import { useState, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import GlitchText from '../components/GlitchText';
import api from '../api';
import { INDIA_STATES, INSTITUTIONS_BY_STATE } from '../data/institutions';

const FIELDS = {
  name: { label: 'Full name', type: 'text', auto: 'name' },
  email: { label: 'Email', type: 'email', auto: 'email' },
  password: { label: 'Password', type: 'password' },
  phone: { label: 'Phone (10 digits)', type: 'tel', auto: 'tel' },
};
const MODES = { login: ['email', 'password'], signup: ['name', 'email', 'password', 'phone'] };
const empty = { name: '', email: '', password: '', phone: '', state: '', college: '' };

/** Returns { field: message } for the fields shown in this mode. */
function validate(mode, v) {
  const e = {};
  if (MODES[mode].includes('name') && v.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = 'Enter a valid email address.';
  if (v.password.length < (mode === 'signup' ? 8 : 1)) e.password = mode === 'signup' ? 'Use at least 8 characters.' : 'Enter your password.';
  if (mode === 'signup') {
    if (!/^\d{10}$/.test(v.phone.replace(/[\s+-]/g, '').slice(-10)) ) e.phone = 'Enter a 10-digit phone number.';
    if (!v.state) e.state = 'Select your institution state.';
    if (!v.college.trim() || v.college === '__other__' && !otherInstitution.trim()) e.college = 'Enter your college.';
  }
  return e;
}

export default function Auth() {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/';
  const [mode, setMode] = useState('login');
  const [v, setV] = useState(empty);
  const [errs, setErrs] = useState({});
  const [server, setServer] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [otherInstitution, setOtherInstitution] = useState('');
  const [otp, setOtp] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const tabs = useRef([]);

  if (user) return <Navigate to={from} replace />; // already signed in

  const switchMode = m => { setMode(m); setErrs({}); setServer(''); setOtherInstitution(''); };
  const onTabKey = (e, i) => { // arrow-key tab navigation
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const n = (i + 1) % 2; switchMode(Object.keys(MODES)[n]); tabs.current[n]?.focus();
  };
  const submit = async ev => {
    ev.preventDefault(); setServer('');
    if (resetMode) {
      if (!resetSent) {
        if (!/^\S+@\S+\.\S+$/.test(v.email)) {
          setServer('Enter a valid email address.');
          return;
        }
      } else {
        if (!/^\d{6}$/.test(otp)) {
          setServer('Enter the 6-digit reset OTP.');
          return;
        }
        if (v.password.length < 8) {
          setServer('Use at least 8 characters for the new password.');
          return;
        }
      }
    }
    if (!resetMode) {
      const e = validate(mode, v); setErrs(e);
      if (Object.keys(e).length) return;
    } else {
      setErrs({});
    }
    setBusy(true);
    try {
      if (resetMode) {
        if (!resetSent) {
          await api.forgotPassword(v.email.trim());
          setResetSent(true);
          setServer('If the account exists, a password reset OTP was sent.');
        } else {
          await api.resetPassword({ email: v.email.trim(), otp: otp.trim(), password: v.password });
          toast.success('Password reset successfully');
          setResetMode(false);
          setResetSent(false);
          setOtp('');
        }
      } else if (mode === 'login') await login({ email: v.email.trim(), password: v.password });
      else {
        await signup({
        ...v,
        name: v.name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        state: v.state,
        college: (v.college === '__other__' ? otherInstitution : v.college).trim(),
      });
        toast.success('Account created!');
        navigate(from, { replace: true });
        return;
      }
      if (!resetMode) {
        toast.success('Welcome back!');
        navigate(from, { replace: true });
      }
    } catch (x) {
      setServer(
        x.code === 'UNAUTHENTICATED'
          ? (resetMode ? x.message : 'Wrong email or password.')
          : x.code === 'CONFLICT'
            ? x.message
            : x.code === 'RATE_LIMITED'
              ? x.message
              : x.message || 'Something went wrong.'
      );
    } finally { setBusy(false); }
  };

  return (
    <section className="page auth-page">
      <div className="fcard auth-fcard"><div className="fcard-in auth-in">
        <GlitchText as="h1" className="page-title">{mode === 'login' ? 'Login' : 'Join XPECTO'}</GlitchText>
        <div className="auth-tabs" role="tablist" aria-label="Account">
          {Object.keys(MODES).map((m, i) => (
            <button key={m} ref={el => { tabs.current[i] = el; }} role="tab" id={`tab-${m}`} aria-selected={mode === m} aria-controls="auth-panel" tabIndex={mode === m ? 0 : -1}
              className={`chip ${mode === m ? 'on' : ''}`} onClick={() => switchMode(m)} onKeyDown={e => onTabKey(e, i)}>{m === 'login' ? 'Login' : 'Sign up'}</button>
          ))}
        </div>
        <form id="auth-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} onSubmit={submit} noValidate>
          {resetMode && (
            <>
              <div className="field">
                <label htmlFor="reset-email">Email</label>
                <input id="reset-email" type="email" value={v.email} onChange={e => setV({ ...v, email: e.target.value })} />
              </div>
              {resetSent && (
                <>
                  <div className="field"><label htmlFor="reset-otp">Reset OTP</label><input id="reset-otp" type="text" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
                  <div className="field"><label htmlFor="reset-password">New password</label><input id="reset-password" type="password" value={v.password} onChange={e => setV({ ...v, password: e.target.value })} autoComplete="new-password" /></div>
                </>
              )}
              <button type="button" className="link-btn" onClick={() => { setResetMode(false); setResetSent(false); setOtp(''); setServer(''); }}>Back to login</button>
            </>
          )}
          {!resetMode && mode === 'login' && (
            <button type="button" className="link-btn" onClick={() => { setResetMode(true); setServer(''); }}>Forgot password?</button>
          )}
          {!resetMode && (
          <>
          {mode === 'signup' && (
            <>
              <div className="field">
                <label htmlFor="institution-state">Institution state / UT</label>
                <select
                  id="institution-state"
                  value={v.state}
                  onChange={e => { setV({ ...v, state: e.target.value, college: '' }); setOtherInstitution(''); }}
                  aria-invalid={!!errs.state}
                >
                  <option value="">Select state or union territory</option>
                  {INDIA_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                </select>
                {errs.state && <span className="err" role="alert">{errs.state}</span>}
              </div>
              <div className="field">
                <label htmlFor="institution-name">Institution name</label>
                <select
                  id="institution-name"
                  value={v.college}
                  onChange={e => setV({ ...v, college: e.target.value })}
                  disabled={!v.state}
                  aria-invalid={!!errs.college}
                >
                  <option value="">
                    {v.state ? 'Select institution' : 'Select a state first'}
                  </option>
                  {(INSTITUTIONS_BY_STATE[v.state] || []).map(college => (
                    <option key={college} value={college}>{college}</option>
                  ))}
                  <option value="__other__">Other institution</option>
                </select>
                {v.college === '__other__' && (
                  <input
                    type="text"
                    value={otherInstitution}
                    onChange={e => setOtherInstitution(e.target.value)}
                    placeholder="Enter institution name"
                    autoComplete="organization"
                  />
                )}
                {errs.college && <span className="err" role="alert">{errs.college}</span>}
              </div>
            </>
          )}
          {MODES[mode].map(k => (
            <div className="field" key={k}>
              <label htmlFor={`f-${k}`}>{FIELDS[k].label}</label>
              <div className="pw-wrap">
                <input id={`f-${k}`} type={k === 'password' && show ? 'text' : FIELDS[k].type} value={v[k]} autoComplete={k === 'password' ? (mode === 'login' ? 'current-password' : 'new-password') : FIELDS[k].auto}
                  onChange={e => setV({ ...v, [k]: e.target.value })} aria-invalid={!!errs[k]} aria-describedby={errs[k] ? `e-${k}` : undefined} />
                {k === 'password' && <button type="button" className="link-btn" onClick={() => setShow(s => !s)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>}
              </div>
              {errs[k] && <span id={`e-${k}`} className="err" role="alert">{errs[k]}</span>}
            </div>
          ))}
          </>
          )}
          {server && <p className="banner-err" role="alert">{server}</p>}
          <button className="btn-slash" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : resetMode ? (resetSent ? 'Reset password' : 'Send reset OTP') : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div></div>
    </section>
  );
}
