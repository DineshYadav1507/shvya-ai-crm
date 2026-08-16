import { FormEvent, ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { api, authToken, setAuthToken, User } from '../lib/api';

type AuthContextValue = { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; register: (data: { organizationName: string; name: string; email: string; password: string }) => Promise<void>; logout: () => void };
const AuthContext = createContext<AuthContextValue | null>(null);
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be inside AuthProvider'); return value; };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(authToken()));
  useEffect(() => { if (!authToken()) return setLoading(false); api.me().then(setUser).catch(() => setAuthToken(null)).finally(() => setLoading(false)); }, []);
  const login = async (email: string, password: string) => { const result = await api.login(email, password); setAuthToken(result.token); setUser(result.user); };
  const register = async (data: { organizationName: string; name: string; email: string; password: string }) => { const result = await api.register(data); setAuthToken(result.token); setUser(result.user); };
  const logout = () => { setAuthToken(null); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ organizationName: 'Shvya Demo', name: 'Dinesh', email: '', password: '' });
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); try { mode === 'login' ? await login(form.email, form.password) : await register(form); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to continue'); } };
  return <div className="auth-screen"><form className="auth-card" onSubmit={submit}><div className="brand"><div className="brand-mark">S</div><div><strong>Shvya AI</strong><span>CRM</span></div></div><h1>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1><p>Sign in to your sales workspace.</p>{mode === 'register' && <><label>Organization<input value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} required /></label><label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label></>}<label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label><label>Password<input type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>{error && <div className="error-box">{error}</div>}<button className="primary-button auth-submit">{mode === 'login' ? 'Sign in' : 'Create workspace'}</button><button type="button" className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create a new workspace' : 'Already have an account? Sign in'}</button></form></div>;
}
