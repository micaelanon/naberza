import { useState, useCallback } from "react";

export interface UseFormSubmitOptions {
  onSuccess?: (message?: string) => void;
  onError?: (message: string) => void;
  successMessage?: string;
}

/**
 * Encapsulates the saving/error state pattern shared across all create/edit forms.
 * Usage: const { saving, error, setError, submit } = useFormSubmit({ onSuccess, onError });
 * Then call: await submit(async () => { fetch...; onDone(); });
 */
export function useFormSubmit(options: UseFormSubmitOptions = {}) {
  const { onSuccess, onError, successMessage } = options;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (action: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      onSuccess?.(successMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  }, [onSuccess, onError, successMessage]);

  return { saving, error, setError, submit };
}
