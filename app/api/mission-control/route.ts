import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const WORKSPACE = '/root/.openclaw/workspace';
const PROJECTS = '/root/projects';

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
  workQueue: { currentObjective: string; completed: string[]; pending: string[]; blocked: string[] };
  logs: { recent: string[]; errors: string[]; warnings: string[] };
  metrics: { runtime: number; sessionAge: number; tokensUsed: number; memoryUsage: string };
  projects: { name: string; path: string; status: string; lastActivity: string }[];
  heartbeat: { last: string; next: string; health: string };
  timestamp: string;
}

function getGitStatus(repoPath: string) {
  try {
    const files = execSync('git status --porcelain 2>/dev/null | cut -c4-99 || true', { cwd: repoPath, encoding: 'utf8' });
    const branch = execSync('git branch --show-current 2>/dev/null || echo "main"', { cwd: repoPath, encoding: 'utf8' }).trim();
    const log = execSync('git log -3 --oneline 2>/dev/null || true', { cwd: repoPath, encoding: 'utf8' });
    const commits = log.split('\n').filter(Boolean).map(l => {
      const [hash, ...msgParts] = l.split(' ');
      return { hash, message: msgParts.join(' '), timestamp: '' };
    });
    return { modified: files.split('\n').filter(Boolean), branch, commits: commits.slice(0, 3) };
  } catch { return { modified: [], branch: 'unknown', commits: [] }; }
}

function getSessionAge() {
  try { const stats = fs.statSync('/root/.openclaw/logs'); return Date.now() - stats.mtimeMs; } catch { return 0; }
}

function getSubagents() {
  try {
    const subs = fs.readdirSync('/root/.openclaw/subagents');
    return subs.map(s => {
      try {
        const meta = JSON.parse(fs.readFileSync(`/root/.openclaw/subagents/${s}/meta.json`, 'utf8').toString());
        return { name: s, status: meta.status || 'unknown', task: meta.task || 'unknown', runtime: meta.runtime || 'unknown', completion: meta.completion || 0 };
      } catch { return { name: s, status: 'unknown', task: 'unknown', runtime: 'unknown', completion: 0 }; }
    });
  } catch { return []; }
}

function getProjects() {
  const projectList = ['oye-ai', 'whatsapp-ai', 'atlaslm', 'kuikchat', 'zuno', 'tokenklaw', 'klaw'];
  return projectList.map(name => {
    let status = 'idle', lastActivity = 'unknown';
    const repoPath = name === 'oye-ai' ? path.join(PROJECTS, 'oye-ai/oye-ai') : name === 'whatsapp-ai' ? path.join(PROJECTS, 'whatsapp-ai') : path.join(PROJECTS, name);
    try { if (fs.existsSync(repoPath)) { lastActivity = fs.statSync(repoPath).mtime.toISOString(); status = getGitStatus(repoPath).modified.length > 0 ? 'active' : 'idle'; } }
    catch { status = 'not-found'; }
    return { name, path: repoPath, status, lastActivity };
  });
}

function getCronJobs() {
  try { const result = execSync('cron action=list --json 2>/dev/null || true', { encoding: 'utf8' }); return JSON.parse(result).jobs || []; }
  catch { return []; }
}

export async function GET(request: NextRequest) {
  const oyeGit = getGitStatus(path.join(PROJECTS, 'oye-ai/oye-ai'));
  const waGit = getGitStatus(path.join(PROJECTS, 'whatsapp-ai'));
  const subagents = getSubagents();
  const projects = getProjects();
  const cron = getCronJobs();
  const sessionAgeMs = getSessionAge();
  const cronJob = cron.find((j: any) => j.name === 'continuous-status-reporter');

  const data: StatusData = {
    agent: { currentTask: process.env.AGENT_TASK || 'OYE AI + WhatsApp AI integration', currentFile: 'mission-control.ts', currentRepo: '/root/projects/oye-ai/oye-ai', currentBranch: oyeGit.branch, subagentActivity: subagents.map((s: any) => s.task).slice(0, 3), lastAction: 'Building Mission Control dashboard', lastActionTimestamp: new Date().toISOString() },
    subagents: subagents.map((s: any) => ({ name: s.name, status: s.status, task: s.task, runtime: s.runtime, completion: s.completion })),
    git: { modifiedFiles: [...oyeGit.modified, ...waGit.modified], commits: [...(oyeGit.commits || []), ...(waGit.commits || [])], latestCommit: oyeGit.commits?.[0] || { hash: 'none', message: 'No commits' } },
    workQueue: { currentObjective: 'Build Mission Control dashboard', completed: ['Verify browsers', 'Install xdg-utils', 'Install agent-browser + Playwright', 'Fix browser sandbox issue'], pending: ['Complete OYE AI integration', 'Supabase E2E tests'], blocked: [] },
    logs: { recent: [], errors: [], warnings: [] },
    metrics: { runtime: Math.floor(sessionAgeMs / 1000), sessionAge: Math.floor(sessionAgeMs / 60000), tokensUsed: 0, memoryUsage: 'N/A' },
    projects,
    heartbeat: { last: cronJob?.state?.lastRunAtMs ? new Date(cronJob.state.lastRunAtMs).toISOString() : 'none', next: cronJob?.state?.nextRunAtMs ? new Date(cronJob.state.nextRunAtMs).toISOString() : 'none', health: 'ok' },
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}