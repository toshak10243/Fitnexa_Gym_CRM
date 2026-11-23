import { FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'account' | 'otp' | 'password' | 'done'>('account');
  const [accountType, setAccountType] = useState('TENANT');
  const [email, setEmail] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (step === 'account') {
        const response = await apiClient.post('/auth/password-reset/request', { accountType, email: email.trim().toLowerCase(), ...(accountType === 'TENANT' ? { subdomain: subdomain.trim().toLowerCase() } : {}) });
        setChallengeId(response.data.data.challengeId); setStep('otp');
      } else if (step === 'otp') {
        const response = await apiClient.post('/auth/password-reset/verify', { challengeId, otp });
        setResetToken(response.data.data.resetToken); setOtp(''); setStep('password');
      } else {
        if (password !== confirm) throw new Error('Passwords do not match.');
        await apiClient.post('/auth/password-reset/complete', { resetToken, newPassword: password, confirmPassword: confirm });
        setPassword(''); setConfirm(''); setResetToken(''); setStep('done');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <main className="min-h-screen bg-[#0A192F] flex items-center justify-center p-5 text-[#111827]">
    <section className="w-full max-w-md border border-[#E5E7EB] bg-[#FBFBF9] p-6 sm:p-8 space-y-6">
      <div><p className="text-xs tracking-widest text-[#B91C1C] font-bold">TRIFIT ACCOUNT SECURITY</p><h1 className="mt-2 text-2xl font-bold">Forgot password?</h1></div>
      {error && <p role="alert" className="text-sm text-[#B91C1C]">{error}</p>}
      {step === 'done' ? <p role="status">Password changed successfully. Sign in with your new password.</p> : <form onSubmit={submit} className="space-y-5">
        {step === 'account' && <>
          <fieldset disabled={busy}><legend className="mb-3 font-semibold">Which account needs recovery?</legend><div className="flex flex-wrap gap-5">{[['SUPER_ADMIN', 'Super Admin'], ['TENANT', 'Gym Account']].map(([value, label]) => <label key={value} className="flex gap-2 items-center"><input className="focus-visible:outline-2" type="radio" name="accountType" value={value} checked={accountType === value} onChange={() => setAccountType(value)} />{label}</label>)}</div></fieldset>
          {accountType === 'TENANT' && <div><Input label="Gym subdomain" required value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase())} pattern="[a-z0-9][a-z0-9-]{0,62}" placeholder="yourgym" disabled={busy} /><p className="text-xs mt-1 text-[#6B7280]">Enter only your gym name from yourgym.trifit.space</p></div>}
          <Input label="Registered email address" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
        </>}
        {step === 'otp' && <><p className="text-sm text-[#6B7280]">If your account details match, a code has been sent to {email}. Check your inbox and spam folder. The code expires in 10 minutes.</p><Input label="6-digit email verification code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value)} disabled={busy} /><button className="text-sm underline focus-visible:outline-2" type="button" disabled={busy} onClick={() => { setError(''); setStep('account'); }}>Change account details or request another code</button><p className="text-xs text-[#6B7280]">Wait at least 60 seconds before requesting another code.</p></>}
        {step === 'password' && <><p className="text-sm text-[#6B7280]">Use 8 to 72 characters including uppercase, lowercase, a number and a special character.</p><Input label="New password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /><Input label="Confirm new password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} /></>}
        <Button type="submit" className="w-full" disabled={busy} isLoading={busy}>{step === 'account' ? 'Send verification code' : step === 'otp' ? 'Verify code' : 'Save new password'}</Button>
      </form>}
      <Link to="/login" className="block text-sm font-semibold underline focus-visible:outline-2">Back to sign in</Link>
    </section>
  </main>;
}
