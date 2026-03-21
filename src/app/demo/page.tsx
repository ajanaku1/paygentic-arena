"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const mono = { fontFamily: '"JetBrains Mono", "Fira Code", monospace' };

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface StepResult {
  step: string;
  status: "success" | "error";
  data: Record<string, any>;
  timestamp: string;
}

interface DemoStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  apiAction: string;
  status: "pending" | "running" | "completed" | "error";
  result?: StepResult;
}

// ─── DEMO SCENARIOS ─────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: "audit",
    title: "Smart Contract Audit",
    requester: "atlas",
    requesterName: "Atlas",
    requesterAvatar: "🌐",
    taskTitle: "Audit staking contract for security vulnerabilities",
    taskDescription: "Perform a thorough security audit of the StakeVault contract. Check for reentrancy, integer overflow, access control issues, flash loan attack vectors, and gas optimization opportunities. Provide a detailed report with severity ratings.",
    skillRequired: "Smart Contract Audit",
    budget: 45,
    expectedProvider: "Cipher",
    expectedProviderAvatar: "🔐",
  },
  {
    id: "review",
    title: "Code Review",
    requester: "atlas",
    requesterName: "Atlas",
    requesterAvatar: "🌐",
    taskTitle: "Review TypeScript SDK for type safety and edge cases",
    taskDescription: "Review the WDK integration module for proper error handling, type safety, and edge cases. Focus on transaction failure recovery, seed phrase validation, and concurrent wallet operations.",
    skillRequired: "Code Review",
    budget: 15,
    expectedProvider: "Nova",
    expectedProviderAvatar: "⚡",
  },
  {
    id: "content",
    title: "Documentation Writing",
    requester: "atlas",
    requesterName: "Atlas",
    requesterAvatar: "🌐",
    taskTitle: "Write developer docs for the AgentVerse API",
    taskDescription: "Create comprehensive API documentation covering all endpoints: /api/agents, /api/tasks, /api/demo. Include request/response examples, authentication notes, and error handling patterns.",
    skillRequired: "Content Writing",
    budget: 8,
    expectedProvider: "Sage",
    expectedProviderAvatar: "📝",
  },
];

const INITIAL_STEPS: DemoStep[] = [
  { id: 0, title: "Create Task", description: "Requester posts a task with skill requirements and USDT budget", icon: "📋", apiAction: "create", status: "pending" },
  { id: 1, title: "Agent Discovery", description: "System finds matching agents and asks them to evaluate the task via LLM", icon: "🔍", apiAction: "assign", status: "pending" },
  { id: 2, title: "Work Begins", description: "Agent accepts and starts working on the deliverable", icon: "⚙️", apiAction: "start", status: "pending" },
  { id: 3, title: "Deliver Work", description: "Agent produces a deliverable using LLM-powered reasoning", icon: "📦", apiAction: "deliver", status: "pending" },
  { id: 4, title: "Verify Quality", description: "Requester evaluates the deliverable and rates the work", icon: "✅", apiAction: "verify", status: "pending" },
  { id: 5, title: "Settle Payment", description: "USDT transfers on-chain via WDK from requester to provider", icon: "💰", apiAction: "pay", status: "pending" },
];

// ─── PAGE ───────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [steps, setSteps] = useState<DemoStep[]>(INITIAL_STEPS.map((s) => ({ ...s })));
  const [currentStep, setCurrentStep] = useState(-1);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const resetDemo = () => {
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setCurrentStep(-1);
    setTaskId(null);
    setIsRunning(false);
    setIsComplete(false);
    setLogs([]);
  };

  const changeScenario = (s: typeof SCENARIOS[number]) => {
    setScenario(s);
    resetDemo();
  };

  const runStep = async (stepIndex: number) => {
    setSteps((prev) => prev.map((s, i) => (i === stepIndex ? { ...s, status: "running" } : s)));
    setCurrentStep(stepIndex);

    const step = INITIAL_STEPS[stepIndex];

    try {
      let body: Record<string, any>;

      if (stepIndex === 0) {
        // Create task
        addLog(`POST /api/demo { step: "create", requesterId: "${scenario.requester}" }`);
        body = {
          step: "create",
          requesterId: scenario.requester,
          title: scenario.taskTitle,
          description: scenario.taskDescription,
          skillRequired: scenario.skillRequired,
          budget: scenario.budget,
        };
      } else {
        addLog(`POST /api/demo { step: "${step.apiAction}", taskId: "${taskId}" }`);
        body = {
          step: step.apiAction,
          taskId,
        };
      }

      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Request failed");

      // Extract task ID from create step
      if (stepIndex === 0 && data.task?.id) {
        setTaskId(data.task.id);
        addLog(`✓ Task created: ${data.task.id.slice(0, 8)}...`);
      }

      // Log step-specific details
      const result = data.step || data;
      if (result.data) {
        Object.entries(result.data).forEach(([k, v]) => {
          if (typeof v === "string" && v.length > 100) {
            addLog(`  ${k}: "${(v as string).slice(0, 100)}..."`);
          } else {
            addLog(`  ${k}: ${JSON.stringify(v)}`);
          }
        });
      }

      addLog(`✓ Step completed: ${step.title}`);

      setSteps((prev) =>
        prev.map((s, i) => (i === stepIndex ? { ...s, status: "completed", result } : s))
      );

      return data;
    } catch (e: any) {
      addLog(`✗ Error: ${e.message}`);
      setSteps((prev) =>
        prev.map((s, i) => (i === stepIndex ? { ...s, status: "error" } : s))
      );
      throw e;
    }
  };

  const runAll = async () => {
    setIsRunning(true);
    resetDemo();
    setIsRunning(true);
    addLog(`▶ Starting demo: "${scenario.title}"`);
    addLog(`  Requester: ${scenario.requesterName} | Skill: ${scenario.skillRequired} | Budget: ${scenario.budget} USDT`);
    addLog("");

    try {
      for (let i = 0; i < INITIAL_STEPS.length; i++) {
        await runStep(i);
        // Pause between steps for dramatic effect
        if (i < INITIAL_STEPS.length - 1) {
          await new Promise((r) => setTimeout(r, 1000));
          addLog("");
        }
      }
      addLog("");
      addLog("═══════════════════════════════════════");
      addLog("✓ DEMO COMPLETE — Full lifecycle executed");
      addLog("  Task → Assignment → Delivery → Verification → Payment");
      addLog("═══════════════════════════════════════");
      setIsComplete(true);
    } catch {
      addLog("✗ Demo halted due to error");
    }

    setIsRunning(false);
  };

  const runSingleStep = async () => {
    const nextStep = steps.findIndex((s) => s.status === "pending");
    if (nextStep === -1) return;

    setIsRunning(true);

    if (nextStep === 0) {
      addLog(`▶ Starting demo: "${scenario.title}"`);
      addLog(`  Requester: ${scenario.requesterName} | Skill: ${scenario.skillRequired} | Budget: ${scenario.budget} USDT`);
      addLog("");
    }

    try {
      await runStep(nextStep);
      if (nextStep === INITIAL_STEPS.length - 1) {
        addLog("");
        addLog("═══════════════════════════════════════");
        addLog("✓ DEMO COMPLETE");
        addLog("═══════════════════════════════════════");
        setIsComplete(true);
      }
    } catch {
      // error already logged
    }

    setIsRunning(false);
  };

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* ─── LEFT: DEMO CONTROLS ─────────────────────────────────────── */}
      <div className="w-[55%] border-r border-[#1e1e2e] flex flex-col overflow-y-auto">
        <div className="p-6 flex flex-col gap-6">
          {/* Header */}
          <div>
            <p className="text-emerald-400 text-xs tracking-[0.3em] uppercase mb-2" style={mono}>
              ◆ Interactive Demo
            </p>
            <h1 className="text-2xl font-bold mb-1" style={mono}>
              Agent-to-Agent Transaction
            </h1>
            <p className="text-[#8888a0] text-xs" style={mono}>
              Watch autonomous AI agents negotiate, deliver work, and settle payment on-chain.
            </p>
          </div>

          {/* Scenario Selector */}
          <div>
            <p className="text-[#8888a0] text-[10px] uppercase tracking-widest mb-3" style={mono}>
              ◇ Select Scenario
            </p>
            <div className="flex gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => changeScenario(s)}
                  disabled={isRunning}
                  className={`flex-1 px-3 py-2.5 rounded border text-xs text-left transition-all cursor-pointer ${
                    scenario.id === s.id
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : "border-[#1e1e2e] bg-[#0d1117] text-[#8888a0] hover:border-[#2e2e3e]"
                  } disabled:opacity-50`}
                  style={mono}
                >
                  <span className="block font-medium">{s.title}</span>
                  <span className="block text-[10px] mt-0.5 opacity-70">
                    {s.requesterAvatar} {s.requesterName} → {s.expectedProviderAvatar} {s.expectedProvider} · {s.budget} USDT
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Task Preview */}
          <div className="border border-[#1e1e2e] rounded-lg p-4 bg-[#0d1117]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#8888a0] uppercase tracking-widest" style={mono}>Task Details</span>
              <span className="text-emerald-400 text-xs font-bold" style={mono}>{scenario.budget} USDT</span>
            </div>
            <h3 className="text-[#e4e4ef] text-sm font-medium mb-1" style={mono}>{scenario.taskTitle}</h3>
            <p className="text-[#8888a0] text-[11px] leading-relaxed" style={mono}>{scenario.taskDescription}</p>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#1e1e2e]">
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#1e1e2e] text-[#8888a0] bg-[#0a0a0f]" style={mono}>
                {scenario.skillRequired}
              </span>
              <span className="text-[#555568] text-[10px]" style={mono}>
                Requester: {scenario.requesterAvatar} {scenario.requesterName}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={runAll}
              disabled={isRunning || isComplete}
              className="px-6 py-2.5 bg-emerald-500 text-[#0a0a0f] font-bold text-xs rounded tracking-wider uppercase cursor-pointer hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={mono}
            >
              {isRunning ? "Running..." : isComplete ? "Complete" : "▶ Run All Steps"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={runSingleStep}
              disabled={isRunning || isComplete}
              className="px-6 py-2.5 border border-[#1e1e2e] text-[#e4e4ef] font-medium text-xs rounded tracking-wider uppercase cursor-pointer hover:border-emerald-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={mono}
            >
              Step →
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetDemo}
              disabled={isRunning}
              className="px-6 py-2.5 border border-[#1e1e2e] text-[#8888a0] font-medium text-xs rounded tracking-wider uppercase cursor-pointer hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={mono}
            >
              Reset
            </motion.button>
          </div>

          {/* Step Progress */}
          <div className="space-y-2">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0.5 }}
                animate={{
                  opacity: step.status === "pending" ? 0.5 : 1,
                  scale: step.status === "running" ? 1.01 : 1,
                }}
                className={`border rounded-lg p-4 transition-all ${
                  step.status === "running"
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : step.status === "completed"
                    ? "border-emerald-500/20 bg-[#0d1117]"
                    : step.status === "error"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-[#1e1e2e] bg-[#0d1117]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status Indicator */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0">
                    {step.status === "running" ? (
                      <span className="animate-spin text-emerald-400">⟳</span>
                    ) : step.status === "completed" ? (
                      <span className="text-emerald-400">✓</span>
                    ) : step.status === "error" ? (
                      <span className="text-red-400">✗</span>
                    ) : (
                      <span className="opacity-40">{step.icon}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${
                          step.status === "completed" ? "text-emerald-400" :
                          step.status === "running" ? "text-[#e4e4ef]" :
                          step.status === "error" ? "text-red-400" :
                          "text-[#8888a0]"
                        }`}
                        style={mono}
                      >
                        {step.title}
                      </span>
                      <span className="text-[#555568] text-[10px]" style={mono}>
                        Step {i + 1}/6
                      </span>
                    </div>
                    <p className="text-[#555568] text-[10px] mt-0.5" style={mono}>
                      {step.description}
                    </p>
                  </div>

                  {/* Step result badge */}
                  {step.result?.data && (
                    <div className="shrink-0">
                      {step.result.data.txHash && (
                        step.result.data.explorerUrl ? (
                          <a
                            href={step.result.data.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors underline decoration-emerald-400/30"
                            style={mono}
                          >
                            ✓ tx: {step.result.data.txHash.slice(0, 10)}... ↗
                          </a>
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-medium" style={mono}>
                            sim: {step.result.data.txHash.slice(0, 14)}...
                          </span>
                        )
                      )}
                      {step.result.data.agentName && !step.result.data.txHash && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium" style={mono}>
                          {step.result.data.agentName}
                        </span>
                      )}
                      {step.result.data.rating && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-medium ml-1" style={mono}>
                          {step.result.data.rating}/5 ★
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded result for completed steps */}
                <AnimatePresence>
                  {step.status === "completed" && step.result?.data && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-[#1e1e2e]/60 space-y-1">
                        {Object.entries(step.result.data).map(([k, v]) => {
                          if (k === "explorerUrl" && v) {
                            return (
                              <div key={k} className="flex gap-2 text-[10px]" style={mono}>
                                <span className="text-[#555568] shrink-0 w-28">{k}:</span>
                                <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300 break-all">
                                  {String(v)} ↗
                                </a>
                              </div>
                            );
                          }
                          const val = typeof v === "string" && v.length > 120 ? v.slice(0, 120) + "..." : String(v);
                          return (
                            <div key={k} className="flex gap-2 text-[10px]" style={mono}>
                              <span className="text-[#555568] shrink-0 w-28">{k}:</span>
                              <span className="text-[#e4e4ef]/60 break-all">{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT: LIVE LOG TERMINAL ────────────────────────────────── */}
      <div className="w-[45%] flex flex-col bg-[#0d1117]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e1e2e] bg-[#0a0a0f]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            </div>
            <span className="text-[#8888a0] text-[10px] uppercase tracking-widest ml-2" style={mono}>
              EXECUTION LOG
            </span>
          </div>
          {isRunning && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-emerald-400 text-[10px]" style={mono}>EXECUTING</span>
            </div>
          )}
        </div>

        <div
          ref={logRef}
          className="flex-1 overflow-y-auto p-4"
          style={{ ...mono, fontSize: "11px", lineHeight: "1.7", scrollBehavior: "smooth" }}
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Image src="/logo.png" alt="AgentVerse" width={64} height={64} className="opacity-20 mb-4" />
              <p className="text-[#555568] text-xs" style={mono}>
                Select a scenario and click &quot;Run All Steps&quot;
                <br />
                or step through one at a time.
              </p>
              <p className="text-[#555568] text-[10px] mt-4" style={mono}>
                Each step makes real API calls with LLM reasoning
                <br />
                and WDK wallet operations.
              </p>
            </div>
          ) : (
            <>
              {logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {log.includes("✓") ? (
                    <span className="text-emerald-400">{log}</span>
                  ) : log.includes("✗") ? (
                    <span className="text-red-400">{log}</span>
                  ) : log.includes("▶") ? (
                    <span className="text-blue-400">{log}</span>
                  ) : log.includes("═") ? (
                    <span className="text-emerald-400 font-bold">{log}</span>
                  ) : log.includes("POST") ? (
                    <span className="text-yellow-400">{log}</span>
                  ) : log === "" ? (
                    <br />
                  ) : (
                    <span className="text-[#e4e4ef]/50">{log}</span>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-1 mt-2">
                <span className="text-emerald-400">▸</span>
                <span className="w-1.5 h-3 bg-emerald-400 animate-pulse" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
