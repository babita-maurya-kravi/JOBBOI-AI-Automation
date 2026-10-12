import { useState } from 'react';
import { Briefcase, PlayCircle, Sparkles } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: 'demo@jobbot.ai',
    password: 'password123',
    phone: '',
    location: 'Bengaluru, India',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = mode === 'login'
        ? await loginUser({ email: form.email, password: form.password })
        : await registerUser({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          location: form.location,
        });

      onAuth(data.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-fuchsia-500';

  return (
    <div className="grid min-h-screen bg-[#050714] text-slate-100 lg:grid-cols-[1fr_480px]">
      <section className="relative hidden overflow-hidden border-r border-slate-800 p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-xl">
          <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-fuchsia-500 to-blue-500 text-white shadow-[0_0_60px_rgba(236,72,153,0.4)]">
            <Briefcase size={54} />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-fuchsia-300">AutoJob Apply</p>
          <h1 className="mt-5 text-6xl font-black leading-tight text-white">Automate. Optimize. Get Hired.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
            AI-powered job search, ATS-style resume review, skill-gap analysis, cover letters, and safe application workflow control.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-6 py-3 text-sm font-black text-white shadow-[0_0_30px_rgba(236,72,153,0.3)]">
              Get Started
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-6 py-3 text-sm font-black text-slate-200">
              <PlayCircle size={18} />
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-[0_0_60px_rgba(15,23,42,0.55)]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-blue-500 text-white">
              <Sparkles size={25} />
            </div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-fuchsia-300">Auto Apply Engine</p>
            <h1 className="mt-2 text-3xl font-black text-white">{mode === 'login' ? 'Login to AutoJob Apply' : 'Create your account'}</h1>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-400">Full name</span>
                <input name="name" value={form.name} onChange={handleChange} className={inputClass} placeholder="Aarav Mehta" required />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-400">Email</span>
              <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} placeholder="you@example.com" required />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-400">Password</span>
              <input type="password" name="password" value={form.password} onChange={handleChange} className={inputClass} placeholder="Password" required />
            </label>

            {mode === 'register' && (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-slate-400">Phone</span>
                  <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} placeholder="+91 98765 43210" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-slate-400">Location</span>
                  <input name="location" value={form.location} onChange={handleChange} className={inputClass} placeholder="Bengaluru, India" />
                </label>
              </>
            )}

            {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>}

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-4 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Create account')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            {mode === 'login' ? 'Need an account?' : 'Already have an account?'}
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="ml-2 font-black text-fuchsia-300">
              {mode === 'login' ? 'Sign up' : 'Login'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
