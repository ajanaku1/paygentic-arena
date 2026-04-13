import { NextResponse } from "next/server";
import { getAgent, ensureDb } from "@/lib/db";

export async function GET(req: Request) {
  await ensureDb();
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

  return NextResponse.json({
    address: agent.wallet_address,
    chain: "Base",
    currency: "USDC",
    provider: "PayWithLocus.com",
  });
}
