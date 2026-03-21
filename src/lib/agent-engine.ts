import OpenAI from "openai";
import type { Agent, Task } from "./types";

let _client: OpenAI | null = null;

function getLLM(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _client;
}

const MODEL = "llama-3.3-70b-versatile";

// ─── AGENT PERSONALITIES ────────────────────────────────────────────────────

const PERSONALITIES: Record<string, string> = {
  atlas: "You are Atlas, a meticulous market researcher and data analyst. You approach tasks methodically, always backing claims with data. You speak concisely and professionally.",
  nova: "You are Nova, a sharp code reviewer and bug hunter. You have deep expertise in Solidity, TypeScript, and system architecture. You are direct and technical in your responses.",
  sage: "You are Sage, a creative content writer and SEO specialist. You craft compelling narratives and understand what makes content resonate. You are articulate and persuasive.",
  cipher: "You are Cipher, a security-focused smart contract auditor. You think adversarially and catch vulnerabilities others miss. You are thorough and precise.",
  pixel: "You are Pixel, an intuitive UI/UX designer and prototyper. You think in user flows and visual hierarchies. You are creative and detail-oriented.",
};

// ─── DECISION: SHOULD AGENT ACCEPT A TASK? ──────────────────────────────────

export async function evaluateTask(
  agent: Agent,
  task: Pick<Task, "title" | "description" | "skill_required" | "budget">
): Promise<{ accept: boolean; reason: string }> {
  const personality = PERSONALITIES[agent.id] || `You are ${agent.name}, an AI agent with skills in ${agent.skills.join(", ")}.`;

  const response = await getLLM().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `${personality}\n\nYou are operating in AgentVerse, an agent-to-agent marketplace. You must decide whether to accept a task based on your skills, the offered budget, and whether the task aligns with your expertise. Respond with JSON only.`,
      },
      {
        role: "user",
        content: `A task has been posted:\n\nTitle: ${task.title}\nDescription: ${task.description}\nSkill Required: ${task.skill_required}\nBudget: ${task.budget} USDT\n\nYour skills: ${agent.skills.join(", ")}\nYour rate: ${agent.hourly_rate} USDT/task\n\nShould you accept this task? Respond with:\n{"accept": true/false, "reason": "brief explanation (1-2 sentences)"}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 150,
    response_format: { type: "json_object" },
  });

  try {
    const content = response.choices[0].message.content || '{"accept": false, "reason": "No response"}';
    return JSON.parse(content);
  } catch {
    return { accept: true, reason: "Task aligns with my skillset." };
  }
}

// ─── DELIVER: AGENT PRODUCES WORK OUTPUT ────────────────────────────────────

export async function generateDeliverable(
  agent: Agent,
  task: Pick<Task, "title" | "description" | "skill_required">
): Promise<string> {
  const personality = PERSONALITIES[agent.id] || `You are ${agent.name}, an AI agent with skills in ${agent.skills.join(", ")}.`;

  const response = await getLLM().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `${personality}\n\nYou have accepted a task on AgentVerse. Produce a high-quality deliverable. Be concise but thorough. Format your output as a professional report or analysis appropriate to the task.`,
      },
      {
        role: "user",
        content: `Complete this task:\n\nTitle: ${task.title}\nDescription: ${task.description}\nSkill Required: ${task.skill_required}\n\nProvide your deliverable below. Keep it under 500 words but make it substantive and actionable.`,
      },
    ],
    temperature: 0.8,
    max_tokens: 800,
  });

  return response.choices[0].message.content || "Deliverable could not be generated.";
}

// ─── VERIFY: REQUESTER EVALUATES DELIVERED WORK ─────────────────────────────

export async function verifyDeliverable(
  requester: Agent,
  task: Pick<Task, "title" | "description">,
  deliverable: string
): Promise<{ approved: boolean; feedback: string; rating: number }> {
  const personality = PERSONALITIES[requester.id] || `You are ${requester.name}, an AI agent reviewing delivered work.`;

  const response = await getLLM().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `${personality}\n\nYou requested a task on AgentVerse and the provider has delivered. Evaluate the quality of the work. Be fair but maintain high standards. Respond with JSON only.`,
      },
      {
        role: "user",
        content: `You requested:\nTitle: ${task.title}\nDescription: ${task.description}\n\nThe provider delivered:\n${deliverable}\n\nEvaluate this deliverable. Respond with:\n{"approved": true/false, "feedback": "brief evaluation (1-2 sentences)", "rating": 1-5}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  try {
    const content = response.choices[0].message.content || '{"approved": true, "feedback": "Satisfactory work.", "rating": 4}';
    return JSON.parse(content);
  } catch {
    return { approved: true, feedback: "Work meets requirements.", rating: 4 };
  }
}

// ─── FIND BEST AGENT FOR A TASK ─────────────────────────────────────────────

export function findMatchingAgents(agents: Agent[], skillRequired: string): Agent[] {
  // First try exact skill match
  const exact = agents.filter((agent) =>
    agent.skills.some(
      (skill) =>
        skill.toLowerCase().includes(skillRequired.toLowerCase()) ||
        skillRequired.toLowerCase().includes(skill.toLowerCase())
    )
  );
  if (exact.length > 0) return exact;

  // Fallback: return all agents sorted by reputation (any agent can attempt)
  return [...agents].sort((a, b) => b.reputation - a.reputation);
}

// ─── AGENT NEGOTIATION (for demo narration) ─────────────────────────────────

export async function generateNarration(
  event: string,
  context: Record<string, any>
): Promise<string> {
  const response = await getLLM().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "You are a narrator for AgentVerse, an AI agent-to-agent marketplace. Describe what is happening in 1-2 short, punchy sentences. Use present tense. Be technical but accessible. No fluff.",
      },
      {
        role: "user",
        content: `Event: ${event}\nContext: ${JSON.stringify(context)}\n\nNarrate this event.`,
      },
    ],
    temperature: 0.9,
    max_tokens: 100,
  });

  return response.choices[0].message.content || event;
}
