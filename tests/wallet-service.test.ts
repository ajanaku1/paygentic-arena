import { describe, it, expect } from "vitest";
import WDK from "@tetherto/wdk";

describe("Wallet Service - WDK", () => {
  it("generates a valid 12-word seed phrase", () => {
    const seed = WDK.getRandomSeedPhrase();
    const words = seed.split(" ");
    expect(words).toHaveLength(12);
    words.forEach((w) => expect(w.length).toBeGreaterThan(0));
  });

  it("generates unique seed phrases", () => {
    const seed1 = WDK.getRandomSeedPhrase();
    const seed2 = WDK.getRandomSeedPhrase();
    expect(seed1).not.toBe(seed2);
  });

  it("derives a valid EVM address from seed", async () => {
    const WalletManagerEvm = (await import("@tetherto/wdk-wallet-evm")).default;
    const seed = WDK.getRandomSeedPhrase();
    const wdk = new WDK(seed).registerWallet("ethereum", WalletManagerEvm, {
      provider: "https://ethereum-sepolia-rpc.publicnode.com",
    });
    const account = await wdk.getAccount("ethereum", 0);
    const address = await account.getAddress();
    wdk.dispose();

    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("derives different addresses from different seeds", async () => {
    const WalletManagerEvm = (await import("@tetherto/wdk-wallet-evm")).default;

    const seed1 = WDK.getRandomSeedPhrase();
    const seed2 = WDK.getRandomSeedPhrase();

    const wdk1 = new WDK(seed1).registerWallet("ethereum", WalletManagerEvm, { provider: "https://ethereum-sepolia-rpc.publicnode.com" });
    const wdk2 = new WDK(seed2).registerWallet("ethereum", WalletManagerEvm, { provider: "https://ethereum-sepolia-rpc.publicnode.com" });

    const addr1 = await (await wdk1.getAccount("ethereum", 0)).getAddress();
    const addr2 = await (await wdk2.getAccount("ethereum", 0)).getAddress();

    wdk1.dispose();
    wdk2.dispose();

    expect(addr1).not.toBe(addr2);
  });

  it("derives same address from same seed (deterministic)", async () => {
    const WalletManagerEvm = (await import("@tetherto/wdk-wallet-evm")).default;
    const seed = "flower alert bracket erosion lizard width craft permit vault twelve witness animal";

    const wdk1 = new WDK(seed).registerWallet("ethereum", WalletManagerEvm, { provider: "https://ethereum-sepolia-rpc.publicnode.com" });
    const wdk2 = new WDK(seed).registerWallet("ethereum", WalletManagerEvm, { provider: "https://ethereum-sepolia-rpc.publicnode.com" });

    const addr1 = await (await wdk1.getAccount("ethereum", 0)).getAddress();
    const addr2 = await (await wdk2.getAccount("ethereum", 0)).getAddress();

    wdk1.dispose();
    wdk2.dispose();

    expect(addr1).toBe(addr2);
  });
});
