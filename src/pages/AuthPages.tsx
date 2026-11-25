import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../services/api.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { UAE_EMIRATES } from '../../shared/schemas.ts';
import { Button, FatooraLogo, Input, Select } from '../components/ui/Primitives.tsx';
import type { Company, User } from '../../shared/types.ts';

function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white">
      <div className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        <div>
          <Link to="/" className="inline-block">
            <FatooraLogo size="md" />
          </Link>
        </div>
        <div className="w-full max-w-md mx-auto my-8">{children}</div>
        <p className="text-xs text-[#A8A29E]">
          © 2026 Inbox Infotech — Inbox E-invoicing · E-Invoicing Software &amp; GST e-invoicing System
        </p>
      </div>

      <div className="hidden lg:flex lg:col-span-6 bg-gradient-to-br from-[#FFF3ED] via-[#FFE5D6] to-[#FDBA74]/40 border-l border-[#E7E5E4] p-14 flex-col justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#F26522]">
          <ShieldCheck className="w-4 h-4" />
          PINT-AE UBL 2.1 Ready
        </div>

        <div className="max-w-md">
          <blockquote className="text-2xl font-semibold text-[#1C1917] leading-snug">
            “Switching from Excel invoices to Inbox E-invoicing cut our monthly billing time by 70% and simplified our e-invoicing compliance.”
          </blockquote>
          <div className="mt-6">
            <p className="text-sm font-semibold text-[#1C1917]">Omar Al Mansoori</p>
            <p className="text-xs text-[#78716C]">
              Managing Director, Nexus Digital Solutions LLC · Dubai
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="bg-white/80 backdrop-blur rounded-lg border border-[#E7E5E4] p-4">
              <p className="text-2xl font-bold text-[#1C1917] tabular-nums">51 / 51</p>
              <p className="text-xs text-[#78716C] mt-1">FTA mandatory fields checked automatically</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg border border-[#E7E5E4] p-4">
              <p className="text-2xl font-bold text-[#1C1917] tabular-nums">500+</p>
              <p className="text-xs text-[#78716C] mt-1">Businesses invoicing with Inbox E-invoicing</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#78716C]">
          Trusted across Dubai, Abu Dhabi, Sharjah, and UAE Free Zones
        </p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; user: User; company: Company };
      }>('/api/auth/login', { email, password });
      setSession(res.data);
      toast.success(`Welcome back, ${res.data.user.firstName}`);
      navigate(res.data.company.isOnboarded ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError('');
    try {
      const res = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; user: User; company: Company };
      }>('/api/auth/demo');
      setSession(res.data);
      toast.success('Signed into demo workspace (Nexus Digital Solutions LLC)');
      navigate('/dashboard');
    } catch {
      setError('Could not launch demo workspace');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      <h1 className="text-2xl font-bold text-[#1C1917]">Welcome back</h1>
      <p className="text-sm text-[#78716C] mt-1.5">
        Sign in to manage your UAE tax invoices and VAT reports.
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-[#FEF2F2] border border-[#DC2626]/20 text-xs text-[#DC2626]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Email address"
          type="email"
          required
          placeholder="you@company.ae"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div>
          <Input
            label="Password"
            type="password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="text-right mt-1.5">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[#F26522] hover:text-[#E05A1B]"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Sign In
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E7E5E4]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-[#A8A29E]">or explore immediately</span>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        loading={demoLoading}
        onClick={handleDemoLogin}
        className="w-full"
      >
        Continue with UAE Demo Workspace
      </Button>

      <p className="mt-6 text-center text-sm text-[#78716C]">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-[#F26522] hover:text-[#E05A1B]">
          Register
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    companyName: '',
    emirate: 'Dubai',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; user: User; company: Company };
      }>('/api/auth/register', form);
      setSession(res.data);
      toast.success('Account created! Complete your 3-step UAE company setup.');
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      <h1 className="text-2xl font-bold text-[#1C1917]">Create your account</h1>
      <p className="text-sm text-[#78716C] mt-1.5">
        Start issuing FTA-compliant UAE tax invoices in minutes.
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-[#FEF2F2] border border-[#DC2626]/20 text-xs text-[#DC2626]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Full Name"
          required
          placeholder="Ahmed Al Maktoum"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <Input
          label="Work Email"
          type="email"
          required
          placeholder="ahmed@company.ae"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Password"
          type="password"
          required
          minLength={8}
          placeholder="Minimum 8 characters"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Input
          label="Company Name (English)"
          required
          placeholder="Al Noor Digital LLC"
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Emirate"
            value={form.emirate}
            onChange={(e) => setForm({ ...form, emirate: e.target.value })}
          >
            {UAE_EMIRATES.map((em) => (
              <option key={em} value={em}>
                {em}
              </option>
            ))}
          </Select>
          <Input
            label="Phone"
            placeholder="+971 50 123 4567"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#78716C]">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[#F26522] hover:text-[#E05A1B]">
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78716C] hover:text-[#1C1917] mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>

      {sent ? (
        <div className="p-6 rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] text-center">
          <div className="w-10 h-10 rounded-full bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-[#1C1917]">Check your inbox</h2>
          <p className="text-sm text-[#78716C] mt-1.5">
            If an account matches <span className="font-medium text-[#1C1917]">{email}</span>, we&apos;ve sent instructions to reset your password.
          </p>
          <Link
            to="/login"
            className="inline-block mt-5 text-sm font-medium text-[#F26522] hover:text-[#E05A1B]"
          >
            Return to login
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-[#1C1917]">Reset your password</h1>
          <p className="text-sm text-[#78716C] mt-1.5">
            Enter your work email and we&apos;ll send you a reset link.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email address"
              type="email"
              required
              placeholder="you@company.ae"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" loading={loading} className="w-full">
              Send Reset Link
            </Button>
          </form>
        </>
      )}
    </AuthSplitLayout>
  );
}
