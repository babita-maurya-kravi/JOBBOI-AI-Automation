import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  BriefcaseBusiness,
  ClipboardList,
  ExternalLink,
  FileText,
  Flag,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import {
  createApplication,
  generateSocialPostCoverLetter,
  importSocialPost,
  matchSocialPost,
  saveSocialPost,
  searchSocialPosts,
  sendSocialPostFeedback,
} from '../services/api';

const platforms = ['LinkedIn', 'X', 'Company Announcement', 'Community Post'];
const classifications = [
  'Recruiter / HR Job Post',
  'Company Hiring Announcement',
  'Internship Opportunity',
  'Referral Opportunity',
  'Freelance / Contract Opportunity',
  'Structured Job Listing',
  'Uncertain / Needs Review',
];

const initialFilters = {
  platform: 'Any',
  classification: 'Any',
  employmentType: 'Any',
  workMode: 'Any',
  minMatchScore: 0,
  sortBy: 'Match score',
  includeNonJobs: false,
};

function toneForClassification(type = '') {
  if (type.includes('Internship')) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (type.includes('Referral')) return 'border-blue-500/30 bg-blue-500/10 text-blue-200';
  if (type.includes('Freelance')) return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (type.includes('Uncertain')) return 'border-slate-600 bg-slate-800 text-slate-300';
  return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200';
}

function formatDate(value, fallback = 'Date unavailable') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString();
}

function postTitle(post) {
  return post.job_title || post.job?.title || 'Role unavailable';
}

function postCompany(post) {
  return post.company_name || post.job?.company || post.author_name || 'Company unavailable';
}

function postUrl(post) {
  return post.application_url || post.original_post_url || post.job?.url || '';
}

function buildRecruiterMessage(post) {
  const skills = (post.matched_skills || []).slice(0, 4);
  const skillText = skills.length ? ` My background matches ${skills.join(', ')}.` : '';
  return [
    `Hi ${post.author_name || postCompany(post) || 'there'},`,
    '',
    `I saw your post about ${postTitle(post)} and wanted to express my interest.${skillText}`,
    '',
    'I would be happy to share my resume and discuss the next step if the role is still open.',
    '',
    'Thanks,',
    'Candidate',
  ].join('\n');
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-fuchsia-500"
      >
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function DetailsModal({ post, coverLetter, recruiterMessage, onClose, onCopyCover, onCopyMessage }) {
  if (!post) return null;
  const url = postUrl(post);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[calc(100vh-32px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-white">{postTitle(post)}</h2>
              <span className={`rounded-lg border px-2 py-1 text-xs font-black ${toneForClassification(post.classification_type)}`}>
                {post.classification_type}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              {postCompany(post)} - {post.platform} - {post.location || post.work_mode || 'Location unavailable'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ['Match', `${post.match_score ?? 0}%`],
              ['Confidence', `${Math.round(Number(post.confidence_score || 0) * 100)}%`],
              ['Work mode', post.work_mode || 'Unavailable'],
              ['Freshers', post.fresher_eligible || 'Unknown'],
            ].map(([label, value]) => (
              <button key={label} type="button" className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-left">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-black text-white">{value}</p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-fuchsia-200">Original Post Text</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{post.post_text}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Matched Skills</p>
              <div className="flex flex-wrap gap-2">
                {(post.matched_skills || []).length ? post.matched_skills.map((skill) => (
                  <span key={skill} className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-200">{skill}</span>
                )) : <span className="text-sm text-slate-500">No resume skill match loaded.</span>}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-rose-300">Missing Skills</p>
              <div className="flex flex-wrap gap-2">
                {(post.missing_skills || []).length ? post.missing_skills.map((skill) => (
                  <span key={skill} className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-xs font-black text-rose-200">{skill}</span>
                )) : <span className="text-sm text-slate-500">No missing skills detected.</span>}
              </div>
            </div>
          </div>

          {post.explanation && (
            <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
              {post.explanation}
            </div>
          )}

          {coverLetter && (
            <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-200">Cover Letter Draft</p>
                <button type="button" onClick={onCopyCover} className="rounded-xl border border-fuchsia-500/30 px-3 py-1.5 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/15">Copy</button>
              </div>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-300">{coverLetter}</pre>
            </div>
          )}

          {recruiterMessage && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Recruiter Message Draft</p>
                <button type="button" onClick={onCopyMessage} className="rounded-xl border border-blue-500/30 px-3 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/15">Copy</button>
              </div>
              <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-300">{recruiterMessage}</pre>
            </div>
          )}

          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800">
              <ExternalLink size={16} />
              View Original Post
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SocialJobPostsPage({ token }) {
  const [posts, setPosts] = useState([]);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [unsupportedSources, setUnsupportedSources] = useState([]);
  const [activePost, setActivePost] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [recruiterMessage, setRecruiterMessage] = useState('');
  const [importForm, setImportForm] = useState({ url: '', platform: 'LinkedIn', author: '', text: '' });
  const [visibleCount, setVisibleCount] = useState(12);

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(window.__jobbotSocialNoticeTimer);
    window.__jobbotSocialNoticeTimer = window.setTimeout(() => setNotice(''), 2800);
  };

  const filteredPosts = useMemo(() => {
    const result = posts.filter((post) => {
      if (!filters.includeNonJobs && post.classification_type === 'Non-Job Post') return false;
      if (filters.platform !== 'Any' && post.platform !== filters.platform) return false;
      if (filters.classification !== 'Any' && post.classification_type !== filters.classification) return false;
      if (filters.employmentType !== 'Any' && !String(post.employment_type || '').toLowerCase().includes(filters.employmentType.toLowerCase())) return false;
      if (filters.workMode !== 'Any' && !String(post.work_mode || '').toLowerCase().includes(filters.workMode.toLowerCase())) return false;
      if (Number(post.match_score || 0) < Number(filters.minMatchScore || 0)) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      if (filters.sortBy === 'Newest') {
        return new Date(b.publication_date || b.first_discovered_at || 0) - new Date(a.publication_date || a.first_discovered_at || 0);
      }
      if (filters.sortBy === 'Deadline') {
        return new Date(a.application_deadline || '2999-01-01') - new Date(b.application_deadline || '2999-01-01');
      }
      if (filters.sortBy === 'Confidence') {
        return Number(b.confidence_score || 0) - Number(a.confidence_score || 0);
      }
      return Number(b.match_score || 0) - Number(a.match_score || 0);
    });
  }, [posts, filters]);

  const runSearch = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const result = await searchSocialPosts({
        query,
        location,
        platforms: filters.platform === 'Any' ? [] : [filters.platform],
        minMatchScore: filters.minMatchScore,
        classifications: filters.classification === 'Any' ? [] : [filters.classification],
        employmentType: filters.employmentType,
        workMode: filters.workMode,
        includeNonJobs: filters.includeNonJobs,
        token,
      });
      setPosts(result.data.posts || []);
      setUnsupportedSources(result.data.unsupported_sources || []);
      setVisibleCount(12);
      showNotice(`Found ${result.data.posts?.length || 0} social job posts matched with your resume`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePost = (postId, patch) => {
    setPosts((current) => current.map((post) => (post.id === postId ? { ...post, ...patch } : post)));
    setActivePost((current) => (current?.id === postId ? { ...current, ...patch } : current));
  };

  const handleImport = async () => {
    if (!importForm.text.trim()) {
      setError('Paste the post text before importing.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await importSocialPost({
        postText: importForm.text,
        originalPostUrl: importForm.url,
        platform: importForm.platform,
        authorName: importForm.author,
        token,
      });
      const imported = result.data.post;
      setPosts((current) => [imported, ...current.filter((post) => post.id !== imported.id)]);
      setImportForm({ url: '', platform: 'LinkedIn', author: '', text: '' });
      setActivePost(imported);
      showNotice('Social post imported and matched with your resume');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async (post) => {
    const result = await matchSocialPost({ postId: post.id, token });
    updatePost(post.id, result.data);
    showNotice(`Resume match: ${result.data.match_score || 0}%`);
  };

  const handleSave = async (post) => {
    const result = await saveSocialPost({ postId: post.id, token });
    updatePost(post.id, { saved: true, job_id: result.data.job_id });
    showNotice('Social job post saved');
  };

  const handleFeedback = async (post, feedback) => {
    await sendSocialPostFeedback({ postId: post.id, feedback, token });
    updatePost(post.id, {
      user_feedback: feedback,
      status: feedback === 'SUSPICIOUS' ? 'SUSPICIOUS' : feedback === 'NOT_RELEVANT' ? 'DISMISSED' : post.status,
    });
    showNotice(feedback === 'SUSPICIOUS' ? 'Post marked for review' : 'Feedback saved');
  };

  const handleCoverLetter = async (post) => {
    setActivePost(post);
    setRecruiterMessage('');
    setCoverLetter('');
    const result = await generateSocialPostCoverLetter({ postId: post.id, token });
    setCoverLetter(result.data.content);
    showNotice('Cover letter draft ready');
  };

  const handleMessageDraft = (post) => {
    setActivePost(post);
    setCoverLetter('');
    setRecruiterMessage(buildRecruiterMessage(post));
    showNotice('Recruiter message draft ready');
  };

  const handleApplyDraft = async (post) => {
    let jobId = post.job_id;
    if (!jobId) {
      const result = await saveSocialPost({ postId: post.id, token });
      jobId = result.data.job_id;
      updatePost(post.id, { saved: true, job_id: jobId });
    }
    if (!jobId) {
      showNotice('Save the job-related post first, then create an apply draft');
      return;
    }
    await createApplication({ jobId, token });
    showNotice('Application draft added to Auto Apply');
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setQuery('');
    setLocation('');
    showNotice('Social post filters reset');
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <aside className="space-y-5">
        <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-300">Social Job Posts</p>
              <h1 className="mt-1 text-xl font-black text-white">Search Settings</h1>
            </div>
            <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-800 p-2 text-slate-300 hover:bg-slate-900" title="Reset filters">
              <RotateCcw size={17} />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-400">Keyword / Skill / Company</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="e.g. React fresher" className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-fuchsia-500" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-400">Location</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="e.g. Pune, Remote" className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-fuchsia-500" />
            </label>

            <SelectField label="Platform" value={filters.platform} onChange={(value) => setFilters((current) => ({ ...current, platform: value }))} options={['Any', ...platforms]} />
            <SelectField label="Post Type" value={filters.classification} onChange={(value) => setFilters((current) => ({ ...current, classification: value }))} options={['Any', ...classifications, 'Non-Job Post']} />
            <SelectField label="Employment" value={filters.employmentType} onChange={(value) => setFilters((current) => ({ ...current, employmentType: value }))} options={['Any', 'Full-time', 'Part-time', 'Internship', 'Contract']} />
            <SelectField label="Work Mode" value={filters.workMode} onChange={(value) => setFilters((current) => ({ ...current, workMode: value }))} options={['Any', 'Remote', 'Hybrid', 'On-site']} />
            <SelectField label="Sort" value={filters.sortBy} onChange={(value) => setFilters((current) => ({ ...current, sortBy: value }))} options={['Match score', 'Newest', 'Confidence', 'Deadline']} />

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Minimum Match Score</span>
              <input type="range" min="0" max="100" value={filters.minMatchScore} onChange={(event) => setFilters((current) => ({ ...current, minMatchScore: Number(event.target.value) }))} className="mt-3 w-full accent-fuchsia-500" />
              <div className="mt-1 text-sm font-black text-fuchsia-200">{filters.minMatchScore}%</div>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-bold text-slate-300">
              <input type="checkbox" checked={filters.includeNonJobs} onChange={(event) => setFilters((current) => ({ ...current, includeNonJobs: event.target.checked }))} className="accent-fuchsia-500" />
              Include non-job classifications
            </label>

            <button type="button" onClick={runSearch} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-4 py-3 text-sm font-black text-white disabled:opacity-60">
              {loading ? <RefreshCw className="animate-spin" size={17} /> : <Search size={17} />}
              {loading ? 'Searching Posts...' : 'Search Social Posts'}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-sm font-black text-white">Import Post URL / Text</p>
          <div className="mt-4 space-y-3">
            <input value={importForm.url} onChange={(event) => setImportForm((current) => ({ ...current, url: event.target.value }))} placeholder="Original post URL" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-fuchsia-500" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <select value={importForm.platform} onChange={(event) => setImportForm((current) => ({ ...current, platform: event.target.value }))} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-fuchsia-500">
                {platforms.map((platform) => <option key={platform}>{platform}</option>)}
              </select>
              <input value={importForm.author} onChange={(event) => setImportForm((current) => ({ ...current, author: event.target.value }))} placeholder="Author / recruiter" className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-fuchsia-500" />
            </div>
            <textarea value={importForm.text} onChange={(event) => setImportForm((current) => ({ ...current, text: event.target.value }))} rows={6} placeholder="Paste recruiter post, HR announcement, referral post, or hiring update..." className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold leading-6 text-white outline-none focus:border-fuchsia-500" />
            <button type="button" onClick={handleImport} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-200 hover:bg-blue-500/15 disabled:opacity-60">
              <ClipboardList size={17} />
              Classify & Match
            </button>
          </div>
        </section>
      </aside>

      <section className="min-w-0 space-y-5">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">Social Job Posts</h1>
              <p className="mt-1 text-sm text-slate-400">Recruiter posts, hiring announcements, referrals, internships, and informal opportunities scored against your resume.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => showNotice(`${filteredPosts.length} posts visible from ${posts.length} loaded`)} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-bold text-emerald-300">
                Listed {filteredPosts.length}/{posts.length}
              </button>
              <button type="button" onClick={runSearch} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-sm font-black text-slate-200 hover:bg-slate-900 disabled:opacity-60">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {notice && <button type="button" onClick={() => setNotice('')} className="mt-5 w-full rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-3 text-left text-sm font-bold text-fuchsia-100">{notice}</button>}
          {error && <button type="button" onClick={() => setError('')} className="mt-5 w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-left text-sm text-rose-200">{error}</button>}

          {unsupportedSources.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-amber-200">
                <AlertTriangle size={17} />
                Unsupported source notice
              </div>
              {unsupportedSources.map((item) => (
                <p key={item.platform} className="mt-2 text-sm leading-6 text-amber-100/80">{item.platform}: {item.reason}</p>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {posts.length === 0 ? (
            <button type="button" onClick={runSearch} className="w-full rounded-3xl border border-slate-800 bg-slate-950/70 p-10 text-center text-slate-500 hover:border-fuchsia-500/40 xl:col-span-2">
              No social posts loaded yet. Search demo social posts or import a recruiter post.
            </button>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-10 text-center xl:col-span-2">
              <p className="text-lg font-black text-white">No posts match selected filters</p>
              <p className="mt-2 text-sm text-slate-500">Reset filters or lower the minimum resume match score.</p>
            </div>
          ) : filteredPosts.slice(0, visibleCount).map((post) => {
            const url = postUrl(post);
            return (
              <article key={post.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-fuchsia-500/40 hover:bg-slate-950">
                <button type="button" onClick={() => setActivePost(post)} className="w-full text-left">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <BriefcaseBusiness className="text-fuchsia-300" size={18} />
                        <h2 className="text-base font-black text-white hover:text-fuchsia-200">{postTitle(post)}</h2>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${toneForClassification(post.classification_type)}`}>{post.classification_type}</span>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                        {postCompany(post)} - {post.platform} - {post.location || post.work_mode || 'Location unavailable'}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{post.post_text}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[post.employment_type, post.experience_requirement, post.work_mode, formatDate(post.publication_date, 'Discovered recently')].filter(Boolean).map((item) => (
                          <span key={item} className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">{item}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-lg font-black text-fuchsia-300">{post.match_score ?? 0}%</p>
                      <p className="text-[11px] font-bold text-slate-500">resume match</p>
                      <p className="mt-2 text-xs font-bold text-blue-300">{Math.round(Number(post.confidence_score || 0) * 100)}% confidence</p>
                    </div>
                  </div>
                </button>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => handleMatch(post)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-blue-500">
                    <Sparkles size={15} /> Skill Fit
                  </button>
                  <button type="button" onClick={() => setActivePost(post)} className="inline-flex items-center gap-1 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-1.5 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-500/15">
                    <ClipboardList size={15} /> Details
                  </button>
                  <button type="button" onClick={() => handleSave(post)} className="inline-flex items-center gap-1 rounded-xl border border-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-900">
                    <Bookmark size={15} /> {post.saved ? 'Saved' : 'Save'}
                  </button>
                  <button type="button" onClick={() => handleCoverLetter(post)} className="inline-flex items-center gap-1 rounded-xl border border-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-900">
                    <FileText size={15} /> Cover Letter
                  </button>
                  <button type="button" onClick={() => handleMessageDraft(post)} className="inline-flex items-center gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-bold text-blue-200 hover:bg-blue-500/15">
                    <MessageCircle size={15} /> Message
                  </button>
                  <button type="button" onClick={() => handleApplyDraft(post)} className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-2.5 py-1.5 text-xs font-black text-white">
                    <Send size={15} /> Apply Draft
                  </button>
                  <button type="button" onClick={() => handleFeedback(post, 'NOT_RELEVANT')} className="inline-flex items-center gap-1 rounded-xl border border-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-900">
                    <X size={15} /> Not Relevant
                  </button>
                  <button type="button" onClick={() => handleFeedback(post, 'SUSPICIOUS')} className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/15">
                    <Flag size={15} /> Suspicious
                  </button>
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-900">
                      <ExternalLink size={15} /> Original
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {filteredPosts.length > visibleCount && (
          <button type="button" onClick={() => setVisibleCount((current) => current + 12)} className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-900">
            Load more posts
          </button>
        )}
      </section>

      <DetailsModal
        post={activePost}
        coverLetter={coverLetter}
        recruiterMessage={recruiterMessage}
        onClose={() => setActivePost(null)}
        onCopyCover={() => navigator.clipboard?.writeText(coverLetter).then(() => showNotice('Cover letter copied'))}
        onCopyMessage={() => navigator.clipboard?.writeText(recruiterMessage).then(() => showNotice('Recruiter message copied'))}
      />
    </div>
  );
}
