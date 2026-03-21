import { NextResponse } from "next/server";
import { getAllAgents, createAgent, ensureDb } from "@/lib/db";
import { createAgentWallet } from "@/lib/wallet-service";

export async function GET() {
  await ensureDb();
  const agents = getAllAgents();
  return NextResponse.json(agents);
}

export async function POST(req: Request) {
  await ensureDb();
  try {
    const body = await req.json();
    const { name, avatar, skills, description, hourly_rate, reputation } = body;

    if (!name || !skills?.length) {
      return NextResponse.json({ error: "name and skills required" }, { status: 400 });
    }

    const { seedPhrase, address } = await createAgentWallet();

    const agent = createAgent({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      avatar: avatar || "🤖",
      skills,
      description: description || "",
      wallet_address: address,
      seed_phrase: seedPhrase,
      hourly_rate: hourly_rate || 10,
      reputation: reputation || 5.0,
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
