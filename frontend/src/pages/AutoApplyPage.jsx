import { useEffect, useMemo, useState } from 'react';
import { Bookmark, CheckCircle2, ClipboardCheck, ExternalLink, Play, RotateCw, ShieldAlert, Send } from 'lucide-react';
import { createApplication, listApplications, listSavedJobs, reviewApplication, startApplication, submitApplication } from '../services/api';

const statusTone = {
  DISCOVERED: 'border-slate-700 bg-slate-800/60 text-slate-200',
  APPLICATION_STARTED: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  READY_TO_APPLY: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  SUBMITTED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
};

const demoPlatformByExternalId = {
  'demo-100': 'Naukri',
  'demo-101': 'LinkedIn',
  'demo-102': 'Indeed',
  'demo-103': 'Glassdoor',
  'demo-104': 'TimesJobs',
  'demo-105': 'Shine.com',
  'demo-106': 'Foundit',
  'demo-107': 'Internshala',
};

const platformSearchUrl = {
  Naukri: (query, location) => `https://www.naukri.com/${encodeURIComponent(query).replaceAll('%20', '-')}-jobs-in-${encodeURIComponent(location).replaceAll('%20', '-')}`,
  LinkedIn: (query, location) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`,
  Indeed: (query, location) => `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`,
  Glassdoor: (query, location) => `https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${encodeURIComponent(query)}&locT=C&locId=&locKeyword=${encodeURIComponent(location)}`,
  TimesJobs: (query, location) => `https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&txtKeywords=${encodeURIComponent(query)}&txtLocation=${encodeURIComponent(location)}`,
  'Shine.com': (query, location) => `https://www.shine.com/job-search/${encodeURIComponent(query).replaceAll('%20', '-')}-jobs-in-${encodeURIComponent(location).replaceAll('%20', '-')}`,
  Foundit: (query, location) => `https://www.foundit.in/srp/results?query=${encodeURIComponent(query)}&locations=${encodeURIComponent(location)}`,
  Internshala: (query, location) => `https://internshala.com/jobs/keywords-${encodeURIComponent(query).replaceAll('%20', '-')}/location-${encodeURIComponent(location).replaceAll('%20', '-')}/`,
};

function jobPlatform(job) {
  if (job?.source === 'DEMO') {
    return demoPlatformByExternalId[job.external_id] || 'LinkedIn';
  }
  return job?.source || 'LinkedIn';
}

function jobOpenUrl(job) {
  const url = job?.url || '';
  if (url && !url.includes('example.com')) {
    return url;
  }
  const platform = jobPlatform(job);
  const buildUrl = platformSearchUrl[platform] || platformSearchUrl.LinkedIn;
  return buildUrl(job?.title || 'developer', job?.location || 'India');
}

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone[status] || statusTone.DISCOVERED}`}>
      {status?.replaceAll('_', ' ') || 'DISCOVERED'}
    </span>
  );
}

function formatDate(value) {
  if (!value) return 'Not submitted';
  return new Date(value).toLocaleString();
}

export default function AutoApplyPage({ token, user }) {
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);

  const stats = useMemo(() => {
    const total = applications.length;
    const ready = applications.filter((item) => item.status === 'READY_TO_APPLY').length;
    const submitted = applications.filter((item) => item.status === 'SUBMITTED').length;
    const needsReview = applications.filter((item) => item.automation_status === 'NEEDS_USER_ACTION').length;
    return { total, ready, submitted, needsReview };
  }, [applications]);

  const loadApplications = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [applicationsResult, savedJobsResult] = await Promise.all([
        listApplications(token),
        listSavedJobs(token),
      ]);
      setApplications(applicationsResult.data.applications || []);
      setSavedJobs((savedJobsResult.data.saved_jobs || []).filter((item) => item.job));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [token]);

  const updateApplication = (updated) => {
    setApplications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const runAction = async (application, action, message) => {
    setActionId(application.id);
    setError('');
    setLogs((current) => [
      `${message}: ${application.job?.title || `Application #${application.id}`}`,
      ...current,
    ].slice(0, 8));

    try {
      const result = await action({ applicationId: application.id, token });
      updateApplication(result.data.application);
      if (result.data.automation?.reason) {
        setLogs((current) => [result.data.automation.reason, ...current].slice(0, 8));
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionId(null);
    }
  };

  const handleCreateDraft = async (savedJob) => {
    setActionId(`saved-${savedJob.id}`);
    setError('');
    setLogs((current) => [
      `Creating application draft: ${savedJob.job?.title || `Saved job #${savedJob.id}`}`,
      ...current,
    ].slice(0, 8));

    try {
      const result = await createApplication({ jobId: savedJob.job.id, token });
      const application = result.data.application;
      setApplications((current) => {
        const exists = current.some((item) => item.id === application.id);
        return exists
          ? current.map((item) => (item.id === application.id ? application : item))
          : [application, ...current];
      });
      setLogs((current) => ['Draft added to application queue', ...current].slice(0, 8));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionId(null);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'Not added';
  const lastName = user?.name?.split(' ').slice(1).join(' ') || 'Not added';

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="space-y-5">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-white">Apply Settings</h1>
              <p className="mt-1 text-sm text-slate-500">Safe automation queue</p>
            </div>
            <button
              type="button"
              onClick={loadApplications}
              disabled={loading}
              className="rounded-xl border border-slate-800 p-2 text-slate-300 transition hover:bg-slate-900 disabled:opacity-50"
              title="Refresh applications"
            >
              <RotateCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {[
              ['Your First Name', firstName],
              ['Your Last Name', lastName],
              ['Phone Number', user?.phone || 'Not added'],
              ['Email', user?.email || 'Not added'],
            ].map(([label, value]) => (
              <label key={label} className="block">
                <span className="text-sm font-bold text-slate-400">{label}</span>
                <input readOnly value={value} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none" />
              </label>
            ))}

            <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
              {[
                ['Drafts', stats.total],
                ['Needs Review', stats.needsReview],
                ['Ready', stats.ready],
                ['Submitted', stats.submitted],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="text-lg font-black text-white">Bot Activity</h2>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-[#070b15] p-3 font-mono text-xs">
            <div className="mb-3 flex gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-slate-500">No bot activity yet.</p>
              ) : logs.map((log, index) => (
                <p key={`${log}-${index}`} className="text-blue-300">
                  {new Date(Date.now() - index * 1000).toLocaleTimeString()} {log}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Application Queue</h1>
            <p className="mt-1 text-sm text-slate-400">Start drafts, review prepared applications, then submit manually approved ones.</p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-bold text-emerald-300">Safe Mode</span>
        </div>

        {error && <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

        <div className="mt-8 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-1 text-amber-300" size={22} />
            <div>
              <p className="font-black text-amber-100">Manual review required before final submit</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-100/75">
                JobBot prepares application data and pauses before submission. CAPTCHA, MFA, rate limits, and final submission stay under user control.
              </p>
            </div>
          </div>
        </div>

        {savedJobs.length > 0 && (
          <div className="mt-5 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
            <div className="flex items-start gap-3">
              <Bookmark className="mt-1 text-blue-300" size={22} />
              <div className="min-w-0 flex-1">
                <p className="font-black text-blue-100">Saved jobs ready for Auto Apply</p>
                <p className="mt-2 text-sm leading-6 text-blue-100/75">Create drafts from saved jobs, then start/review/submit them in the queue below.</p>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {savedJobs.map((savedJob) => {
                    const job = savedJob.job;
                    const alreadyQueued = applications.some((application) => application.job_id === job.id);
                    const busy = actionId === `saved-${savedJob.id}`;
                    return (
                      <div key={savedJob.id} className="rounded-2xl border border-blue-500/20 bg-slate-950/60 p-3">
                        <p className="font-black text-white">{job.title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{job.company} - {job.source}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={jobOpenUrl(job)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-slate-800"
                          >
                            <ExternalLink size={14} />
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCreateDraft(savedJob)}
                            disabled={busy || alreadyQueued}
                            className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-3 py-2 text-xs font-black text-white transition hover:bg-fuchsia-500 disabled:opacity-60"
                          >
                            <Send size={14} />
                            {alreadyQueued ? 'Queued' : 'Draft'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {applications.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-center">
              <ClipboardCheck className="mx-auto text-slate-500" size={34} />
              <p className="mt-3 font-black text-white">No application drafts yet</p>
              <p className="mt-2 text-sm text-slate-500">Go to Search Jobs and click Apply Draft on a job to add it here.</p>
            </div>
          ) : applications.map((application) => {
            const job = application.job || {};
            const busy = actionId === application.id;
            return (
              <div key={application.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-white">{job.title || `Application #${application.id}`}</p>
                      <StatusBadge status={application.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{job.company || 'Unknown company'}{job.location ? ` • ${job.location}` : ''}</p>
                    <p className="mt-2 text-xs text-slate-500">Applied: {formatDate(application.applied_at)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {job.title && (
                      <a
                        href={jobOpenUrl(job)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-slate-800"
                      >
                        <ExternalLink size={14} />
                        Open
                      </a>
                    )}
                    {application.status === 'DISCOVERED' && (
                      <button
                        type="button"
                        onClick={() => runAction(application, startApplication, 'Starting application')}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-3 py-2 text-xs font-black text-white transition hover:bg-fuchsia-500 disabled:opacity-60"
                      >
                        <Play size={14} />
                        Start
                      </button>
                    )}
                    {application.automation_status === 'NEEDS_USER_ACTION' && (
                      <button
                        type="button"
                        onClick={() => runAction(application, reviewApplication, 'Marking reviewed')}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-500 disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} />
                        Reviewed
                      </button>
                    )}
                    {application.status === 'READY_TO_APPLY' && (
                      <button
                        type="button"
                        onClick={() => runAction(application, submitApplication, 'Submitting application')}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        <Send size={14} />
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
