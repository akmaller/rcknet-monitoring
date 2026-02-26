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

  private async executeWithClient<T>(handler: (client: RouterClient) => Promise<T>, logFailure: boolean): Promise<T> {
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

    if (logFailure) {
      logger.error({ err: lastErr }, 'mikrotik_request_failed');
    }
    throw lastErr;
  }

  async withClient<T>(handler: (client: RouterClient) => Promise<T>): Promise<T> {
    return this.executeWithClient(handler, true);
  }

  async checkConnection() {
    const startedAt = Date.now();
    try {
      await this.executeWithClient(async (client) => {
        await client.menu('/system/identity').get();
        return true;
      }, false);
      return {
        connected: true,
        latencyMs: Date.now() - startedAt
      };
    } catch (err) {
      return {
        connected: false,
        latencyMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : 'mikrotik_connection_failed'
      };
    }
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
