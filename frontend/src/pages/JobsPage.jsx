import { useMemo, useState } from 'react';
import { Bookmark, ClipboardList, ExternalLink, FileText, Globe2, MessageCircle, Search, Send, Sparkles, X } from 'lucide-react';
import { createApplication, generateCoverLetter, matchJob, saveJob, searchJobs } from '../services/api';

const filterOptions = {
  experience: ['Any', 'Fresher', '0-1 yr', '1-3 yrs', '3-5 yrs', '5+ yrs'],
  jobType: ['Any', 'Full-time', 'Half-time', 'Internship'],
  workplace: ['Any', 'Remote', 'Hybrid', 'On-site'],
  platform: ['Naukri', 'LinkedIn', 'Indeed', 'Glassdoor', 'TimesJobs', 'Shine.com', 'Foundit', 'Internshala'],
  posted: ['Any time', 'Today', '3 days', '7 days', '15 days', '30 days'],
};

const allPlatforms = filterOptions.platform;

const initialFilters = {
  experience: 'Any',
  jobType: 'Any',
  workplace: 'Any',
  platform: allPlatforms,
  posted: 'Any time',
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

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
        active
          ? 'border-fuchsia-500/60 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_18px_rgba(217,70,239,0.16)]'
          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function parseExperienceRange(experience = '') {
  const text = String(experience).toLowerCase();
  if (text.includes('fresher') || text.includes('entry')) {
    return { min: 0, max: 0 };
  }
  const range = text.match(/(\d+)\s*[-to]+\s*(\d+)/);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }
  const single = text.match(/(\d+)\+?/);
  if (single) {
    const value = Number(single[1]);
    return { min: value, max: text.includes('+') ? 99 : value };
  }
  return { min: 0, max: 99 };
}

function matchesExperience(job, selected) {
  if (selected === 'Any') return true;
  const { min, max } = parseExperienceRange(job.experience_required);
  if (selected === 'Fresher') return min === 0 && max <= 1;
  if (selected === '0-1 yr') return min <= 1 && max <= 1;
  if (selected === '1-3 yrs') return min <= 3 && max >= 1;
  if (selected === '3-5 yrs') return min <= 5 && max >= 3;
  if (selected === '5+ yrs') return max >= 5 || min >= 5;
  return true;
}

function matchesJobType(job, selected) {
  if (selected === 'Any') return true;
  const type = String(job.employment_type || '').toLowerCase();
  const normalized = selected.toLowerCase();
  if (normalized === 'half-time') return type.includes('part') || type.includes('half');
  if (normalized === 'internship') return type.includes('intern');
  return type.includes(normalized);
}

function matchesWorkplace(job, selected) {
  if (selected === 'Any') return true;
  const haystack = `${job.location || ''} ${job.employment_type || ''} ${job.description || ''}`.toLowerCase();
  if (selected === 'Remote') return haystack.includes('remote');
  if (selected === 'Hybrid') return haystack.includes('hybrid');
  if (selected === 'On-site') return !haystack.includes('remote') && !haystack.includes('hybrid');
  return true;
}

function matchesPlatform(job, selectedPlatforms) {
  if (!selectedPlatforms.length) return true;
  if (selectedPlatforms.length === allPlatforms.length) return true;
  const platform = jobPlatform(job).toLowerCase().replace('.com', '');
  return selectedPlatforms.some((selected) => platform.includes(selected.toLowerCase().replace('.com', '')));
}

function matchesPosted(job, selected) {
  if (selected === 'Any time') return true;
  if (!job.posted_at) return false;

  const postedAt = new Date(job.posted_at);
  if (Number.isNaN(postedAt.getTime())) return false;

  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now.getTime() - postedAt.getTime()) / 86400000));
  if (selected === 'Today') return diffDays <= 1;

  const days = Number.parseInt(selected, 10);
  return Number.isFinite(days) ? diffDays <= days : true;
}

function jobPlatform(job) {
  if (job.source === 'DEMO') {
    return demoPlatformByExternalId[job.external_id] || 'Naukri';
  }
  return job.source || 'Unknown';
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

function jobMatchesFilters(job, filters) {
  return (
    matchesExperience(job, filters.experience)
    && matchesJobType(job, filters.jobType)
    && matchesWorkplace(job, filters.workplace)
    && matchesPlatform(job, filters.platform)
    && matchesPosted(job, filters.posted)
  );
}

function getJobRequirements(job) {
  const items = [
    job.experience_required && `Experience: ${job.experience_required}`,
    job.employment_type && `Job type: ${job.employment_type}`,
    job.location && `Location: ${job.location}`,
    job.salary && `Salary: ${job.salary}`,
  ].filter(Boolean);

  const description = String(job.description || '');
  const explicitRequirement = description.match(/requirements?\s*:\s*(.+)$/i);
  const skills = [
    ...(job.matched_skills || []),
    ...(job.partial_skills || []),
    ...(job.missing_skills || []),
  ];

  if (explicitRequirement) {
    explicitRequirement[1]
      .split(/,|\band\b/i)
      .map((item) => item.replace(/\.$/, '').trim())
      .filter(Boolean)
      .forEach((item) => items.push(item));
  } else if (skills.length) {
    skills.forEach((skill) => items.push(`Skill: ${skill}`));
  } else if (description) {
    items.push(description);
  }

  return [...new Set(items)].slice(0, 12);
}

function buildOutreachMessage(job) {
  const platform = jobPlatform(job);
  const company = job.company || 'your team';
  const title = job.title || 'this role';
  const location = job.location || 'India';
  const skills = [
    ...(job.matched_skills || []),
    ...(job.partial_skills || []),
  ].slice(0, 4);
  const skillText = skills.length ? ` My background aligns with ${skills.join(', ')}.` : '';

  return [
    `Hi ${company} team,`,
    '',
    `I found the ${title} role on ${platform} for ${location} and it looks closely aligned with my profile.${skillText}`,
    '',
    'I would be happy to share my resume and discuss how I can contribute to this role. Please let me know the best next step.',
    '',
    'Thanks,',
    'Candidate',
  ].join('\n');
}

function RequirementsList({ job }) {
  const requirements = getJobRequirements(job);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <div className="mb-2 flex items-center gap-2">
        <ClipboardList className="text-fuchsia-300" size={16} />
        <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-200">Requirements</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {requirements.length === 0 ? (
          <p className="text-sm text-slate-500">Requirements are not available for this job.</p>
        ) : requirements.map((item) => (
          <div key={item} className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function JobModal({
  job,
  coverLetter,
  outreachMessage,
  messageSent,
  onClose,
  onMatch,
  onCoverLetter,
  onSave,
  onApplyDraft,
  onMessageDraft,
  onCopyCoverLetter,
  onCopyMessage,
  onOpenAndCopyMessage,
  onMarkMessageSent,
}) {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[calc(100vh-32px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="shrink-0 border-b border-slate-800 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
          <button type="button" onClick={() => onMatch(job)} className="min-w-0 text-left">
            <h2 className="text-xl font-black text-white hover:text-fuchsia-200">{job.title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">{job.company} - {jobPlatform(job)} - {job.location}</p>
          </button>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X size={20} />
          </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => onMatch(job)} className="text-4xl font-black text-blue-300 hover:text-blue-200">
            {job.match_score ?? 0}%
          </button>
          <span className="rounded-lg bg-blue-500/15 px-3 py-2 text-sm font-black text-blue-200">Overall match</span>
          {job.title && (
            <a href={jobOpenUrl(job)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800">
              <ExternalLink size={15} />
              View Job
            </a>
          )}
        </div>

        <button type="button" onClick={() => onMatch(job)} className="mt-3 w-full rounded-2xl bg-slate-950 p-3 text-left text-sm leading-6 text-slate-300 hover:bg-slate-950/70">
          {job.explanation || 'Click Skill Fit to run explainable matching for this role.'}
        </button>

        <div className="mt-4">
          <RequirementsList job={job} />
        </div>

        {coverLetter && (
          <div className="mt-4 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-fuchsia-200">Cover Letter Draft</h3>
              <button type="button" onClick={onCopyCoverLetter} className="rounded-xl border border-fuchsia-500/30 px-3 py-1.5 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/15">
                Copy Draft
              </button>
            </div>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-left text-sm leading-6 text-slate-300">
              {coverLetter}
            </pre>
          </div>
        )}

        {outreachMessage && (
          <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-blue-200">Platform Message Draft</h3>
              <div className="flex flex-wrap gap-2">
                <a href={jobOpenUrl(job)} target="_blank" rel="noreferrer" className="rounded-xl border border-blue-500/30 px-3 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/15">
                  Open Platform
                </a>
                <button type="button" onClick={onOpenAndCopyMessage} className="rounded-xl border border-blue-500/30 bg-blue-500/15 px-3 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/25">
                  Open & Copy
                </button>
                <button type="button" onClick={onCopyMessage} className="rounded-xl border border-blue-500/30 px-3 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/15">
                  Copy Message
                </button>
                <button type="button" onClick={onMarkMessageSent} className={`rounded-xl border px-3 py-1.5 text-xs font-black ${
                  messageSent
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                    : 'border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}>
                  {messageSent ? 'Message Sent' : 'Mark Sent'}
                </button>
              </div>
            </div>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-left text-sm leading-6 text-slate-300">
              {outreachMessage}
            </pre>
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-amber-300">Matched / Partial</p>
            <div className="flex flex-wrap gap-2">
              {[...(job.matched_skills || []), ...(job.partial_skills || [])].length === 0 ? (
                <button type="button" onClick={() => onMatch(job)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-300">Run Skill Fit</button>
              ) : [...(job.matched_skills || []), ...(job.partial_skills || [])].map((skill) => (
                <button key={skill} type="button" className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-200">{skill}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-rose-300">Missing</p>
            <div className="flex flex-wrap gap-2">
              {(job.missing_skills || []).length === 0 ? (
                <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-400">No gaps loaded</span>
              ) : (job.missing_skills || []).map((skill) => (
                <button key={skill} type="button" className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-black text-rose-200">{skill}</button>
              ))}
            </div>
          </div>
        </div>
        </div>

        <div className="shrink-0 border-t border-slate-800 bg-slate-900/95 px-5 py-3">
          <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onMatch(job)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-500">
            <Sparkles size={16} /> Skill Fit
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-sm font-bold text-fuchsia-200">
            <ClipboardList size={16} /> Requirements
          </button>
          <button type="button" onClick={() => onCoverLetter(job.id)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800">
            <FileText size={16} /> Cover Letter
          </button>
          <button type="button" onClick={() => onMessageDraft(job)} className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-bold text-blue-200 hover:bg-blue-500/15">
            <MessageCircle size={16} /> Message Draft
          </button>
          <button type="button" onClick={() => onSave(job.id)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800">
            <Bookmark size={16} /> {job.saved ? 'Saved' : 'Save'}
          </button>
          <button type="button" onClick={() => onApplyDraft(job)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-3 py-2 text-sm font-black text-white">
            <Send size={16} /> {job.application_status || 'Apply Draft'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage({ token }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [activeLetter, setActiveLetter] = useState('');
  const [activeLetterJobId, setActiveLetterJobId] = useState(null);
  const [activeMessage, setActiveMessage] = useState('');
  const [activeMessageJobId, setActiveMessageJobId] = useState(null);
  const [sentMessageJobIds, setSentMessageJobIds] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [notice, setNotice] = useState('');
  const [activityLog, setActivityLog] = useState([]);

  const filteredJobs = useMemo(
    () => jobs
      .filter((job) => jobMatchesFilters(job, filters))
      .sort((a, b) => Number(b.match_score || 0) - Number(a.match_score || 0)),
    [jobs, filters],
  );

  const platformCounts = useMemo(() => (
    jobs.reduce((counts, job) => {
      const platform = jobPlatform(job);
      const filtersWithoutPlatform = { ...filters, platform: allPlatforms };
      if (!jobMatchesFilters(job, filtersWithoutPlatform)) {
        return counts;
      }
      return { ...counts, [platform]: (counts[platform] || 0) + 1 };
    }, {})
  ), [jobs, filters]);

  const activePlatformLabel = filters.platform.length === allPlatforms.length
    ? 'All Platforms'
    : filters.platform[0] || 'All Platforms';

  const showNotice = (message) => {
    setNotice(message);
    setActivityLog((current) => [`${new Date().toLocaleTimeString()} ${message}`, ...current].slice(0, 8));
    window.clearTimeout(window.__jobbotNoticeTimer);
    window.__jobbotNoticeTimer = window.setTimeout(() => setNotice(''), 2600);
  };

  const runSearch = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setFilters((current) => ({ ...current, platform: allPlatforms }));
    setActivityLog([
      `${new Date().toLocaleTimeString()} Auto platform search started`,
      ...allPlatforms.map((platform) => `${new Date().toLocaleTimeString()} Searching ${platform}`),
      'Resume match ranking enabled',
    ]);
    showNotice('Auto searching all platforms');
    try {
      const result = await searchJobs({ query, location, token });
      setJobs(result.data.jobs || []);
      showNotice(`Listed ${result.data.jobs?.length || 0} resume-related jobs from platforms`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const setSingleFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    showNotice(`Showing jobs matching ${value}`);
  };

  const handlePlatformClick = (platform) => {
    setFilters((current) => ({ ...current, platform: [platform] }));
    const count = platformCounts[platform] || 0;
    showNotice(`Showing ${count} ${platform} jobs and requirements`);
  };

  const showAllPlatforms = () => {
    setFilters((current) => ({ ...current, platform: allPlatforms }));
    showNotice('Showing all resume-matched jobs from every platform');
  };

  const updateJob = (jobId, patch) => {
    setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, ...patch } : job)));
    setActiveJob((current) => (current?.id === jobId ? { ...current, ...patch } : current));
  };

  const handleMatch = async (job) => {
    showNotice('Running skill fit analysis');
    const result = await matchJob({ jobId: job.id, token });
    updateJob(job.id, result.data);
    setActiveJob({ ...job, ...result.data });
    showNotice(`Skill fit: ${result.data.match_score}%`);
  };

  const handleSave = async (jobId) => {
    await saveJob({ jobId, token });
    updateJob(jobId, { saved: true });
    showNotice('Job saved');
  };

  const handleCoverLetter = async (jobId) => {
    const job = jobs.find((item) => item.id === jobId);
    if (job) {
      setActiveJob(job);
    }
    setActiveLetter('');
    setActiveLetterJobId(jobId);
    showNotice('Generating cover letter');
    const result = await generateCoverLetter({ jobId, token });
    setActiveLetter(result.data.content);
    showNotice('Cover letter ready');
  };

  const handleMessageDraft = (job) => {
    setActiveJob(job);
    setActiveMessageJobId(job.id);
    setActiveMessage(buildOutreachMessage(job));
    showNotice('Message draft ready. Copy it and send manually on the platform.');
  };

  const handleOpenAndCopyMessage = () => {
    if (!activeJob || !activeMessage) return;
    navigator.clipboard?.writeText(activeMessage);
    window.open(jobOpenUrl(activeJob), '_blank', 'noopener,noreferrer');
    showNotice('Message copied. Platform opened for manual send.');
  };

  const handleMarkMessageSent = () => {
    if (!activeJob) return;
    setSentMessageJobIds((current) => (
      current.includes(activeJob.id) ? current : [...current, activeJob.id]
    ));
    showNotice('Message marked as sent');
  };

  const handleApplyDraft = async (jobOrId) => {
    const job = typeof jobOrId === 'object' ? jobOrId : jobs.find((item) => item.id === jobOrId);
    const jobId = typeof jobOrId === 'object' ? jobOrId.id : jobOrId;
    const result = await createApplication({ jobId, token });
    updateJob(jobId, { application_status: result.data.application.status });
    showNotice('Application draft created');
    if (job) {
      openApplyReview(job);
    }
  };

  const stopSearch = () => {
    setLoading(false);
    showNotice('Search stopped');
  };

  const openAllPlatforms = () => {
    setFilters((current) => ({ ...current, platform: [...filterOptions.platform] }));
    showNotice('Showing jobs from all available platforms');
  };

  const openApplyReview = (job) => {
    const url = jobOpenUrl(job);
    window.open(url, '_blank', 'noopener,noreferrer');
    showNotice(`Opening ${jobPlatform(job)} for manual apply review`);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <aside className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
        <button type="button" onClick={runSearch} className="text-left text-xl font-black text-white hover:text-fuchsia-200">Search Settings</button>
        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="text-sm font-bold text-slate-400">Job Role / Title</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="e.g. Python Developer" className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-fuchsia-500" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-400">Location</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="e.g. Pune" className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-fuchsia-500" />
          </label>

          {Object.entries(filterOptions).map(([key, values]) => (
            <div key={key}>
              <p className="mb-2 text-sm font-bold capitalize text-slate-400">
                {key === 'posted' ? 'Posted Within' : key === 'platform' ? 'Platforms - click to filter jobs' : key}
              </p>
              {key === 'platform' && (
                <button
                  type="button"
                  onClick={showAllPlatforms}
                  className={`mb-2 rounded-full border px-3 py-1.5 text-xs font-black transition ${
                    filters.platform.length === allPlatforms.length
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  All Platforms
                </button>
              )}
              <div className="flex flex-wrap gap-2">
                {values.map((item) => (
                  <FilterChip
                    key={item}
                    label={key === 'platform' ? `${item} (${platformCounts[item] || 0})` : item}
                    active={key === 'platform' ? filters.platform.includes(item) : filters[key] === item}
                    onClick={() => (key === 'platform' ? handlePlatformClick(item) : setSingleFilter(key, item))}
                  />
                ))}
              </div>
            </div>
          ))}

          <label className="block">
            <span className="text-sm font-bold text-slate-400">Max jobs to scrape</span>
            <button type="button" onClick={() => showNotice('Max jobs set to 30')} className="mt-2 w-28 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white outline-none hover:border-fuchsia-500">30</button>
          </label>

          <button type="button" onClick={runSearch} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-4 py-3 text-sm font-black text-white shadow-[0_0_30px_rgba(236,72,153,0.26)] disabled:opacity-60">
            <Search size={17} />
            {loading ? 'Searching Platforms...' : 'Auto Search Platforms'}
          </button>
          <button type="button" onClick={openAllPlatforms} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-200 hover:bg-blue-500/15">
            Show All Platforms
          </button>

          <div className="rounded-2xl border border-slate-800 bg-[#070b15] p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
              <Globe2 size={16} />
              Browser Activity
            </div>
            <div className="space-y-2 font-mono text-[11px]">
              {activityLog.length === 0 ? (
                <p className="rounded-lg bg-slate-950 px-2 py-2 text-slate-500">No search activity yet.</p>
              ) : activityLog.map((line, index) => (
                <button key={`${line}-${index}`} type="button" onClick={() => showNotice(line)} className="block w-full rounded-lg bg-slate-950 px-2 py-2 text-left text-blue-300 hover:bg-slate-900">
                  {line}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0 space-y-5">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 md:flex-row md:items-center md:justify-between">
          <button type="button" onClick={runSearch} className="text-left">
            <h1 className="text-2xl font-black text-white hover:text-fuchsia-200">Search Jobs</h1>
            <p className="text-sm text-slate-400">All available jobs are scored against your resume and sorted by match.</p>
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => showNotice(`Active platform: ${activePlatformLabel}`)} className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-sm font-bold text-blue-200 hover:bg-blue-500/15">{activePlatformLabel}</button>
            <button type="button" onClick={() => showNotice(`${filteredJobs.length} jobs listed from ${jobs.length} found`)} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/15">Listed {filteredJobs.length}/{jobs.length}</button>
            <button type="button" onClick={stopSearch} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/15">Stop</button>
          </div>
        </div>

        {notice && <button type="button" onClick={() => setNotice('')} className="w-full rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-3 text-left text-sm font-bold text-fuchsia-100">{notice}</button>}
        {error && <button type="button" onClick={() => setError('')} className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-left text-sm text-rose-200">{error}</button>}

        <div className="grid gap-3 xl:grid-cols-2">
          {jobs.length === 0 ? (
            <button type="button" onClick={runSearch} className="w-full rounded-3xl border border-slate-800 bg-slate-950/70 p-10 text-center text-slate-500 hover:border-fuchsia-500/40 xl:col-span-2">No jobs found yet. Click to search.</button>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-10 text-center xl:col-span-2">
              <p className="text-lg font-black text-white">No recommended jobs for selected filters</p>
              <p className="mt-2 text-sm text-slate-500">Example: Fresher/0-1 yr will hide 2-4 yr and 3-5 yr jobs. Change filters to see matching jobs.</p>
            </div>
          ) : filteredJobs.map((job) => (
            <article key={`${job.source}-${job.external_id || job.id}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 transition hover:border-fuchsia-500/40 hover:bg-slate-950">
              <button type="button" onClick={() => setActiveJob(job)} className="w-full text-left">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-white hover:text-fuchsia-200">{job.title}</h2>
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300">LIVE</span>
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">{job.company} - {job.location || 'Remote'} - {jobPlatform(job)}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{job.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[job.employment_type, job.experience_required, job.salary].filter(Boolean).map((item) => (
                        <span key={item} className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">{item}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-lg font-black text-fuchsia-300">{job.match_score ?? 0}%</p>
                    <p className="text-[11px] font-bold text-slate-500">match</p>
                  </div>
                </div>
              </button>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => handleMatch(job)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-blue-500">
                  <Sparkles size={15} /> Skill Fit
                </button>
                <button type="button" onClick={() => setActiveJob(job)} className="inline-flex items-center gap-1 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-1.5 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-500/15">
                  <ClipboardList size={15} /> Requirements
                </button>
                <button type="button" onClick={() => handleCoverLetter(job.id)} className="inline-flex items-center gap-1 rounded-xl border border-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-900">
                  <FileText size={15} /> Cover Letter
                </button>
                <button type="button" onClick={() => handleMessageDraft(job)} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold ${
                  sentMessageJobIds.includes(job.id)
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-blue-500/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15'
                }`}>
                  <MessageCircle size={15} /> {sentMessageJobIds.includes(job.id) ? 'Message Sent' : 'Message Draft'}
                </button>
                <button type="button" onClick={() => handleSave(job.id)} className="inline-flex items-center gap-1 rounded-xl border border-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-900">
                  <Bookmark size={15} /> {job.saved ? 'Saved' : 'Save'}
                </button>
                <button type="button" onClick={() => handleApplyDraft(job)} className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-2.5 py-1.5 text-xs font-black text-white">
                  <Send size={15} /> {job.application_status || 'Apply Draft'}
                </button>
                {job.title && (
                  <a href={jobOpenUrl(job)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-900">
                    <ExternalLink size={15} /> View Job
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

      </section>

      <JobModal
        job={activeJob}
        coverLetter={activeJob && activeLetterJobId === activeJob.id ? activeLetter : ''}
        outreachMessage={activeJob && activeMessageJobId === activeJob.id ? activeMessage : ''}
        messageSent={Boolean(activeJob && sentMessageJobIds.includes(activeJob.id))}
        onClose={() => setActiveJob(null)}
        onMatch={handleMatch}
        onCoverLetter={handleCoverLetter}
        onSave={handleSave}
        onApplyDraft={handleApplyDraft}
        onMessageDraft={handleMessageDraft}
        onCopyCoverLetter={() => navigator.clipboard?.writeText(activeLetter).then(() => showNotice('Cover letter copied'))}
        onCopyMessage={() => navigator.clipboard?.writeText(activeMessage).then(() => showNotice('Message copied'))}
        onOpenAndCopyMessage={handleOpenAndCopyMessage}
        onMarkMessageSent={handleMarkMessageSent}
      />
    </div>
  );
}
