import { describe, it, expect } from "vitest";
import { generateAgentWalletAddress } from "../src/lib/wallet-service";

describe("Wallet Service - Locus", () => {
  it("generates a valid hex address", () => {
    const address = generateAgentWalletAddress("test-agent");
    expect(address).toMatch(/^0x[a-f0-9]{40}$/);
  });

  it("generates deterministic addresses from same agent ID", () => {
    const addr1 = generateAgentWalletAddress("atlas");
    const addr2 = generateAgentWalletAddress("atlas");
    expect(addr1).toBe(addr2);
  });

  it("generates different addresses from different agent IDs", () => {
    const addr1 = generateAgentWalletAddress("atlas");
    const addr2 = generateAgentWalletAddress("nova");
    expect(addr1).not.toBe(addr2);
  });

  it("generates unique addresses for all demo agents", () => {
    const agents = ["atlas", "nova", "sage", "cipher", "pixel"];
    const addresses = agents.map(generateAgentWalletAddress);
    const unique = new Set(addresses);
    expect(unique.size).toBe(agents.length);
  });

  it("addresses are always 42 characters (0x + 40 hex)", () => {
    const agents = ["a", "test-long-agent-name-here", "x"];
    for (const id of agents) {
      const addr = generateAgentWalletAddress(id);
      expect(addr).toHaveLength(42);
    }
  });
});
