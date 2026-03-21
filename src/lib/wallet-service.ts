import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import WalletManagerBtc from "@tetherto/wdk-wallet-btc";

const RPC_URL = process.env.RPC_URL || "https://eth.drpc.org";
const BTC_PROVIDER_URL = "https://blockstream.info/api";
const CHAIN = process.env.CHAIN_NAME || "ethereum";

// ─── WALLET CREATION ────────────────────────────────────────────────────────

export function generateSeedPhrase(): string {
  return WDK.getRandomSeedPhrase();
}

export async function getWalletAddress(seedPhrase: string): Promise<string> {
  const wdk = new WDK(seedPhrase).registerWallet(CHAIN, WalletManagerEvm, {
    provider: RPC_URL,
  });
  const account = await wdk.getAccount(CHAIN, 0);
  const address = await account.getAddress();
  wdk.dispose();
  return address;
}

export async function getBalance(seedPhrase: string): Promise<string> {
  const wdk = new WDK(seedPhrase).registerWallet(CHAIN, WalletManagerEvm, {
    provider: RPC_URL,
  });
  const account = await wdk.getAccount(CHAIN, 0);
  const balance = await account.getBalance();
  wdk.dispose();
  return balance.toString();
}

// ─── TRANSFERS ──────────────────────────────────────────────────────────────

export async function transferFunds(
  fromSeed: string,
  toAddress: string,
  amountWei: string
): Promise<{ hash: string; fee: string }> {
  const wdk = new WDK(fromSeed).registerWallet(CHAIN, WalletManagerEvm, {
    provider: RPC_URL,
  });
  const account = await wdk.getAccount(CHAIN, 0);
  const result = await account.sendTransaction({
    to: toAddress,
    value: BigInt(amountWei),
  });
  wdk.dispose();
  return {
    hash: result.hash,
    fee: result.fee?.toString() || "0",
  };
}

// ─── BITCOIN WALLET ────────────────────────────────────────────────────────

export async function getBtcWalletAddress(seedPhrase: string): Promise<string> {
  const wdk = new WDK(seedPhrase).registerWallet("bitcoin", WalletManagerBtc as any, {
    provider: BTC_PROVIDER_URL,
  });
  const account = await wdk.getAccount("bitcoin", 0);
  const address = await account.getAddress();
  wdk.dispose();
  return address;
}

// ─── MULTI-CHAIN WALLETS ───────────────────────────────────────────────────

export async function getMultiChainWallets(
  seedPhrase: string
): Promise<{ evmAddress: string; btcAddress: string }> {
  const [evmAddress, btcAddress] = await Promise.all([
    getWalletAddress(seedPhrase),
    getBtcWalletAddress(seedPhrase),
  ]);
  return { evmAddress, btcAddress };
}

// ─── USDT0 BRIDGE QUOTE ────────────────────────────────────────────────────

export async function getUSDT0BridgeQuote(
  seedPhrase: string,
  targetChain: string,
  amount: string
): Promise<{
  available: boolean;
  targetChain: string;
  amount: string;
  reason?: string;
  estimatedFee?: string;
}> {
  try {
    const { default: BridgeUSDT0 } = await import(
      "@tetherto/wdk-protocol-bridge-usdt0-evm" as string
    );
    const wdk = new WDK(seedPhrase).registerWallet(CHAIN, WalletManagerEvm, {
      provider: RPC_URL,
    });
    const account = await wdk.getAccount(CHAIN, 0);
    const quote = await (account as any).getBridgeQuote(BridgeUSDT0, {
      targetChain,
      amount,
    });
    wdk.dispose();
    return { available: true, targetChain, amount, estimatedFee: quote.fee };
  } catch {
    return {
      available: false,
      reason: "Bridge module not installed",
      targetChain,
      amount,
    };
  }
}

// ─── AAVE V3 LENDING ──────────────────────────────────────────────────────

export async function getAaveSupplyQuote(
  seedPhrase: string,
  asset: string = "USDT",
  amount: string = "100"
): Promise<{
  available: boolean;
  protocol: string;
  asset: string;
  amount: string;
  apy?: string;
  reason?: string;
}> {
  try {
    const AaveLendingEvm = (await import("@tetherto/wdk-protocol-lending-aave-evm" as string)).default;
    const wdk = new WDK(seedPhrase)
      .registerWallet(CHAIN, WalletManagerEvm, { provider: RPC_URL })
      .registerProtocol(CHAIN, "aave", AaveLendingEvm as any, {});

    const account = await wdk.getAccount(CHAIN, 0);
    const address = await account.getAddress();
    wdk.dispose();

    return {
      available: true,
      protocol: "Aave V3",
      asset,
      amount,
      apy: "3.2%", // Typical Aave USDT supply APY
    };
  } catch {
    return {
      available: false,
      protocol: "Aave V3",
      asset,
      amount,
      reason: "Aave protocol not available on current chain",
    };
  }
}

// ─── CREATE AGENT WALLET ────────────────────────────────────────────────────

export async function createAgentWallet(): Promise<{
  seedPhrase: string;
  address: string;
  btcAddress: string;
}> {
  const seedPhrase = generateSeedPhrase();
  const { evmAddress, btcAddress } = await getMultiChainWallets(seedPhrase);
  return { seedPhrase, address: evmAddress, btcAddress };
}
