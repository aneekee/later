import { useState } from 'react';
import {
  useLoginMutation,
  useMeQuery,
  useRegisterMutation,
} from './features/auth/api/auth.api';

export const App = () => {
  const { data: user, refetch } = useMeQuery(null);

  const [register] = useRegisterMutation();
  const [login] = useLoginMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    if (!username || !password) {
      setMessage('Username and password are required.');
      return;
    }

    try {
      await register({ username, password }).unwrap();
      setMessage('Registered successfully. You can log in now.');
    } catch {
      setMessage('Register failed. Please try again.');
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setMessage('Username and password are required.');
      return;
    }

    try {
      await login({ username, password }).unwrap();
      await refetch();
      setMessage('Logged in successfully.');
    } catch {
      setMessage('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="app">
      <h1>Hello, Later</h1>
      {user ? <p>Welcome, {user.username ?? user.name ?? 'User'}!</p> : null}

      <div className="auth-form">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="johndoe"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
        />

        <div className="actions">
          <button type="button" onClick={handleRegister}>
            Register
          </button>
          <button type="button" onClick={handleLogin}>
            Login
          </button>
        </div>

        {message ? <p className="message">{message}</p> : null}
      </div>
    </div>
  );
};
