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
