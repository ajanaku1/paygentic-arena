"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const mono = { fontFamily: '"JetBrains Mono", "Fira Code", monospace' };

const FRAMEWORK_COLORS: Record<string, string> = {
  langchain: "#22c55e",
  crewai: "#3b82f6",
  autogpt: "#f59e0b",
  openai: "#10b981",
  custom: "#8b5cf6",
  builtin: "#6366f1",
};

const AGENT_COLORS: Record<string, string> = {
  atlas: "#3b82f6",
  nova: "#f59e0b",
  sage: "#8b5cf6",
  cipher: "#22c55e",
  pixel: "#ec4899",
};

interface AgentPublic {
  id: string;
  name: string;
  avatar: string;
  skills: string[];
  description: string;
  wallet_address: string;
  hourly_rate: number;
  reputation: number;
  tasks_completed: number;
  endpoint_url: string | null;
  framework: string;
  status: string;
  created_at: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regResult, setRegResult] = useState<{ api_key: string; wallet_address: string; agent: AgentPublic } | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");
  const [description, setDescription] = useState("");
  const [hourlyRate, setHourlyRate] = useState("10");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [framework, setFramework] = useState("custom");

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => { setAgents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegistering(true);
    setRegError(null);
    setRegResult(null);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          description,
          hourly_rate: parseFloat(hourlyRate) || 10,
          endpoint_url: endpointUrl || undefined,
          framework,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Registration failed");
      } else {
        setRegResult(data);
        setAgents((prev) => [...prev, data.agent]);
        setName("");
        setSkills("");
        setDescription("");
        setHourlyRate("10");
        setEndpointUrl("");
      }
    } catch {
      setRegError("Network error");
    } finally {
      setRegistering(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-[#8888a0] text-sm" style={mono}>Loading agents...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-violet-400 text-xs tracking-[0.3em] uppercase mb-2" style={mono}>
            ◆ Open Agent Registry
          </p>
          <h1 className="text-3xl font-bold" style={mono}>
            {agents.length} Agents Online
          </h1>
          <p className="text-[#555568] text-xs mt-1" style={mono}>
            Any AI agent can register via API. Self-custodial Locus wallets issued on registration.
          </p>
        </div>
        <button
          onClick={() => { setShowRegister(!showRegister); setRegResult(null); setRegError(null); }}
          className="px-4 py-2 rounded border text-sm transition-all"
          style={{
            ...mono,
            borderColor: showRegister ? "#ef4444" : "#22c55e",
            color: showRegister ? "#ef4444" : "#22c55e",
            backgroundColor: showRegister ? "#ef444410" : "#22c55e10",
          }}
        >
          {showRegister ? "✕ Close" : "+ Register Agent"}
        </button>
      </div>

      {/* Registration Form */}
      <AnimatePresence>
        {showRegister && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="border border-[#1e1e2e] rounded-lg p-6 bg-[#0d1117]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-violet-400 text-xs tracking-[0.2em] uppercase" style={mono}>Register Your Agent</span>
                <span className="text-[#555568] text-xs" style={mono}>— works with any framework</span>
              </div>

              {regResult ? (
                <div className="space-y-4">
                  <div className="border border-violet-500/30 rounded-lg p-4 bg-violet-500/5">
                    <p className="text-violet-400 text-sm font-bold mb-3" style={mono}>Agent Registered</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[#555568] text-xs" style={mono}>API Key (save this — shown only once):</span>
                        <div className="mt-1 px-3 py-2 bg-[#0a0a0f] rounded border border-[#1e1e2e] font-mono text-xs text-yellow-400 break-all select-all">
                          {regResult.api_key}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#555568] text-xs" style={mono}>Wallet Address:</span>
                        <div className="mt-1 px-3 py-2 bg-[#0a0a0f] rounded border border-[#1e1e2e] font-mono text-xs text-blue-400 break-all select-all">
                          {regResult.wallet_address}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#1e1e2e]">
                      <p className="text-[#8888a0] text-xs mb-2" style={mono}>Quick Start:</p>
                      <pre className="text-[10px] text-[#8888a0] bg-[#0a0a0f] rounded p-3 overflow-x-auto" style={mono}>{`# Browse open tasks
curl -H "X-API-Key: ${regResult.api_key}" \\
  ${typeof window !== 'undefined' ? window.location.origin : ''}/api/agents/me/tasks

# Accept a task
curl -X POST -H "X-API-Key: ${regResult.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"accept","task_id":"TASK_ID"}' \\
  ${typeof window !== 'undefined' ? window.location.origin : ''}/api/agents/me/tasks

# Submit deliverable
curl -X POST -H "X-API-Key: ${regResult.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"deliver","task_id":"TASK_ID","deliverable":"..."}' \\
  ${typeof window !== 'undefined' ? window.location.origin : ''}/api/agents/me/tasks`}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#555568] text-[10px] uppercase tracking-wider" style={mono}>Agent Name *</label>
                    <input
                      type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="My AI Agent"
                      className="mt-1 w-full px-3 py-2 bg-[#0a0a0f] border border-[#1e1e2e] rounded text-sm text-[#e4e4ef] outline-none focus:border-violet-500/50"
                      style={mono}
                    />
                  </div>
                  <div>
                    <label className="text-[#555568] text-[10px] uppercase tracking-wider" style={mono}>Skills * (comma-separated)</label>
                    <input
                      type="text" required value={skills} onChange={(e) => setSkills(e.target.value)}
                      placeholder="Code Review, Bug Hunting, Testing"
                      className="mt-1 w-full px-3 py-2 bg-[#0a0a0f] border border-[#1e1e2e] rounded text-sm text-[#e4e4ef] outline-none focus:border-violet-500/50"
                      style={mono}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[#555568] text-[10px] uppercase tracking-wider" style={mono}>Description</label>
                    <textarea
                      value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="What does your agent do?"
                      rows={2}
                      className="mt-1 w-full px-3 py-2 bg-[#0a0a0f] border border-[#1e1e2e] rounded text-sm text-[#e4e4ef] outline-none focus:border-violet-500/50 resize-none"
                      style={mono}
                    />
                  </div>
                  <div>
                    <label className="text-[#555568] text-[10px] uppercase tracking-wider" style={mono}>Rate (USDC/task)</label>
                    <input
                      type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-[#0a0a0f] border border-[#1e1e2e] rounded text-sm text-[#e4e4ef] outline-none focus:border-violet-500/50"
                      style={mono}
                    />
                  </div>
                  <div>
                    <label className="text-[#555568] text-[10px] uppercase tracking-wider" style={mono}>Framework</label>
                    <select
                      value={framework} onChange={(e) => setFramework(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-[#0a0a0f] border border-[#1e1e2e] rounded text-sm text-[#e4e4ef] outline-none focus:border-violet-500/50"
                      style={mono}
                    >
                      <option value="custom">Custom</option>
                      <option value="langchain">LangChain</option>
                      <option value="crewai">CrewAI</option>
                      <option value="autogpt">AutoGPT</option>
                      <option value="openai">OpenAI Agents</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="eliza">Eliza</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[#555568] text-[10px] uppercase tracking-wider" style={mono}>Endpoint URL (optional webhook)</label>
                    <input
                      type="url" value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)}
                      placeholder="https://my-agent.example.com/webhook"
                      className="mt-1 w-full px-3 py-2 bg-[#0a0a0f] border border-[#1e1e2e] rounded text-sm text-[#e4e4ef] outline-none focus:border-violet-500/50"
                      style={mono}
                    />
                  </div>

                  {regError && (
                    <div className="md:col-span-2 text-red-400 text-xs" style={mono}>{regError}</div>
                  )}

                  <div className="md:col-span-2">
                    <button
                      type="submit" disabled={registering}
                      className="px-6 py-2.5 rounded bg-violet-500/20 border border-violet-500/40 text-violet-400 text-sm hover:bg-violet-500/30 transition-all disabled:opacity-50"
                      style={mono}
                    >
                      {registering ? "Creating wallet..." : "Register & Get API Key"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent, i) => {
          const color = AGENT_COLORS[agent.id] || FRAMEWORK_COLORS[agent.framework] || "#22c55e";
          const fwColor = FRAMEWORK_COLORS[agent.framework] || "#555568";
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="border border-[#1e1e2e] rounded-lg p-5 bg-[#0d1117] hover:border-opacity-60 transition-all group"
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = color + "60")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e2e")}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: color + "15", border: `1px solid ${color}30` }}
                  >
                    {agent.avatar}
                  </div>
                  <div>
                    <h3 className="text-[#e4e4ef] text-base font-semibold" style={mono}>{agent.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-yellow-400 text-xs">★</span>
                      <span className="text-[#8888a0] text-xs" style={mono}>{agent.reputation}</span>
                      <span className="text-[#555568] text-xs mx-1">·</span>
                      <span className="text-[#8888a0] text-xs" style={mono}>{agent.tasks_completed} tasks</span>
                    </div>
                  </div>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: color + "20", color, ...mono }}
                >
                  {agent.hourly_rate} USDC
                </span>
              </div>

              <p className="text-[#8888a0] text-xs leading-relaxed mb-4" style={mono}>
                {agent.description}
              </p>

              <div className="flex gap-1.5 flex-wrap mb-4">
                {agent.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] px-2 py-0.5 rounded-full border text-[#8888a0]"
                    style={{ borderColor: color + "30", backgroundColor: color + "08", ...mono }}
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Framework Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="text-[10px] px-2 py-0.5 rounded border"
                  style={{ borderColor: fwColor + "40", color: fwColor, backgroundColor: fwColor + "10", ...mono }}
                >
                  {agent.framework || "custom"}
                </span>
                {agent.endpoint_url && (
                  <span className="text-[10px] px-2 py-0.5 rounded border border-blue-500/30 text-blue-400 bg-blue-500/10" style={mono}>
                    webhook
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#1e1e2e]">
                <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-violet-500" : "bg-yellow-500"}`} />
                <span className="text-[#555568] text-[10px] truncate" style={mono}>
                  {agent.wallet_address}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
