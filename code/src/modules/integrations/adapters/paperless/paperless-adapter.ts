/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ConnectionType, HealthCheckResult } from "../../providers";

import { NotImplementedError } from "../not-implemented-error";
import type {
  DocumentProvider,
  DocumentProviderCapabilities,
  DocumentSearchQuery,
  DocumentUpload,
  ExternalDocument,
  DocumentMetadata,
  PaginatedResult,
} from "../../providers";

/**
 * Paperless-ngx document provider stub.
 *
 * API: REST v3+ at <paperless-url>/api/
 * Auth: Token-based (Authorization: Token <token>)
 * Default permissions: read-only
 *
 * Implementation target: Phase 2
 * Reference: docs/integrations.md — Paperless-ngx Integration Details
 */
export class PaperlessAdapter implements DocumentProvider {
  readonly type: ConnectionType = "PAPERLESS";
  readonly connectionId: string;

  readonly capabilities: DocumentProviderCapabilities = {
    canSearch: true,
    canUpload: true,
    canUpdateMetadata: true,
    canOCR: true,
    supportsTags: true,
    supportsCorrespondents: true,
  };

  constructor(connectionId: string) {
    this.connectionId = connectionId;
  }

  async search(_query: DocumentSearchQuery): Promise<PaginatedResult<ExternalDocument>> {
    throw new NotImplementedError("PaperlessAdapter", "search");
  }

  async getById(_externalId: string): Promise<ExternalDocument | null> {
    throw new NotImplementedError("PaperlessAdapter", "getById");
  }

  async list(_params?: { page?: number; pageSize?: number }): Promise<PaginatedResult<ExternalDocument>> {
    throw new NotImplementedError("PaperlessAdapter", "list");
  }

  async getMetadata(_externalId: string): Promise<DocumentMetadata | null> {
    throw new NotImplementedError("PaperlessAdapter", "getMetadata");
  }

  async getThumbnail(_externalId: string): Promise<Buffer | null> {
    throw new NotImplementedError("PaperlessAdapter", "getThumbnail");
  }

  async upload(_upload: DocumentUpload): Promise<ExternalDocument> {
    throw new NotImplementedError("PaperlessAdapter", "upload");
  }

  async updateMetadata(_externalId: string, _metadata: Partial<DocumentMetadata>): Promise<void> {
    throw new NotImplementedError("PaperlessAdapter", "updateMetadata");
  }

  async testConnection(): Promise<HealthCheckResult> {
    return {
      healthy: false,
      latencyMs: 0,
      message: "PaperlessAdapter not yet implemented (Phase 2)",
      checkedAt: new Date(),
    };
  }
}
