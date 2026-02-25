const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const withBase = (path: string) => `${API_BASE}${path}`;

export async function getCsrfToken(): Promise<string> {
  const res = await fetch(withBase('/api/auth/csrf'), {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data = await res.json();
  return data.csrfToken as string;
}

export async function login(username: string, password: string): Promise<void> {
  const csrfToken = await getCsrfToken();
  const res = await fetch(withBase('/api/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Login failed');
  }
}

export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken();
  const res = await fetch(withBase('/api/auth/logout'), {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Logout failed');
}

export async function me() {
  const res = await fetch(withBase('/api/auth/me'), {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function fetchCustomers(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '' || value === null) return;
    query.set(key, String(value));
  });
  const res = await fetch(withBase(`/api/customers?${query.toString()}`), {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function fetchStats(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '' || value === null) return;
    query.set(key, String(value));
  });
  const res = await fetch(withBase(`/api/customers/stats?${query.toString()}`), {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchPppoeUsers() {
  const res = await fetch(withBase('/api/pppoe/users'), {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch PPPoE users');
  return res.json();
}

export async function createPppoeUser(payload: {
  username: string;
  password: string;
  profile?: string;
  comment?: string;
  disabled?: boolean;
}) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(withBase('/api/pppoe/users'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to create user');
  }
}

export async function updatePppoeUser(username: string, payload: Record<string, unknown>) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(withBase(`/api/pppoe/users/${encodeURIComponent(username)}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to update user');
  }
}

export async function deletePppoeUser(username: string) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(withBase(`/api/pppoe/users/${encodeURIComponent(username)}`), {
    method: 'DELETE',
    headers: {
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to delete user');
  }
}

export async function setPppoeUserDisabled(username: string, disabled: boolean) {
  const csrfToken = await getCsrfToken();
  const endpoint = disabled ? 'disable' : 'enable';
  const res = await fetch(withBase(`/api/pppoe/users/${encodeURIComponent(username)}/${endpoint}`), {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to update status');
  }
}

export async function fetchPppoeProfiles() {
  const res = await fetch(withBase('/api/pppoe/profiles'), {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch profiles');
  return res.json();
}

export async function createPppoeProfile(payload: {
  name: string;
  rateLimit?: string;
  localAddress?: string;
  remoteAddressPool?: string;
}) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(withBase('/api/pppoe/profiles'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to create profile');
  }
}

export async function updatePppoeProfile(name: string, payload: Record<string, unknown>) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(withBase(`/api/pppoe/profiles/${encodeURIComponent(name)}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to update profile');
  }
}

export async function deletePppoeProfile(name: string) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(withBase(`/api/pppoe/profiles/${encodeURIComponent(name)}`), {
    method: 'DELETE',
    headers: {
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to delete profile');
  }
}

export async function fetchAuditLogs(limit = 100) {
  const res = await fetch(withBase(`/api/audit?limit=${limit}`), {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}
