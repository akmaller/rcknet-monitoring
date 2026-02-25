import { MikrotikClient } from './mikrotik.service';

export type PppProfile = {
  name: string;
  rateLimit?: string | null;
  localAddress?: string | null;
  remoteAddressPool?: string | null;
};

export class PppoeProfilesService {
  private client: MikrotikClient;

  constructor() {
    this.client = new MikrotikClient();
  }

  async listProfiles() {
    return this.client.withClient(async (router) => {
      return router.menu('/ppp profile').get();
    });
  }

  async getProfileByName(name: string) {
    return this.client.withClient(async (router) => {
      return router.menu('/ppp profile').where('name', name).getOnly();
    });
  }

  async createProfile(data: { name: string; rateLimit?: string; localAddress?: string; remoteAddressPool?: string }) {
    const payload: Record<string, any> = {
      name: data.name
    };
    if (data.rateLimit) payload['rate-limit'] = data.rateLimit;
    if (data.localAddress) payload['local-address'] = data.localAddress;
    if (data.remoteAddressPool) payload['remote-address'] = data.remoteAddressPool;

    return this.client.withClient(async (router) => {
      await router.menu('/ppp profile').add(payload);
    });
  }

  async updateProfile(name: string, patch: { rateLimit?: string; localAddress?: string; remoteAddressPool?: string }) {
    const payload: Record<string, any> = {};
    if (patch.rateLimit) payload['rate-limit'] = patch.rateLimit;
    if (patch.localAddress) payload['local-address'] = patch.localAddress;
    if (patch.remoteAddressPool) payload['remote-address'] = patch.remoteAddressPool;

    return this.client.withClient(async (router) => {
      const menu = router.menu('/ppp profile');
      const item = await menu.where('name', name).getOnly();
      if (!item) throw new Error('PPPoE profile not found');
      await menu.where('name', name).update(payload);
    });
  }

  async deleteProfile(name: string) {
    return this.client.withClient(async (router) => {
      const menu = router.menu('/ppp profile');
      const item = await menu.where('name', name).getOnly();
      if (!item) throw new Error('PPPoE profile not found');
      await menu.where('name', name).remove();
    });
  }
}
