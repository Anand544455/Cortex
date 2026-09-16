import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Form';
import Button from '../../components/ui/Button';

export default function Login() {
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      push('Welcome back.');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center">
            <Brain size={16} className="text-ink" />
          </div>
          <span className="font-display font-bold text-xl text-white">CORTEX</span>
        </div>

        <div className="bg-white rounded-card shadow-lift p-7">
          <h1 className="font-display font-semibold text-navy text-lg mb-1">Log in</h1>
          <p className="text-sm text-slate mb-6">Welcome back to your SEO command center.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
            />
            <Input
              label="Password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Button type="submit" loading={loading} className="w-full justify-center" icon={ArrowRight}>
              Log in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-white/60 mt-5">
          New here?{' '}
          <Link to="/register" className="text-teal font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
