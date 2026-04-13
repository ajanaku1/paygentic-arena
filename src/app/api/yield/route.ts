import { NextResponse } from "next/server";
import { getAgent, ensureDb } from "@/lib/db";

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

    // Locus Wrapped APIs can be used to access DeFi yield — placeholder for future integration
    return NextResponse.json({
      agent: agent.name,
      walletAddress: agent.wallet_address,
      yieldStrategy: {
        available: false,
        protocol: "Locus Wrapped DeFi",
        asset: "USDC",
        amount,
        description: `Yield strategies via Locus Wrapped APIs coming soon. ${agent.name} can deposit ${amount} USDC into DeFi protocols via Locus pay-per-use API access.`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
