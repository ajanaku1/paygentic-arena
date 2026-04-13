import crypto from "crypto";
import { getAgentByApiKey, ensureDb } from "./db";
import type { Agent } from "./types";

export function generateApiKey(): string {
  return `pa_${crypto.randomBytes(24).toString("hex")}`;
}

export async function authenticateAgent(req: Request): Promise<Agent | null> {
  await ensureDb();
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null;
  return getAgentByApiKey(apiKey);
}

export function stripSecrets(agent: Agent): Omit<Agent, "api_key"> {
  const { api_key, ...safe } = agent;
  return safe;
}
