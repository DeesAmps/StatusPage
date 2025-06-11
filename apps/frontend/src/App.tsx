import { useState, useEffect } from 'react'
import './App.css'
import { register, login, getMe } from './api'
import Dashboard from './Dashboard'

function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [error, setError] = useState('')
  const [user, setUser] = useState<{ email: string } | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const fn = mode === 'login' ? login : register
      const res = await fn(email, password)
      setToken(res.token)
      localStorage.setItem('token', res.token)
      const me = await getMe(res.token)
      setUser(me.user)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }

  // Fetch user if token exists
  useEffect(() => {
    if (token) {
      getMe(token).then(me => setUser(me.user)).catch(() => handleLogout())
    }
  }, [token])

  if (user) {
    return (
      <div className="authed">
        <h2>Welcome, {user.email}</h2>
        <button onClick={handleLogout}>Logout</button>
        <Dashboard token={token!} />
      </div>
    )
  }

  return (
    <div className="auth-container">
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  )
}

export default App
