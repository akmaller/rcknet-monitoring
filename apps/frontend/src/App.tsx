import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { fetchCustomers, fetchStats, login, logout, me } from './api';
import type { CustomerStatus, CustomersStats, User } from './types';
import Health from './Health';

const defaultStats: CustomersStats = { total: 0, online: 0, offline: 0 };

const formatStatus = (status: CustomerStatus['status']) =>
  status === 'online' ? 'Online' : 'Offline';

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
  )
};

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

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      loadData().catch(() => {
        setCustomers([]);
        setStats(defaultStats);
      });
    }, 30000);
    return () => window.clearInterval(interval);
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
              <p>Secure monitoring hub</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              <span>Username</span>
              <div className="input-wrap">
                <span className="icon">{Icons.user}</span>
                <input name="username" type="text" autoComplete="username" required defaultValue="admin" />
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
        <div>
          <p className="eyebrow">RT/RW Net Monitoring</p>
          <h2>Network Control</h2>
        </div>
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

      <section className="stats-grid">
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
      </section>

      <section className="filters glass">
        <div className="field">
          <span className="icon">{Icons.search}</span>
          <input
            type="text"
            placeholder="Search username"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <div className="field">
          <span className="icon">{Icons.filter}</span>
          <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
            <option value="">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        <div className="field">
          <input
            type="text"
            placeholder="Filter profile"
            value={filters.profile}
            onChange={(e) => handleFilterChange('profile', e.target.value)}
          />
        </div>
        <div className="field">
          <input
            type="text"
            placeholder="Filter comment"
            value={filters.comment}
            onChange={(e) => handleFilterChange('comment', e.target.value)}
          />
        </div>
      </section>

      <section className="table-card glass">
        <div className="table-header">
          <h3>PPPoE Customers</h3>
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
                <th>Active IP</th>
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
                    No data.
                  </td>
                </tr>
              )}
              {customers.map((item) => (
                <tr key={item.username}>
                  <td>{item.username}</td>
                  <td>
                    <span className={`status ${item.status}`}>{formatStatus(item.status)}</span>
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
