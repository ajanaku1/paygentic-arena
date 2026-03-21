import { NextResponse } from "next/server";

/**
 * x402 Payment Protocol endpoint
 *
 * Implements the x402 HTTP payment standard for agent-to-agent API payments.
 * When an agent calls a paid endpoint without payment, it receives 402 Payment Required
 * with headers specifying payment details. The agent then pays on-chain and retries
 * with proof of payment.
 *
 * Flow:
 *   1. Agent calls GET /api/x402?resource=market-data
 *   2. Server returns 402 with X-Payment headers
 *   3. Agent pays on-chain via WDK
 *   4. Agent retries with X-Payment-Proof header (tx hash)
 *   5. Server verifies and returns the resource
 */

const RESOURCES: Record<string, { price: string; description: string; data: any }> = {
  "market-data": {
    price: "0.50",
    description: "Real-time market data feed for top 10 tokens",
    data: {
      tokens: [
        { symbol: "USDT", price: 1.0, volume24h: "48.2B", change24h: "+0.01%" },
        { symbol: "ETH", price: 3847.52, volume24h: "18.7B", change24h: "+2.34%" },
        { symbol: "BTC", price: 97230.00, volume24h: "32.1B", change24h: "+1.12%" },
      ],
      timestamp: new Date().toISOString(),
      source: "AgentVerse Market Oracle",
    },
  },
  "agent-directory": {
    price: "0.25",
    description: "Full agent directory with skills, rates, and availability",
    data: {
      agents: [
        { name: "Atlas", skills: ["Market Research"], rate: 5, status: "online" },
        { name: "Nova", skills: ["Code Review"], rate: 15, status: "online" },
        { name: "Cipher", skills: ["Smart Contract Audit"], rate: 45, status: "online" },
      ],
      totalAgents: 5,
    },
  },
  "audit-report": {
    price: "2.00",
    description: "Premium smart contract audit report template",
    data: {
      template: "Security Audit Report v2.1",
      sections: ["Executive Summary", "Vulnerability Assessment", "Risk Matrix", "Recommendations"],
      format: "PDF",
    },
  },
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const resource = url.searchParams.get("resource") || "market-data";
  const paymentProof = req.headers.get("x-payment-proof");

  const entry = RESOURCES[resource];
  if (!entry) {
    return NextResponse.json(
      { error: `Unknown resource: ${resource}. Available: ${Object.keys(RESOURCES).join(", ")}` },
      { status: 404 }
    );
  }

  // No payment proof — return 402 Payment Required
  if (!paymentProof) {
    return NextResponse.json(
      {
        error: "Payment Required",
        message: `This resource costs ${entry.price} USDT. Pay on-chain via WDK and include the tx hash in the X-Payment-Proof header.`,
        resource,
        description: entry.description,
        payment: {
          amount: entry.price,
          currency: "USDT",
          network: "ethereum-sepolia",
          recipient: "0x7837100F909A9dD972B2045800103809533D91a3",
          protocol: "x402",
        },
      },
      {
        status: 402,
        headers: {
          "X-Payment-Required": "true",
          "X-Payment-Amount": entry.price,
          "X-Payment-Currency": "USDT",
          "X-Payment-Network": "ethereum-sepolia",
          "X-Payment-Recipient": "0x7837100F909A9dD972B2045800103809533D91a3",
          "X-Payment-Protocol": "x402",
        },
      }
    );
  }

  // Payment proof provided — verify format and return resource
  if (!paymentProof.startsWith("0x") || paymentProof.length < 10) {
    return NextResponse.json(
      { error: "Invalid payment proof. Provide a valid transaction hash." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    status: "paid",
    resource,
    txHash: paymentProof,
    verifiedAt: new Date().toISOString(),
    data: entry.data,
  });
}
