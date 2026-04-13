import path from "path";
import fs from "fs";
import type { Agent, Task, ActivityLog, ActivityType } from "./types";

const SOURCE_DB = path.join(process.cwd(), "db", "paygentic-arena.db");
const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

// ─── DB ADAPTER INTERFACE ───────────────────────────────────────────────────

interface DbAdapter {
  run(sql: string, ...params: any[]): void;
  get(sql: string, ...params: any[]): any;
  all(sql: string, ...params: any[]): any[];
  exec(sql: string): void;
}

let _db: DbAdapter | null = null;
let _initPromise: Promise<DbAdapter> | null = null;

// ─── BETTER-SQLITE3 (local dev) ─────────────────────────────────────────────

function initBetterSqlite(): DbAdapter {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  const db = new Database(SOURCE_DB);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);

  return {
    run(sql: string, ...params: any[]) { db.prepare(sql).run(...params); },
    get(sql: string, ...params: any[]): any { return db.prepare(sql).get(...params); },
    all(sql: string, ...params: any[]): any[] { return db.prepare(sql).all(...params); },
    exec(sql: string) { db.exec(sql); },
  };
}

// ─── SQL.JS (Vercel serverless) ─────────────────────────────────────────────

async function initSqlJs(): Promise<DbAdapter> {
  const initSqlJsLib = (await import("sql.js")).default;
  const sqlJsDir = path.dirname(require.resolve("sql.js"));
  const SQL = await initSqlJsLib({
    locateFile: (file: string) => path.join(sqlJsDir, file),
  });
  let db: any;

  if (fs.existsSync(SOURCE_DB)) {
    const buffer = fs.readFileSync(SOURCE_DB);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
    db.run(schema);
  }

  return {
    run(sql: string, ...params: any[]) { db.run(sql, params); },
    get(sql: string, ...params: any[]): any {
      const stmt = db.prepare(sql);
      if (params.length) stmt.bind(params);
      if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row; }
      stmt.free();
      return undefined;
    },
    all(sql: string, ...params: any[]): any[] {
      const results: any[] = [];
      const stmt = db.prepare(sql);
      if (params.length) stmt.bind(params);
      while (stmt.step()) results.push(stmt.getAsObject());
      stmt.free();
      return results;
    },
    exec(sql: string) { db.run(sql); },
  };
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────────

export async function ensureDb(): Promise<DbAdapter> {
  if (_db) return _db;

  // Try better-sqlite3 first (local dev), fall back to sql.js (Vercel)
  try {
    _db = initBetterSqlite();
    return _db;
  } catch {
    if (!_initPromise) {
      _initPromise = initSqlJs().then((db) => { _db = db; return db; });
    }
    return _initPromise;
  }
}

export function getDb(): DbAdapter {
  if (_db) return _db;
  try {
    _db = initBetterSqlite();
    return _db;
  } catch {
    throw new Error("DB not initialized. Call await ensureDb() first.");
  }
}

// ─── AGENTS ─────────────────────────────────────────────────────────────────

export function getAllAgents(): Agent[] {
  const db = getDb();
  return db.all("SELECT * FROM agents ORDER BY created_at").map(parseAgent);
}

export function getAgent(id: string): Agent | null {
  const db = getDb();
  const row = db.get("SELECT * FROM agents WHERE id = ?", id);
  return row ? parseAgent(row) : null;
}

export function createAgent(agent: Omit<Agent, "tasks_completed" | "created_at">): Agent {
  const db = getDb();
  db.run(
    `INSERT INTO agents (id, name, avatar, skills, description, wallet_address, hourly_rate, reputation, api_key, endpoint_url, framework, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    agent.id, agent.name, agent.avatar, JSON.stringify(agent.skills), agent.description,
    agent.wallet_address, agent.hourly_rate, agent.reputation,
    agent.api_key || null, agent.endpoint_url || null, agent.framework || "custom", agent.status || "active"
  );
  logActivity("agent_registered", agent.id, null, `${agent.name} joined PaygenticArena`, { framework: agent.framework });
  return getAgent(agent.id)!;
}

export function getAgentByApiKey(apiKey: string): Agent | null {
  const db = getDb();
  const row = db.get("SELECT * FROM agents WHERE api_key = ? AND status = 'active'", apiKey);
  return row ? parseAgent(row) : null;
}

export function incrementTasksCompleted(agentId: string): void {
  getDb().run("UPDATE agents SET tasks_completed = tasks_completed + 1 WHERE id = ?", agentId);
}

function parseAgent(row: any): Agent {
  return { ...row, skills: typeof row.skills === "string" ? JSON.parse(row.skills) : row.skills };
}

// ─── TASKS ──────────────────────────────────────────────────────────────────

export function getAllTasks(): Task[] {
  return getDb().all("SELECT * FROM tasks ORDER BY created_at DESC") as Task[];
}

export function getTask(id: string): Task | null {
  return (getDb().get("SELECT * FROM tasks WHERE id = ?", id) as Task) || null;
}

export function getTasksByStatus(status: string): Task[] {
  return getDb().all("SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC", status) as Task[];
}

export function createTask(task: Pick<Task, "id" | "title" | "description" | "requester_id" | "skill_required" | "budget">): Task {
  const db = getDb();
  db.run(
    `INSERT INTO tasks (id, title, description, requester_id, skill_required, budget) VALUES (?, ?, ?, ?, ?, ?)`,
    task.id, task.title, task.description, task.requester_id, task.skill_required, task.budget
  );
  logActivity("task_created", task.requester_id, task.id, `New task: "${task.title}" (${task.budget} USDC)`);
  return getTask(task.id)!;
}

export function updateTaskStatus(taskId: string, status: string, extra?: { provider_id?: string; result?: string; tx_hash?: string; escrow_tx_hash?: string; escrow_status?: string }): Task {
  const db = getDb();
  const sets: string[] = ["status = ?"];
  const params: any[] = [status];
  if (extra?.provider_id) { sets.push("provider_id = ?"); params.push(extra.provider_id); }
  if (extra?.result) { sets.push("result = ?"); params.push(extra.result); }
  if (extra?.tx_hash) { sets.push("tx_hash = ?"); params.push(extra.tx_hash); }
  if (extra?.escrow_tx_hash) { sets.push("escrow_tx_hash = ?"); params.push(extra.escrow_tx_hash); }
  if (extra?.escrow_status) { sets.push("escrow_status = ?"); params.push(extra.escrow_status); }
  if (status === "paid") { sets.push("completed_at = CURRENT_TIMESTAMP"); }
  params.push(taskId);
  db.run(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, ...params);
  return getTask(taskId)!;
}

// ─── ACTIVITY LOG ───────────────────────────────────────────────────────────

export function logActivity(type: ActivityType | string, agentId: string | null, taskId: string | null, message: string, metadata?: Record<string, any>): void {
  getDb().run(
    `INSERT INTO activity_log (type, agent_id, task_id, message, metadata) VALUES (?, ?, ?, ?, ?)`,
    type, agentId, taskId, message, metadata ? JSON.stringify(metadata) : null
  );
}

export function getRecentActivity(limit = 50): ActivityLog[] {
  return getDb().all("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?", limit).map((r: any) => ({
    ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null,
  }));
}

// ─── STATS ──────────────────────────────────────────────────────────────────

export function getStats() {
  const db = getDb();
  const agentCount = (db.get("SELECT COUNT(*) as c FROM agents") as any).c;
  const taskCount = (db.get("SELECT COUNT(*) as c FROM tasks") as any).c;
  const completedCount = (db.get("SELECT COUNT(*) as c FROM tasks WHERE status = 'paid'") as any).c;
  const volume = (db.get("SELECT COALESCE(SUM(budget), 0) as v FROM tasks WHERE status = 'paid'") as any).v;
  const escrowLocked = (db.get("SELECT COALESCE(SUM(budget), 0) as v FROM tasks WHERE escrow_status = 'locked'") as any).v;
  const escrowReleased = (db.get("SELECT COALESCE(SUM(budget), 0) as v FROM tasks WHERE escrow_status = 'released'") as any).v;
  return {
    agentCount, taskCount, completedCount,
    volume: Math.round(volume * 100) / 100,
    escrowLocked: Math.round(escrowLocked * 100) / 100,
    escrowReleased: Math.round(escrowReleased * 100) / 100,
  };
}
