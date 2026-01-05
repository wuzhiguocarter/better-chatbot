import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDefaultTenantId, resolveTenantId } from "./tenant";

let originalEnv: Record<string, string | undefined>;

describe("tenant helpers", () => {
  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.unstubAllEnvs();
    delete process.env.DEFAULT_TENANT_ID;
  });

  afterEach(() => {
    process.env = { ...originalEnv } as any; // ts-ignore
    vi.unstubAllEnvs();
  });

  it("returns default tenant id when no env is set", () => {
    expect(getDefaultTenantId()).toBe("default");
  });

  it("uses the DEFAULT_TENANT_ID env when set", () => {
    vi.stubEnv("DEFAULT_TENANT_ID", "acme");
    expect(getDefaultTenantId()).toBe("acme");
  });

  it("prefers header tenant id over default", () => {
    vi.stubEnv("DEFAULT_TENANT_ID", "fallback");
    const requestHeaders = new Headers([["x-tenant-id", "tenant-42"]]);

    expect(resolveTenantId(requestHeaders)).toBe("tenant-42");
  });

  it("falls back to default when no header provided", () => {
    vi.stubEnv("DEFAULT_TENANT_ID", "fallback");

    expect(resolveTenantId()).toBe("fallback");
  });
});
