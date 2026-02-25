import env from '../config/env';
import logger from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { RouterOSClient } = require('routeros-client');

type RouterClient = any;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MikrotikClient {
  private createClient() {
    return new RouterOSClient({
      host: env.mikrotik.host,
      user: env.mikrotik.user,
      password: env.mikrotik.password,
      port: env.mikrotik.port,
      timeout: env.mikrotik.timeout
    });
  }

  async withClient<T>(handler: (client: RouterClient) => Promise<T>): Promise<T> {
    let lastErr: unknown;
    const attempts = Math.max(1, env.mikrotik.retryCount);

    for (let i = 0; i < attempts; i += 1) {
      const api = this.createClient();
      try {
        const client = await api.connect();
        const result = await handler(client);
        api.close();
        return result;
      } catch (err) {
        lastErr = err;
        try {
          api.close();
        } catch {
          // ignore close error
        }
        if (i < attempts - 1) {
          await sleep(env.mikrotik.retryDelayMs);
        }
      }
    }

    logger.error({ err: lastErr }, 'mikrotik_request_failed');
    throw lastErr;
  }

  async getActiveSessions() {
    return this.withClient(async (client) => {
      return client.menu('/ppp active').get();
    });
  }

  async getSecrets() {
    return this.withClient(async (client) => {
      return client.menu('/ppp secret').get();
    });
  }

  async getSecretByName(name: string) {
    return this.withClient(async (client) => {
      return client.menu('/ppp secret').where('name', name).getOnly();
    });
  }

  async getProfileByName(name: string) {
    return this.withClient(async (client) => {
      return client.menu('/ppp profile').where('name', name).getOnly();
    });
  }
}
