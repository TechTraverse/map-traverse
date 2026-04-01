import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Login failed');
        return;
      }
      refetch();
      navigate('/configs', { replace: true });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mapui:flex mapui:items-center mapui:justify-center mapui:min-h-screen mapui:bg-gray-50">
      <div className="mapui:w-full mapui:max-w-sm">
        <div className="mapui:bg-white mapui:rounded-lg mapui:shadow-lg mapui:p-8">
          <h1 className="mapui:text-2xl mapui:font-bold mapui:text-gray-900 mapui:mb-6 mapui:text-center">
            Admin Login
          </h1>
          <form onSubmit={handleSubmit} className="mapui:space-y-4">
            <div>
              <label className="mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-700 mapui:mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                className="mapui:w-full mapui:border mapui:border-gray-300 mapui:rounded mapui:px-3 mapui:py-2 mapui:text-sm mapui:focus:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-700 mapui:mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="mapui:w-full mapui:border mapui:border-gray-300 mapui:rounded mapui:px-3 mapui:py-2 mapui:text-sm mapui:focus:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500"
              />
            </div>
            {error && (
              <p className="mapui:text-red-600 mapui:text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mapui:w-full mapui:bg-blue-600 mapui:text-white mapui:py-2 mapui:rounded mapui:hover:bg-blue-700 mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed mapui:font-medium"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
