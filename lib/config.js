function getConfig() {
  // CONSTRUCTION_CONFIG env var (JSON string) — primary for Vercel
  if (process.env.CONSTRUCTION_CONFIG) {
    try { return JSON.parse(process.env.CONSTRUCTION_CONFIG); } catch(e) {}
  }
  // Fallback to file
  try { return require('../config.json'); } catch(e) {}
  return { databases: {} };
}

export function getDB(key) {
  return getConfig().databases?.[key] || null;
}

export function getBranding() {
  const c = getConfig();
  return {
    name: c.name || 'Construction OS 2.0',
    currency: c.currency || 'DOP',
    logo: c.logo || null,
  };
}
