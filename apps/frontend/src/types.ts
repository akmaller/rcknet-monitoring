export type Role = 'admin' | 'operator' | 'viewer';

export type User = {
  id: string;
  username: string;
  role: Role;
};

export type CustomerStatus = {
  id: string | number;
  username: string;
  status: 'online' | 'offline';
  activeIp: string | null;
  uptime: string | null;
  profile: string | null;
  comment: string | null;
  lastSeen: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomersStats = {
  total: number;
  online: number;
  offline: number;
};

export type PppoeSecret = {
  username: string;
  profile: string | null;
  comment: string | null;
  rateLimit: string | null;
  disabled: boolean;
};

export type PppoeUserRow = {
  username: string;
  profile: string | null;
  comment: string | null;
  rateLimit: string | null;
  disabled: boolean;
  status: 'online' | 'offline';
  activeIp: string | null;
  uptime: string | null;
  lastSeen: string | null;
};

export type PppoeProfile = {
  name: string;
  rateLimit: string | null;
  localAddress: string | null;
  remoteAddressPool: string | null;
};

export type AuditLogEntry = {
  id: string | null;
  action: string;
  status: string | null;
  targetType: string | null;
  targetId: string | null;
  error: string | null;
  createdAt: string;
  user: { id: string | null; username: string; role: Role } | null;
};

export type MikrotikServerInfo = {
  type: string;
  platform: string | null;
  totalMemoryBytes: number | null;
  freeMemoryBytes: number | null;
};
