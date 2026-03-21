import { NextResponse } from "next/server";
import * as taskManager from "@/lib/task-manager";
import { getAllAgents } from "@/lib/db";

// Run the full demo flow step by step
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { step, taskId, requesterId, title, description, skillRequired, budget } = body;

    // If no step specified, run the full demo
    if (!step) {
      const agents = getAllAgents();
      if (agents.length === 0) {
        return NextResponse.json({ error: "No agents registered. Run seed first." }, { status: 400 });
      }

      const reqId = requesterId || agents[0].id;
      const steps = await taskManager.runFullDemo(
        reqId,
        title || "Review smart contract for reentrancy vulnerabilities",
        description || "Perform a thorough security audit of the staking contract. Check for reentrancy, integer overflow, access control issues, and gas optimization opportunities.",
        skillRequired || "Smart Contract Audit",
        budget || 25
      );

      return NextResponse.json({ steps });
    }

    // Step-by-step mode
    let result;
    switch (step) {
      case "create":
        result = await taskManager.createTask(
          requesterId,
          title,
          description,
          skillRequired,
          budget
        );
        break;
      case "assign":
        result = await taskManager.findAndAssignAgent(taskId);
        break;
      case "start":
        result = await taskManager.startWork(taskId);
        break;
      case "deliver":
        result = await taskManager.deliverWork(taskId);
        break;
      case "verify":
        result = await taskManager.verifyWork(taskId);
        break;
      case "pay":
        result = await taskManager.settlePayment(taskId);
        break;
      default:
        return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
