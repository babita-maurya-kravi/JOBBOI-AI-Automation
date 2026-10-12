import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileText,
  LineChart,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { getAnalytics } from '../services/api';

const emptyAnalytics = {
  total_jobs_found: 0,
  matched_jobs: 0,
  applications: 0,
  interview_responses: 0,
  saved_jobs: 0,
  average_match_score: 0,
  response_rate: 0,
  applications_by_platform: [],
  applications_by_status: [],
};

const chartBars = [32, 55, 38, 64, 49, 72, 54, 80];
const skillRows = [
  ['System Design', 90],
  ['Python Backend', 84],
  ['React', 78],
  ['SQL', 72],
];

function GlassPanel({ children, className = '' }) {
  return (
    <section className={`rounded-[1.35rem] border border-white/10 bg-[#11152d]/80 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur ${className}`}>
      {children}
    </section>
  );
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'pink' }) {
  const toneClass = {
    pink: 'from-fuchsia-500 to-pink-500',
    blue: 'from-blue-500 to-cyan-400',
    violet: 'from-violet-500 to-indigo-500',
    rose: 'from-rose-500 to-fuchsia-500',
  }[tone];

  return (
    <GlassPanel className={`overflow-hidden bg-gradient-to-br ${toneClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-white/75">{label}</p>
          <p className="mt-2 text-3xl font-black leading-none text-white">{value}</p>
          <p className="mt-2 text-[11px] font-bold text-white/70">{detail}</p>
        </div>
        <div className="rounded-2xl bg-white/15 p-3 text-white">
          <Icon size={21} />
        </div>
      </div>
    </GlassPanel>
  );
}

function RocketVisual() {
  return (
    <div className="relative min-h-64 overflow-hidden rounded-[1.35rem] border border-fuchsia-400/20 bg-[#121737]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(217,70,239,0.28),transparent_28%),radial-gradient(circle_at_28%_84%,rgba(14,165,233,0.22),transparent_30%)]" />
      <div className="absolute left-8 top-8 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white shadow-xl">
        Auto Apply
      </div>
      <div className="absolute bottom-8 left-10 h-20 w-52 rounded-full bg-blue-500/20 blur-2xl" />
      <div className="absolute bottom-7 left-16 h-16 w-44 rounded-[50%] border border-blue-300/25 bg-gradient-to-r from-blue-500/20 to-fuchsia-500/20" />
      <div className="absolute bottom-12 right-16 h-36 w-20 -rotate-12 rounded-t-full rounded-b-[2rem] bg-gradient-to-b from-white via-slate-200 to-fuchsia-300 shadow-[0_0_45px_rgba(217,70,239,0.35)]">
        <div className="absolute left-1/2 top-8 h-9 w-9 -translate-x-1/2 rounded-full border-4 border-blue-200 bg-blue-500" />
        <div className="absolute -left-8 bottom-2 h-14 w-10 rotate-12 rounded-br-[2rem] bg-fuchsia-500" />
        <div className="absolute -right-8 bottom-2 h-14 w-10 rotate-[-12deg] rounded-bl-[2rem] bg-blue-500" />
        <div className="absolute bottom-[-34px] left-1/2 h-12 w-10 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-200 via-pink-500 to-transparent blur-sm" />
      </div>
      <div className="absolute bottom-8 right-8 rounded-2xl border border-white/10 bg-white/10 p-3 text-fuchsia-200">
        <BriefcaseBusiness size={30} />
      </div>
    </div>
  );
}

function ActivityRows({ analytics }) {
  const rows = analytics.applications_by_status.length
    ? analytics.applications_by_status
    : [
      { name: 'Frontend Developer', value: 'Applied' },
      { name: 'ML Engineer', value: 'Interview' },
      { name: 'Full Stack Developer', value: 'Review' },
      { name: 'Backend Developer', value: 'Prepared' },
    ];

  return (
    <div className="space-y-3">
      {rows.slice(0, 4).map((row, index) => (
        <div key={`${row.name}-${index}`} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-blue-500 text-white">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{row.name}</p>
            <p className="text-xs text-slate-500">Resume matched and queued</p>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-black text-emerald-300">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniAnalytics() {
  return (
    <div className="h-44 rounded-2xl border border-white/10 bg-[#0b1026] p-4">
      <div className="flex h-full items-end gap-2">
        {chartBars.map((height, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <span
              className="w-full rounded-t-xl bg-gradient-to-t from-blue-600 to-fuchsia-400"
              style={{ height: `${height}%` }}
            />
            <span className="h-1 w-1 rounded-full bg-slate-600" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AtsScore({ score }) {
  const value = Math.max(0, Math.min(100, Number(score || 85)));
  return (
    <GlassPanel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-white">Resume ATS Score</h2>
        <Sparkles className="text-fuchsia-300" size={18} />
      </div>
      <div className="mt-5 flex justify-center">
        <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-[conic-gradient(#ec4899_0deg,#ec4899_245deg,#2563eb_245deg,#2563eb_315deg,#1f2937_315deg)] p-3 shadow-[0_0_45px_rgba(236,72,153,0.24)]">
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#0b1026]">
            <p className="text-5xl font-black text-white">{value}</p>
            <p className="text-xs font-bold text-slate-500">/100</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm font-black text-white">{value >= 80 ? 'Great Score' : 'Keep Improving'}</p>
      <p className="mt-1 text-center text-xs text-slate-500">Resume is ready for matching</p>
      <a href="/resume" className="mt-5 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-4 py-3 text-sm font-black text-white shadow-[0_0_26px_rgba(236,72,153,0.25)]">
        Improve Now
      </a>
    </GlassPanel>
  );
}

export default function AutoJobDashboardPage({ token }) {
  const [analytics, setAnalytics] = useState(emptyAnalytics);

  useEffect(() => {
    if (!token) return;
    getAnalytics(token)
      .then((result) => setAnalytics({ ...emptyAnalytics, ...result.data }))
      .catch(() => setAnalytics(emptyAnalytics));
  }, [token]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Jobs Applied" value={analytics.applications || 0} detail="+12% this week" icon={Rocket} tone="pink" />
        <MetricCard label="Interviews" value={analytics.interview_responses || 0} detail="+6% this week" icon={CalendarDays} tone="blue" />
        <MetricCard label="Offers" value={analytics.saved_jobs || 0} detail="saved opportunities" icon={BriefcaseBusiness} tone="violet" />
        <MetricCard label="Success Rate" value={`${analytics.response_rate || 18.7}%`} detail="+4.2% this month" icon={LineChart} tone="rose" />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <GlassPanel className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
            <div className="flex flex-col justify-center">
              <p className="text-sm font-black uppercase text-fuchsia-300">Welcome back</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-white md:text-4xl">Your AI job assistant is working for you</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
                Search matching jobs, save the best roles, prepare application drafts, and keep manual review before final submission.
              </p>
              <a href="/jobs" className="mt-6 inline-flex w-fit items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-5 py-3 text-sm font-black text-white shadow-[0_0_32px_rgba(236,72,153,0.3)]">
                Find Better Jobs
                <ArrowRight size={17} />
              </a>
            </div>
            <RocketVisual />
          </GlassPanel>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <GlassPanel className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-black text-white">Recent Applications</h2>
                <a href="/auto-apply" className="text-xs font-black text-fuchsia-300">View all</a>
              </div>
              <ActivityRows analytics={analytics} />
            </GlassPanel>

            <GlassPanel className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-black text-white">Application Analytics</h2>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">This month</span>
              </div>
              <MiniAnalytics />
            </GlassPanel>
          </div>
        </div>

        <div className="space-y-5">
          <AtsScore score={analytics.average_match_score || 85} />
          <GlassPanel className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-white">Top Skills To Learn</h2>
              <BarChart3 className="text-fuchsia-300" size={18} />
            </div>
            <div className="space-y-4">
              {skillRows.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="font-bold text-slate-300">{label}</span>
                    <span className="font-black text-fuchsia-200">{value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
          <GlassPanel className="p-5">
            <div className="flex items-center gap-2 font-black text-emerald-300">
              <CheckCircle2 size={18} />
              Safe automation mode
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">Applications pause for CAPTCHA, MFA, and final submit review.</p>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
