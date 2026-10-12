import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BriefcaseBusiness, FileUp, GraduationCap, Lightbulb, ShieldCheck, Sparkles } from 'lucide-react';
import { analyzeResume, listResumes, uploadResume } from '../services/api';

const scanSteps = [
  'Reading PDF content',
  'Extracting profile details',
  'Detecting skills and experience',
  'Calculating ATS score',
];

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function ScoreRing({ score, empty = false }) {
  const value = Number(score || 0);
  const label = empty ? 'No resume' : value >= 75 ? 'Strong' : value >= 50 ? 'Improve' : 'Low';
  return (
    <div className="flex h-44 w-44 items-center justify-center rounded-full border-[14px] border-blue-500 bg-slate-950 shadow-[0_0_35px_rgba(59,130,246,0.25)]">
      <div className="text-center">
        <p className="text-5xl font-black text-white">{value}</p>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function CategoryBar({ label, score, max, status, feedback }) {
  const pct = Math.min(100, Math.round((score / Math.max(1, max)) * 100));
  const color = pct >= 75 ? 'bg-emerald-400' : pct >= 45 ? 'bg-blue-500' : 'bg-rose-500';
  const statusColor = pct >= 75 ? 'text-emerald-300' : pct >= 45 ? 'text-blue-300' : 'text-rose-300';
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[150px_1fr_52px] items-center gap-3 text-sm">
        <span className="truncate font-semibold text-slate-300">{label}</span>
        <div className="h-2 rounded-full bg-slate-800">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-right text-xs font-bold text-slate-400">{score}/{max}</span>
      </div>
      {(status || feedback) && (
        <p className="pl-[162px] text-xs leading-5 text-slate-500">
          {status && <span className={`font-bold ${statusColor}`}>{status}: </span>}
          {feedback}
        </p>
      )}
    </div>
  );
}

export default function ResumePage({ token }) {
  const scanSectionRef = useRef(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [error, setError] = useState('');
  const [atsResults, setAtsResults] = useState({});

  const activeResume = resumes.find((resume) => resume.id === selectedResumeId) || resumes[0];
  const hasResume = Boolean(activeResume);
  const parsed = activeResume?.parsed_data || {};
  const skills = useMemo(() => [
    ...(parsed.technical_skills || []),
    ...(parsed.skills || []),
  ].filter(Boolean).slice(0, 12), [parsed]);

  const loadResumes = async () => {
    if (!token) return;
    try {
      const result = await listResumes(token);
      const items = result.data.resumes || [];
      setResumes(items);
      setSelectedResumeId((current) => current || items[0]?.id || null);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [token]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setLoading(true);
    setScanStep(0);
    setError('');
    setSelectedFile(file.name);

    window.setTimeout(() => {
      scanSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    const startedAt = Date.now();
    const scanTimer = window.setInterval(() => {
      setScanStep((current) => Math.min(current + 1, scanSteps.length - 1));
    }, 700);

    try {
      const result = await uploadResume({ file, token });
      const resumeId = result.data.resume.id;
      const analysis = await analyzeResume({ resumeId, token });
      const remainingScanTime = Math.max(0, 2600 - (Date.now() - startedAt));

      if (remainingScanTime > 0) {
        await wait(remainingScanTime);
      }

      setScanStep(scanSteps.length);
      setAtsResults((current) => ({ ...current, [resumeId]: analysis.data }));
      setSelectedResumeId(resumeId);
      await loadResumes();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      window.clearInterval(scanTimer);
      setLoading(false);
      event.target.value = null;
    }
  };

  const atsResult = activeResume ? atsResults[activeResume.id] || activeResume.ats_analysis : null;
  const score = atsResult?.score ?? activeResume?.ats_score ?? 0;
  const categories = atsResult?.categories || {};
  const issues = atsResult?.issues || [];
  const improvements = atsResult?.improvements || [];

  const renderList = (title, items, icon) => {
    const Icon = icon;
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Icon className="text-fuchsia-300" size={18} />
          <h3 className="text-lg font-black text-white">{title}</h3>
        </div>
        {!items?.length ? (
          <p className="text-sm text-slate-500">No {title.toLowerCase()} found in the selected resume.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={`${title}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                {typeof item === 'string' ? item : (
                  <div className="space-y-1">
                    {Object.entries(item).map(([key, value]) => (
                      value && (!Array.isArray(value) || value.length > 0) ? (
                        <p key={key}><span className="font-bold capitalize text-slate-100">{key.replaceAll('_', ' ')}:</span> {Array.isArray(value) ? value.join(', ') : value}</p>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_0_40px_rgba(15,23,42,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Upload Resume</p>
          <h1 className="mt-2 text-2xl font-black text-white">Start by uploading your resume PDF</h1>
          <label className="mt-6 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-fuchsia-500/40 bg-fuchsia-500/10 p-6 text-center transition hover:bg-fuchsia-500/15">
            <FileUp className="text-fuchsia-300" size={36} />
            <span className="mt-3 text-sm font-black text-white">{loading ? 'Parsing resume...' : 'Drop or choose PDF'}</span>
            <span className="mt-2 text-xs text-slate-400">PyMuPDF extraction plus validated profile parsing</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
          </label>
          {selectedFile && <p className="mt-4 rounded-xl bg-slate-900 p-3 text-sm text-slate-300">Selected: {selectedFile}</p>}
          {error && <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
          <Link
            to="/resume-library"
            className="mt-6 flex w-full items-center justify-center rounded-2xl border border-slate-800 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-900"
          >
            Manage Uploaded Resumes
          </Link>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Candidate Profile</p>
              <h2 className="mt-2 text-3xl font-black text-white">{parsed.name || 'Upload a resume to build your profile'}</h2>
              <p className="mt-2 text-sm text-slate-400">{activeResume?.file_name || 'Contact info, skills, education, projects, and experience will appear here.'}</p>
              {hasResume ? (
                <div className="mt-4 grid gap-2 text-sm text-slate-400 md:grid-cols-2">
                  <p><span className="font-bold text-slate-200">Email:</span> {parsed.email || 'Not found'}</p>
                  <p><span className="font-bold text-slate-200">Phone:</span> {parsed.phone || 'Not found'}</p>
                  <p><span className="font-bold text-slate-200">Location:</span> {parsed.location || 'Not found'}</p>
                  <p><span className="font-bold text-slate-200">Summary:</span> {parsed.summary || 'Not found'}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
                  Profile details will appear after upload.
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {!hasResume ? (
                  <span className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-500">Upload a resume to detect skills</span>
                ) : skills.length === 0 ? (
                  <span className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-500">No skills detected</span>
                ) : skills.map((skill) => (
                  <span key={skill} className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300">{skill}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} />
                ATS-style estimate
              </div>
            </div>
          </div>
        </section>
      </div>

      <section ref={scanSectionRef} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="mb-6 flex items-center gap-3">
          <Sparkles className="text-fuchsia-300" size={20} />
          <h2 className="text-xl font-black text-white">ATS Score & Recommendations</h2>
        </div>
        {loading && (
          <div className="mb-6 rounded-3xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-fuchsia-300">Scanning Resume</p>
                <p className="mt-2 text-sm text-slate-300">{scanSteps[Math.min(scanStep, scanSteps.length - 1)]}</p>
              </div>
              <div className="flex items-center gap-2">
                {scanSteps.map((step, index) => (
                  <span
                    key={step}
                    className={`h-2 w-12 rounded-full transition ${
                      index <= scanStep ? 'bg-fuchsia-300 shadow-[0_0_14px_rgba(217,70,239,0.6)]' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-blue-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, ((scanStep + 1) / scanSteps.length) * 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <div className="flex justify-center">
            <ScoreRing score={score} empty={!hasResume} />
          </div>
          <div className="space-y-4">
            {!hasResume ? (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500">
                Upload a resume to generate ATS category ratings.
              </div>
            ) : Object.keys(categories).length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-500">
                ATS category ratings will appear after analysis finishes.
              </div>
            ) : Object.entries(categories).map(([label, value]) => (
              <CategoryBar
                key={label}
                label={label}
                score={value.score}
                max={value.max}
                status={value.status}
                feedback={value.feedback}
              />
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="text-rose-300" size={18} />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">Issues Found</p>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              {!hasResume ? (
                <p className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">No resume uploaded yet.</p>
              ) : issues.length === 0 ? (
                <p className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">Run ATS analysis to see exact missing points.</p>
              ) : issues.map((item) => (
                <p key={item} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-100">{item}</p>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="text-amber-300" size={18} />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Improvement Plan</p>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              {!hasResume ? (
                <p className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">Upload a resume to get prioritized improvement steps.</p>
              ) : improvements.length === 0 ? (
                <p className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">Upload or select a resume to get prioritized improvement steps.</p>
              ) : improvements.map((item, index) => (
                <div key={`${item.category}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{item.category}</p>
                  <p className="mt-1 font-bold text-white">{item.issue}</p>
                  <p className="mt-1 text-slate-400">{item.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Strengths</p>
            <div className="space-y-3 text-sm text-slate-300">
              {(!hasResume ? ['No resume uploaded yet.'] : atsResult?.strengths?.length ? atsResult.strengths : ['Strengths will appear after resume analysis.']).map((item) => (
                <p key={item} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">{item}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-amber-300">Recommendations</p>
            <div className="space-y-3 text-sm text-slate-300">
              {(!hasResume ? ['Upload a resume to see recommendations.'] : atsResult?.recommendations?.length ? atsResult.recommendations : ['Recommendations will appear after resume analysis.']).map((item) => (
                <p key={item} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">{item}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {hasResume && renderList('Experience', parsed.experience || [], BriefcaseBusiness)}
        {hasResume && renderList('Education', parsed.education || [], GraduationCap)}
        {hasResume && renderList('Projects', parsed.projects || [], Sparkles)}
        {hasResume && renderList('Certifications', parsed.certifications || [], ShieldCheck)}
        {hasResume && renderList('Achievements', parsed.achievements || [], Sparkles)}
      </div>
    </div>
  );
}
