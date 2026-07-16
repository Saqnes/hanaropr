/* Cloudflare Pages Function — POST /api/save
   Commits assets/data.json to GitHub so the admin editor can save without git.
   FAIL-CLOSED: does nothing unless these env vars/secrets are configured in
   Cloudflare Pages → Settings → Environment variables:
     ADMIN_SECRET  — shared secret the admin types into the editor's "서버 저장 암호"
     GH_TOKEN      — GitHub fine-grained PAT with Contents: Read+Write on the repo (SECRET)
     GH_REPO       — "owner/repo"  (e.g. saqnes/hanaropr)
     GH_BRANCH     — branch to commit to (default: main)
     GH_PATH       — file path (default: assets/data.json)
   Also put /admin.html and /api/* behind Cloudflare Access — see ADMIN.md. */

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // fail closed if not configured
  if (!env.ADMIN_SECRET || !env.GH_TOKEN || !env.GH_REPO) {
    return json({ error: 'backend not configured' }, 403);
  }
  // shared-secret check (Cloudflare Access should also gate this path)
  if ((request.headers.get('x-admin-secret') || '') !== env.ADMIN_SECRET) {
    return json({ error: 'unauthorized' }, 401);
  }

  let data;
  try { data = await request.json(); } catch (e) { return json({ error: 'invalid json' }, 400); }
  // minimal shape validation
  const keys = ['projects', 'launches', 'awards', 'sponsors'];
  if (typeof data !== 'object' || data === null || !keys.every(k => Array.isArray(data[k]))) {
    return json({ error: 'unexpected data shape' }, 422);
  }

  const repo = env.GH_REPO;
  const branch = env.GH_BRANCH || 'main';
  const path = env.GH_PATH || 'assets/data.json';
  const api = `https://api.github.com/repos/${repo}/contents/${path}`;
  const ghHeaders = {
    'Authorization': `Bearer ${env.GH_TOKEN}`,
    'User-Agent': 'hanaro-admin',
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // get current sha (if file exists)
  let sha;
  try {
    const cur = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers: ghHeaders });
    if (cur.ok) { sha = (await cur.json()).sha; }
  } catch (e) { /* first write: no sha */ }

  const put = await fetch(api, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'admin: update data.json',
      content: b64utf8(JSON.stringify(data, null, 2) + '\n'),
      branch,
      sha
    })
  });

  if (!put.ok) {
    const detail = await put.text();
    return json({ error: 'github write failed', status: put.status, detail: detail.slice(0, 300) }, 502);
  }
  return json({ ok: true });
}

// Any non-POST method
export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json({ error: 'method not allowed' }, 405);
}
