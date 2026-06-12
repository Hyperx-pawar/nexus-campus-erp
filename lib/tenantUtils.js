// lib/tenantUtils.js
/**
 * Convert a string to a URL‑friendly slug.
 */
export function slugify(str) {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-') // replace spaces with -
    .replace(/[^\w-]+/g, '') // remove non‑word chars
    .replace(/--+/g, '-') // collapse multiple -
    .replace(/^-+/, '') // trim - from start
    .replace(/-+$/, ''); // trim - from end
}

/**
 * Build a bucket name for a tenant.
 * @param {Object} tenant – must contain `type` and `name` fields.
 * @returns {string} bucket name
 */
export function getTenantBucketName(tenant) {
  const type = tenant.type?.toLowerCase() ?? 'tenant';
  const nameSlug = slugify(tenant.name ?? 'default');
  return `${type}-${nameSlug}-bucket`;
}
