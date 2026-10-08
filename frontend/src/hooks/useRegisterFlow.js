import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Register click: logged out -> /auth (remembering returnTo); logged in -> open the payment modal for `target`. */
export default function useRegisterFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [target, setTarget] = useState(null);
  const start = (t, returnTo) => user ? setTarget(t) : navigate('/auth', { state: { from: returnTo } });
  return { target, start, close: () => setTarget(null) };
}
