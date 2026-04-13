import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const TEST_DB = path.join(process.cwd(), "db", "test.db");
const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

function getTestDb() {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  const db = new Database(TEST_DB);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf-8"));
  return db;
}

describe("Database Schema", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getTestDb();
  });

  it("creates agents table", () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'").all();
    expect(tables).toHaveLength(1);
  });

  it("creates tasks table", () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").all();
    expect(tables).toHaveLength(1);
  });

  it("creates activity_log table", () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_log'").all();
    expect(tables).toHaveLength(1);
  });

  it("inserts and retrieves an agent", () => {
    db.prepare(
      "INSERT INTO agents (id, name, avatar, skills, wallet_address, hourly_rate, reputation) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("test-1", "TestBot", "🤖", '["Testing"]', "0x123", 10, 5.0);

    const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get("test-1") as any;
    expect(agent.name).toBe("TestBot");
    expect(agent.avatar).toBe("🤖");
    expect(JSON.parse(agent.skills)).toEqual(["Testing"]);
    expect(agent.wallet_address).toBe("0x123");
    expect(agent.hourly_rate).toBe(10);
    expect(agent.reputation).toBe(5.0);
  });

  it("inserts and retrieves a task", () => {
    db.prepare(
      "INSERT INTO agents (id, name, avatar, skills, wallet_address) VALUES (?, ?, ?, ?, ?)"
    ).run("agent-1", "Agent", "🤖", "[]", "0x1");

    db.prepare(
      "INSERT INTO tasks (id, title, description, requester_id, skill_required, budget) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("task-1", "Test Task", "Do something", "agent-1", "Testing", 25);

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get("task-1") as any;
    expect(task.title).toBe("Test Task");
    expect(task.requester_id).toBe("agent-1");
    expect(task.budget).toBe(25);
    expect(task.status).toBe("open");
  });

  it("updates task status", () => {
    db.prepare("INSERT INTO agents (id, name, avatar, skills, wallet_address) VALUES (?, ?, ?, ?, ?)").run("a1", "A", "🤖", "[]", "0x1");
    db.prepare("INSERT INTO tasks (id, title, requester_id, skill_required, budget) VALUES (?, ?, ?, ?, ?)").run("t1", "Task", "a1", "Skill", 10);

    db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run("in_progress", "t1");
    const task = db.prepare("SELECT status FROM tasks WHERE id = ?").get("t1") as any;
    expect(task.status).toBe("in_progress");
  });

  it("inserts and retrieves activity log entries", () => {
    db.prepare("INSERT INTO activity_log (type, agent_id, message) VALUES (?, ?, ?)").run("agent_registered", "a1", "Agent joined");

    const logs = db.prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 1").all() as any[];
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe("agent_registered");
    expect(logs[0].message).toBe("Agent joined");
  });

  it("enforces task status defaults to open", () => {
    db.prepare("INSERT INTO agents (id, name, avatar, skills, wallet_address) VALUES (?, ?, ?, ?, ?)").run("a2", "B", "🤖", "[]", "0x2");
    db.prepare("INSERT INTO tasks (id, title, requester_id, skill_required, budget) VALUES (?, ?, ?, ?, ?)").run("t2", "Task2", "a2", "Skill", 5);

    const task = db.prepare("SELECT status FROM tasks WHERE id = ?").get("t2") as any;
    expect(task.status).toBe("open");
  });

  it("stores and parses JSON metadata in activity log", () => {
    const meta = JSON.stringify({ rating: 4.5, txHash: "0xabc" });
    db.prepare("INSERT INTO activity_log (type, agent_id, message, metadata) VALUES (?, ?, ?, ?)").run("payment_sent", "a1", "Paid", meta);

    const log = db.prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 1").get() as any;
    const parsed = JSON.parse(log.metadata);
    expect(parsed.rating).toBe(4.5);
    expect(parsed.txHash).toBe("0xabc");
  });

  it("tracks tasks_completed counter", () => {
    db.prepare("INSERT INTO agents (id, name, avatar, skills, wallet_address, tasks_completed) VALUES (?, ?, ?, ?, ?, ?)").run("a3", "C", "🤖", "[]", "0x3", 0);

    db.prepare("UPDATE agents SET tasks_completed = tasks_completed + 1 WHERE id = ?").run("a3");
    db.prepare("UPDATE agents SET tasks_completed = tasks_completed + 1 WHERE id = ?").run("a3");

    const agent = db.prepare("SELECT tasks_completed FROM agents WHERE id = ?").get("a3") as any;
    expect(agent.tasks_completed).toBe(2);
  });
});
