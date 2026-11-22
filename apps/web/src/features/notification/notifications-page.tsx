import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { NotificationType, NotificationChannel } from '@fitnexa/shared';

export function NotificationsPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterChannel, setFilterChannel] = useState('');

  // Send Notification Modal
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>(NotificationType.GENERAL_ANNOUNCEMENT);
  const [channel, setChannel] = useState<NotificationChannel>(NotificationChannel.IN_APP);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/notifications/feed?limit=50');
      const data = res.data.data;
      setNotifications(data.notifications || data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const visibleNotifications = notifications.filter((notification) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [notification.title, notification.message]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
    const matchesType = !filterType || notification.type === filterType;
    const matchesChannel = !filterChannel || notification.channel === filterChannel;
    return matchesSearch && matchesType && matchesChannel;
  });

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      fetchFeed();
    } catch {
      // Handled gracefully
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read');
      fetchFeed();
    } catch {
      // Handled gracefully
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setSendError('Notification title and message are required.');
      return;
    }
    setSendError(null);
    setIsSending(true);
    try {
      await apiClient.post('/notifications/send', {
        title: title.trim(),
        message: message.trim(),
        type,
        channel,
      });
      setIsSendModalOpen(false);
      setTitle('');
      setMessage('');
      fetchFeed();
    } catch (err: any) {
      setSendError(err?.response?.data?.message || 'Failed to dispatch notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
              Notifications & Alerts Center
            </h1>
            {unreadCount > 0 && (
              <span className="bg-[#B91C1C] text-white text-[10px] font-bold px-2 py-0.5 rounded-none font-mono">
                {unreadCount} NEW
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time feed of billing receipts, low stock alerts, session bookings, and member announcements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
              onClick={handleMarkAllRead}
            >
              Mark All as Read
            </Button>
          )}
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/notifications/settings')}
          >
            Preferences
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => setIsSendModalOpen(true)}
          >
            + Dispatch Announcement
          </Button>
        </div>
      </div>

      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex flex-col md:flex-row gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notifications by title or message..."
          className="text-xs border-[#E5E7EB] bg-white rounded-none"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs border border-[#E5E7EB] bg-white px-3 h-9 rounded-none text-[#0A192F]"
        >
          <option value="">All Types</option>
          {Object.values(NotificationType).map((notificationType) => (
            <option key={notificationType} value={notificationType}>
              {notificationType.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="text-xs border border-[#E5E7EB] bg-white px-3 h-9 rounded-none text-[#0A192F]"
        >
          <option value="">All Channels</option>
          {Object.values(NotificationChannel).map((notificationChannel) => (
            <option key={notificationChannel} value={notificationChannel}>
              {notificationChannel.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : visibleNotifications.length === 0 ? (
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-12 text-center text-xs text-[#6B7280]">
            No notifications match your search or filters.
          </div>
        ) : (
          visibleNotifications.map((n) => {
            return (
              <div
                key={n.id}
                className={`p-4 border transition-colors flex items-start justify-between gap-4 ${
                  n.isRead
                    ? 'bg-[#FBFBF9] border-[#E5E7EB]'
                    : 'bg-white border-[#0A192F] shadow-xs'
                }`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                        n.isRead
                          ? 'bg-[#F5F5F0] text-[#6B7280] border-[#E5E7EB]'
                          : 'bg-[#0A192F] text-white border-[#0A192F]'
                      }`}
                    >
                      {n.type?.replace(/_/g, ' ') || 'ALERT'}
                    </span>
                    <span className="font-mono text-[10px] text-[#6B7280]">
                      {new Date(n.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-[10px] text-[#6B7280] font-mono">
                      via {n.channel}
                    </span>
                  </div>

                  <h2 className="text-xs font-bold text-[#0A192F]">
                    {n.title}
                  </h2>
                  <p className="text-xs text-[#6B7280] whitespace-pre-wrap">
                    {n.message}
                  </p>
                </div>

                {!n.isRead && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-6 px-2 border-[#E5E7EB] hover:bg-[#F5F5F0] rounded-none shrink-0"
                    onClick={() => handleMarkAsRead(n.id)}
                  >
                    Mark Read
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dispatch Modal */}
      {isSendModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Dispatch Notification
              </h2>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] text-sm font-mono"
                onClick={() => setIsSendModalOpen(false)}
              >
                Close
              </button>
            </div>

            {sendError && (
              <div className="p-3 border border-red-200 bg-red-50 text-xs text-[#B91C1C]">
                {sendError}
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Alert Subject / Title *
                </label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Gym Holiday Hours - Republic Day"
                  className="text-xs border-[#E5E7EB] bg-white rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    Notification Category
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as NotificationType)}
                    className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                  >
                    {Object.values(NotificationType).map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    Outbound Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as NotificationChannel)}
                    className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                  >
                    {Object.values(NotificationChannel).map((c) => (
                      <option key={c} value={c}>
                        {c.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Message Body *
                </label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="The gym floor will be open from 6:00 AM to 12:00 PM tomorrow for Republic Day."
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 text-[#0A192F] rounded-none focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSendModalOpen(false)}
                  className="text-xs border-[#E5E7EB] rounded-none h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSending}
                  className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-8 px-5 font-bold"
                >
                  {isSending ? 'Sending...' : 'Dispatch Alert'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}


