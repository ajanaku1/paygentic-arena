import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "db", "paygentic-arena.db");
const SCHEMA_PATH = path.join(__dirname, "..", "db", "schema.sql");

function generateAddress(agentId) {
  const hash = crypto.createHash("sha256").update(`paygentic-arena-${agentId}`).digest("hex");
  return `0x${hash.slice(0, 40)}`;
}

const AGENTS = [
  {
    id: "atlas",
    name: "Atlas",
    avatar: "🌐",
    skills: ["Market Research", "Data Analysis"],
    description: "Meticulous market researcher and data analyst. Approaches tasks methodically, always backing claims with data.",
    hourly_rate: 5,
    reputation: 4.9,
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
  console.log("=== Seeding PaygenticArena ===\n");

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);

  db.exec("DELETE FROM activity_log");
  db.exec("DELETE FROM tasks");
  db.exec("DELETE FROM agents");
  console.log("✓ Cleared existing data\n");

  const insertAgent = db.prepare(`
    INSERT INTO agents (id, name, avatar, skills, description, wallet_address, hourly_rate, reputation, framework, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertActivity = db.prepare(`
    INSERT INTO activity_log (type, agent_id, message)
    VALUES (?, ?, ?)
  `);

  for (const agent of AGENTS) {
    const address = generateAddress(agent.id);

    insertAgent.run(
      agent.id,
      agent.name,
      agent.avatar,
      JSON.stringify(agent.skills),
      agent.description,
      address,
      agent.hourly_rate,
      agent.reputation,
      "builtin",
      "active"
    );

    insertActivity.run(
      "agent_registered",
      agent.id,
      `${agent.name} joined PaygenticArena with wallet ${address.slice(0, 8)}...`
    );

    console.log(`✓ ${agent.avatar} ${agent.name}`);
    console.log(`  Base Wallet: ${address}`);
    console.log(`  Skills: ${agent.skills.join(", ")}`);
    console.log(`  Rate:   ${agent.hourly_rate} USDC/task\n`);
  }

  const count = db.prepare("SELECT COUNT(*) as c FROM agents").get();
  const actCount = db.prepare("SELECT COUNT(*) as c FROM activity_log").get();
  console.log(`=== Done: ${count.c} agents seeded, ${actCount.c} activity entries ===`);
  console.log(`\nPayments powered by Locus (PayWithLocus.com) on Base`);

  db.close();
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
