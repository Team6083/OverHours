import { useState, useCallback } from "react";

export function useAsync<T>(f: () => Promise<T>) {
  const [result, setResult] = useState<T | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const reload = useCallback(() => {
    setPending(true);
    f()
      .then((r) => {
        setResult(r);
        setError(null);
      })
      .catch((e) => {
        setError(e);
        setResult(null);
      })
      .finally(() => setPending(false));
  }, [f]);

  return {
    error,
    result,
    pending,
    reload,
  };
}
