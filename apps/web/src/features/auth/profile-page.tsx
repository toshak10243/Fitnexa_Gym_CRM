import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { MustChangePasswordModal } from '../../components/auth/must-change-password-modal';
import { Button } from '../../components/ui/button';

export function ProfilePage() {
  const { user, isImpersonating } = useAuth();
  const [changing, setChanging] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <section className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-[#0A192F]">My Profile & Account Security</h1>
      <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-6 space-y-4">
        <p><strong>Name:</strong> {user?.fullName}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role.replace(/_/g, ' ')}</p>
      </div>
      <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-6 space-y-4">
        <h2 className="font-bold text-[#0A192F]">Password</h2>
        <p className="text-sm text-[#6B7280]">Use at least 8 characters with uppercase, lowercase, a number and a special character.</p>
        {saved && <p role="status">Your password has been changed successfully.</p>}
        {isImpersonating ? <p>Exit client impersonation to manage your own password.</p> : <Button onClick={() => { setSaved(false); setChanging(true); }}>Change Password</Button>}
      </div>
      {changing && <MustChangePasswordModal isOpen onCancel={() => setChanging(false)} onPasswordChanged={() => { setChanging(false); setSaved(true); }} />}
    </section>
  );
}
