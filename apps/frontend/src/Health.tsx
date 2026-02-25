import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const Health = () => {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { credentials: 'include' });
        if (!res.ok) throw new Error('Health check failed');
        const data = await res.json();
        setMessage(data.status || 'ok');
        setStatus('ok');
      } catch (err: any) {
        setMessage(err.message || 'error');
        setStatus('error');
      }
    };
    run();
  }, []);

  return (
    <div className="health-card">
      <h3>Health Check</h3>
      <p>Status: <strong className={`health ${status}`}>{status}</strong></p>
      <p>Message: {message}</p>
    </div>
  );
};

export default Health;
