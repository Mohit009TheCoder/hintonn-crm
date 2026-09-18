import React, { useState } from 'react';
import { HexLogo, Icon } from '../../shared/Icons';
import { useAuth } from '../../context/AuthContext';

const ROLE_OPTIONS = [
  { value: 'agent', label: 'Agent' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
];

export default function LoginView() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sign In fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('agent');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email/phone and password.');
      return;
    }
    setLoading(true);
    const result = await login(identifier.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      role,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <HexLogo size={36} />
            <div>
              <div className="font-display font-extrabold text-[22px] leading-none">
                Hintonn <span className="gradient-text">AI</span>
              </div>
              <div className="text-[12px] text-[#64748B] mt-0.5">Lead Automation CRM</div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-lg overflow-hidden">
          {/* Tab Toggle */}
          <div className="flex border-b border-[#E2E8F0]">
            <button
              onClick={() => { setTab('signin'); setError(''); }}
              className={`flex-1 py-3.5 text-[13.5px] font-semibold transition-all ${
                tab === 'signin'
                  ? 'text-[#2563EB] border-b-2 border-[#2563EB] bg-[#EFF6FF]'
                  : 'text-[#64748B] hover:text-[#334155]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('signup'); setError(''); }}
              className={`flex-1 py-3.5 text-[13.5px] font-semibold transition-all ${
                tab === 'signup'
                  ? 'text-[#2563EB] border-b-2 border-[#2563EB] bg-[#EFF6FF]'
                  : 'text-[#64748B] hover:text-[#334155]'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="p-6">
            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-[10px] bg-[#FEE2E2] border border-[#FECACA] text-[12.5px] text-[#DC2626] flex items-center gap-2">
                <Icon name="alerttriangle" size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {tab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                    Email or Phone
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="rohan@ashraygroup.in"
                    className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex items-center justify-end">
                  <button type="button" className="text-[12px] text-[#2563EB] hover:underline font-medium">
                    Forgot password?
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-[10px] text-[13.5px] font-semibold text-white gradient-bg hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Icon name="loader" size={15} className="animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                    Full Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                    Email <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@company.in"
                    className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                      Password <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                      Confirm <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all bg-white"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-[10px] text-[13.5px] font-semibold text-white gradient-bg hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Icon name="loader" size={15} className="animate-spin" />}
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}

            {/* Demo hint */}
            <div className="mt-5 pt-4 border-t border-[#E2E8F0] text-center">
              <div className="text-[11.5px] text-[#94A3B8]">
                Demo: <span className="font-mono text-[#64748B]">rohan@ashraygroup.in</span> /{' '}
                <span className="font-mono text-[#64748B]">password123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[11px] text-[#94A3B8]">
          © 2025 Hintonn AI — Built for Real Estate Teams
        </div>
      </div>
    </div>
  );
}
