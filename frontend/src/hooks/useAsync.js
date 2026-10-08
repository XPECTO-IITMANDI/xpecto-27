import { useCallback, useEffect, useState } from 'react';

/** Runs an async fn on mount/deps change. Returns { data, error, loading, reload }. */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(() => {
    setState(s => ({ ...s, error: null, loading: true }));
    fn().then(data => setState({ data, error: null, loading: false })).catch(e => setState({ data: null, error: e, loading: false }));
  }, deps); // eslint-disable-line
  useEffect(run, [run]);
  return { ...state, reload: run };
}
