import { NextResponse } from "next/server";
import { getAgent, ensureDb } from "@/lib/db";
import { getAaveSupplyQuote } from "@/lib/wallet-service";

export async function GET(req: Request) {
  await ensureDb();
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId") || "atlas";
    const amount = url.searchParams.get("amount") || "100";

    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const quote = await getAaveSupplyQuote(agent.seed_phrase, "USDT", amount);

    return NextResponse.json({
      agent: agent.name,
      walletAddress: agent.wallet_address,
      yieldStrategy: {
        ...quote,
        description: quote.available
          ? `${agent.name} can deposit ${amount} USDT into Aave V3 to earn ~${quote.apy} APY while idle`
          : `Yield not available: ${quote.reason}`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
