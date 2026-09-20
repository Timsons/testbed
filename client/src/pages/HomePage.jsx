import { useEffect, useState } from 'react';

function HomePage() {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((body) => setStatus(body.success ? body.data.status : 'unreachable'))
      .catch(() => setStatus('unreachable'));
  }, []);

  return (
    <div className="page">
      <h1>Bootcamp App</h1>
      <p>Server status: {status}</p>
    </div>
  );
}

export default HomePage;
