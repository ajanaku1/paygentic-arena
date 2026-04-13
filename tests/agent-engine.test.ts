import { describe, it, expect } from "vitest";
import { findMatchingAgents } from "../src/lib/agent-engine";
import type { Agent } from "../src/lib/types";

const MOCK_AGENTS: Agent[] = [
  { id: "atlas", name: "Atlas", avatar: "🌐", skills: ["Market Research", "Data Analysis"], description: "", wallet_address: "0x1", hourly_rate: 5, reputation: 4.9, tasks_completed: 0, api_key: null, endpoint_url: null, framework: "builtin", status: "active", created_at: "" },
  { id: "nova", name: "Nova", avatar: "⚡", skills: ["Code Review", "Bug Hunting"], description: "", wallet_address: "0x2", hourly_rate: 15, reputation: 4.8, tasks_completed: 0, api_key: null, endpoint_url: null, framework: "builtin", status: "active", created_at: "" },
  { id: "sage", name: "Sage", avatar: "📝", skills: ["Content Writing", "SEO"], description: "", wallet_address: "0x3", hourly_rate: 8, reputation: 4.7, tasks_completed: 0, api_key: null, endpoint_url: null, framework: "builtin", status: "active", created_at: "" },
  { id: "cipher", name: "Cipher", avatar: "🔐", skills: ["Smart Contract Audit", "Security Analysis"], description: "", wallet_address: "0x4", hourly_rate: 45, reputation: 5.0, tasks_completed: 0, api_key: null, endpoint_url: null, framework: "builtin", status: "active", created_at: "" },
  { id: "pixel", name: "Pixel", avatar: "🎨", skills: ["UI/UX Design", "Prototyping"], description: "", wallet_address: "0x5", hourly_rate: 12, reputation: 4.6, tasks_completed: 0, api_key: null, endpoint_url: null, framework: "builtin", status: "active", created_at: "" },
];

describe("Agent Engine - findMatchingAgents", () => {
  it("finds exact skill match", () => {
    const result = findMatchingAgents(MOCK_AGENTS, "Code Review");
    expect(result.map((a) => a.id)).toContain("nova");
  });

  it("finds partial skill match", () => {
    const result = findMatchingAgents(MOCK_AGENTS, "Audit");
    expect(result.map((a) => a.id)).toContain("cipher");
  });

  it("finds match when query is substring of skill", () => {
    const result = findMatchingAgents(MOCK_AGENTS, "Writing");
    expect(result.map((a) => a.id)).toContain("sage");
  });

  it("returns all agents sorted by reputation when no match", () => {
    const result = findMatchingAgents(MOCK_AGENTS, "Quantum Physics");
    expect(result).toHaveLength(5);
    expect(result[0].id).toBe("cipher"); // highest reputation (5.0)
  });

  it("returns multiple matches for broad skill", () => {
    const result = findMatchingAgents(MOCK_AGENTS, "Analysis");
    const ids = result.map((a) => a.id);
    expect(ids).toContain("atlas"); // Data Analysis
    expect(ids).toContain("cipher"); // Security Analysis
  });

  it("is case-insensitive", () => {
    const result = findMatchingAgents(MOCK_AGENTS, "code review");
    expect(result.map((a) => a.id)).toContain("nova");
  });

  it("handles empty agent list", () => {
    const result = findMatchingAgents([], "Code Review");
    expect(result).toHaveLength(0);
  });
});
