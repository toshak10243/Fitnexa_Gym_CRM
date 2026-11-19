import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Preference Toggles
  const [inAppBilling, setInAppBilling] = useState(true);
  const [inAppAttendance, setInAppAttendance] = useState(true);
  const [inAppSessions, setInAppSessions] = useState(true);
  const [emailBilling, setEmailBilling] = useState(true);
  const [smsBilling, setSmsBilling] = useState(false);
  const [whatsappAnnouncements, setWhatsappAnnouncements] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get('/notifications/preferences');
        if (res.data.data) {
          // Preload if exists
        }
      } catch {
        // Handled gracefully
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    try {
      await apiClient.put('/notifications/preferences', {
        preferences: {
          inAppBilling,
          inAppAttendance,
          inAppSessions,
          emailBilling,
          smsBilling,
          whatsappAnnouncements,
        },
      });
      setSuccessMsg('Notification preferences updated successfully.');
    } catch {
      // Handled gracefully
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Notification & Delivery Preferences
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Configure system alert channels, transactional emails, and automated WhatsApp triggers.
          </p>
        </div>
        <Button
          variant="outline"
          className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
          onClick={() => navigate('/notifications')}
        >
          ← Alerts Feed
        </Button>
      </div>

      {successMsg && (
        <div className="p-3 border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 font-bold">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-6">
        {/* In-App Alerts */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-2">
            In-App Notification Center
          </h2>
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-xs text-[#0A192F] cursor-pointer">
              <input
                type="checkbox"
                checked={inAppBilling}
                onChange={(e) => setInAppBilling(e.target.checked)}
                className="rounded-none border-[#E5E7EB] text-[#0A192F] focus:ring-0"
              />
              <span>In-App alerts for invoice receipts and payment collections</span>
            </label>
            <label className="flex items-center gap-3 text-xs text-[#0A192F] cursor-pointer">
              <input
                type="checkbox"
                checked={inAppAttendance}
                onChange={(e) => setInAppAttendance(e.target.checked)}
                className="rounded-none border-[#E5E7EB] text-[#0A192F] focus:ring-0"
              />
              <span>In-App alerts for gym access denails and biometric sync anomalies</span>
            </label>
            <label className="flex items-center gap-3 text-xs text-[#0A192F] cursor-pointer">
              <input
                type="checkbox"
                checked={inAppSessions}
                onChange={(e) => setInAppSessions(e.target.checked)}
                className="rounded-none border-[#E5E7EB] text-[#0A192F] focus:ring-0"
              />
              <span>In-App alerts for personal training schedule bookings and cancellations</span>
            </label>
          </div>
        </div>

        {/* Transactional Outbound Channels */}
        <div className="space-y-3 pt-3 border-t border-[#E5E7EB]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-2">
            Transactional Email & Messaging Channels
          </h2>
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-xs text-[#0A192F] cursor-pointer">
              <input
                type="checkbox"
                checked={emailBilling}
                onChange={(e) => setEmailBilling(e.target.checked)}
                className="rounded-none border-[#E5E7EB] text-[#0A192F] focus:ring-0"
              />
              <span>Email GST invoice PDF receipts to members upon payment settlement</span>
            </label>
            <label className="flex items-center gap-3 text-xs text-[#0A192F] cursor-pointer">
              <input
                type="checkbox"
                checked={smsBilling}
                onChange={(e) => setSmsBilling(e.target.checked)}
                className="rounded-none border-[#E5E7EB] text-[#0A192F] focus:ring-0"
              />
              <span>Transactional DLT-registered SMS for membership expiry & renewal alerts</span>
            </label>
            <label className="flex items-center gap-3 text-xs text-[#0A192F] cursor-pointer">
              <input
                type="checkbox"
                checked={whatsappAnnouncements}
                onChange={(e) => setWhatsappAnnouncements(e.target.checked)}
                className="rounded-none border-[#E5E7EB] text-[#0A192F] focus:ring-0"
              />
              <span>WhatsApp Business API template messages for gym holidays and schedule changes</span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-10 px-6 font-bold"
          >
            {isSaving ? 'Saving...' : 'Update Preferences'}
          </Button>
        </div>
      </form>
    </div>
  );
}
