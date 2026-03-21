import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import WalletManagerBtc from "@tetherto/wdk-wallet-btc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "db", "agentverse.db");
const SCHEMA_PATH = path.join(__dirname, "..", "db", "schema.sql");
const RPC_URL = process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

// Fixed seed for Atlas so the address is stable and can be funded from a faucet
const ATLAS_SEED = "flower alert bracket erosion lizard width craft permit vault twelve witness animal";

const AGENTS = [
  {
    id: "atlas",
    name: "Atlas",
    avatar: "🌐",
    skills: ["Market Research", "Data Analysis"],
    description: "Meticulous market researcher and data analyst. Approaches tasks methodically, always backing claims with data.",
    hourly_rate: 5,
    reputation: 4.9,
    fixedSeed: ATLAS_SEED,
  },
  {
    id: "nova",
    name: "Nova",
    avatar: "⚡",
    skills: ["Code Review", "Bug Hunting"],
    description: "Sharp code reviewer and bug hunter. Deep expertise in Solidity, TypeScript, and system architecture.",
    hourly_rate: 15,
    reputation: 4.8,
  },
  {
    id: "sage",
    name: "Sage",
    avatar: "📝",
    skills: ["Content Writing", "SEO"],
    description: "Creative content writer and SEO specialist. Crafts compelling narratives that resonate with audiences.",
    hourly_rate: 8,
    reputation: 4.7,
  },
  {
    id: "cipher",
    name: "Cipher",
    avatar: "🔐",
    skills: ["Smart Contract Audit", "Security Analysis"],
    description: "Security-focused smart contract auditor. Thinks adversarially and catches vulnerabilities others miss.",
    hourly_rate: 45,
    reputation: 5.0,
  },
  {
    id: "pixel",
    name: "Pixel",
    avatar: "🎨",
    skills: ["UI/UX Design", "Prototyping"],
    description: "Intuitive UI/UX designer and prototyper. Thinks in user flows and visual hierarchies.",
    hourly_rate: 12,
    reputation: 4.6,
  },
];

async function seed() {
  console.log("=== Seeding AgentVerse ===\n");

  // Init DB
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);

  // Clear existing data
  db.exec("DELETE FROM activity_log");
  db.exec("DELETE FROM tasks");
  db.exec("DELETE FROM agents");
  console.log("✓ Cleared existing data\n");

  const insertAgent = db.prepare(`
    INSERT INTO agents (id, name, avatar, skills, description, wallet_address, seed_phrase, hourly_rate, reputation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertActivity = db.prepare(`
    INSERT INTO activity_log (type, agent_id, message)
    VALUES (?, ?, ?)
  `);

  for (const agent of AGENTS) {
    // Generate WDK wallets (EVM + BTC) — use fixed seed if provided
    const seed = agent.fixedSeed || WDK.getRandomSeedPhrase();

    const evmWdk = new WDK(seed).registerWallet("ethereum", WalletManagerEvm, {
      provider: RPC_URL,
    });
    const evmAccount = await evmWdk.getAccount("ethereum", 0);
    const address = await evmAccount.getAddress();
    evmWdk.dispose();

    const btcWdk = new WDK(seed).registerWallet("bitcoin", WalletManagerBtc, {
      provider: "https://blockstream.info/api",
    });
    const btcAccount = await btcWdk.getAccount("bitcoin", 0);
    const btcAddress = await btcAccount.getAddress();
    btcWdk.dispose();

    insertAgent.run(
      agent.id,
      agent.name,
      agent.avatar,
      JSON.stringify(agent.skills),
      agent.description,
      address,
      seed,
      agent.hourly_rate,
      agent.reputation
    );

    insertActivity.run(
      "agent_registered",
      agent.id,
      `${agent.name} joined AgentVerse with wallet ${address.slice(0, 8)}...`
    );

    console.log(`✓ ${agent.avatar} ${agent.name}`);
    console.log(`  EVM Wallet: ${address}`);
    console.log(`  BTC Wallet: ${btcAddress}`);
    console.log(`  Skills: ${agent.skills.join(", ")}`);
    console.log(`  Rate:   ${agent.hourly_rate} USDT/task\n`);
  }

  // Verify
  const count = db.prepare("SELECT COUNT(*) as c FROM agents").get();
  const actCount = db.prepare("SELECT COUNT(*) as c FROM activity_log").get();
  console.log(`=== Done: ${count.c} agents seeded, ${actCount.c} activity entries ===`);

  db.close();
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
