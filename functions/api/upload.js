/* Cloudflare Pages Function — POST /api/upload
   Accepts an image and commits it to assets/uploads/ in the GitHub repo so the
   admin editor can upload photos without git.

   SECURITY — layered, fail-closed (identical model to /api/save):
     1) Cloudflare Access JWT (STRONG, recommended): if ACCESS_AUD + ACCESS_TEAM_DOMAIN
        are set, a valid Cf-Access-Jwt-Assertion (RS256, verified against your team's
        JWKS, aud + exp checked) is REQUIRED. This ties uploads to real SSO/OTP login.
     2) Shared secret (always required): x-admin-secret header must equal ADMIN_SECRET.
   Does nothing unless configured (403). Env vars (Cloudflare Pages → Settings → Env):
     ADMIN_SECRET       — shared secret typed into the editor's "서버 저장 암호"
     GH_TOKEN           — GitHub fine-grained PAT, Contents: Read+Write (SECRET)
     GH_REPO            — "owner/repo"     GH_BRANCH (default main)
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

/* contentType (subtype) -> file extension. Also the allow-list of image types. */
const CT_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
};
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/* Approx decoded byte length of a standard base64 string (no data: prefix). */
function b64DecodedBytes(b64) {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const pad = (clean.match(/=+$/) || [''])[0].length;
  return Math.floor(clean.length * 3 / 4) - pad;
}

/* Turn an arbitrary filename into a safe, lowercase, restricted-charset basename. */
function sanitizeName(name, ext) {
  let base = String(name || '').split(/[\\/]/).pop(); // basename
  base = base.toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-') // restrict charset
    .replace(/-+/g, '-')           // collapse repeats
    .replace(/^[-._]+|[-._]+$/g, ''); // strip leading/trailing - . _
  // append an image extension if one isn't already present
  const dot = base.lastIndexOf('.');
  const cur = dot >= 0 ? base.slice(dot + 1) : '';
  if (!cur || IMAGE_EXTS.indexOf(cur) === -1) {
    base = (base || 'image') + '.' + ext;
  }
  return base;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // gate 1: backend must be configured (fail-closed)
  if (!env.ADMIN_SECRET || !env.GH_TOKEN || !env.GH_REPO) {
    return json({ error: 'backend not configured' }, 403);
  }
  // gate 2: Cloudflare Access JWT (strong) — required if configured
  const access = await verifyAccess(request, env);
  if (!access.skip && !access.ok) return json({ error: 'access denied', reason: access.reason }, 401);
  // gate 3: shared secret (always) — a missing/blank header fails here
  if ((request.headers.get('x-admin-secret') || '') !== env.ADMIN_SECRET) {
    return json({ error: 'unauthorized' }, 401);
  }

  let data;
  try { data = await request.json(); } catch (e) { return json({ error: 'invalid json' }, 400); }
  if (typeof data !== 'object' || data === null) {
    return json({ error: 'invalid json' }, 400);
  }

  const contentType = String(data.contentType || '').toLowerCase().split(';')[0].trim();
  const ext = CT_EXT[contentType];
  if (!contentType.startsWith('image/') || !ext) {
    return json({ error: 'unsupported content type' }, 415);
  }

  const dataBase64 = data.dataBase64;
  if (typeof dataBase64 !== 'string' || dataBase64.length === 0) {
    return json({ error: 'missing image data' }, 400);
  }
  if (b64DecodedBytes(dataBase64) > MAX_BYTES) {
    return json({ error: 'too large' }, 413);
  }

  const safeName = Date.now() + '-' + sanitizeName(data.filename, ext);
  const path = 'assets/uploads/' + safeName;

  const repo = env.GH_REPO;
  const branch = env.GH_BRANCH || 'main';
  const api = `https://api.github.com/repos/${repo}/contents/${path}`;
  const gh = {
    'Authorization': `Bearer ${env.GH_TOKEN}`,
    'User-Agent': 'hanaro-admin',
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  const put = await fetch(api, {
    method: 'PUT',
    headers: { ...gh, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'admin: upload ' + safeName,
      content: dataBase64, // GitHub expects raw base64
      branch
    })
  });
  if (!put.ok) {
    const detail = await put.text();
    return json({ error: 'github write failed', status: put.status, detail: detail.slice(0, 300) }, 502);
  }
  return json({ ok: true, path: path });
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json({ error: 'method not allowed' }, 405);
}
