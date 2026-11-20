import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface MustChangePasswordModalProps {
  isOpen: boolean;
  onPasswordChanged: () => void;
}

export function MustChangePasswordModal({
  isOpen,
  onPasswordChanged,
}: MustChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from the temporary password.');
      return;
    }

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
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-5">
        <div className="border-b border-[#E5E7EB] pb-3">
          <div className="text-[10px] font-mono uppercase font-bold text-[#B91C1C] tracking-wider mb-1">
            Mandatory Security Policy
          </div>
          <h2 className="text-base font-bold text-[#0A192F] uppercase tracking-wide">
            Set Your Permanent Password
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            Your gym account was provisioned with a temporary password. You must set a private password before proceeding into the management console.
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
              {isSubmitting ? 'Updating Security Credentials...' : 'Save Password & Access Console'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
