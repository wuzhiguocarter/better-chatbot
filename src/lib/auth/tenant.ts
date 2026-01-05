export const getDefaultTenantId = () =>
  process.env.DEFAULT_TENANT_ID || "default";

export const getTenantIdFromHeaders = (headers?: Headers | null) => {
  if (!headers) {
    return null;
  }

  return headers.get("x-tenant-id") || headers.get("x-tenant");
};

export const resolveTenantId = (headers?: Headers | null) =>
  getTenantIdFromHeaders(headers) || getDefaultTenantId();
