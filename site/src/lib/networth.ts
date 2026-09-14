import { NetworthAssetRow, NetworthCategory } from "@/lib/healthDb";

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

// Valorise une liste d'actifs en EUR. Crypto : CoinGecko direct en EUR. Tradfi : cours natif
// (Yahoo) converti en EUR via le taux de change. Cash : la quantité EST le montant dans
// `asset.currency`, converti en EUR. Un actif sans `symbol` configuré (ou dont la récupération
// échoue) reste sans valorisation plutôt que d'afficher un chiffre inventé.
export async function computeValuations(
  assets: NetworthAssetRow[],
): Promise<Map<number, AssetValuation>> {
  const result = new Map<number, AssetValuation>();

  const cryptoIds = Array.from(
    new Set(assets.filter((a) => a.category === "crypto" && a.symbol).map((a) => a.symbol as string)),
  );
  const cryptoPrices = await fetchCryptoPricesEur(cryptoIds);

  const stockTickers = Array.from(
    new Set(assets.filter((a) => a.category === "tradfi" && a.symbol).map((a) => a.symbol as string)),
  );
  const stockQuoteEntries = await Promise.all(
    stockTickers.map(async (t) => [t, await fetchStockQuote(t)] as const),
  );
  const stockQuotes = new Map(stockQuoteEntries);

  const currenciesNeeded = new Set<string>();
  for (const [, quote] of stockQuoteEntries) {
    if (quote) currenciesNeeded.add(quote.currency);
  }
  for (const a of assets) {
    if (a.category === "cash") currenciesNeeded.add(a.currency);
  }
  const fxEntries = await Promise.all(
    Array.from(currenciesNeeded).map(async (c) => [c, await fetchFxRateToEur(c)] as const),
  );
  const fxRates = new Map(fxEntries);

  for (const a of assets) {
    if (a.category === "crypto") {
      const price = a.symbol ? cryptoPrices.get(a.symbol) ?? null : null;
      result.set(
        a.id,
        price != null
          ? { unitPriceEur: price, valueEur: price * a.quantity, priced: true }
          : UNPRICED,
      );
    } else if (a.category === "tradfi") {
      const quote = a.symbol ? stockQuotes.get(a.symbol) ?? null : null;
      const rate = quote ? fxRates.get(quote.currency) ?? null : null;
      const unitPriceEur = quote && rate != null ? quote.price * rate : null;
      result.set(
        a.id,
        unitPriceEur != null
          ? { unitPriceEur, valueEur: unitPriceEur * a.quantity, priced: true }
          : UNPRICED,
      );
    } else {
      const rate = fxRates.get(a.currency) ?? (a.currency === "EUR" ? 1 : null);
      result.set(
        a.id,
        rate != null ? { unitPriceEur: rate, valueEur: rate * a.quantity, priced: true } : UNPRICED,
      );
    }
  }

  return result;
}

export const NETWORTH_CATEGORIES: { id: NetworthCategory; label: string }[] = [
  { id: "crypto", label: "Crypto" },
  { id: "tradfi", label: "Trade Fi" },
  { id: "cash", label: "Cash" },
];
