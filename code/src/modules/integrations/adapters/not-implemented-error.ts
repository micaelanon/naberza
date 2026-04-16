import { AdapterError } from "../providers";

/**
 * Thrown by adapter stubs when a method is not yet implemented.
 * Replace with real implementation in Phase 2+.
 */
export class NotImplementedError extends AdapterError {
  constructor(adapterName: string, method: string) {
    super(
      "UNKNOWN",
      `[${adapterName}] Method "${method}" is not yet implemented. See Phase 2 roadmap.`,
      undefined,
      false
    );
    this.name = "NotImplementedError";
  }
}
