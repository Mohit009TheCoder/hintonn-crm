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

  // Forgot Password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Real world password validation regex: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

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
    if (!name.trim() || !email.trim() || !regPassword.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!passwordRegex.test(regPassword)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
      return;
    }
    setLoading(true);
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password: regPassword,
      role,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!forgotEmail.trim()) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      const API_BASE = (typeof __API_URL__ !== 'undefined' && __API_URL__) ? __API_URL__ : '';
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('Network error.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim() || !newPassword.trim()) {
      setError('Please enter the OTP and a new password.');
      return;
    }
    if (!passwordRegex.test(newPassword)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
      return;
    }
    setLoading(true);
    try {
      const API_BASE = (typeof __API_URL__ !== 'undefined' && __API_URL__) ? __API_URL__ : '';
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: otp.trim(), newPassword: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setTab('signin');
        setOtpSent(false);
        setForgotEmail('');
        setOtp('');
        setNewPassword('');
        // Optional: show a success message or let context handle it
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError('Network error.');
    }
    setLoading(false);
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
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                    >
                      <Icon name={showPassword ? 'eyeoff' : 'eye'} size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button type="button" onClick={() => { setTab('forgot_password'); setError(''); }} className="text-[12px] text-[#2563EB] hover:underline font-medium">
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
            ) : tab === 'signup' ? (
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
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                      >
                        <Icon name={showPassword ? 'eyeoff' : 'eye'} size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                      Confirm <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
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
            ) : tab === 'forgot_password' ? (
              <form onSubmit={otpSent ? handleResetPassword : handleForgotPassword} className="space-y-4">
                <div className="text-[13px] text-[#64748B] mb-4">
                  {otpSent 
                    ? "We've sent a 6-digit OTP to your email. Enter it below along with your new password." 
                    : "Enter your registered email address and we'll send you an OTP to reset your password."}
                </div>
                
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="john@company.in"
                    disabled={otpSent}
                    className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                  />
                </div>

                {otpSent && (
                  <>
                    <div>
                      <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                        6-Digit OTP
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all font-mono tracking-widest text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[12.5px] font-semibold text-[#334155] mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[13.5px] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                        >
                          <Icon name={showPassword ? 'eyeoff' : 'eye'} size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button type="button" onClick={() => { setTab('signin'); setError(''); }} className="text-[12px] text-[#64748B] hover:text-[#334155] font-medium transition-colors">
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold text-white gradient-bg hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {loading && <Icon name="loader" size={15} className="animate-spin" />}
                    {otpSent ? 'Reset Password' : 'Send OTP'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[11px] text-[#94A3B8]">
          © 2026 Hintonn AI — Built for Real Estate Teams
        </div>
      </div>
    </div>
  );
}
