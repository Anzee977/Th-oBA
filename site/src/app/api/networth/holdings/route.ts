import { NextRequest, NextResponse } from "next/server";
import { createNetworthHolding } from "@/lib/healthDb";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

export async function POST(request: NextRequest) {
  try {
    const { containerId, name, symbol, currency, category } = await request.json();

    const cleanContainerId = Number(containerId);
    if (!Number.isInteger(cleanContainerId)) {
      return NextResponse.json({ error: "Sous-catégorie invalide." }, { status: 400 });
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
      typeof currency === "string" && CURRENCIES.includes(currency) ? currency : "EUR";

    const holding = await createNetworthHolding({
      containerId: cleanContainerId,
      name: name.trim(),
      symbol: cleanSymbol,
      currency: cleanCurrency,
    });
    return NextResponse.json({ holding });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible d'ajouter la possession." }, { status: 500 });
  }
}
