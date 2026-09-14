import { NextRequest, NextResponse } from "next/server";
import { createNetworthAsset, NetworthCategory } from "@/lib/healthDb";

const CATEGORIES: NetworthCategory[] = ["crypto", "tradfi", "cash"];
const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

export async function POST(request: NextRequest) {
  try {
    const { category, name, symbol, currency } = await request.json();

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Nom requis." }, { status: 400 });
    }

    let cleanSymbol: string | null = null;
    if (typeof symbol === "string" && symbol.trim()) {
      // CoinGecko attend un identifiant en minuscules ; les tickers boursiers Yahoo Finance
      // sont insensibles au séparateur d'échange mais on garde la casse telle quelle (ex: MC.PA).
      cleanSymbol = category === "crypto" ? symbol.trim().toLowerCase() : symbol.trim();
    }

    const cleanCurrency =
      category === "cash" && typeof currency === "string" && CURRENCIES.includes(currency)
        ? currency
        : "EUR";

    const asset = await createNetworthAsset({
      category,
      name: name.trim(),
      symbol: cleanSymbol,
      currency: cleanCurrency,
    });
    return NextResponse.json({ asset });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de créer la sous-catégorie." }, { status: 500 });
  }
}
