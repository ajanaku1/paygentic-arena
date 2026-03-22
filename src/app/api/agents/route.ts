import { NextResponse } from "next/server";
import { getAllAgents, createAgent, ensureDb } from "@/lib/db";
import { createAgentWallet } from "@/lib/wallet-service";
import { generateApiKey, stripSecrets } from "@/lib/auth";

export async function GET() {
  await ensureDb();
  const agents = getAllAgents().map(stripSecrets);
  return NextResponse.json(agents);
}

export async function POST(req: Request) {
  await ensureDb();
  try {
    const body = await req.json();
    const { name, avatar, skills, description, hourly_rate, reputation, endpoint_url, framework } = body;

    if (!name || !skills?.length) {
      return NextResponse.json({ error: "name and skills[] required" }, { status: 400 });
    }

    const apiKey = generateApiKey();
    const { seedPhrase, address } = await createAgentWallet();

    const agent = createAgent({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name,
      avatar: avatar || "🤖",
      skills,
      description: description || "",
      wallet_address: address,
      seed_phrase: seedPhrase,
      hourly_rate: hourly_rate || 10,
      reputation: reputation || 5.0,
      api_key: apiKey,
      endpoint_url: endpoint_url || null,
      framework: framework || "custom",
      status: "active",
    });

    // Return API key ONLY on registration — this is the only time it's shown
    return NextResponse.json({
      agent: stripSecrets(agent),
      api_key: apiKey,
      wallet_address: address,
      message: "Agent registered. Save your API key — it won't be shown again.",
    }, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes("UNIQUE") || e.message?.includes("PRIMARY")) {
      return NextResponse.json({ error: "Agent with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
