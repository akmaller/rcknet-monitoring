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
