import {
  isHealthDbEnabled,
  listAllNetworthTransactions,
  listNetworthContainers,
  listNetworthHoldings,
  NetworthCategory,
  NetworthContainerRow,
  NetworthTransactionRow,
  upsertNetworthSnapshot,
} from "@/lib/healthDb";

type CacheEntry<T> = { fetchedAt: number; value: T };

const CRYPTO_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — CoinGecko, pas besoin de plus frais
const STOCK_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — Yahoo Finance
const FX_CACHE_TTL_MS = 60 * 60 * 1000; // 1h — taux de change, varie peu

const cryptoPriceCache = new Map<string, CacheEntry<number>>(); // coingecko id -> prix EUR
const stockQuoteCache = new Map<string, CacheEntry<{ price: number; currency: string }>>();
const fxRateCache = new Map<string, CacheEntry<number>>(); // devise -> taux vers EUR

// Récupère en un seul appel les prix EUR de plusieurs cryptos (CoinGecko, pas de clé requise).
async function fetchCryptoPricesEur(ids: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const now = Date.now();
  const toFetch = ids.filter((id) => {
    const cached = cryptoPriceCache.get(id);
    if (cached && now - cached.fetchedAt < CRYPTO_CACHE_TTL_MS) {
      result.set(id, cached.value);
      return false;
    }
    return true;
  });
  if (toFetch.length === 0) return result;

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      toFetch.join(","),
    )}&vs_currencies=eur`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, { eur?: number }>;
    for (const id of toFetch) {
      const price = data[id]?.eur;
      if (typeof price === "number") {
        cryptoPriceCache.set(id, { fetchedAt: now, value: price });
        result.set(id, price);
      }
    }
  } catch (error) {
    console.error("Échec de la récupération des prix crypto (CoinGecko)", error);
  }
  return result;
}

// Cours d'une action/ETF via le endpoint public (non officiel mais largement utilisé) de
// Yahoo Finance — pas de clé requise. Renvoie le prix dans la devise native du ticker.
async function fetchStockQuote(ticker: string): Promise<{ price: number; currency: string } | null> {
  const now = Date.now();
  const cached = stockQuoteCache.get(ticker);
  if (cached && now - cached.fetchedAt < STOCK_CACHE_TTL_MS) {
    return cached.value;
  }
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const currency = meta?.currency;
    if (typeof price !== "number" || typeof currency !== "string") return null;
    const value = { price, currency };
    stockQuoteCache.set(ticker, { fetchedAt: now, value });
    return value;
  } catch (error) {
    console.error(`Échec de la récupération du cours pour ${ticker} (Yahoo Finance)`, error);
    return null;
  }
}

// Taux de change vers EUR (Frankfurter, API BCE gratuite sans clé).
async function fetchFxRateToEur(currency: string): Promise<number | null> {
  if (currency === "EUR") return 1;
  const now = Date.now();
  const cached = fxRateCache.get(currency);
  if (cached && now - cached.fetchedAt < FX_CACHE_TTL_MS) {
    return cached.value;
  }
  try {
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(currency)}&to=EUR`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.EUR;
    if (typeof rate !== "number") return null;
    fxRateCache.set(currency, { fetchedAt: now, value: rate });
    return rate;
  } catch (error) {
    console.error(`Échec de la récupération du taux de change ${currency}->EUR`, error);
    return null;
  }
}

export type AssetValuation = {
  unitPriceEur: number | null;
  valueEur: number | null;
  priced: boolean;
};

const UNPRICED: AssetValuation = { unitPriceEur: null, valueEur: null, priced: false };

export type HoldingForValuation = {
  id: number;
  category: NetworthCategory;
  symbol: string | null;
  currency: string;
  quantity: number;
};

// Valorise une liste de possessions en EUR. Crypto : CoinGecko direct en EUR. Tradfi : cours
// natif (Yahoo) converti en EUR via le taux de change. Cash : la quantité EST le montant dans
// `holding.currency`, converti en EUR. Une possession sans `symbol` configuré (ou dont la
// récupération échoue) reste sans valorisation plutôt que d'afficher un chiffre inventé.
export async function computeValuations(
  holdings: HoldingForValuation[],
): Promise<Map<number, AssetValuation>> {
  const result = new Map<number, AssetValuation>();

  const cryptoIds = Array.from(
    new Set(holdings.filter((h) => h.category === "crypto" && h.symbol).map((h) => h.symbol as string)),
  );
  const cryptoPrices = await fetchCryptoPricesEur(cryptoIds);

  const stockTickers = Array.from(
    new Set(holdings.filter((h) => h.category === "tradfi" && h.symbol).map((h) => h.symbol as string)),
  );
  const stockQuoteEntries = await Promise.all(
    stockTickers.map(async (t) => [t, await fetchStockQuote(t)] as const),
  );
  const stockQuotes = new Map(stockQuoteEntries);

  const currenciesNeeded = new Set<string>();
  for (const [, quote] of stockQuoteEntries) {
    if (quote) currenciesNeeded.add(quote.currency);
  }
  for (const h of holdings) {
    if (h.category === "cash") currenciesNeeded.add(h.currency);
  }
  const fxEntries = await Promise.all(
    Array.from(currenciesNeeded).map(async (c) => [c, await fetchFxRateToEur(c)] as const),
  );
  const fxRates = new Map(fxEntries);

  for (const h of holdings) {
    if (h.category === "crypto") {
      const price = h.symbol ? cryptoPrices.get(h.symbol) ?? null : null;
      result.set(
        h.id,
        price != null
          ? { unitPriceEur: price, valueEur: price * h.quantity, priced: true }
          : UNPRICED,
      );
    } else if (h.category === "tradfi") {
      const quote = h.symbol ? stockQuotes.get(h.symbol) ?? null : null;
      const rate = quote ? fxRates.get(quote.currency) ?? null : null;
      const unitPriceEur = quote && rate != null ? quote.price * rate : null;
      result.set(
        h.id,
        unitPriceEur != null
          ? { unitPriceEur, valueEur: unitPriceEur * h.quantity, priced: true }
          : UNPRICED,
      );
    } else {
      const rate = fxRates.get(h.currency) ?? (h.currency === "EUR" ? 1 : null);
      result.set(
        h.id,
        rate != null ? { unitPriceEur: rate, valueEur: rate * h.quantity, priced: true } : UNPRICED,
      );
    }
  }

  return result;
}

export type HoldingView = {
  id: number;
  containerId: number;
  name: string;
  symbol: string | null;
  currency: string;
  quantity: number;
  unitPriceEur: number | null;
  valueEur: number | null;
  priced: boolean;
};

// Charge et valorise tout ce qui appartient à une catégorie (contenants + possessions +
// leur historique de mouvements), pour les pages /networth/crypto, /networth/tradfi,
// /networth/cash.
export async function getNetworthCategoryData(category: NetworthCategory): Promise<{
  containers: NetworthContainerRow[];
  holdings: HoldingView[];
  transactions: NetworthTransactionRow[];
}> {
  const [allContainers, allHoldings, allTransactions] = await Promise.all([
    listNetworthContainers(),
    listNetworthHoldings(),
    listAllNetworthTransactions(),
  ]);

  const containers = allContainers.filter((c) => c.category === category);
  const containerIds = new Set(containers.map((c) => c.id));
  const holdings = allHoldings.filter((h) => containerIds.has(h.containerId));
  const holdingIds = new Set(holdings.map((h) => h.id));
  const transactions = allTransactions.filter((t) => holdingIds.has(t.holdingId));

  const valuations = await computeValuations(
    holdings.map((h) => ({ id: h.id, category, symbol: h.symbol, currency: h.currency, quantity: h.quantity })),
  );
  const holdingsView = holdings.map((h) => ({
    ...h,
    ...(valuations.get(h.id) ?? { unitPriceEur: null, valueEur: null, priced: false }),
  }));

  return { containers, holdings: holdingsView, transactions };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type NetworthBreakdown = {
  crypto: number;
  tradfi: number;
  cash: number;
  total: number;
  holdingsCount: number;
  hasUnpriced: boolean;
};

// Calcule le Net Worth actuel (total + sous-total par catégorie), toutes catégories/contenants
// confondus. Utilisée à la fois par le dashboard (/networth) et par l'instantané quotidien
// (voir runNetworthSnapshot ci-dessous).
export async function getCurrentNetworthBreakdown(): Promise<NetworthBreakdown> {
  const [containers, holdings] = await Promise.all([listNetworthContainers(), listNetworthHoldings()]);

  const containerCategory = new Map(containers.map((c) => [c.id, c.category]));
  const valuations = await computeValuations(
    holdings.map((h) => ({
      id: h.id,
      category: containerCategory.get(h.containerId) ?? "cash",
      symbol: h.symbol,
      currency: h.currency,
      quantity: h.quantity,
    })),
  );

  const totals: Record<NetworthCategory, number> = { crypto: 0, tradfi: 0, cash: 0 };
  let hasUnpriced = false;
  for (const h of holdings) {
    const valuation = valuations.get(h.id);
    if (!valuation?.priced || valuation.valueEur == null) {
      hasUnpriced = true;
      continue;
    }
    const category = containerCategory.get(h.containerId);
    if (category) totals[category] += valuation.valueEur;
  }

  return {
    crypto: totals.crypto,
    tradfi: totals.tradfi,
    cash: totals.cash,
    total: totals.crypto + totals.tradfi + totals.cash,
    holdingsCount: holdings.length,
    hasUnpriced,
  };
}

// Enregistre le Net Worth actuel comme instantané du jour (upsert — plusieurs exécutions le
// même jour affinent juste la valeur avec les prix les plus récents). Conçue pour tourner en
// tâche de fond, au démarrage puis toutes les heures (voir instrumentation.ts) — jamais
// appelée depuis une requête HTTP.
export async function runNetworthSnapshot(): Promise<void> {
  if (!isHealthDbEnabled()) return;

  try {
    const breakdown = await getCurrentNetworthBreakdown();
    if (breakdown.holdingsCount === 0) return;

    await upsertNetworthSnapshot({
      date: todayIso(),
      totalEur: breakdown.total,
      cryptoEur: breakdown.crypto,
      tradfiEur: breakdown.tradfi,
      cashEur: breakdown.cash,
    });
    console.log(`[networth-snapshot] OK — ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[networth-snapshot] échec :", error);
  }
}
