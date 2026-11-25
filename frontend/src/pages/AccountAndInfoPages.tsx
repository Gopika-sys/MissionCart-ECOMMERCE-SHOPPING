import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, MapPin, PackageCheck, Heart, ShoppingBag, Sparkles, Users, Recycle, Shield, Eye, EyeOff, Trash2 } from 'lucide-react';
import { api, unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';

function scorePassword(pwd: string): { score: number; label: string; color: string; rules: { ok: boolean; text: string }[] } {
  const rules = [
    { ok: pwd.length >= 8, text: 'At least 8 characters' },
    { ok: /[A-Z]/.test(pwd), text: 'One uppercase letter' },
    { ok: /[a-z]/.test(pwd), text: 'One lowercase letter' },
    { ok: /\d/.test(pwd), text: 'One number' },
    { ok: /[^A-Za-z0-9]/.test(pwd), text: 'One special character (@$!%*?&#)' },
  ];
  const score = rules.filter((r) => r.ok).length;
  const label = score <= 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';
  const color = score <= 2 ? '#B91C1C' : score === 3 ? '#B45309' : score === 4 ? '#9A6B32' : '#166534';
  return { score, label, color, rules };
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'SELLER') navigate('/seller');
      else navigate(from === '/login' ? '/dashboard' : from);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 4rem', maxWidth: 520 }}>
      <PageHeader title="Welcome back" subtitle="Sign in to manage your missions, bag, orders, and lifecycle requests." breadcrumbs={[{ label: 'Sign In' }]} />
      <div className="mc-card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} noValidate>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, marginBottom: '0.3rem' }}>Email</label>
            <input id="login-email" type="email" required className="mc-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="login-pass" style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, marginBottom: '0.3rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input id="login-pass" type={showPassword ? 'text' : 'password'} required className="mc-input" style={{ paddingRight: '2.6rem' }} value={password} onChange={(e) => setPassword(e.target.value)} />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mc-muted)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <div role="alert" style={{ color: 'var(--mc-burgundy)', fontSize: '0.88rem', fontWeight: 500 }}>{error}</div>}
          <button type="submit" disabled={loading} className="mc-btn mc-btn-accent">{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>

        <div className="mc-linen-panel" style={{ padding: '0.9rem 1rem', marginTop: '1.25rem', fontSize: '0.82rem' }}>
          <strong>Demo Customer Account:</strong> ananya@missioncart.local / MissionCart@2026
          <br />
          <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.25rem 0.7rem', fontSize: '0.75rem', marginTop: '0.45rem' }} onClick={() => { setEmail('ananya@missioncart.local'); setPassword('MissionCart@2026'); }}>
            Fill Demo Customer
          </button>
        </div>

        <p style={{ marginTop: '1.25rem', fontSize: '0.9rem', textAlign: 'center', color: 'var(--mc-muted)' }}>
          New to MissionCart? <Link to="/register" style={{ color: 'var(--mc-burgundy)', fontWeight: 600 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [accountType, setAccountType] = useState<'CUSTOMER' | 'SELLER'>('CUSTOMER');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pwdEval = scorePassword(password);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) errs.fullName = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (phone.trim() && !/^(\+91[-\s]?)?[6-9]\d{4}[-\s]?\d{5}$/.test(phone.trim())) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number (e.g. +91 9876543210).';
    }
    if (pwdEval.score < 5) {
      errs.password = 'Password must be 8+ characters with uppercase, lowercase, number, and special character.';
    }
    if (confirmPassword !== password) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (!termsAccepted) {
      errs.terms = 'Please accept the Terms of Service & Privacy Policy.';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    setError(null);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const user = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        confirmPassword,
        accountType,
        termsAccepted: true,
      });
      navigate(user.role === 'SELLER' ? '/seller' : '/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 4rem', maxWidth: 540 }}>
      <PageHeader title="Create your account" subtitle="Start planning purpose-first bundles in INR." breadcrumbs={[{ label: 'Register' }]} />
      <div className="mc-card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }} noValidate>
          <div>
            <label htmlFor="reg-name" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.25rem' }}>Full Name *</label>
            <input id="reg-name" required className="mc-input" placeholder="e.g., Ananya Sharma" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            {fieldErrors.fullName && <div style={{ color: 'var(--mc-burgundy)', fontSize: '0.78rem', marginTop: 4 }}>{fieldErrors.fullName}</div>}
          </div>

          <div>
            <label htmlFor="reg-email" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.25rem' }}>Email Address *</label>
            <input id="reg-email" type="email" required className="mc-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {fieldErrors.email && <div style={{ color: 'var(--mc-burgundy)', fontSize: '0.78rem', marginTop: 4 }}>{fieldErrors.email}</div>}
          </div>

          <div>
            <label htmlFor="reg-phone" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.25rem' }}>Indian Mobile Number (Optional)</label>
            <input id="reg-phone" className="mc-input" placeholder="+91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {fieldErrors.phone && <div style={{ color: 'var(--mc-burgundy)', fontSize: '0.78rem', marginTop: 4 }}>{fieldErrors.phone}</div>}
          </div>

          <div>
            <label htmlFor="reg-pass" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.25rem' }}>Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-pass"
                type={showPassword ? 'text' : 'password'}
                required
                className="mc-input"
                style={{ paddingRight: '2.6rem' }}
                placeholder="Min 8 chars, A-z, 0-9, symbol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mc-muted)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <div style={{ marginTop: '0.45rem', padding: '0.6rem 0.75rem', background: 'var(--mc-card)', borderRadius: 'var(--mc-radius-sm)', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Password Strength</span>
                  <strong style={{ color: pwdEval.color }}>{pwdEval.label} ({pwdEval.score}/5)</strong>
                </div>
                <div style={{ height: 5, background: '#E5DDD1', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${(pwdEval.score / 5) * 100}%`, height: '100%', background: pwdEval.color, transition: 'width 200ms ease' }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.75rem', color: 'var(--mc-muted)' }}>
                  {pwdEval.rules.map((r) => (
                    <span key={r.text} style={{ color: r.ok ? '#166534' : 'var(--mc-muted)' }}>
                      {r.ok ? '✓' : '○'} {r.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {fieldErrors.password && <div style={{ color: 'var(--mc-burgundy)', fontSize: '0.78rem', marginTop: 4 }}>{fieldErrors.password}</div>}
          </div>

          <div>
            <label htmlFor="reg-confirm" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.25rem' }}>Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                required
                className="mc-input"
                style={{ paddingRight: '2.6rem' }}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirm((v) => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mc-muted)' }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <div style={{ color: 'var(--mc-burgundy)', fontSize: '0.78rem', marginTop: 4 }}>{fieldErrors.confirmPassword}</div>}
          </div>

          <div>
            <label htmlFor="reg-role" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.25rem' }}>Account Type</label>
            <select id="reg-role" className="mc-select" value={accountType} onChange={(e) => setAccountType(e.target.value as any)}>
              <option value="CUSTOMER">Customer Account</option>
              <option value="SELLER">Seller Studio Account</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.84rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>I agree to MissionCart&apos;s Terms of Service and Privacy Policy.</span>
          </label>
          {fieldErrors.terms && <div style={{ color: 'var(--mc-burgundy)', fontSize: '0.78rem', marginTop: -6 }}>{fieldErrors.terms}</div>}

          {error && <div role="alert" style={{ color: 'var(--mc-burgundy)', fontSize: '0.88rem', fontWeight: 500 }}>{error}</div>}
          <button type="submit" disabled={loading} className="mc-btn mc-btn-accent">{loading ? 'Creating Account...' : 'Create Account'}</button>
        </form>
        <p style={{ marginTop: '1.25rem', fontSize: '0.9rem', textAlign: 'center', color: 'var(--mc-muted)' }}>
          Already registered? <Link to="/login" style={{ color: 'var(--mc-burgundy)', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export const CustomerDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title={`Hello, ${user?.fullName}`}
        subtitle={`${user?.role} account overview — access missions, bag, orders, and saved possessions.`}
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <button type="button" className="mc-btn mc-btn-outline" onClick={async () => { await logout(); navigate('/'); }}>
            <LogOut size={15} /> Sign Out
          </button>
        }
      />

      <div className="mc-grid-4">
        {[
          { to: '/missions', icon: Sparkles, title: 'My Missions', desc: 'Revisit saved purpose plans & budgets' },
          { to: '/shared-missions', icon: Users, title: 'Shared Rooms', desc: 'Collaborate with roommates & friends' },
          { to: '/possessions', icon: PackageCheck, title: 'Already-Own', desc: 'Prevent duplicate spending automatically' },
          { to: '/orders', icon: ShoppingBag, title: 'Orders & Tracking', desc: 'View native purchases & tracking' },
          { to: '/wishlist', icon: Heart, title: 'Wishlist', desc: 'Saved products for future missions' },
          { to: '/lifecycle', icon: Recycle, title: 'Lifecycle Manager', desc: 'Repair, exchange, rent & resell' },
          { to: '/addresses', icon: MapPin, title: 'Addresses', desc: 'Manage Indian delivery addresses' },
          { to: '/profile', icon: Shield, title: 'Profile & Settings', desc: 'Account details & preferences' },
        ].map((card) => (
          <Link key={card.to} to={card.to} className="mc-card" style={{ padding: '1.35rem' }}>
            <card.icon size={20} color="var(--mc-burgundy)" style={{ marginBottom: '0.7rem' }} />
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.3rem' }}>{card.title}</h2>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--mc-muted)' }}>{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useCart();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { showToast('Full name is required'); return; }
    await api.patch('/users/profile', { fullName: fullName.trim(), phone: phone.trim() });
    await refreshUser();
    showToast('Profile saved');
  };

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem', maxWidth: 660 }}>
      <PageHeader title="Profile & Settings" breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Profile' }]} />
      <form onSubmit={save} className="mc-card" style={{ padding: '1.6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input disabled className="mc-input" value={user?.email || ''} />
        <input required className="mc-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" />
        <input className="mc-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (+91...)" />
        <button type="submit" className="mc-btn mc-btn-accent">Save Profile</button>
      </form>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'burgundy-ivory');
  const applyTheme = (t: string) => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  };
  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem', maxWidth: 680 }}>
      <PageHeader title="Editorial Theme & Preferences" breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Settings' }]} />
      <div className="mc-card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className={`mc-btn ${theme === 'burgundy-ivory' ? 'mc-btn-primary' : 'mc-btn-outline'}`} onClick={() => applyTheme('burgundy-ivory')}>
          Warm Ivory &amp; Burgundy (Default)
        </button>
        <button type="button" className={`mc-btn ${theme === 'chocolate-blush' ? 'mc-btn-primary' : 'mc-btn-outline'}`} onClick={() => applyTheme('chocolate-blush')}>
          Chocolate &amp; Blush
        </button>
      </div>
    </div>
  );
};

export const AddressesPage: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useCart();
  const [label, setLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => unwrap<any[]>(await api.get('/addresses')),
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/addresses', { label, recipientName, phone, line1, city, state: stateName, postalCode, defaultAddress: false });
    qc.invalidateQueries({ queryKey: ['addresses'] });
    setLine1('');
    showToast('Address saved');
  };

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader title="Saved Addresses" breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Addresses' }]} />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Remove saved address?"
        message="Are you sure you want to remove this saved delivery address?"
        confirmLabel="Yes, Remove"
        cancelLabel="Keep Address"
        onConfirm={async () => {
          if (pendingDeleteId !== null) {
            await api.delete(`/addresses/${pendingDeleteId}`);
            qc.invalidateQueries({ queryKey: ['addresses'] });
            showToast('Address removed');
          }
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />

      <div className="mc-grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
        <form onSubmit={add} className="mc-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <h2 style={{ fontSize: '1.3rem' }}>Add New Address</h2>
          <input className="mc-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (Home, Hostel, Office)" />
          <input required className="mc-input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient Name" />
          <input required className="mc-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <input required className="mc-input" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street / Hostel / Flat" />
          <div className="mc-grid-3">
            <input required className="mc-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <input required className="mc-input" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="State" />
            <input required className="mc-input" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="PIN" />
          </div>
          <button type="submit" className="mc-btn mc-btn-accent">Save Address</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {(addresses || []).map((a) => (
            <div key={a.id} className="mc-linen-panel" style={{ padding: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="mc-badge" style={{ marginBottom: '0.35rem' }}>{a.label}</span>
                <div style={{ fontWeight: 700 }}>{a.recipientName}</div>
                <div style={{ fontSize: '0.86rem', color: 'var(--mc-muted)' }}>{a.line1}, {a.city}, {a.state} {a.postalCode}</div>
              </div>
              <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setPendingDeleteId(a.id)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const HowItWorksPage: React.FC = () => (
  <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem', maxWidth: 920 }}>
    <PageHeader
      title="How MissionCart Works"
      subtitle="Instead of forcing you to open 14 browser tabs across marketplaces, MissionCart starts with your real-life goal and orchestrates verified catalogue matching, budget optimization, compatibility checks, and post-purchase lifecycle support."
      breadcrumbs={[{ label: 'How It Works' }]}
    />
    <div className="mc-grid-2">
      {[
        { t: '1. Universal Natural-Language Understanding', d: 'Type any situation — hostel move-in, Manali trek, oily skincare, or milk products under ₹1,000. Runs via Gemini/OpenAI when configured, or our zero-key deterministic rule engine.' },
        { t: '2. Grounded Multi-Source Catalogue', d: 'Every recommendation maps strictly to real database records across MissionCart Direct and verified open-catalog/partner feeds. Never invented products or fake links.' },
        { t: '3. Smart Budget & Already-Own Exclusion', d: 'List items you already own to eliminate duplicates, see essential vs optional spend in INR, and get one-click budget swaps.' },
        { t: '4. Attribute-Driven Compatibility Engine', d: 'Checks Indian 230V/16A electrical load limits, room dimensions, fashion sizes, and skincare active ingredient conflicts.' },
      ].map((b) => (
        <div key={b.t} className="mc-linen-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.45rem' }}>{b.t}</h2>
          <p style={{ margin: 0, color: 'var(--mc-muted)' }}>{b.d}</p>
        </div>
      ))}
    </div>
  </div>
);

export const AboutPage: React.FC = () => (
  <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem', maxWidth: 860 }}>
    <PageHeader title="About MissionCart" breadcrumbs={[{ label: 'About' }]} />
    <p style={{ fontSize: '1.06rem', color: 'var(--mc-muted)' }}>
      MissionCart was designed around a simple observation: people do not wake up wanting to browse 400 search filters — they wake up preparing for life chapters. Moving cities, starting a first job, organizing a study corner, or building a gentle routine all deserve calm, honest, purpose-first commerce.
    </p>
  </div>
);

export const ContactPage: React.FC = () => {
  const [sent, setSent] = useState(false);
  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem', maxWidth: 640 }}>
      <PageHeader title="Contact MissionCart" subtitle="Questions about catalog partnerships, retailer feeds, or orders?" breadcrumbs={[{ label: 'Contact' }]} />
      {sent ? (
        <div className="mc-linen-panel" style={{ padding: '2rem' }}>Message received — thank you for reaching out.</div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="mc-card" style={{ padding: '1.6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input required className="mc-input" placeholder="Your Name" />
          <input type="email" required className="mc-input" placeholder="Email Address" />
          <textarea required rows={4} className="mc-textarea" placeholder="How can we help?" />
          <button type="submit" className="mc-btn mc-btn-accent">Send Message</button>
        </form>
      )}
    </div>
  );
};
