import { useEffect, useState } from 'react';
import { Bookmark, ExternalLink, RefreshCw, Send, Trash2 } from 'lucide-react';
import { createApplication, listSavedJobs, removeSavedJob } from '../services/api';

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

function jobOpenUrl(job) {
  if (job?.url) return job.url;
  const buildUrl = platformSearchUrl[job?.source] || platformSearchUrl.LinkedIn;
  return buildUrl(job?.title || 'developer', job?.location || 'India');
}

function formatDate(value) {
  if (!value) return 'Saved recently';
  return new Date(value).toLocaleString();
}

export default function SavedJobsPage({ token }) {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSavedJobs = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const result = await listSavedJobs(token);
      setSavedJobs((result.data.saved_jobs || []).filter((item) => item.job));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedJobs();
  }, [token]);

  const handleRemove = async (savedJob) => {
    setActionId(savedJob.id);
    setError('');
    setNotice('');
    try {
      await removeSavedJob({ jobId: savedJob.job.id, token });
      setSavedJobs((current) => current.filter((item) => item.id !== savedJob.id));
      setNotice('Job removed from saved list');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionId(null);
    }
  };

  const handleApplyDraft = async (savedJob) => {
    setActionId(savedJob.id);
    setError('');
    setNotice('');
    try {
      await createApplication({ jobId: savedJob.job.id, token });
      setNotice('Application draft added to Auto Apply');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Saved Jobs</p>
            <h1 className="mt-2 text-3xl font-black text-white">Jobs Saved For Review</h1>
            <p className="mt-2 text-sm text-slate-400">Create application drafts from saved jobs, then continue them in Auto Apply.</p>
          </div>
          <button
            type="button"
            onClick={loadSavedJobs}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 px-4 py-2 text-sm font-black text-slate-200 transition hover:bg-slate-900 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {notice && <p className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">{notice}</p>}
        {error && <p className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      </section>

      <section className="space-y-3">
        {savedJobs.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-10 text-center">
            <Bookmark className="mx-auto text-slate-500" size={38} />
            <p className="mt-4 text-lg font-black text-white">No saved jobs yet</p>
            <p className="mt-2 text-sm text-slate-500">Go to Search Jobs and click Save on roles you want to review.</p>
          </div>
        ) : savedJobs.map((savedJob) => {
          const job = savedJob.job;
          const busy = actionId === savedJob.id;
          return (
            <article key={savedJob.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Bookmark className="text-fuchsia-300" size={18} />
                    <h2 className="text-xl font-black text-white">{job.title}</h2>
                    <span className="rounded-lg bg-blue-500/15 px-2 py-1 text-xs font-black text-blue-200">{job.source}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-400">{job.company} - {job.location || 'Remote'}</p>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">{job.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[job.employment_type, job.experience_required, job.salary, `Saved: ${formatDate(savedJob.created_at)}`].filter(Boolean).map((item) => (
                      <span key={item} className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">{item}</span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={jobOpenUrl(job)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-900"
                  >
                    <ExternalLink size={16} />
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => handleApplyDraft(savedJob)}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-3 py-2 text-sm font-black text-white transition disabled:opacity-60"
                  >
                    <Send size={16} />
                    Apply Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(savedJob)}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-black text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
