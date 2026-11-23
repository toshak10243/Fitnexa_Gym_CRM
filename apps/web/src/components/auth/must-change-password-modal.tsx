import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRef } from 'react';
import { apiClient } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface MustChangePasswordModalProps {
  isOpen: boolean;
  onPasswordChanged: () => void;
  onCancel?: () => void;
}

export function MustChangePasswordModal({
  isOpen,
  onPasswordChanged,
  onCancel,
}: MustChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Use uppercase, lowercase, a number and a special character.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from the temporary password.');
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      onPasswordChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password. Verify your current temporary password.';
      setError(msg);
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="password-dialog-title" className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md max-h-[90dvh] overflow-y-auto p-6 space-y-5">
        <div className="border-b border-[#E5E7EB] pb-3">
          <div className="text-[10px] font-mono uppercase font-bold text-[#B91C1C] tracking-wider mb-1">
            Account Security
          </div>
          <h2 id="password-dialog-title" className="text-base font-bold text-[#0A192F] uppercase tracking-wide">
            {onCancel ? 'Change Password' : 'Set Your Permanent Password'}
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            {onCancel ? 'Enter your current password and choose a new private password.' : 'Enter the temporary password from your email and choose a private password before opening your dashboard.'}
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 text-[#B91C1C] border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              Temporary / Current Password *
            </label>
            <Input
              type="password"
              value={currentPassword}
              aria-label="Current password"
              autoComplete="current-password"
              autoFocus
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter temporary password from email"
              className="rounded-none text-xs h-9 border-[#E5E7EB]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              New Permanent Password *
            </label>
            <Input
              type="password"
              value={newPassword}
              aria-label="New password"
              autoComplete="new-password"
              minLength={8}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="At least 8 characters (letters, numbers, symbols)"
              className="rounded-none text-xs h-9 border-[#E5E7EB]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              Confirm New Password *
            </label>
            <Input
              type="password"
              value={confirmPassword}
              aria-label="Confirm new password"
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-type new password"
              className="rounded-none text-xs h-9 border-[#E5E7EB]"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9 rounded-none text-xs bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] uppercase font-bold tracking-wider"
            >
              {isSubmitting ? 'Updating Password...' : onCancel ? 'Save New Password' : 'Save Password & Open Dashboard'}
            </Button>
            {onCancel && <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel} className="mt-2 w-full rounded-none">Cancel</Button>}
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}


