import { NextResponse } from "next/server";
import { getAgent } from "@/lib/db";
import {
  getWalletAddress,
  getBalance,
  getUSDT0BridgeQuote,
} from "@/lib/wallet-service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json(
      { error: "agentId query param required" },
      { status: 400 }
    );
  }

  const agent = getAgent(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  try {
    const [address, balance, bridgeQuote] = await Promise.all([
      getWalletAddress(agent.seed_phrase),
      getBalance(agent.seed_phrase),
      getUSDT0BridgeQuote(agent.seed_phrase, "arbitrum", "100"),
    ]);

    return NextResponse.json({
      address,
      balance,
      chain: process.env.CHAIN_NAME || "ethereum",
      bridgeQuote,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to fetch wallet info" },
      { status: 500 }
    );
  }
}
