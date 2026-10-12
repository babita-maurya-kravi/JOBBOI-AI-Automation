import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BellRing,
  Bookmark,
  Briefcase,
  FileCheck2,
  FileText,
  Files,
  LayoutDashboard,
  LogOut,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import AutoJobLoginPage from './pages/AutoJobLoginPage';
import AutoJobDashboardPage from './pages/AutoJobDashboardPage';
import ResumePage from './pages/ResumePage';
import ResumeLibraryPage from './pages/ResumeLibraryPage';
import JobsPage from './pages/JobsPage';
import SavedJobsPage from './pages/SavedJobsPage';
import SkillGapPage from './pages/SkillGapPage';
import AutoApplyPage from './pages/AutoApplyPage';

const workflowItems = [
  { label: 'Resume', icon: FileText, to: '/resume' },
  { label: 'Search Jobs', icon: Search, to: '/jobs' },
  { label: 'Auto Apply', icon: Rocket, to: '/auto-apply' },
];

const resultItems = [
  { label: 'Resume Library', icon: Files, to: '/resume-library' },
  { label: 'Saved Jobs', icon: Bookmark, to: '/saved-jobs' },
  { label: 'Applications', icon: Briefcase, to: '/applications' },
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Analytics', icon: BarChart3, to: '/analytics' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

function NavGroup({ title, items }) {
  const location = useLocation();

  return (
    <div>
      <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <nav className="space-y-1">
        {items.map(({ label, icon: Icon, to }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={label}
              to={to}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_24px_rgba(217,70,239,0.18)]'
                  : 'border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/70 hover:text-slate-100'
              }`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Sidebar({ user, onLogout }) {
  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#0b0f24]/95">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-blue-500 text-white shadow-[0_0_32px_rgba(236,72,153,0.35)]">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-sm font-black leading-none text-white">AutoJob Apply</p>
            <p className="mt-1 text-[10px] font-semibold uppercase text-fuchsia-300">Automation OS</p>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold text-fuchsia-200">
          <Sparkles size={13} />
          AI-powered
        </div>
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto p-4">
        <NavGroup title="Workflow" items={workflowItems} />
        <NavGroup title="Results" items={resultItems} />
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Search filters ready</span>
          </div>
          <div className="text-slate-500">
            Jobs filter selected platforms only.
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-900"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}

function TopBar({ user }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090d20]/90 px-5 py-4 backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-[#11152d] px-4 py-2.5 text-sm text-slate-500 shadow-inner">
            <Search size={16} />
            <span>Search jobs, skills, companies...</span>
          </div>
          <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-300">
            <ShieldCheck size={17} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-sm font-black text-white">{user?.name || 'Ayush Kumar'}</p>
            <p className="text-xs font-semibold text-slate-500">Premium Plan</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-blue-500 text-sm font-black text-white">
            {(user?.name || 'D').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-[0_0_40px_rgba(15,23,42,0.35)]">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-300">AutoJob Apply</p>
      <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}

function AppLayout({ user, token, onLogout }) {
  return (
    <div className="flex min-h-screen bg-[#050714] text-slate-100">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="min-w-0 flex-1">
        <TopBar user={user} />
        <main className="mx-auto max-w-[1540px] p-4 md:p-5">
          <Routes>
            <Route path="/" element={<AutoJobDashboardPage token={token} />} />
            <Route path="/resume" element={<ResumePage token={token} />} />
            <Route path="/resume-library" element={<ResumeLibraryPage token={token} />} />
            <Route path="/ats" element={<ResumePage token={token} />} />
            <Route path="/jobs" element={<JobsPage token={token} />} />
            <Route path="/skill-gap" element={<SkillGapPage token={token} />} />
            <Route path="/auto-apply" element={<AutoApplyPage token={token} user={user} />} />
            <Route path="/saved-jobs" element={<SavedJobsPage token={token} />} />
            <Route path="/applications" element={<AutoApplyPage token={token} user={user} />} />
            <Route path="/cover-letters" element={<PlaceholderPage title="Cover Letters" subtitle="Generated drafts are saved by job so you can review them before using them." />} />
            <Route path="/follow-ups" element={<PlaceholderPage title="Follow-ups" subtitle="Schedule reminders and keep response tracking organized by application." />} />
            <Route path="/analytics" element={<AutoJobDashboardPage token={token} />} />
            <Route path="/versions" element={<PlaceholderPage title="Resume Versions" subtitle="Compare resume versions and ATS-style score improvements over time." />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" subtitle="Configure API keys, uploads, safe automation permissions, and source adapter settings." />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [authState, setAuthState] = useState(() => {
    const stored = localStorage.getItem('jobbot-auth');
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      return parsed?.token ? parsed : null;
    } catch {
      localStorage.removeItem('jobbot-auth');
      return null;
    }
  });

  useEffect(() => {
    if (authState) {
      localStorage.setItem('jobbot-auth', JSON.stringify(authState));
    } else {
      localStorage.removeItem('jobbot-auth');
    }
  }, [authState]);

  useEffect(() => {
    const handleUnauthorized = () => setAuthState(null);
    window.addEventListener('jobbot:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('jobbot:unauthorized', handleUnauthorized);
  }, []);

  const handleAuth = (data) => {
    setAuthState({ token: data.token, user: data.user });
  };

  const handleLogout = () => {
    setAuthState(null);
  };

  if (!authState) {
    return <AutoJobLoginPage onAuth={handleAuth} />;
  }

  return <AppLayout user={authState.user} token={authState.token} onLogout={handleLogout} />;
}
