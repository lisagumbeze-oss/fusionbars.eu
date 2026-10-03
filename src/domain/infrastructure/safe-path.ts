export function safeInternalAdminPath(path: string, locale: string): string {
  const fallback = `/${locale}/admin`;
  if (!path.startsWith(fallback) || path.startsWith('//') || path.includes('\\') || path.includes('://') || path.includes('/admin/login')) {
    return fallback;
  }
  return path;
}
