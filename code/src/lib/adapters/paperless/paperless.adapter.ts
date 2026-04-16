import type { BaseAdapter, ConnectionConfig, HealthCheckResult } from "../adapter-types";
import { AdapterError } from "../adapter-types";

export interface PaperlessConfig {
  baseUrl: string;
  token: string;
}

export interface PaperlessDocument {
  id: number;
  title: string;
  content: string;
  document_type: number | null;
  correspondent: number | null;
  tags: number[];
  created: string;
  added: string;
  archived_file_name: string | null;
  original_file_name: string;
  download_url?: string;
  thumbnail_url?: string;
}

export interface PaperlessListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PaperlessDocument[];
}

export interface PaperlessTag {
  id: number;
  name: string;
  slug: string;
}

export interface PaperlessCorrespondent {
  id: number;
  name: string;
  slug: string;
}

function assertPaperlessConfig(config: Record<string, unknown>): PaperlessConfig {
  if (typeof config.baseUrl !== "string" || !config.baseUrl) {
    throw new AdapterError("VALIDATION_ERROR", "Paperless config missing baseUrl");
  }
  if (typeof config.token !== "string" || !config.token) {
    throw new AdapterError("VALIDATION_ERROR", "Paperless config missing token");
  }
  return { baseUrl: config.baseUrl, token: config.token };
}

export class PaperlessAdapter implements BaseAdapter {
  readonly type = "paperless" as const;
  readonly connectionId: string;

  private readonly baseUrl: string;
  private readonly token: string;

  constructor(connection: ConnectionConfig) {
    this.connectionId = connection.id;
    const cfg = assertPaperlessConfig(connection.config);
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
    this.token = cfg.token;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Token ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api${path}`;

    let response: Response;
    try {
      response = await fetch(url, { headers: this.headers, ...options });
    } catch (err) {
      throw new AdapterError(
        "CONNECTION_FAILED",
        `Cannot connect to Paperless at ${this.baseUrl}`,
        err,
        true
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new AdapterError("AUTH_FAILED", "Paperless authentication failed — check your API token");
    }
    if (response.status === 429) {
      throw new AdapterError("RATE_LIMITED", "Paperless rate limit exceeded", undefined, true);
    }
    if (!response.ok) {
      const status = response.status;
      throw new AdapterError("EXTERNAL_ERROR", `Paperless responded with ${status}`, undefined, false);
    }

    return response.json() as Promise<T>;
  }

  async testConnection(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.request<unknown>("/documents/?page_size=1");
      return { healthy: true, latencyMs: Date.now() - start, checkedAt: new Date() };
    } catch (err) {
      const message = err instanceof AdapterError ? err.message : "Unknown error";
      return { healthy: false, latencyMs: Date.now() - start, message, checkedAt: new Date() };
    }
  }

  async getDocuments(options: {
    page?: number;
    pageSize?: number;
    ordering?: string;
    search?: string;
    tags?: number[];
  } = {}): Promise<PaperlessListResponse> {
    const params = new URLSearchParams();
    if (options.page) params.set("page", String(options.page));
    if (options.pageSize) params.set("page_size", String(options.pageSize));
    if (options.ordering) params.set("ordering", options.ordering);
    if (options.search) params.set("query", options.search);
    if (options.tags?.length) options.tags.forEach((t) => params.append("tags__id__all", String(t)));

    const query = params.toString();
    const suffix = query ? `?${query}` : "";
    return this.request<PaperlessListResponse>(`/documents/${suffix}`);
  }

  async getDocument(id: number): Promise<PaperlessDocument> {
    return this.request<PaperlessDocument>(`/documents/${id}/`);
  }

  async getTags(): Promise<PaperlessTag[]> {
    const res = await this.request<{ results: PaperlessTag[] }>("/tags/?page_size=100");
    return res.results;
  }

  async getCorrespondent(id: number): Promise<PaperlessCorrespondent> {
    return this.request<PaperlessCorrespondent>(`/correspondents/${id}/`);
  }

  getDownloadUrl(doc: PaperlessDocument): string {
    return `${this.baseUrl}/api/documents/${doc.id}/download/`;
  }

  getThumbnailUrl(doc: PaperlessDocument): string {
    return `${this.baseUrl}/api/documents/${doc.id}/thumb/`;
  }
}
