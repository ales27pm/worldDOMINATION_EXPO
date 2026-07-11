// One-off: list public object storage contents, printed relative to the search path.
// Never prints bucket ids or full search paths.
import { Storage } from '@google-cloud/storage';

const SIDECAR = 'http://127.0.0.1:1106';
const storage = new Storage({
  credentials: {
    audience: 'replit',
    subject_token_type: 'access_token',
    token_url: `${SIDECAR}/token`,
    type: 'external_account',
    credential_source: {
      url: `${SIDECAR}/credential`,
      format: { type: 'json', subject_token_field_name: 'access_token' },
    },
    universe_domain: 'googleapis.com',
  },
  projectId: '',
});

const searchPaths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

for (let i = 0; i < searchPaths.length; i += 1) {
  const sp = searchPaths[i];
  const parts = sp.replace(/^\//, '').split('/');
  const bucketName = parts[0];
  const prefix = parts.slice(1).join('/');
  const [files] = await storage.bucket(bucketName).getFiles({ prefix });
  console.log(`--- search path #${i} (${files.length} objects) ---`);
  const rel = files
    .map((f) => f.name.slice(prefix.length ? prefix.length + 1 : 0))
    .sort();
  // Group by top 2 path segments for a compact overview
  const groups = new Map();
  for (const r of rel) {
    const seg = r.split('/');
    const key = seg.slice(0, Math.min(2, seg.length - 1)).join('/') || '(root)';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const [k, v] of [...groups.entries()].sort()) {
    console.log(`${k}: ${v.length}`);
    if (v.length <= 30) v.forEach((x) => console.log('   ' + x));
  }
}
