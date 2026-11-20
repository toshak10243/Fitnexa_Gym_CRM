import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, UserRole } from '@fitnexa/shared';
import { Button } from './ui/button';

export interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  initialPermissions?: Record<string, string[]> | null;
  onSave: (updatedPermissions: Record<string, string[]>) => Promise<void>;
  isLoading?: boolean;
}

const ROLES_TO_DISPLAY = [
  { role: UserRole.GYM_OWNER, label: 'Gym Owner', icon: '👑', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { role: UserRole.BRANCH_MANAGER, label: 'Branch Manager', icon: '🏢', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { role: UserRole.FRONT_DESK, label: 'Front Desk', icon: '🛎️', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { role: UserRole.TRAINER, label: 'Trainer', icon: '🏋️', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { role: UserRole.STAFF, label: 'Staff (Support)', icon: '🧹', color: 'text-zinc-700 bg-zinc-50 border-zinc-200' },
];

export function RolePermissionsModal({
  isOpen,
  onClose,
  title,
  subtitle,
  initialPermissions,
  onSave,
  isLoading = false,
}: RolePermissionsModalProps) {
  const [currentPermissions, setCurrentPermissions] = useState<Record<string, string[]>>(() => {
    const perms: Record<string, string[]> = {};
    for (const r of ROLES_TO_DISPLAY) {
      perms[r.role] = initialPermissions?.[r.role]
        ? [...initialPermissions[r.role]]
        : [...(DEFAULT_ROLE_PERMISSIONS[r.role] || [])];
    }
    return perms;
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.category)));
    return ['ALL', ...cats];
  }, []);

  // Filtered permissions
  const filteredPermissions = useMemo(() => {
    return ALL_PERMISSIONS.filter((perm) => {
      const matchesCat = categoryFilter === 'ALL' || perm.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        perm.label.toLowerCase().includes(q) ||
        perm.id.toLowerCase().includes(q) ||
        perm.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [categoryFilter, searchQuery]);

  const handleToggle = (role: string, permId: string) => {
    setCurrentPermissions((prev) => {
      const existing = prev[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
      const hasPerm = existing.includes(permId);
      const nextList = hasPerm ? existing.filter((p) => p !== permId) : [...existing, permId];
      return {
        ...prev,
        [role]: nextList,
      };
    });
  };

  const handleGrantAllForRole = (role: string) => {
    setCurrentPermissions((prev) => ({
      ...prev,
      [role]: ALL_PERMISSIONS.map((p) => p.id),
    }));
  };

  const handleRevokeAllForRole = (role: string) => {
    setCurrentPermissions((prev) => ({
      ...prev,
      [role]: [],
    }));
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset role permissions to system standard defaults?')) {
      const resetMap: Record<string, string[]> = {};
      for (const r of ROLES_TO_DISPLAY) {
        resetMap[r.role] = [...(DEFAULT_ROLE_PERMISSIONS[r.role] || [])];
      }
      setCurrentPermissions(resetMap);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(currentPermissions);
      onClose();
    } catch {
      // Error handled by caller
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-6xl max-h-[92vh] flex flex-col p-6 space-y-4 rounded-none shadow-none">
        {/* Header */}
        <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#0A192F] text-[#FBFBF9] text-[10px] font-mono px-2 py-0.5 font-bold uppercase tracking-wider">
                Role Access Control Matrix
              </span>
              {subtitle && <span className="text-xs font-mono text-[#6B7280]">{subtitle}</span>}
            </div>
            <h3 className="text-base font-bold text-[#0A192F] uppercase tracking-wide mt-1">
              {title}
            </h3>
            <p className="text-xs text-[#6B7280]">
              Configure exact module access per role with interactive ticks (✓ Allowed) and crosses (✕ Blocked). Blocked features are completely hidden from the staff sidebar and URL routes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#0A192F] text-xl font-bold p-1 leading-none"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#F5F5F0] border border-[#E5E7EB] shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mr-1">
              Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#0A192F] text-[#FBFBF9]'
                    : 'bg-white border border-[#D1D5DB] text-[#374151] hover:bg-[#EFEFEA]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search permission..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white border border-[#D1D5DB] text-[#111827] focus:outline-none focus:border-[#0A192F] w-48"
            />
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#D1D5DB] text-[#0A192F] hover:bg-[#EFEFEA] whitespace-nowrap"
            >
              Reset Defaults
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="flex-1 overflow-y-auto border border-[#E5E7EB] bg-white min-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0A192F] text-[#FBFBF9] uppercase text-[11px] tracking-wider z-10">
              <tr>
                <th className="p-3 font-bold border-b border-[#162E52] w-[34%] bg-[#0A192F]">
                  Feature / Capability
                </th>
                {ROLES_TO_DISPLAY.map((r) => {
                  const rolePerms = currentPermissions[r.role] || [];
                  const count = rolePerms.length;
                  return (
                    <th
                      key={r.role}
                      className="p-2.5 text-center font-bold border-b border-[#162E52] bg-[#0A192F]"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#9CA3AF] mt-0.5">
                        {count} of {ALL_PERMISSIONS.length} allowed
                      </div>
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleGrantAllForRole(r.role)}
                          className="text-[9px] font-mono px-1 py-0.2 bg-emerald-700 hover:bg-emerald-600 text-white"
                          title={`Grant all permissions to ${r.label}`}
                        >
                          all ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeAllForRole(r.role)}
                          className="text-[9px] font-mono px-1 py-0.2 bg-red-800 hover:bg-red-700 text-white"
                          title={`Revoke all permissions from ${r.label}`}
                        >
                          none ✕
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredPermissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-[#6B7280]">
                    No permissions match your category or search query.
                  </td>
                </tr>
              ) : (
                filteredPermissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-[#F9F9F6] transition-colors">
                    <td className="p-3 border-r border-[#E5E7EB]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0A192F]">{perm.label}</span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-[#F5F5F0] border border-[#E5E7EB] text-[#6B7280]">
                          {perm.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">{perm.description}</div>
                    </td>

                    {ROLES_TO_DISPLAY.map((r) => {
                      const rolePerms = currentPermissions[r.role] || [];
                      const isAllowed = rolePerms.includes(perm.id);

                      return (
                        <td
                          key={r.role}
                          className="p-2 text-center border-r border-[#E5E7EB] last:border-r-0"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggle(r.role, perm.id)}
                            className={`w-full py-1.5 px-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              isAllowed
                                ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] hover:bg-[#D1FAE5]'
                                : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] hover:bg-[#FEE2E2]'
                            }`}
                            title={`Click to ${isAllowed ? 'BLOCK' : 'ALLOW'} for ${r.label}`}
                          >
                            <span className="text-sm leading-none">{isAllowed ? '✓' : '✕'}</span>
                            <span className="text-[10px] uppercase tracking-wider">
                              {isAllowed ? 'Allowed' : 'Blocked'}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] shrink-0">
          <div className="text-xs text-[#6B7280]">
            Modifications apply immediately across client user sessions and sidebars.
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving || isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving || isLoading}
              className="bg-[#0A192F] hover:bg-[#162E52]"
            >
              Save Permissions Matrix
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
