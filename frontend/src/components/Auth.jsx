import { useState } from 'react'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'https://expensemate-backend-kxdj.onrender.com'
).replace(/\/$/, '')

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')

    const endpoint = isLogin ? 'login' : 'register'

    const body = isLogin
      ? { email: email.trim(), password }
      : { name: name.trim(), email: email.trim(), password }

    setIsLoading(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed')
      }

      if (isLogin) {
        onLogin(data)
      } else {
        setIsLogin(true)
        setPassword('')
        setError('Registration successful! Please login.')
      }
    } catch (error) {
      console.error('Authentication error:', error)

      setError(
        error.message === 'Failed to fetch'
          ? 'Unable to connect to server. Please try again.'
          : error.message,
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>ExpenseMate</h1>
        <h2>{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>

        {!isLogin && (
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={event => setName(event.target.value)}
            required
          />
        )}

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={event => setEmail(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (minimum 8 characters)"
          value={password}
          onChange={event => setPassword(event.target.value)}
          minLength={8}
          required
        />

        {error && <p className="auth-message">{error}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading
            ? 'Please wait...'
            : isLogin
              ? 'Login'
              : 'Register'}
        </button>

        <p>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}

          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setPassword('')
            }}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </form>
    </div>
  )
}

export default Auth