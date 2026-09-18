import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../shared/Icons';
import { useAuth } from '../../context/AuthContext';

const ROLE_COLORS = {
  admin: { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]', border: 'border-[#FECACA]' },
  manager: { bg: 'bg-[#F3E8FF]', text: 'text-[#7E22CE]', border: 'border-[#E9D5FF]' },
  agent: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]', border: 'border-[#BFDBFE]' },
  viewer: { bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', border: 'border-[#E2E8F0]' },
};

const PERMISSION_MATRIX = [
  { resource: 'leads', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'projects', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'partners', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'calls', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'whatsapp', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'reports', actions: ['read'] },
  { resource: 'analytics', actions: ['read'] },
  { resource: 'settings', actions: ['read', 'update'] },
  { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
];

const ALL_ROLES = ['admin', 'manager', 'agent', 'viewer'];

const ROLE_PERMISSIONS = {
  admin: {
    leads: { create: true, read: true, update: true, delete: true },
    projects: { create: true, read: true, update: true, delete: true },
    tasks: { create: true, read: true, update: true, delete: true },
    partners: { create: true, read: true, update: true, delete: true },
    calls: { create: true, read: true, update: true, delete: true },
    whatsapp: { create: true, read: true, update: true, delete: true },
    reports: { read: true },
    analytics: { read: true },
    settings: { read: true, update: true },
    users: { create: true, read: true, update: true, delete: true },
  },
  manager: {
    leads: { create: true, read: true, update: true, delete: false },
    projects: { create: true, read: true, update: true, delete: false },
    tasks: { create: true, read: true, update: true, delete: true },
    partners: { create: true, read: true, update: true, delete: false },
    calls: { create: true, read: true, update: true, delete: false },
    whatsapp: { create: true, read: true, update: true, delete: false },
    reports: { read: true },
    analytics: { read: true },
    settings: { read: true, update: true },
    users: { create: false, read: true, update: false, delete: false },
  },
  agent: {
    leads: { create: true, read: true, update: true, delete: false },
    projects: { create: false, read: true, update: false, delete: false },
    tasks: { create: true, read: true, update: true, delete: false },
    partners: { create: false, read: true, update: false, delete: false },
    calls: { create: true, read: true, update: false, delete: false },
    whatsapp: { create: false, read: true, update: false, delete: false },
    reports: { read: true },
    analytics: { read: false },
    settings: { read: true, update: false },
    users: { create: false, read: false, update: false, delete: false },
  },
  viewer: {
    leads: { create: false, read: true, update: false, delete: false },
    projects: { create: false, read: true, update: false, delete: false },
    tasks: { create: false, read: true, update: false, delete: false },
    partners: { create: false, read: true, update: false, delete: false },
    calls: { create: false, read: true, update: false, delete: false },
    whatsapp: { create: false, read: true, update: false, delete: false },
    reports: { read: true },
    analytics: { read: true },
    settings: { read: false, update: false },
    users: { create: false, read: false, update: false, delete: false },
  },
};

function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function UserManagementView() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'agent',
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [editingRole, setEditingRole] = useState(null);

  const authFetch = useCallback(
    (url, options = {}) =>
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      }),
    [token]
  );

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/auth/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (e) {
      console.error('Failed to fetch users', e);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteForm.name.trim() || !inviteForm.email.trim() || !inviteForm.password.trim()) {
      setInviteError('Name, email, and password are required.');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (data.success) {
        setInviteForm({ name: '', email: '', phone: '', password: '', role: 'agent' });
        setShowInvite(false);
        fetchUsers();
      } else {
        setInviteError(data.message || 'Failed to create user');
      }
    } catch (e) {
      setInviteError('Network error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await authFetch(`/api/auth/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        setEditingRole(null);
      }
    } catch (e) {
      console.error('Failed to update role', e);
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    try {
      const res = await authFetch(`/api/auth/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: !currentActive } : u))
        );
      }
    } catch (e) {
      console.error('Failed to toggle user', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[22px] font-display font-extrabold text-[#0F172A]">
            User Management
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Manage team access, roles, and permissions.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setShowPermissions(!showPermissions)}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-semibold border border-[#E2E8F0] text-[#334155] hover:bg-[#F1F5F9] transition-all"
          >
            <Icon name="settings" size={15} />
            Permissions
          </button>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-semibold text-white gradient-bg hover:opacity-90 transition-all"
          >
            <Icon name="userplus" size={15} />
            Invite User
          </button>
        </div>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="bg-white rounded-[14px] border border-[#E2E8F0] p-5 card-flat">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-[#0F172A]">Invite New User</h3>
            <button
              onClick={() => setShowInvite(false)}
              className="text-[#94A3B8] hover:text-[#334155]"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          {inviteError && (
            <div className="mb-3 p-2.5 rounded-[8px] bg-[#FEE2E2] text-[12px] text-[#DC2626]">
              {inviteError}
            </div>
          )}
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Full Name *"
              value={inviteForm.name}
              onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))}
              className="px-3 py-2 rounded-[10px] border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB]"
            />
            <input
              type="email"
              placeholder="Email *"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
              className="px-3 py-2 rounded-[10px] border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB]"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={inviteForm.phone}
              onChange={(e) => setInviteForm((p) => ({ ...p, phone: e.target.value }))}
              className="px-3 py-2 rounded-[10px] border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB]"
            />
            <input
              type="password"
              placeholder="Password *"
              value={inviteForm.password}
              onChange={(e) => setInviteForm((p) => ({ ...p, password: e.target.value }))}
              className="px-3 py-2 rounded-[10px] border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB]"
            />
            <div className="flex gap-2">
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
                className="flex-1 px-3 py-2 rounded-[10px] border border-[#E2E8F0] text-[13px] focus:outline-none focus:border-[#2563EB] bg-white"
              >
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold text-white gradient-bg hover:opacity-90 disabled:opacity-60"
              >
                {inviteLoading ? '...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Permissions Matrix */}
      {showPermissions && (
        <div className="bg-white rounded-[14px] border border-[#E2E8F0] p-5 card-flat overflow-x-auto">
          <h3 className="text-[15px] font-bold text-[#0F172A] mb-4">Permissions Matrix</h3>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th className="text-left py-2 px-3 font-semibold text-[#64748B]">Resource</th>
                <th className="text-left py-2 px-3 font-semibold text-[#64748B]">Action</th>
                {ALL_ROLES.map((r) => (
                  <th key={r} className="text-center py-2 px-3 font-semibold capitalize text-[#64748B]">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row) =>
                row.actions.map((action, ai) => (
                  <tr key={`${row.resource}-${action}`} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                    {ai === 0 && (
                      <td
                        rowSpan={row.actions.length}
                        className="py-2 px-3 font-semibold text-[#0F172A] capitalize align-top"
                      >
                        {row.resource}
                      </td>
                    )}
                    <td className="py-2 px-3 text-[#64748B] capitalize">{action}</td>
                    {ALL_ROLES.map((role) => {
                      const has = ROLE_PERMISSIONS[role]?.[row.resource]?.[action];
                      return (
                        <td key={role} className="text-center py-2 px-3">
                          {has ? (
                            <span className="inline-flex w-5 h-5 rounded-full bg-[#D1FAE5] text-[#059669] items-center justify-center">
                              <Icon name="check" size={12} strokeWidth={2.5} />
                            </span>
                          ) : (
                            <span className="inline-block w-5 h-5 rounded-full bg-[#F1F5F9]"></span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#94A3B8]">
          <Icon name="loader" size={20} className="animate-spin mr-2" />
          Loading users...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => {
            const rc = ROLE_COLORS[u.role] || ROLE_COLORS.viewer;
            const isCurrentUser = currentUser?.id === u.id;
            return (
              <div
                key={u.id}
                className={`bg-white rounded-[14px] border p-5 card-base transition-all ${
                  isCurrentUser ? 'border-[#2563EB]/30 ring-1 ring-[#2563EB]/10' : 'border-[#E2E8F0]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#2563EB] to-[#9333EA] text-white flex items-center justify-center text-[14px] font-bold flex-shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[#0F172A] truncate flex items-center gap-1.5">
                        {u.name}
                        {isCurrentUser && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#DBEAFE] text-[#1D4ED8] font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[#64748B] truncate">{u.email}</div>
                      {u.phone && (
                        <div className="text-[11.5px] text-[#94A3B8]">{u.phone}</div>
                      )}
                    </div>
                  </div>
                  {/* Status toggle */}
                  <button
                    onClick={() => handleToggleActive(u.id, u.isActive !== false)}
                    className={`w-10 h-[22px] rounded-full relative transition-all ${
                      u.isActive !== false ? 'bg-[#059669]' : 'bg-[#CBD5E1]'
                    }`}
                    title={u.isActive !== false ? 'Active' : 'Inactive'}
                  >
                    <span
                      className={`absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all ${
                        u.isActive !== false ? 'left-[21px]' : 'left-[3px]'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F1F5F9]">
                  <span
                    className={`tag-pill ${rc.bg} ${rc.text} capitalize text-[10.5px]`}
                  >
                    {u.role}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] text-[#94A3B8]">
                      {timeAgo(u.lastLogin || u.updatedAt)}
                    </span>
                    {/* Edit role dropdown */}
                    {editingRole === u.id ? (
                      <select
                        autoFocus
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        onBlur={() => setEditingRole(null)}
                        className="text-[11px] px-1.5 py-0.5 rounded border border-[#E2E8F0] bg-white"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="agent">Agent</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingRole(u.id)}
                        className="text-[#94A3B8] hover:text-[#334155] transition-colors"
                        title="Edit role"
                      >
                        <Icon name="settings" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
