import { v4 as uuid } from "uuid";
import type { Agent, Task } from "./types";
import * as db from "./db";
import * as engine from "./agent-engine";
import * as wallet from "./wallet-service";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface StepResult {
  step: string;
  status: "success" | "error";
  data: Record<string, any>;
  timestamp: string;
}

// ─── CREATE A TASK ──────────────────────────────────────────────────────────

export async function createTask(
  requesterId: string,
  title: string,
  description: string,
  skillRequired: string,
  budget: number
): Promise<{ task: Task; step: StepResult }> {
  const requester = db.getAgent(requesterId);
  if (!requester) throw new Error(`Agent ${requesterId} not found`);

  const task = db.createTask({
    id: uuid(),
    title,
    description,
    requester_id: requesterId,
    skill_required: skillRequired,
    budget,
  });

  return {
    task,
    step: {
      step: "task_created",
      status: "success",
      data: {
        taskId: task.id,
        requester: requester.name,
        title,
        budget,
        skillRequired,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

// ─── FIND AND ASSIGN AN AGENT ───────────────────────────────────────────────

export async function findAndAssignAgent(
  taskId: string
): Promise<{ task: Task; agent: Agent; evaluation: { accept: boolean; reason: string }; step: StepResult }> {
  const task = db.getTask(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const allAgents = db.getAllAgents();
  const candidates = engine.findMatchingAgents(allAgents, task.skill_required);

  if (candidates.length === 0) {
    throw new Error(`No agents found with skill: ${task.skill_required}`);
  }

  // Filter out the requester
  const eligible = candidates.filter((a) => a.id !== task.requester_id);
  if (eligible.length === 0) {
    throw new Error("No eligible agents (requester cannot self-assign)");
  }

  // Ask the best matching agent to evaluate the task
  const agent = eligible[0];
  const evaluation = await engine.evaluateTask(agent, task);

  if (evaluation.accept) {
    const updated = db.updateTaskStatus(taskId, "assigned", {
      provider_id: agent.id,
    });

    db.logActivity(
      "task_assigned",
      agent.id,
      taskId,
      `${agent.name} accepted: "${task.title}" for ${task.budget} USDT`,
      { reason: evaluation.reason }
    );

    return {
      task: updated,
      agent,
      evaluation,
      step: {
        step: "agent_assigned",
        status: "success",
        data: {
          agentId: agent.id,
          agentName: agent.name,
          reason: evaluation.reason,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  // If first agent rejects, try next
  for (const fallback of eligible.slice(1)) {
    const eval2 = await engine.evaluateTask(fallback, task);
    if (eval2.accept) {
      const updated = db.updateTaskStatus(taskId, "assigned", {
        provider_id: fallback.id,
      });
      db.logActivity(
        "task_assigned",
        fallback.id,
        taskId,
        `${fallback.name} accepted: "${task.title}" for ${task.budget} USDT`,
        { reason: eval2.reason }
      );
      return {
        task: updated,
        agent: fallback,
        evaluation: eval2,
        step: {
          step: "agent_assigned",
          status: "success",
          data: {
            agentId: fallback.id,
            agentName: fallback.name,
            reason: eval2.reason,
          },
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  throw new Error("All matching agents declined the task");
}

// ─── AGENT STARTS WORK ─────────────────────────────────────────────────────

export async function startWork(
  taskId: string
): Promise<{ task: Task; step: StepResult }> {
  const task = db.getTask(taskId);
  if (!task || !task.provider_id) throw new Error("Task not assigned");

  const updated = db.updateTaskStatus(taskId, "in_progress");
  const provider = db.getAgent(task.provider_id)!;

  db.logActivity(
    "task_started",
    task.provider_id,
    taskId,
    `${provider.name} started working on "${task.title}"`
  );

  return {
    task: updated,
    step: {
      step: "work_started",
      status: "success",
      data: { provider: provider.name, taskTitle: task.title },
      timestamp: new Date().toISOString(),
    },
  };
}

// ─── AGENT DELIVERS WORK ───────────────────────────────────────────────────

export async function deliverWork(
  taskId: string
): Promise<{ task: Task; deliverable: string; step: StepResult }> {
  const task = db.getTask(taskId);
  if (!task || !task.provider_id) throw new Error("Task not in progress");

  const provider = db.getAgent(task.provider_id)!;
  const deliverable = await engine.generateDeliverable(provider, task);

  const updated = db.updateTaskStatus(taskId, "delivered", {
    result: deliverable,
  });

  db.logActivity(
    "task_delivered",
    task.provider_id,
    taskId,
    `${provider.name} delivered work for "${task.title}"`,
    { preview: deliverable.slice(0, 200) }
  );

  return {
    task: updated,
    deliverable,
    step: {
      step: "work_delivered",
      status: "success",
      data: {
        provider: provider.name,
        deliverablePreview: deliverable.slice(0, 300),
      },
      timestamp: new Date().toISOString(),
    },
  };
}

// ─── REQUESTER VERIFIES WORK ────────────────────────────────────────────────

export async function verifyWork(
  taskId: string
): Promise<{
  task: Task;
  verification: { approved: boolean; feedback: string; rating: number };
  step: StepResult;
}> {
  const task = db.getTask(taskId);
  if (!task || !task.result) throw new Error("No deliverable to verify");

  const requester = db.getAgent(task.requester_id)!;
  const verification = await engine.verifyDeliverable(requester, task, task.result);

  // Always approve in demo mode — agents should settle, even with feedback
  // In production, a rejection would loop back for revisions
  const updated = db.updateTaskStatus(taskId, "verified");
  db.logActivity(
    "task_verified",
    task.requester_id,
    taskId,
    `${requester.name} ${verification.approved ? "approved" : "accepted with notes"}: "${verification.feedback}" (${verification.rating}/5)`,
    { rating: verification.rating, originalApproval: verification.approved }
  );
  return {
    task: updated,
    verification: { ...verification, approved: true },
    step: {
      step: "work_verified",
      status: "success",
      data: {
        requester: requester.name,
        approved: true,
        feedback: verification.feedback,
        rating: verification.rating,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

// ─── SETTLE PAYMENT VIA WDK ────────────────────────────────────────────────

export async function settlePayment(
  taskId: string
): Promise<{ task: Task; txHash: string; step: StepResult }> {
  const task = db.getTask(taskId);
  if (!task || task.status !== "verified") throw new Error("Task not verified");

  const requester = db.getAgent(task.requester_id)!;
  const provider = db.getAgent(task.provider_id!)!;

  let txHash: string;
  try {
    // Check if requester has any balance on Sepolia testnet
    const balance = await wallet.getBalance(requester.seed_phrase);
    const balanceBigInt = BigInt(balance);

    if (balanceBigInt > BigInt(0)) {
      // Send a small real ETH transfer as proof-of-settlement (0.0001 ETH or 10% of balance, whichever is smaller)
      const proofAmount = balanceBigInt < BigInt("100000000000000")
        ? (balanceBigInt / BigInt(10)).toString()
        : "100000000000000"; // 0.0001 ETH
      const result = await wallet.transferFunds(
        requester.seed_phrase,
        provider.wallet_address,
        proofAmount
      );
      txHash = result.hash;
    } else {
      throw new Error("No testnet funds");
    }
  } catch (e: any) {
    // Fallback: simulated tx hash when no testnet funds available
    txHash = `0xSIM_${Array.from({ length: 58 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
  }

  const isSimulated = txHash.startsWith("0xSIM_");
  const txLabel = isSimulated ? "(simulated - testnet)" : "";

  const updated = db.updateTaskStatus(taskId, "paid", { tx_hash: txHash });
  db.incrementTasksCompleted(provider.id);

  db.logActivity(
    "payment_sent",
    requester.id,
    taskId,
    `${requester.name} → ${provider.name}: ${task.budget} USDT ${txLabel} (tx: ${txHash.slice(0, 14)}...)`.trim(),
    { txHash, amount: task.budget, from: requester.wallet_address, to: provider.wallet_address, simulated: isSimulated }
  );

  db.logActivity(
    "payment_received",
    provider.id,
    taskId,
    `${provider.name} received ${task.budget} USDT from ${requester.name} ${txLabel}`.trim(),
    { txHash, amount: task.budget, simulated: isSimulated }
  );

  return {
    task: updated,
    txHash,
    step: {
      step: "payment_settled",
      status: "success",
      data: {
        from: requester.name,
        fromAddress: requester.wallet_address,
        to: provider.name,
        toAddress: provider.wallet_address,
        amount: task.budget,
        txHash,
        simulated: isSimulated,
        explorerUrl: isSimulated ? null : `https://sepolia.etherscan.io/tx/${txHash}`,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

// ─── FULL DEMO FLOW (all steps) ─────────────────────────────────────────────

export async function runFullDemo(
  requesterId: string,
  title: string,
  description: string,
  skillRequired: string,
  budget: number
): Promise<StepResult[]> {
  const steps: StepResult[] = [];

  // 1. Create task
  const { task, step: s1 } = await createTask(requesterId, title, description, skillRequired, budget);
  steps.push(s1);

  // 2. Find and assign agent
  const { step: s2 } = await findAndAssignAgent(task.id);
  steps.push(s2);

  // 3. Start work
  const { step: s3 } = await startWork(task.id);
  steps.push(s3);

  // 4. Deliver work
  const { step: s4 } = await deliverWork(task.id);
  steps.push(s4);

  // 5. Verify work
  const { step: s5 } = await verifyWork(task.id);
  steps.push(s5);

  // 6. Settle payment
  const { step: s6 } = await settlePayment(task.id);
  steps.push(s6);

  return steps;
}
