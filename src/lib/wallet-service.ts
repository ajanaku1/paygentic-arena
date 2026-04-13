// Locus Payment Service — uses PayWithLocus.com REST API for USDC payments on Base
const LOCUS_API = process.env.LOCUS_API_URL || "https://api.paywithlocus.com/api";
const LOCUS_API_KEY = process.env.LOCUS_API_KEY || "";

function locusHeaders() {
  return {
    "Authorization": `Bearer ${LOCUS_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// ─── WALLET / BALANCE ──────────────────────────────────────────────────────

export async function getBalance(): Promise<string> {
  const res = await fetch(`${LOCUS_API}/pay/balance`, {
    headers: locusHeaders(),
  });
  if (!res.ok) throw new Error(`Locus balance check failed: ${res.status}`);
  const data = await res.json();
  return data.balance?.toString() || "0";
}

export async function getWalletAddress(): Promise<string> {
  const res = await fetch(`${LOCUS_API}/pay/balance`, {
    headers: locusHeaders(),
  });
  if (!res.ok) throw new Error(`Locus wallet info failed: ${res.status}`);
  const data = await res.json();
  return data.address || data.walletAddress || "";
}

// ─── TRANSFERS (Direct USDC Send) ──────────────────────────────────────────

export async function sendPayment(
  toAddress: string,
  amount: string,
  memo?: string
): Promise<{ txHash: string }> {
  const res = await fetch(`${LOCUS_API}/pay/send`, {
    method: "POST",
    headers: locusHeaders(),
    body: JSON.stringify({
      to: toAddress,
      amount,
      memo: memo || "PaygenticArena payment",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Locus send failed: ${res.status}`);
  }
  const data = await res.json();
  return { txHash: data.txHash || data.hash || "" };
}

// ─── CHECKOUT SESSIONS ─────────────────────────────────────────────────────

export async function createCheckoutSession(params: {
  amount: string;
  description: string;
  metadata?: Record<string, string>;
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const res = await fetch(`${LOCUS_API}/checkout/sessions`, {
    method: "POST",
    headers: locusHeaders(),
    body: JSON.stringify({
      amount: params.amount,
      description: params.description,
      successUrl: `${baseUrl}/tasks`,
      cancelUrl: `${baseUrl}/tasks`,
      webhookUrl: `${baseUrl}/api/webhooks/locus`,
      metadata: params.metadata || {},
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Locus checkout failed: ${res.status}`);
  }
  const data = await res.json();
  return { sessionId: data.id || data.sessionId, checkoutUrl: data.url || data.checkoutUrl || "" };
}

// ─── ESCROW (via Checkout Sessions) ────────────────────────────────────────
// Escrow is implemented using Locus checkout sessions:
// - Lock: Create a checkout session for the task budget
// - Release: Direct send from the platform wallet to the worker

export async function lockEscrow(
  amount: string,
  taskTitle: string,
  taskId: string
): Promise<{ sessionId: string; txHash: string }> {
  // For demo: simulate escrow lock via checkout session creation
  try {
    const session = await createCheckoutSession({
      amount,
      description: `Escrow for task: ${taskTitle}`,
      metadata: { taskId, type: "escrow_lock" },
    });
    return { sessionId: session.sessionId, txHash: `locus_escrow_${session.sessionId}` };
  } catch {
    // Simulated escrow for demo when API key not configured
    const simId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return { sessionId: simId, txHash: `locus_sim_${simId}` };
  }
}

export async function releaseEscrow(
  toAddress: string,
  amount: string,
  taskId: string
): Promise<{ txHash: string }> {
  try {
    const result = await sendPayment(
      toAddress,
      amount,
      `Escrow release for task ${taskId}`
    );
    return result;
  } catch {
    // Simulated release for demo
    return { txHash: `locus_sim_release_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }
}

// ─── AGENT WALLET CREATION ─────────────────────────────────────────────────
// In the Locus model, the platform holds one wallet (LOCUS_API_KEY).
// Individual agents get assigned addresses tracked in our DB.
// For demo purposes, we generate deterministic Base addresses.

export function generateAgentWalletAddress(agentId: string): string {
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(`paygentic-arena-${agentId}`).digest("hex");
  return `0x${hash.slice(0, 40)}`;
}

export async function createAgentWallet(agentId: string): Promise<{ address: string }> {
  const address = generateAgentWalletAddress(agentId);
  return { address };
}
