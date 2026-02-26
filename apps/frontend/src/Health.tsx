import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const Health = () => {
  const [status, setStatus] = useState<'loading' | 'ok' | 'degraded' | 'error'>('loading');
  const [apiStatus, setApiStatus] = useState<'ok' | 'error' | 'loading'>('loading');
  const [mikrotikStatus, setMikrotikStatus] = useState<'ok' | 'error' | 'loading'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { credentials: 'include' });
        if (!res.ok) throw new Error('Health check failed');
        const data = await res.json();
        const overallStatus = data?.status === 'degraded' ? 'degraded' : 'ok';
        const serviceApiStatus = data?.services?.api?.status === 'ok' ? 'ok' : 'error';
        const serviceMikrotikStatus = data?.services?.mikrotik?.connected ? 'ok' : 'error';
        const mktError = data?.services?.mikrotik?.error;
        const mktLatency = data?.services?.mikrotik?.latencyMs;

        setStatus(overallStatus);
        setApiStatus(serviceApiStatus);
        setMikrotikStatus(serviceMikrotikStatus);
        setMessage(
          serviceMikrotikStatus === 'ok'
            ? `MikroTik connected (${mktLatency ?? '-'} ms)`
            : `MikroTik disconnected${mktError ? `: ${mktError}` : ''}`
        );
      } catch (err: any) {
        setMessage(err.message || 'error');
        setStatus('error');
        setApiStatus('error');
        setMikrotikStatus('error');
      }
    };
    run();
  }, []);

  return (
    <div className="health-card">
      <h3>Health Check</h3>
      <p>Status: <strong className={`health ${status}`}>{status}</strong></p>
      <p>API: <strong className={`health ${apiStatus}`}>{apiStatus}</strong></p>
      <p>MikroTik: <strong className={`health ${mikrotikStatus}`}>{mikrotikStatus}</strong></p>
      <p>Message: {message}</p>
    </div>
  );
};

export default Health;
