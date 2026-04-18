import { useState, useCallback } from "react";

/**
 * Encapsulates the saving/error state pattern shared across all create/edit forms.
 * Usage: const { saving, error, setError, submit } = useFormSubmit();
 * Then call: await submit(async () => { fetch...; onDone(); });
 */
export function useFormSubmit() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (action: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }, []);

  return { saving, error, setError, submit };
}
