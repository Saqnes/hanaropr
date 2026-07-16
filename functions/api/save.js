/* Cloudflare Pages Function — POST /api/save
   Commits assets/data.json to GitHub so the admin editor can save without git.

   SECURITY — layered, fail-closed:
     1) Cloudflare Access JWT (STRONG, recommended): if ACCESS_AUD + ACCESS_TEAM_DOMAIN
        are set, a valid Cf-Access-Jwt-Assertion (RS256, verified against your team's
        JWKS, aud + exp checked) is REQUIRED. This ties writes to real SSO/OTP login.
     2) Shared secret (always required): x-admin-secret header must equal ADMIN_SECRET.
   Does nothing unless configured (403). Env vars (Cloudflare Pages → Settings → Env):
     ADMIN_SECRET       — shared secret typed into the editor's "서버 저장 암호"
     GH_TOKEN           — GitHub fine-grained PAT, Contents: Read+Write (SECRET)
     GH_REPO            — "owner/repo"     GH_BRANCH (default main)   GH_PATH (default assets/data.json)
     ACCESS_TEAM_DOMAIN — <team>.cloudflareaccess.com   (optional, enables layer 1)
     ACCESS_AUD         — Access application Audience (AUD) tag       (optional, enables layer 1)
   Put /admin.html and /api/* behind Cloudflare Access too — see ADMIN.md. */

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
function b64urlStr(b64) {
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return atob(b64);
}
function b64urlBytes(b64) {
  const s = b64urlStr(b64);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}
function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
/* same simple fingerprint the admin editor uses; over the CANONICAL json (JSON.stringify(JSON.parse(...))) */
function hashStr(s) { let h = 5381, i = s.length; while (i) h = (h * 33) ^ s.charCodeAt(--i); return (h >>> 0).toString(16); }
function b64ToUtf8(b64) {
  const bin = atob(String(b64 || '').replace(/\n/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* Verify a Cloudflare Access JWT. Returns {skip} if not configured, else {ok, reason}. */
async function verifyAccess(request, env) {
  if (!env.ACCESS_AUD || !env.ACCESS_TEAM_DOMAIN) return { skip: true };
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return { ok: false, reason: 'no access token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed token' };
  let header, payload;
  try {
    header = JSON.parse(b64urlStr(parts[0]));
    payload = JSON.parse(b64urlStr(parts[1]));
  } catch (e) { return { ok: false, reason: 'decode' }; }

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (aud.indexOf(env.ACCESS_AUD) === -1) return { ok: false, reason: 'aud mismatch' };
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return { ok: false, reason: 'expired' };

  let jwks;
  try {
    const res = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600 } });
    jwks = await res.json();
  } catch (e) { return { ok: false, reason: 'jwks fetch' }; }
  const jwk = (jwks.keys || []).find(k => k.kid === header.kid);
  if (!jwk) return { ok: false, reason: 'unknown key' };

  try {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const signed = new TextEncoder().encode(parts[0] + '.' + parts[1]);
    const sig = b64urlBytes(parts[2]);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, signed);
    return { ok: ok, reason: ok ? '' : 'bad signature' };
  } catch (e) { return { ok: false, reason: 'verify error' }; }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ADMIN_SECRET || !env.GH_TOKEN || !env.GH_REPO) {
    return json({ error: 'backend not configured' }, 403);
  }
  // layer 1: Cloudflare Access JWT (strong) — required if configured
  const access = await verifyAccess(request, env);
  if (!access.skip && !access.ok) return json({ error: 'access denied', reason: access.reason }, 401);
  // layer 2: shared secret (always)
  if ((request.headers.get('x-admin-secret') || '') !== env.ADMIN_SECRET) {
    return json({ error: 'unauthorized' }, 401);
  }

  let data;
  try { data = await request.json(); } catch (e) { return json({ error: 'invalid json' }, 400); }
  const arrKeys = ['projects', 'launches', 'awards', 'sponsors', 'contacts'];
  if (typeof data !== 'object' || data === null || !arrKeys.every(k => Array.isArray(data[k]))) {
    return json({ error: 'unexpected data shape' }, 422);
  }

  const repo = env.GH_REPO;
  const branch = env.GH_BRANCH || 'main';
  const path = env.GH_PATH || 'assets/data.json';
  const api = `https://api.github.com/repos/${repo}/contents/${path}`;
  const gh = {
    'Authorization': `Bearer ${env.GH_TOKEN}`,
    'User-Agent': 'hanaro-admin',
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  let sha, curHash = null;
  try {
    const cur = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers: gh });
    if (cur.ok) {
      const cj = await cur.json();
      sha = cj.sha;
      if (cj.content) { try { curHash = hashStr(JSON.stringify(JSON.parse(b64ToUtf8(cj.content)))); } catch (e) { /* unparseable current file */ } }
    }
  } catch (e) { /* first write */ }

  // optimistic concurrency: if the client based its edits on a different version than what's live now,
  // another admin saved in between — refuse instead of silently overwriting their work.
  const baseHash = request.headers.get('x-base-hash');
  if (baseHash && curHash && baseHash !== curHash) {
    return json({ error: 'conflict' }, 409);
  }

  const put = await fetch(api, {
    method: 'PUT',
    headers: { ...gh, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'admin: update data.json',
      content: b64utf8(JSON.stringify(data, null, 2) + '\n'),
      branch, sha
    })
  });
  if (!put.ok) {
    const detail = await put.text();
    return json({ error: 'github write failed', status: put.status, detail: detail.slice(0, 300) }, 502);
  }
  return json({ ok: true });
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json({ error: 'method not allowed' }, 405);
}
