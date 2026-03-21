import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { Agent, Task, ActivityLog, ActivityType } from "./types";

const DB_PATH = path.join(process.cwd(), "db", "agentverse.db");
const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");

    // Run schema
    const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
    _db.exec(schema);
  }
  return _db;
}

// ─── AGENTS ─────────────────────────────────────────────────────────────────

export function getAllAgents(): Agent[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM agents ORDER BY created_at").all() as any[];
  return rows.map(parseAgent);
}

export function getAgent(id: string): Agent | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as any;
  return row ? parseAgent(row) : null;
}

export function createAgent(agent: Omit<Agent, "tasks_completed" | "created_at">): Agent {
  const db = getDb();
  db.prepare(`
    INSERT INTO agents (id, name, avatar, skills, description, wallet_address, seed_phrase, hourly_rate, reputation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    agent.id,
    agent.name,
    agent.avatar,
    JSON.stringify(agent.skills),
    agent.description,
    agent.wallet_address,
    agent.seed_phrase,
    agent.hourly_rate,
    agent.reputation
  );

  logActivity("agent_registered", agent.id, null, `${agent.name} joined AgentVerse`);
  return getAgent(agent.id)!;
}

export function incrementTasksCompleted(agentId: string): void {
  const db = getDb();
  db.prepare("UPDATE agents SET tasks_completed = tasks_completed + 1 WHERE id = ?").run(agentId);
}

function parseAgent(row: any): Agent {
  return {
    ...row,
    skills: JSON.parse(row.skills),
  };
}

// ─── TASKS ──────────────────────────────────────────────────────────────────

export function getAllTasks(): Task[] {
  const db = getDb();
  return db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all() as Task[];
}

export function getTask(id: string): Task | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task) || null;
}

export function getTasksByStatus(status: string): Task[] {
  const db = getDb();
  return db.prepare("SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC").all(status) as Task[];
}

export function createTask(task: Pick<Task, "id" | "title" | "description" | "requester_id" | "skill_required" | "budget">): Task {
  const db = getDb();
  db.prepare(`
    INSERT INTO tasks (id, title, description, requester_id, skill_required, budget)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(task.id, task.title, task.description, task.requester_id, task.skill_required, task.budget);

  logActivity("task_created", task.requester_id, task.id, `New task: "${task.title}" (${task.budget} USDT)`);
  return getTask(task.id)!;
}

export function updateTaskStatus(
  taskId: string,
  status: string,
  extra?: { provider_id?: string; result?: string; tx_hash?: string }
): Task {
  const db = getDb();
  const sets: string[] = ["status = ?"];
  const params: any[] = [status];

  if (extra?.provider_id) {
    sets.push("provider_id = ?");
    params.push(extra.provider_id);
  }
  if (extra?.result) {
    sets.push("result = ?");
    params.push(extra.result);
  }
  if (extra?.tx_hash) {
    sets.push("tx_hash = ?");
    params.push(extra.tx_hash);
  }
  if (status === "paid") {
    sets.push("completed_at = CURRENT_TIMESTAMP");
  }

  params.push(taskId);
  db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  return getTask(taskId)!;
}

// ─── ACTIVITY LOG ───────────────────────────────────────────────────────────

export function logActivity(
  type: ActivityType | string,
  agentId: string | null,
  taskId: string | null,
  message: string,
  metadata?: Record<string, any>
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO activity_log (type, agent_id, task_id, message, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(type, agentId, taskId, message, metadata ? JSON.stringify(metadata) : null);
}

export function getRecentActivity(limit = 50): ActivityLog[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?"
  ).all(limit) as any[];
  return rows.map((r) => ({
    ...r,
    metadata: r.metadata ? JSON.parse(r.metadata) : null,
  }));
}

// ─── STATS ──────────────────────────────────────────────────────────────────

export function getStats() {
  const db = getDb();
  const agentCount = (db.prepare("SELECT COUNT(*) as c FROM agents").get() as any).c;
  const taskCount = (db.prepare("SELECT COUNT(*) as c FROM tasks").get() as any).c;
  const completedCount = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'paid'").get() as any).c;
  const volume = (db.prepare("SELECT COALESCE(SUM(budget), 0) as v FROM tasks WHERE status = 'paid'").get() as any).v;

  return {
    agentCount,
    taskCount,
    completedCount,
    volume: Math.round(volume * 100) / 100,
  };
}
