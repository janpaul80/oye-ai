"use client";

import { useState, useEffect } from 'react';

interface StatusData {
  agent: {
    currentTask: string;
    currentFile: string;
    currentRepo: string;
    currentBranch: string;
    subagentActivity: string[];
    lastAction: string;
    lastActionTimestamp: string;
  };
  subagents: { name: string; status: string; task: string; runtime: string; completion: number }[];
  git: {
    modifiedFiles: string[];
    commits: { hash: string; message: string; timestamp: string }[];
    latestCommit: { hash: string; message: string };
  };
  workQueue: {
    currentObjective: string;
    completed: string[];
    pending: string[];
    blocked: string[];
  };
  logs: { recent: string[]; errors: string[]; warnings: string[] };
  metrics: { runtime: number; sessionAge: number; tokensUsed: number; memoryUsage: string };
  projects: { name: string; path: string; status: string; lastActivity: string }[];
  heartbeat: { last: string; next: string; health: string };
  timestamp: string;
}

function formatAge(ms: number) {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  return `${Math.floor(ms / 3600000)}h`;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'text-green-400';
    case 'running': return 'text-blue-400';
    case 'idle': return 'text-gray-400';
    case 'error': return 'text-red-400';
    default: return 'text-gray-500';
  }
}

export default function MissionControl() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/mission-control?_t=' + Date.now());
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date().toLocaleTimeString());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl">Loading Mission Control...</div>
      </div>
    );
  }

  return (
    <>
      
        <title>Mission Control</title>
      
      <div className="min-h-screen bg-[#0a0a0a] text-white font-mono p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Mission Control
            </h1>
            <p className="text-gray-500 text-sm mt-1">Real-time agent monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-xs">Last refresh: {lastRefresh}</span>
            <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-xs border border-green-800">
              ● Live
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Agent Status */}
          <div className="bg-[#111] rounded-xl p-5 border border-gray-800">
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Agent Status</h2>
            {data?.agent && (
              <div className="space-y-3">
                <div>
                  <span className="text-gray-500 text-xs">Current Task</span>
                  <p className="text-white text-sm">{data.agent.currentTask}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Repository</span>
                  <p className="text-blue-400 text-sm">{data.agent.currentRepo}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Branch</span>
                  <p className="text-purple-400 text-sm">{data.agent.currentBranch}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Last Action</span>
                  <p className="text-gray-300 text-sm">{data.agent.lastAction}</p>
                </div>
              </div>
            )}
          </div>

          {/* Subagents */}
          <div className="bg-[#111] rounded-xl p-5 border border-gray-800">
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Subagents ({data?.subagents.length || 0})</h2>
            {data?.subagents && data.subagents.length > 0 ? (
              <div className="space-y-3">
                {data.subagents.slice(0, 4).map((sub, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="text-white text-sm">{sub.name}</span>
                      <p className="text-gray-500 text-xs">{sub.task?.slice(0, 30)}</p>
                    </div>
                    <span className={`text-xs ${getStatusColor(sub.status)}`}>
                      {sub.status} {sub.completion > 0 && `${sub.completion}%`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active subagents</p>
            )}
          </div>

          {/* Git Activity */}
          <div className="bg-[#111] rounded-xl p-5 border border-gray-800">
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Git Activity</h2>
            {data?.git?.latestCommit && (
              <div>
                <span className="text-gray-500 text-xs">Latest Commit</span>
                <p className="text-green-400 text-sm font-mono">{data.git.latestCommit.hash?.slice(0, 7)}</p>
                <p className="text-gray-300 text-xs mt-1">{data.git.latestCommit.message}</p>
              </div>
            )}
            {data?.git?.modifiedFiles && data.git.modifiedFiles.length > 0 && (
              <div className="mt-3">
                <span className="text-gray-500 text-xs">Modified ({data.git.modifiedFiles.length})</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.git.modifiedFiles.slice(0, 5).map((f, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Work Queue */}
          <div className="bg-[#111] rounded-xl p-5 border border-gray-800">
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Work Queue</h2>
            {data?.workQueue && (
              <div className="space-y-3">
                <div>
                  <span className="text-gray-500 text-xs">Current Objective</span>
                  <p className="text-yellow-400 text-sm">{data.workQueue.currentObjective}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Completed ({data.workQueue.completed.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.workQueue.completed.slice(0, 3).map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-900/30 text-green-400 rounded text-xs">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Pending ({data.workQueue.pending.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.workQueue.pending.slice(0, 3).map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Heartbeat */}
          <div className="bg-[#111] rounded-xl p-5 border border-gray-800">
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Heartbeat</h2>
            {data?.heartbeat && (
              <div className="space-y-3">
                <div>
                  <span className="text-gray-500 text-xs">Last Heartbeat</span>
                  <p className="text-gray-300 text-sm">{data.heartbeat.last}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Next Heartbeat</span>
                  <p className="text-gray-300 text-sm">{data.heartbeat.next}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Health</span>
                  <p className={`text-sm ${data.heartbeat.health === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                    {data.heartbeat.health}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="bg-[#111] rounded-xl p-5 border border-gray-800">
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Metrics</h2>
            {data?.metrics && (
              <div className="space-y-3">
                <div>
                  <span className="text-gray-500 text-xs">Session Age</span>
                  <p className="text-white text-sm">{formatAge(data.metrics.sessionAge * 60000)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Runtime (seconds)</span>
                  <p className="text-white text-sm">{data.metrics.runtime}</p>
                </div>
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="bg-[#111] rounded-xl p-5 border border-gray-800 col-span-full">
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Projects</h2>
            {data?.projects && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {data.projects.map((proj, i) => (
                  <div key={i} className="text-center">
                    <p className={`text-sm font-medium ${getStatusColor(proj.status)}`}>{proj.name}</p>
                    <p className="text-gray-600 text-xs mt-1">{proj.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-xl">
            <p className="text-red-400 text-sm">Error: {error}</p>
          </div>
        )}

        {/* Log excerpt */}
        {data?.logs?.recent && data.logs.recent.length > 0 && (
          <div className="mt-6 p-4 bg-[#111] rounded-xl border border-gray-800">
            <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Recent Logs</h2>
            <pre className="text-gray-500 text-xs overflow-x-auto max-h-32">
              {data.logs.recent[0]?.slice(0, 500)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}