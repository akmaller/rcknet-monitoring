import { MikrotikClient } from './mikrotik.service';

export type PppSecret = {
  name: string;
  profile?: string | null;
  comment?: string | null;
  rateLimit?: string | null;
  disabled?: boolean;
};

export class MikrotikService {
  private client: MikrotikClient;

  constructor() {
    this.client = new MikrotikClient();
  }

  async listSecrets() {
    return this.client.withClient(async (router) => {
      return router.menu('/ppp secret').get();
    });
  }

  async createSecret(data: {
    username: string;
    password: string;
    profile?: string;
    comment?: string;
    disabled?: boolean;
    rateLimit?: string;
  }) {
    const payload: Record<string, any> = {
      name: data.username,
      password: data.password
    };
    if (data.profile) payload.profile = data.profile;
    if (data.comment) payload.comment = data.comment;
    if (data.disabled !== undefined) payload.disabled = data.disabled ? 'yes' : 'no';
    if (data.rateLimit !== undefined) payload['rate-limit'] = data.rateLimit;

    return this.client.withClient(async (router) => {
      await router.menu('/ppp secret').add(payload);
    });
  }

  async updateSecret(
    name: string,
    patch: { password?: string; profile?: string; comment?: string; disabled?: boolean; rateLimit?: string }
  ) {
    const payload: Record<string, any> = {};
    if (patch.password !== undefined) payload.password = patch.password;
    if (patch.profile !== undefined) payload.profile = patch.profile;
    if (patch.comment !== undefined) payload.comment = patch.comment;
    if (patch.disabled !== undefined) payload.disabled = patch.disabled ? 'yes' : 'no';
    if (patch.rateLimit !== undefined) payload['rate-limit'] = patch.rateLimit;

    return this.client.withClient(async (router) => {
      const menu = router.menu('/ppp secret');
      const item = await menu.where('name', name).getOnly();
      if (!item) throw new Error('not_found');
      await menu.where('name', name).update(payload);
    });
  }

  async deleteSecret(name: string) {
    return this.client.withClient(async (router) => {
      const menu = router.menu('/ppp secret');
      const item = await menu.where('name', name).getOnly();
      if (!item) throw new Error('not_found');
      await menu.where('name', name).remove();
    });
  }

  async setSecretDisabled(name: string, disabled: boolean) {
    return this.updateSecret(name, { disabled });
  }

  async getSecretByName(name: string) {
    return this.client.getSecretByName(name);
  }
}
