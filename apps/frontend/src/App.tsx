import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { fetchCustomers, fetchStats, login, logout, me } from './api';
import type { CustomerStatus, CustomersStats, User } from './types';
import Health from './Health';

const defaultStats: CustomersStats = { total: 0, online: 0, offline: 0 };

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatStatus = (status: CustomerStatus['status']) =>
  status === 'online' ? 'Online' : 'Offline';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [stats, setStats] = useState<CustomersStats>(defaultStats);
  const [customers, setCustomers] = useState<CustomerStatus[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    profile: '',
    comment: ''
  });
  const [page, setPage] = useState({ limit: 100, offset: 0 });

  const filterParams = useMemo(
    () => ({
      search: filters.search || undefined,
      status: filters.status || undefined,
      profile: filters.profile || undefined,
      comment: filters.comment || undefined
    }),
    [filters]
  );

  const loadData = async () => {
    const [statsRes, customersRes] = await Promise.all([
      fetchStats(filterParams),
      fetchCustomers({ ...filterParams, limit: page.limit, offset: page.offset })
    ]);
    setStats(statsRes.data);
    setCustomers(customersRes.data);
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
    loadData().catch(() => {
      setCustomers([]);
      setStats(defaultStats);
    });
  }, [user, filterParams, page]);

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
    } finally {
      setIsBusy(false);
    }
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage((prev) => ({ ...prev, offset: 0 }));
  };

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="card">Memuat sesi...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell login-bg">
        <div className="login-card">
          <div className="login-header">
            <h1>RCKNet Monitoring</h1>
            <p>Masuk untuk melihat status PPPoE pelanggan.</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              Username
              <input name="username" type="text" autoComplete="username" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            {loginError && <div className="error">{loginError}</div>}
            <button type="submit" disabled={isBusy}>
              {isBusy ? 'Memproses...' : 'Login'}
            </button>
          </form>
          <div className="login-footer">
            <span>Session aman dengan cookie httpOnly + CSRF.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell dashboard-bg">
      <header className="topbar">
        <div>
          <h2>Dashboard</h2>
          <p className="subtitle">RT/RW Net Monitoring</p>
        </div>
        <div className="topbar-actions">
          <div className="user-chip">
            {user.username} · {user.role}
          </div>
          <button className="ghost" onClick={handleLogout} disabled={isBusy}>
            Logout
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Total Pelanggan</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="stat-card accent">
          <span>Online</span>
          <strong>{stats.online}</strong>
        </div>
        <div className="stat-card muted">
          <span>Offline</span>
          <strong>{stats.offline}</strong>
        </div>
        <Health />
      </section>

      <section className="filters">
        <input
          type="text"
          placeholder="Cari username..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">Semua Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <input
          type="text"
          placeholder="Filter profile"
          value={filters.profile}
          onChange={(e) => handleFilterChange('profile', e.target.value)}
        />
        <input
          type="text"
          placeholder="Filter comment"
          value={filters.comment}
          onChange={(e) => handleFilterChange('comment', e.target.value)}
        />
      </section>

      <section className="table-card">
        <div className="table-header">
          <h3>Customer PPPoE</h3>
          <div className="pager">
            <button
              className="ghost"
              disabled={page.offset === 0}
              onClick={() => setPage((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
            >
              Prev
            </button>
            <button
              className="ghost"
              onClick={() => setPage((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
            >
              Next
            </button>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Status</th>
                <th>IP Aktif</th>
                <th>Uptime</th>
                <th>Profile</th>
                <th>Comment</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    Tidak ada data.
                  </td>
                </tr>
              )}
              {customers.map((item) => (
                <tr key={item.username}>
                  <td>{item.username}</td>
                  <td>
                    <span className={`status ${item.status}`}>
                      {formatStatus(item.status)}
                    </span>
                  </td>
                  <td>{item.activeIp || '-'}</td>
                  <td>{item.uptime || '-'}</td>
                  <td>{item.profile || '-'}</td>
                  <td>{item.comment || '-'}</td>
                  <td>{formatDate(item.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;
