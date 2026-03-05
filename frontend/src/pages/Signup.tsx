import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signup, login } from '../api/auth';

export default function Signup() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login: authLogin } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!username || !email || !password) {
            setError('Username, Email, and Password are required.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await signup({ username, email, password, full_name: fullName });
            // Auto-login after signup
            const { token, user } = await login(username, password);
            authLogin(token.access_token, user);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Join us</h1>
                <p className="text-slate-500 text-sm mb-6">Create your account to get started.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            placeholder="johndoe"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            placeholder="john@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" senior-medium className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            placeholder="••••••••"
                            required
                            minLength={8}
                        />
                    </div>
                    {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-indigo-600 text-white py-2.5 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md shadow-indigo-200"
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-slate-500">
                    Already have an account? <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
