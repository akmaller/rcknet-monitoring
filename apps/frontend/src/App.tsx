import { useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  login,
  logout,
  me,
  fetchCustomers,
  fetchStats,
  fetchPppoeUsers,
  createPppoeUser,
  updatePppoeUser,
  deletePppoeUser,
  setPppoeUserDisabled,
  fetchPppoeProfiles,
  createPppoeProfile,
  updatePppoeProfile,
  deletePppoeProfile,
  fetchAuditLogs,
  confirmChangeRequest
} from './api';
import type {
  AuditLogEntry,
  CustomerStatus,
  CustomersStats,
  PppoeProfile,
  PppoeSecret,
  PppoeUserRow,
  User
} from './types';
import Health from './Health';

const defaultStats: CustomersStats = { total: 0, online: 0, offline: 0 };

const usernameRegex = /^[a-zA-Z0-9._-]{3,32}$/;
const rateLimitRegex = /^[0-9KMGkmg/.,:\-\s]+$/;
const addressRegex = /^[0-9A-Za-z._:/-]+$/;

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const Icons = {
  user: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2-8 4.5V20h16v-1.5C20 16 16.42 14 12 14Z" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2ZM10 7a2 2 0 0 1 4 0v2h-4Zm4 8.73V17a2 2 0 0 1-4 0v-1.27a2 2 0 1 1 4 0Z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 9.74 8 11 4.6-1.26 8-6 8-11V5Zm0 18c-3.33-1.11-6-5.07-6-8.9V6.3l6-2.4 6 2.4v4.8c0 3.83-2.67 7.79-6 8.9Z" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 3 14h7l-1 8 10-12h-7Z" />
    </svg>
  ),
  chip: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3v2H7a2 2 0 0 0-2 2v2H3v2h2v2H3v2h2v2a2 2 0 0 0 2 2h2v2h2v-2h2v2h2v-2h2a2 2 0 0 0 2-2v-2h2v-2h-2v-2h2v-2h-2V7a2 2 0 0 0-2-2h-2V3h-2v2h-2V3ZM7 7h10v10H7Z" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 5h18v2H3Zm4 6h10v2H7Zm3 6h4v2h-4Z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 2a8 8 0 1 0 5.3 14l4.7 4.7 1.4-1.4-4.7-4.7A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1-6 6 6 6 0 0 1 6-6Z" />
    </svg>
  ),
  power: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 2h2v10h-2Z" />
      <path d="M7.76 4.34 6.34 5.76A8 8 0 1 0 17.66 5.76l-1.42-1.42A6 6 0 1 1 7.76 4.34Z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 5h2v14h-2Z" />
      <path d="M5 11h14v2H5Z" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17.25V20h2.75l8.1-8.1-2.75-2.75ZM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 2.75 2.75Z" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h12l-1 13H7Zm3-3h6l1 2H8Z" />
    </svg>
  ),
  toggle: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 6h10a6 6 0 1 1 0 12H7A6 6 0 1 1 7 6Zm0 2a4 4 0 1 0 0 8h10a4 4 0 1 0 0-8Z" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2Zm2 0v13a1 1 0 0 0 1 1h10V5Z" />
    </svg>
  ),
  package: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 3 6.5V17.5L12 22l9-4.5V6.5Zm0 2.18L18.76 7 12 9.82 5.24 7ZM5 9.45l6 2.73v7.45l-6-3Zm14 0v6.91l-6 3v-7.45Z" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 1 21h22Zm1 14h-2v-5h2Zm0 4h-2v-2h2Z" />
    </svg>
  )
};

type ActionLog = {
  id: string;
  status: 'success' | 'error';
  message: string;
  timestamp: string;
};

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  diff?: Record<string, { before: unknown; after: unknown }>;
};

type UserFormState = {
  username: string;
  password: string;
  profile: string;
  comment: string;
  disabled: boolean;
};

type ProfileFormState = {
  name: string;
  rateLimit: string;
  localAddress: string;
  remoteAddressPool: string;
};

const Modal = ({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal glass">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

const ActionTrail = ({ items, inline }: { items: ActionLog[]; inline?: boolean }) => (
  <div className={`action-trail glass ${inline ? 'inline' : ''}`}>
    <div className="section-title">
      <div className="icon-box">{Icons.book}</div>
      <div>
        <h4>Audit Trail</h4>
        <p>Ringkasan aksi terbaru</p>
      </div>
    </div>
    <div className="trail-list">
      {items.length === 0 && <div className="empty">Belum ada aktivitas.</div>}
      {items.map((item) => (
        <div key={item.id} className={`trail-item ${item.status}`}>
          <span className="trail-message">{item.message}</span>
          <span className="trail-time">{item.timestamp}</span>
        </div>
      ))}
    </div>
  </div>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'profiles' | 'audit'>('users');

  const [stats, setStats] = useState<CustomersStats>(defaultStats);
  const [customers, setCustomers] = useState<CustomerStatus[]>([]);
  const [secrets, setSecrets] = useState<PppoeSecret[]>([]);
  const [profiles, setProfiles] = useState<PppoeProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [userFilters, setUserFilters] = useState({
    search: '',
    profile: '',
    enabled: '',
    status: ''
  });

  const [actionTrail, setActionTrail] = useState<ActionLog[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [userForm, setUserForm] = useState<UserFormState>({
    username: '',
    password: '',
    profile: '',
    comment: '',
    disabled: false
  });
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userEditing, setUserEditing] = useState<PppoeUserRow | null>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<'create' | 'edit'>('create');
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    rateLimit: '',
    localAddress: '',
    remoteAddressPool: ''
  });
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [profileEditing, setProfileEditing] = useState<PppoeProfile | null>(null);

  const isAdmin = user?.role === 'admin';

  const pushTrail = (status: ActionLog['status'], message: string) => {
    setActionTrail((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        status,
        message,
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ].slice(0, 6));
  };

  const loadUsers = async () => {
    const [statsRes, customersRes, secretsRes, profilesRes] = await Promise.all([
      fetchStats({}),
      fetchCustomers({ limit: 2000, offset: 0 }),
      fetchPppoeUsers(),
      fetchPppoeProfiles()
    ]);
    setStats(statsRes.data ?? defaultStats);
    setCustomers(customersRes.data ?? []);
    setSecrets(secretsRes.data ?? []);
    setProfiles(profilesRes.data ?? []);
  };

  const loadProfiles = async () => {
    const res = await fetchPppoeProfiles();
    setProfiles(res.data ?? []);
  };

  const loadAuditLogs = async () => {
    const res = await fetchAuditLogs(100);
    setAuditLogs(res.data ?? []);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const res = await me();
        setUser(res.user);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'users') {
      loadUsers().catch(() => {
        setCustomers([]);
        setSecrets([]);
        setStats(defaultStats);
      });
    }
    if (activeTab === 'profiles') {
      loadProfiles().catch(() => setProfiles([]));
    }
    if (activeTab === 'audit') {
      loadAuditLogs().catch(() => setAuditLogs([]));
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (!user || activeTab !== 'users') return;
    const interval = window.setInterval(() => {
      loadUsers().catch(() => {});
    }, 30000);
    return () => window.clearInterval(interval);
  }, [user, activeTab]);

  const mergedUsers = useMemo<PppoeUserRow[]>(() => {
    const map = new Map(customers.map((item) => [item.username, item]));
    const base = secrets.length
      ? secrets.map((secret) => {
          const customer = map.get(secret.username);
          return {
            username: secret.username,
            profile: secret.profile ?? customer?.profile ?? null,
            comment: secret.comment ?? customer?.comment ?? null,
            disabled: secret.disabled,
            status: customer?.status ?? 'offline',
            activeIp: customer?.activeIp ?? null,
            uptime: customer?.uptime ?? null,
            lastSeen: customer?.lastSeen ?? null
          };
        })
      : customers.map((customer) => ({
          username: customer.username,
          profile: customer.profile ?? null,
          comment: customer.comment ?? null,
          disabled: false,
          status: customer.status,
          activeIp: customer.activeIp ?? null,
          uptime: customer.uptime ?? null,
          lastSeen: customer.lastSeen ?? null
        }));

    return base.filter((row) => {
      if (userFilters.search && !row.username.toLowerCase().includes(userFilters.search.toLowerCase())) {
        return false;
      }
      if (userFilters.profile && row.profile !== userFilters.profile) {
        return false;
      }
      if (userFilters.enabled === 'enabled' && row.disabled) return false;
      if (userFilters.enabled === 'disabled' && !row.disabled) return false;
      if (userFilters.status && row.status !== userFilters.status) return false;
      return true;
    });
  }, [customers, secrets, userFilters]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsBusy(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const username = String(formData.get('username') || '');
    const password = String(formData.get('password') || '');

    try {
      await login(username, password);
      const res = await me();
      setUser(res.user);
      form.reset();
    } catch (err: any) {
      setLoginError(err.message || 'Login gagal');
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogout = async () => {
    setIsBusy(true);
    try {
      await logout();
      setUser(null);
      setCustomers([]);
      setStats(defaultStats);
      setSecrets([]);
      setProfiles([]);
      setAuditLogs([]);
    } finally {
      setIsBusy(false);
    }
  };

  const openCreateUser = () => {
    setUserModalMode('create');
    setUserModalOpen(true);
    setUserEditing(null);
    setUserForm({
      username: '',
      password: '',
      profile: '',
      comment: '',
      disabled: false
    });
    setUserFormError(null);
  };

  const openEditUser = (row: PppoeUserRow) => {
    setUserModalMode('edit');
    setUserModalOpen(true);
    setUserEditing(row);
    setUserForm({
      username: row.username,
      password: '',
      profile: row.profile ?? '',
      comment: row.comment ?? '',
      disabled: row.disabled
    });
    setUserFormError(null);
  };

  const validateUserForm = (mode: 'create' | 'edit', state: UserFormState) => {
    if (!usernameRegex.test(state.username)) {
      return 'Username harus 3-32 karakter dan hanya alnum + . _ -';
    }
    if (mode === 'create' && state.password.trim().length < 8) {
      return 'Password minimal 8 karakter';
    }
    if (state.password && state.password.length < 8) {
      return 'Password minimal 8 karakter';
    }
    if (state.comment.length > 200) {
      return 'Comment maksimal 200 karakter';
    }
    return null;
  };

  const submitUserForm = async () => {
    const error = validateUserForm(userModalMode, userForm);
    if (error) {
      setUserFormError(error);
      return;
    }
    setUserFormError(null);
    setIsBusy(true);

    const payload = {
      username: userForm.username.trim(),
      password: userForm.password || undefined,
      profile: userForm.profile || undefined,
      comment: userForm.comment || undefined,
      disabled: userForm.disabled
    };

    const doSubmit = async () => {
      try {
        if (userModalMode === 'create') {
          await createPppoeUser({
            username: payload.username,
            password: payload.password || '',
            profile: payload.profile,
            comment: payload.comment,
            disabled: payload.disabled
          });
          pushTrail('success', `User ${payload.username} dibuat`);
        } else {
          const patch: Record<string, unknown> = {
            profile: payload.profile,
            comment: payload.comment,
            disabled: payload.disabled
          };
          if (payload.password) patch.password = payload.password;
          await updatePppoeUser(payload.username, patch);
          pushTrail('success', `User ${payload.username} diperbarui`);
        }
        setUserModalOpen(false);
        await loadUsers();
      } catch (err: any) {
        pushTrail('error', err.message || 'Gagal menyimpan user');
      } finally {
        setIsBusy(false);
      }
    };

    if (userModalMode === 'edit' && userEditing) {
      const previousProfile = userEditing.profile || null;
      const nextProfile = payload.profile || null;
      if (previousProfile !== nextProfile) {
        setConfirmState({
          title: 'Konfirmasi perubahan paket',
          description: `Ubah paket ${userEditing.username} ke ${nextProfile || '-'}?`,
          confirmLabel: 'Ubah Paket',
          onConfirm: async () => {
            await doSubmit();
            setConfirmState(null);
          }
        });
        return;
      }
    }

    await doSubmit();
  };

  const handleToggleUser = (row: PppoeUserRow) => {
    if (!isAdmin) return;
    const nextState = !row.disabled;
    setConfirmState({
      title: nextState ? 'Nonaktifkan user?' : 'Aktifkan user?',
      description: `${row.username} akan ${nextState ? 'dinonaktifkan' : 'diaktifkan'}.`,
      confirmLabel: nextState ? 'Nonaktifkan' : 'Aktifkan',
      onConfirm: async () => {
        try {
          await setPppoeUserDisabled(row.username, nextState);
          pushTrail('success', `User ${row.username} ${nextState ? 'dinonaktifkan' : 'diaktifkan'}`);
          await loadUsers();
        } catch (err: any) {
          pushTrail('error', err.message || 'Gagal mengubah status user');
        } finally {
          setConfirmState(null);
        }
      }
    });
  };

  const handleDeleteUser = (row: PppoeUserRow) => {
    if (!isAdmin) return;
    setIsBusy(true);
    deletePppoeUser(row.username)
      .then((response) => {
        if (response?.status === 'pending' && response.changeRequestId) {
          setConfirmState({
            title: 'Konfirmasi penghapusan user',
            description: `Hapus user ${row.username}?`,
            confirmLabel: 'Konfirmasi',
            diff: response.diff,
            onConfirm: async () => {
              try {
                await confirmChangeRequest(response.changeRequestId);
                pushTrail('success', `User ${row.username} dihapus`);
                await loadUsers();
              } catch (err: any) {
                pushTrail('error', err.message || 'Gagal konfirmasi penghapusan');
              } finally {
                setConfirmState(null);
              }
            }
          });
          return;
        }
        pushTrail('success', `User ${row.username} dihapus`);
        loadUsers().catch(() => {});
      })
      .catch((err: any) => {
        pushTrail('error', err.message || 'Gagal menghapus user');
      })
      .finally(() => {
        setIsBusy(false);
      });
  };

  const openCreateProfile = () => {
    setProfileModalMode('create');
    setProfileModalOpen(true);
    setProfileEditing(null);
    setProfileForm({
      name: '',
      rateLimit: '',
      localAddress: '',
      remoteAddressPool: ''
    });
    setProfileFormError(null);
  };

  const openEditProfile = (profile: PppoeProfile) => {
    setProfileModalMode('edit');
    setProfileModalOpen(true);
    setProfileEditing(profile);
    setProfileForm({
      name: profile.name,
      rateLimit: profile.rateLimit ?? '',
      localAddress: profile.localAddress ?? '',
      remoteAddressPool: profile.remoteAddressPool ?? ''
    });
    setProfileFormError(null);
  };

  const validateProfileForm = (mode: 'create' | 'edit', state: ProfileFormState) => {
    if (!state.name.trim()) return 'Nama profile wajib diisi';
    if (state.rateLimit && (!rateLimitRegex.test(state.rateLimit) || !state.rateLimit.includes('/'))) {
      return 'Format rate-limit tidak valid';
    }
    if (state.localAddress && !addressRegex.test(state.localAddress)) {
      return 'Format local-address tidak valid';
    }
    if (state.remoteAddressPool && !addressRegex.test(state.remoteAddressPool)) {
      return 'Format remote-address/pool tidak valid';
    }
    if (mode === 'edit' && !state.rateLimit && !state.localAddress && !state.remoteAddressPool) {
      return 'Minimal satu field harus diubah';
    }
    return null;
  };

  const submitProfileForm = async () => {
    const error = validateProfileForm(profileModalMode, profileForm);
    if (error) {
      setProfileFormError(error);
      return;
    }
    setProfileFormError(null);
    setIsBusy(true);

    const payload = {
      name: profileForm.name.trim(),
      rateLimit: profileForm.rateLimit || undefined,
      localAddress: profileForm.localAddress || undefined,
      remoteAddressPool: profileForm.remoteAddressPool || undefined
    };

    const doSubmit = async () => {
      try {
        if (profileModalMode === 'create') {
          await createPppoeProfile(payload);
          pushTrail('success', `Profile ${payload.name} dibuat`);
        } else if (profileEditing) {
          const response = await updatePppoeProfile(profileEditing.name, {
            rateLimit: payload.rateLimit,
            localAddress: payload.localAddress,
            remoteAddressPool: payload.remoteAddressPool
          });

          if (response?.status === 'pending' && response.changeRequestId) {
            setProfileModalOpen(false);
            setConfirmState({
              title: 'Konfirmasi perubahan paket',
              description: `Perubahan rate-limit untuk ${profileEditing.name} membutuhkan persetujuan.`,
              confirmLabel: 'Konfirmasi',
              diff: response.diff,
              onConfirm: async () => {
                try {
                  await confirmChangeRequest(response.changeRequestId);
                  pushTrail('success', `Rate-limit ${profileEditing.name} diterapkan`);
                  await loadProfiles();
                } catch (err: any) {
                  pushTrail('error', err.message || 'Gagal konfirmasi perubahan');
                } finally {
                  setConfirmState(null);
                }
              }
            });
            return;
          }

          pushTrail('success', `Profile ${profileEditing.name} diperbarui`);
        }
        setProfileModalOpen(false);
        await loadProfiles();
      } catch (err: any) {
        pushTrail('error', err.message || 'Gagal menyimpan profile');
      } finally {
        setIsBusy(false);
      }
    };

    if (profileModalMode === 'edit' && profileEditing) {
      const previousRate = profileEditing.rateLimit || null;
      const nextRate = payload.rateLimit || null;
      if (previousRate !== nextRate) {
        await doSubmit();
        return;
      }
    }

    await doSubmit();
  };

  const handleDeleteProfile = (profile: PppoeProfile) => {
    if (!isAdmin) return;
    setIsBusy(true);
    deletePppoeProfile(profile.name)
      .then((response) => {
        if (response?.status === 'pending' && response.changeRequestId) {
          setConfirmState({
            title: 'Konfirmasi penghapusan profile',
            description: `Hapus profile ${profile.name}?`,
            confirmLabel: 'Konfirmasi',
            diff: response.diff,
            onConfirm: async () => {
              try {
                await confirmChangeRequest(response.changeRequestId);
                pushTrail('success', `Profile ${profile.name} dihapus`);
                await loadProfiles();
              } catch (err: any) {
                pushTrail('error', err.message || 'Gagal konfirmasi penghapusan');
              } finally {
                setConfirmState(null);
              }
            }
          });
          return;
        }
        pushTrail('success', `Profile ${profile.name} dihapus`);
        loadProfiles().catch(() => {});
      })
      .catch((err: any) => {
        pushTrail('error', err.message || 'Gagal menghapus profile');
      })
      .finally(() => {
        setIsBusy(false);
      });
  };

  if (authLoading) {
    return (
      <div className="page-shell">
        <div className="glass loading">Loading session...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell login-shell">
        <div className="glow" />
        <div className="login-card glass">
          <div className="login-title">
            <div className="logo">RN</div>
            <div>
              <h1>RCKNet</h1>
              <p>Secure admin console</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              <span>Username</span>
              <div className="input-wrap">
                <span className="icon">{Icons.user}</span>
                <input name="username" type="text" autoComplete="username" required />
              </div>
            </label>
            <label>
              <span>Password</span>
              <div className="input-wrap">
                <span className="icon">{Icons.lock}</span>
                <input name="password" type="password" autoComplete="current-password" required />
              </div>
            </label>
            {loginError && <div className="error">{loginError}</div>}
            <button type="submit" disabled={isBusy} className="primary">
              {isBusy ? 'Signing in...' : 'Login'}
            </button>
          </form>
          <div className="login-note">
            <span className="icon">{Icons.shield}</span>
            Session secured with httpOnly + CSRF
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell dashboard-shell">
      <div className="grid-glow" />
      <header className="topbar glass">
        <div className="brand">
          <div className="logo">RN</div>
          <div>
            <p className="eyebrow">RCKNet Control</p>
            <h2>Admin Console</h2>
          </div>
        </div>
        <nav className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            {Icons.user} Users
          </button>
          <button
            className={`tab-btn ${activeTab === 'profiles' ? 'active' : ''}`}
            onClick={() => setActiveTab('profiles')}
          >
            {Icons.package} Profiles
          </button>
          <button
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            {Icons.book} Audit Logs
          </button>
        </nav>
        <div className="topbar-actions">
          <div className="user-pill">
            {Icons.user}
            {user.username}
            <span className="role">{user.role}</span>
          </div>
          <button className="ghost" onClick={handleLogout} disabled={isBusy}>
            {Icons.power}
            Logout
          </button>
        </div>
      </header>

      {activeTab === 'users' && (
        <div className="content-grid">
          <section className="section-card glass">
            <div className="section-header">
              <div>
                <h3>PPPoE Users</h3>
                <p>Kelola akun pelanggan dan status aktif.</p>
              </div>
              {isAdmin && (
                <button className="primary btn-sm" onClick={openCreateUser}>
                  {Icons.plus} Tambah User
                </button>
              )}
            </div>

            <div className="stats-row">
              <div className="stat-card glass">
                <div className="stat-icon">{Icons.chip}</div>
                <div>
                  <p>Total Customers</p>
                  <strong>{stats.total}</strong>
                </div>
              </div>
              <div className="stat-card glass accent">
                <div className="stat-icon">{Icons.bolt}</div>
                <div>
                  <p>Online</p>
                  <strong>{stats.online}</strong>
                </div>
              </div>
              <div className="stat-card glass">
                <div className="stat-icon">{Icons.shield}</div>
                <div>
                  <p>Offline</p>
                  <strong>{stats.offline}</strong>
                </div>
              </div>
              <div className="stat-card glass">
                <Health />
              </div>
            </div>

            <div className="filters">
              <div className="field">
                <span className="icon">{Icons.search}</span>
                <input
                  type="text"
                  placeholder="Cari username"
                  value={userFilters.search}
                  onChange={(e) => setUserFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <div className="field">
                <span className="icon">{Icons.filter}</span>
                <select
                  value={userFilters.profile}
                  onChange={(e) => setUserFilters((prev) => ({ ...prev, profile: e.target.value }))}
                >
                  <option value="">Semua profile</option>
                  {profiles.map((profile) => (
                    <option key={profile.name} value={profile.name}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <select
                  value={userFilters.enabled}
                  onChange={(e) => setUserFilters((prev) => ({ ...prev, enabled: e.target.value }))}
                >
                  <option value="">Semua status</option>
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div className="field">
                <select
                  value={userFilters.status}
                  onChange={(e) => setUserFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">Online + Offline</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>

            <div className="table-card">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Status</th>
                      <th>Enabled</th>
                      <th>Active IP</th>
                      <th>Uptime</th>
                      <th>Profile</th>
                      <th>Comment</th>
                      <th>Last Seen</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedUsers.length === 0 && (
                      <tr>
                        <td colSpan={9} className="empty">
                          Tidak ada data.
                        </td>
                      </tr>
                    )}
                    {mergedUsers.map((row) => (
                      <tr key={row.username}>
                        <td data-label="Username">{row.username}</td>
                        <td data-label="Status">
                          <span className={`status ${row.status}`}>{row.status}</span>
                        </td>
                        <td data-label="Enabled">
                          <button
                            className={`toggle ${row.disabled ? 'off' : 'on'}`}
                            onClick={() => handleToggleUser(row)}
                            disabled={!isAdmin}
                          >
                            {Icons.toggle}
                            {row.disabled ? 'Disabled' : 'Enabled'}
                          </button>
                        </td>
                        <td data-label="Active IP">{row.activeIp || '-'}</td>
                        <td data-label="Uptime">{row.uptime || '-'}</td>
                        <td data-label="Profile">{row.profile || '-'}</td>
                        <td data-label="Comment">{row.comment || '-'}</td>
                        <td data-label="Last Seen">{formatDate(row.lastSeen)}</td>
                        <td data-label="Actions">
                          <div className="row-actions">
                            <button className="ghost" onClick={() => openEditUser(row)} disabled={!isAdmin}>
                              {Icons.edit}
                              Edit
                            </button>
                            <button className="ghost danger" onClick={() => handleDeleteUser(row)} disabled={!isAdmin}>
                              {Icons.trash}
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <ActionTrail items={actionTrail} inline />
          </section>
        </div>
      )}

      {activeTab === 'profiles' && (
        <div className="content-grid">
          <section className="section-card glass">
            <div className="section-header">
              <div>
                <h3>PPPoE Profiles</h3>
                <p>Kelola paket dan rate-limit.</p>
              </div>
              {isAdmin && (
                <button className="primary btn-sm" onClick={openCreateProfile}>
                  {Icons.plus} Tambah Profile
                </button>
              )}
            </div>

            <div className="table-card">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Rate-limit</th>
                      <th>Local Address</th>
                      <th>Remote Pool</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="empty">
                          Belum ada profile.
                        </td>
                      </tr>
                    )}
                    {profiles.map((profile) => (
                      <tr key={profile.name}>
                        <td data-label="Name">{profile.name}</td>
                        <td data-label="Rate-limit">{profile.rateLimit || '-'}</td>
                        <td data-label="Local Address">{profile.localAddress || '-'}</td>
                        <td data-label="Remote Pool">{profile.remoteAddressPool || '-'}</td>
                        <td data-label="Actions">
                          <div className="row-actions">
                            <button className="ghost" onClick={() => openEditProfile(profile)} disabled={!isAdmin}>
                              {Icons.edit}
                              Edit
                            </button>
                            <button
                              className="ghost danger"
                              onClick={() => handleDeleteProfile(profile)}
                              disabled={!isAdmin}
                            >
                              {Icons.trash}
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <ActionTrail items={actionTrail} inline />
          </section>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="content-grid">
          <section className="section-card glass">
            <div className="section-header">
              <div>
                <h3>Audit Logs</h3>
                <p>100 tindakan admin terakhir.</p>
              </div>
              <button className="ghost" onClick={loadAuditLogs}>
                {Icons.filter}
                Refresh
              </button>
            </div>

            <div className="table-card">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Status</th>
                      <th>Target</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="empty">
                          Belum ada audit log.
                        </td>
                      </tr>
                    )}
                    {auditLogs.map((log) => (
                      <tr key={log.id ?? `${log.action}-${log.createdAt}`}>
                        <td data-label="Waktu">{formatDate(log.createdAt)}</td>
                        <td data-label="User">{log.user?.username || '-'}</td>
                        <td data-label="Action">{log.action}</td>
                        <td data-label="Status">
                          <span className={`status ${log.status === 'success' ? 'online' : 'offline'}`}>
                            {log.status || 'n/a'}
                          </span>
                        </td>
                        <td data-label="Target">{log.targetId || log.targetType || '-'}</td>
                        <td data-label="Error">{log.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <ActionTrail items={actionTrail} inline />
          </section>
        </div>
      )}

      <Modal
        open={userModalOpen}
        title={userModalMode === 'create' ? 'Tambah User' : 'Edit User'}
        onClose={() => setUserModalOpen(false)}
      >
        <div className="form-grid">
          <label>
            <span>Username</span>
            <input
              value={userForm.username}
              onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
              disabled={userModalMode === 'edit'}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder={userModalMode === 'edit' ? 'Kosongkan jika tidak diganti' : 'Minimal 8 karakter'}
            />
          </label>
          <label>
            <span>Profile</span>
            <select
              value={userForm.profile}
              onChange={(e) => setUserForm((prev) => ({ ...prev, profile: e.target.value }))}
            >
              <option value="">Pilih profile</option>
              {profiles.map((profile) => (
                <option key={profile.name} value={profile.name}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Comment</span>
            <input
              value={userForm.comment}
              onChange={(e) => setUserForm((prev) => ({ ...prev, comment: e.target.value }))}
              maxLength={200}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={userForm.disabled}
              onChange={(e) => setUserForm((prev) => ({ ...prev, disabled: e.target.checked }))}
            />
            <span>Disabled</span>
          </label>
        </div>
        {userFormError && <div className="error">{userFormError}</div>}
        <div className="modal-actions">
          <button className="ghost" onClick={() => setUserModalOpen(false)}>
            Batal
          </button>
          <button className="primary" onClick={submitUserForm} disabled={isBusy}>
            {userModalMode === 'create' ? 'Buat User' : 'Simpan Perubahan'}
          </button>
        </div>
      </Modal>

      <Modal
        open={profileModalOpen}
        title={profileModalMode === 'create' ? 'Tambah Profile' : 'Edit Profile'}
        onClose={() => setProfileModalOpen(false)}
      >
        <div className="form-grid">
          <label>
            <span>Nama Profile</span>
            <input
              value={profileForm.name}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={profileModalMode === 'edit'}
            />
          </label>
          <label>
            <span>Rate-limit</span>
            <input
              value={profileForm.rateLimit}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, rateLimit: e.target.value }))}
              placeholder="Contoh: 10M/10M"
            />
          </label>
          <label>
            <span>Local Address</span>
            <input
              value={profileForm.localAddress}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, localAddress: e.target.value }))}
            />
          </label>
          <label>
            <span>Remote Pool</span>
            <input
              value={profileForm.remoteAddressPool}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, remoteAddressPool: e.target.value }))}
            />
          </label>
        </div>
        {profileFormError && <div className="error">{profileFormError}</div>}
        <div className="modal-actions">
          <button className="ghost" onClick={() => setProfileModalOpen(false)}>
            Batal
          </button>
          <button className="primary" onClick={submitProfileForm} disabled={isBusy}>
            {profileModalMode === 'create' ? 'Buat Profile' : 'Simpan Perubahan'}
          </button>
        </div>
      </Modal>

      {confirmState && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal glass">
            <div className="modal-header">
              <h3>{confirmState.title}</h3>
              <button className="ghost" onClick={() => setConfirmState(null)} type="button">
                Close
              </button>
            </div>
            <div className="modal-body confirm-body">
              <div className="confirm-icon">{Icons.alert}</div>
              <p>{confirmState.description}</p>
              {confirmState.diff && (
                <div className="diff-box">
                  {Object.entries(confirmState.diff).map(([key, value]) => (
                    <div key={key} className="diff-row">
                      <span className="diff-key">{key}</span>
                      <span className="diff-before">{String(value.before ?? '-')}</span>
                      <span className="diff-arrow">→</span>
                      <span className="diff-after">{String(value.after ?? '-')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setConfirmState(null)}>
                Batal
              </button>
              <button
                className="primary danger"
                onClick={confirmState.onConfirm}
                disabled={isBusy}
              >
                {confirmState.confirmLabel || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
