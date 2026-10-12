import { useState } from 'react';
import { EyeOff, Lock, LogIn, Mail, MapPin, Phone, User } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

function LogoMark({ compact = false }) {
  return (
    <div className={`flex items-center gap-4 ${compact ? 'justify-center' : ''}`}>
      <div className={`${compact ? 'h-12 w-12' : 'h-24 w-24'} relative flex items-center justify-center`}>
        <div className={`${compact ? 'rounded-2xl' : 'rounded-[1.8rem]'} absolute inset-0 bg-gradient-to-br from-fuchsia-400 via-violet-500 to-blue-500 shadow-[0_0_46px_rgba(168,85,247,0.45)]`} />
        <span className={`${compact ? 'text-3xl' : 'text-6xl'} relative font-black text-white`}>A</span>
        <Sparkle className="absolute -right-2 top-1 text-fuchsia-200" />
      </div>
      {!compact && (
        <div>
          <p className="text-5xl font-black leading-none text-white">
            Auto<span className="text-fuchsia-300">Job</span>
          </p>
          <p className="mt-3 text-2xl font-black tracking-[0.42em] text-blue-300">APPLY AI</p>
        </div>
      )}
    </div>
  );
}

function Sparkle({ className = '' }) {
  return (
    <span className={`text-3xl font-black ${className}`}>✦</span>
  );
}

function FloatingCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-blue-300/35 bg-blue-500/15 p-4 shadow-[0_0_38px_rgba(59,130,246,0.18)] backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}

function AuthInput({ icon: Icon, children }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-blue-300/35 bg-[#061331]/80 px-4 py-3 text-sm font-semibold text-blue-100 outline-none transition focus-within:border-fuchsia-400">
      <Icon className="text-blue-100/70" size={18} />
      {children}
    </label>
  );
}

export default function AutoJobLoginPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [resetSent, setResetSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: 'demo@jobbot.ai',
    password: 'password123',
    phone: '',
    location: 'Bengaluru, India',
  });
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (mode === 'forgot') {
      setResetSent(true);
      return;
    }

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

  const inputClass = 'min-w-0 flex-1 bg-transparent text-white placeholder:text-blue-100/55 outline-none';
  const isRegister = mode === 'register';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#02071e] text-white">
      <img
        src="/jobbotlogin.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,30,0.06),rgba(2,7,30,0.02)_55%,rgba(2,7,30,0.20))]" />

      <main className="relative z-10 flex h-screen items-center justify-end overflow-hidden px-6 py-6 lg:px-16 xl:px-28">
        <section className="flex w-full max-w-[420px] min-h-0 flex-col justify-center overflow-hidden">
          <div className="rounded-[1.35rem] border border-blue-400/35 bg-[#06102a]/72 p-4 shadow-[0_0_70px_rgba(37,99,235,0.18)] backdrop-blur-md">
            <div className="text-center">
              <LogoMark compact />
              <p className="mt-2 text-3xl font-black text-white">
                Auto<span className="text-fuchsia-300">Job</span>
              </p>
              <p className="mt-1 text-base font-black tracking-[0.42em] text-blue-300">APPLY AI</p>
              <h2 className="mt-4 text-2xl font-black text-white">{mode === 'forgot' ? 'Reset Password' : isRegister ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="mt-1 text-sm text-blue-100/75">
                {mode === 'forgot' ? 'Enter your email to request a reset link' : isRegister ? 'Start your AI-powered job journey' : 'Sign in to continue to your job journey'}
              </p>
            </div>

            <form className="mt-4 space-y-2.5" onSubmit={handleSubmit}>
              {mode === 'forgot' ? (
                <>
                  <AuthInput icon={Mail}>
                    <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} placeholder="Email address" required />
                  </AuthInput>
                  {resetSent && (
                    <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                      Password reset request noted. Backend email delivery can be connected next.
                    </div>
                  )}
                </>
              ) : isRegister && (
                <>
                  <AuthInput icon={User}>
                    <input name="name" value={form.name} onChange={handleChange} className={inputClass} placeholder="Full name" required />
                  </AuthInput>
                  <AuthInput icon={Phone}>
                    <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} placeholder="Phone number" />
                  </AuthInput>
                </>
              )}

              {mode !== 'forgot' && (
                <AuthInput icon={Mail}>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} placeholder="Email or Phone Number" required />
                </AuthInput>
              )}

              {mode !== 'forgot' && (
                <AuthInput icon={Lock}>
                  <input type="password" name="password" value={form.password} onChange={handleChange} className={inputClass} placeholder="Password" required />
                  <EyeOff size={19} className="text-blue-100/60" />
                </AuthInput>
              )}

              {isRegister && (
                <AuthInput icon={MapPin}>
                  <input name="location" value={form.location} onChange={handleChange} className={inputClass} placeholder="Location" />
                </AuthInput>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-3 text-blue-100/80">
                    <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-blue-300 bg-blue-950 accent-blue-500" />
                    Remember me
                  </label>
                  <button type="button" onClick={() => { setMode('forgot'); setResetSent(false); setError(''); }} className="font-black text-fuchsia-300">Forgot password?</button>
                </div>
              )}

              {error && <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>}

              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-[0_0_36px_rgba(217,70,239,0.28)] transition disabled:cursor-not-allowed disabled:opacity-60">
                <LogIn size={20} />
                {loading ? 'Please wait...' : mode === 'forgot' ? 'Send Reset Link' : isRegister ? 'Create Account' : 'Log In'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-blue-100/75">
              {mode === 'forgot' ? 'Remembered your password?' : isRegister ? 'Already have an account?' : "Don't have an account?"}
              <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setResetSent(false); setError(''); }} className="ml-2 font-black text-fuchsia-300">
                {mode === 'forgot' ? 'Log In' : isRegister ? 'Log In' : 'Sign Up'}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

