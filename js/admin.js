/* HANARO — admin editor.
   Edits the same content the public site renders (assets/data.json), with a
   live preview using the shared cms.js renderers.

   ── CHANGE THE PASSPHRASE ──────────────────────────────────────────────
   The gate below is a SOFT lock only (a static site cannot truly authenticate
   in the browser — data.json is publicly readable). Real access control =
   Cloudflare Access in front of /admin.html and /api/* (see ADMIN.md).
   To change the passphrase: pick a phrase, get its SHA-256 hex
     node -e "console.log(require('crypto').createHash('sha256').update('YOUR-PASS').digest('hex'))"
   and paste it into PASS_HASH. Default passphrase is "hanaro2026".
   ─────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var PASS_HASH = '74968a976986aad87dbe978260a57fb1128122e1eb9318db63b561cfe4de61fa';
  var DATA_URL = 'assets/data.json';
  var SAVE_API = '/api/save';

  var $ = function (s) { return document.querySelector(s); };
  var CMS = window.HANARO_CMS;
  var esc = CMS.esc;

  /* object-section preview builders (match public output) */
  function pvSite(s) {
    var r = '';
    if (s.address) r += '<span class="muted">' + esc(s.address) + '</span>';
    if (s.email) r += '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>';
    if (s.instagram) r += '<a href="' + esc(s.instagram) + '">Instagram ↗</a>';
    if (s.notion) r += '<a href="' + esc(s.notion) + '">Notion 아카이브 ↗</a>';
    return '<div class="panel"><span class="eyebrow no-rule">Footer · 연락처 미리보기</span><div class="footer-links" style="margin-top:10px">' + (r || '<span class="muted">미입력</span>') + '</div></div>';
  }
  function pvSupport(s) {
    var acc = (s.number || s.bank)
      ? '<span class="eyebrow no-rule">' + (esc(s.bank) || '계좌') + '</span><p class="mono" style="font-size:1.05rem;word-break:break-all">' + esc(s.number) + '</p>' + (s.holder ? '<p class="muted" style="font-size:.82rem;margin-top:4px">예금주 · ' + esc(s.holder) + '</p>' : '')
      : '<p class="ph-note">계좌 미입력</p>';
    var f = s.foundation ? '<div class="actions" style="margin-top:12px"><a class="btn btn-line" href="' + esc(s.foundation) + '">재단 기부 ↗</a></div>' : '';
    return '<div class="ph-block">' + acc + '</div>' + f;
  }
  function pvLocation(l) {
    return '<div class="panel"><span class="eyebrow no-rule">Location</span><p style="margin-top:8px">' +
      (esc(l.address) || '<span class="muted">주소 미입력</span>') + '</p>' +
      (l.mapEmbed ? '<p class="muted" style="font-size:.78rem;margin-top:8px;word-break:break-all">MAP: ' + esc(l.mapEmbed) + '</p>' : '<p class="ph-note" style="margin-top:8px">지도 미입력</p>') + '</div>';
  }

  var SCHEMA = {
    projects: {
      type: 'array', label: '프로젝트', empty: '등록된 프로젝트가 없습니다.',
      preview: function (a) { return '<div class="grid g2">' + a.map(CMS.projectCard).join('') + '</div>'; },
      fields: [
        { k: 'name', t: 'text', ph: '로켓 이름' }, { k: 'ko', t: 'text', ph: '한글 이름(선택)' },
        { k: 'year', t: 'text', ph: '연도 (예: 2025)' }, { k: 'event', t: 'text', ph: '대회/라벨' },
        { k: 'team', t: 'text', ph: '담당 팀' },
        { k: 'status', t: 'select', opts: ['', '설계', '제작', '시험', '발사', '완료'] },
        { k: 'summary', t: 'textarea', ph: '목표·성과 요약', full: true }
      ],
      title: function (x) { return x.name || '새 프로젝트'; }
    },
    launches: {
      type: 'array', label: '발사 기록', empty: '등록된 발사 기록이 없습니다.',
      preview: function (a) { return '<div class="log">' + a.map(CMS.launchRow).join('') + '</div>'; },
      fields: [
        { k: 'year', t: 'text', ph: '연도' },
        { k: 'status', t: 'select', opts: ['go', 'warn'], optLabels: { go: '성공(발사 완료)', warn: '부분/이상' } },
        { k: 'name', t: 'text', ph: '기체 · 대회', full: true }, { k: 'desc', t: 'text', ph: '설명', full: true }
      ],
      title: function (x) { return (x.year ? x.year + ' · ' : '') + (x.name || '새 발사 기록'); }
    },
    awards: {
      type: 'array', label: '수상', empty: '등록된 수상 내역이 없습니다.',
      preview: function (a) { return '<div class="log">' + a.map(CMS.awardRow).join('') + '</div>'; },
      fields: [
        { k: 'year', t: 'text', ph: '연도' }, { k: 'rank', t: 'text', ph: '순위/상 (예: 금상)' },
        { k: 'name', t: 'text', ph: '대회 · 상 이름', full: true }, { k: 'desc', t: 'text', ph: '설명', full: true }
      ],
      title: function (x) { return (x.year ? x.year + ' · ' : '') + (x.name || '새 수상'); }
    },
    sponsors: {
      type: 'array', label: '후원사', empty: '등록된 후원사가 없습니다.',
      preview: function (a) { return '<div class="grid g4">' + a.map(CMS.sponsorItem).join('') + '</div>'; },
      fields: [{ k: 'name', t: 'text', ph: '후원사명' }, { k: 'kind', t: 'text', ph: '영문/구분 (선택)' }],
      title: function (x) { return x.name || '새 후원사'; }
    },
    contacts: {
      type: 'array', label: '회장단', empty: '등록된 연락처가 없습니다.',
      preview: function (a) { return '<div class="grid">' + a.map(CMS.contactCard).join('') + '</div>'; },
      fields: [
        { k: 'role', t: 'text', ph: '직책 (예: 회장)' }, { k: 'name', t: 'text', ph: '이름' },
        { k: 'email', t: 'text', ph: '이메일 (공개됨)', full: true }, { k: 'phone', t: 'text', ph: '전화 (공개됨·선택)', full: true }
      ],
      title: function (x) { return (x.role ? x.role + ' · ' : '') + (x.name || '새 연락처'); }
    },
    support: {
      type: 'object', label: '후원 정보', preview: pvSupport,
      fields: [
        { k: 'bank', t: 'text', ph: '은행 (예: 농협)' }, { k: 'number', t: 'text', ph: '계좌번호 (공개됨)' },
        { k: 'holder', t: 'text', ph: '예금주', full: true }, { k: 'foundation', t: 'text', ph: '재단 기부 링크 URL', full: true }
      ]
    },
    location: {
      type: 'object', label: '위치', preview: pvLocation,
      fields: [
        { k: 'address', t: 'text', ph: '주소', full: true },
        { k: 'mapEmbed', t: 'text', ph: '지도 임베드 URL (iframe src)', full: true }
      ]
    },
    site: {
      type: 'object', label: '사이트 정보', preview: pvSite,
      fields: [
        { k: 'email', t: 'text', ph: '대표 이메일 (문의 폼 수신·공개됨)', full: true },
        { k: 'instagram', t: 'text', ph: '인스타그램 URL', full: true },
        { k: 'notion', t: 'text', ph: '아카이브(노션) URL', full: true },
        { k: 'address', t: 'text', ph: '푸터 주소', full: true }
      ]
    },
    content: { type: 'content', label: '페이지 문구' }
  };
  var ORDER = ['projects', 'launches', 'awards', 'sponsors', 'contacts', 'support', 'location', 'site', 'content'];

  var state = { site: {}, contacts: [], support: {}, location: {}, projects: [], launches: [], awards: [], sponsors: [], content: {} };
  var active = 'projects';

  /* page copy (data-cms-text / data-cms-list) discovery */
  var PAGES = ['index.html', 'about.html', 'projects.html', 'teams.html', 'archive.html', 'support.html', 'contact.html'];
  var PAGE_LABEL = { 'index.html': '홈', 'about.html': '소개', 'projects.html': '프로젝트', 'teams.html': '팀', 'archive.html': '아카이브', 'support.html': '후원', 'contact.html': '연락처' };
  var contentFields = null; /* null = not loaded yet; else array of {key,type,item,def,page} */

  /* ---------- gate ---------- */
  function sha256(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function unlock() { $('#gate').style.display = 'none'; $('#app').hidden = false; loadData(); loadContentFields(); }
  if (sessionStorage.getItem('hanaro_admin') === '1') unlock();
  $('#gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    sha256($('#pass').value).then(function (h) {
      if (h === PASS_HASH) { sessionStorage.setItem('hanaro_admin', '1'); unlock(); }
      else { $('#gateErr').style.display = 'block'; }
    });
  });
  $('#btnLogout').addEventListener('click', function () { sessionStorage.removeItem('hanaro_admin'); location.reload(); });

  /* ---------- data ---------- */
  function loadData() {
    fetch(DATA_URL, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        d = d || {};
        ORDER.forEach(function (k) {
          if (SCHEMA[k].type === 'object' || SCHEMA[k].type === 'content') state[k] = (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) ? d[k] : {};
          else state[k] = Array.isArray(d[k]) ? d[k] : [];
        });
        buildTabs(); renderEditor(); renderPreview();
      })
      .catch(function () { buildTabs(); renderEditor(); renderPreview(); });
  }

  /* ---------- tabs ---------- */
  function buildTabs() {
    var t = $('#adminTabs');
    t.innerHTML = ORDER.map(function (k) {
      var count;
      if (SCHEMA[k].type === 'object') count = '';
      else if (SCHEMA[k].type === 'content') count = ' <span class="mono" style="opacity:.6">(' + Object.keys(state.content || {}).length + ')</span>';
      else count = ' <span class="mono" style="opacity:.6">(' + state[k].length + ')</span>';
      return '<button class="tab" role="tab" data-col="' + k + '" aria-selected="' + (k === active) + '">' + SCHEMA[k].label + count + '</button>';
    }).join('');
    t.onclick = function (e) {
      var b = e.target.closest('[data-col]'); if (!b) return;
      active = b.getAttribute('data-col'); buildTabs(); renderEditor(); renderPreview();
    };
  }

  /* ---------- editor ---------- */
  function field(colKey, i, f) {
    var val = (i === null ? state[colKey][f.k] : state[colKey][i][f.k]) || '';
    var id = 'f-' + colKey + '-' + (i === null ? 'o' : i) + '-' + f.k;
    var inp;
    if (f.t === 'textarea') inp = '<textarea id="' + id + '" data-k="' + f.k + '" placeholder="' + (f.ph || '') + '">' + esc(val) + '</textarea>';
    else if (f.t === 'select') inp = '<select id="' + id + '" data-k="' + f.k + '">' + f.opts.map(function (o) {
      var lab = (f.optLabels && f.optLabels[o]) || (o === '' ? '— 없음 —' : o);
      return '<option value="' + o + '"' + (o === val ? ' selected' : '') + '>' + lab + '</option>';
    }).join('') + '</select>';
    else inp = '<input id="' + id + '" data-k="' + f.k + '" type="text" value="' + esc(val) + '" placeholder="' + (f.ph || '') + '">';
    return '<div class="field' + (f.full ? ' full' : '') + '"><label for="' + id + '">' + f.k + '</label>' + inp + '</div>';
  }

  function renderEditor() {
    var sc = SCHEMA[active];
    if (sc.type === 'content') { renderContentEditor(); return; }
    if (sc.type === 'object') {
      var of = sc.fields.map(function (f) { return field(active, null, f); }).join('');
      $('#editor').innerHTML = '<div class="panel ed-entry"><div class="ed-head"><b style="font-size:.95rem">' + sc.label + '</b></div><div class="ed-grid">' + of + '</div></div>';
      return;
    }
    var arr = state[active];
    var html = arr.map(function (x, i) {
      var fields = sc.fields.map(function (f) { return field(active, i, f); }).join('');
      return '<div class="panel ed-entry" data-i="' + i + '"><div class="ed-head"><span class="idx">#' + (i + 1) + '</span>' +
        '<b style="font-size:.95rem">' + esc(sc.title(x)) + '</b><span class="sp"></span>' +
        '<button class="ed-btn" data-act="up" title="위로">↑</button>' +
        '<button class="ed-btn" data-act="down" title="아래로">↓</button>' +
        '<button class="ed-btn danger" data-act="del" title="삭제">삭제</button></div>' +
        '<div class="ed-grid">' + fields + '</div></div>';
    }).join('');
    html += '<button class="ed-add" data-act="add" type="button">+ ' + sc.label + ' 추가</button>';
    $('#editor').innerHTML = html;
  }

  /* ---------- page copy (content) editor ---------- */
  function loadContentFields() {
    contentFields = [];
    var seen = {};
    return Promise.all(PAGES.map(function (pg) {
      return fetch(pg, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (html) {
          if (!html) return;
          var doc = new DOMParser().parseFromString(html, 'text/html');
          CMS.readContentDefaults(doc).forEach(function (f) {
            if (seen[f.key]) return;
            seen[f.key] = 1; f.page = pg; contentFields.push(f);
          });
        }).catch(function () { });
    })).then(function () {
      buildTabs();
      if (active === 'content') { renderEditor(); renderPreview(); }
    });
  }
  function sameArr(a, b) {
    a = a || []; b = b || [];
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function contentField(f) {
    var id = 'c-' + f.key.replace(/[^a-z0-9]/gi, '-');
    var ov = state.content[f.key];
    if (f.type === 'list') {
      var arr = Array.isArray(ov) ? ov : f.def;
      return '<div class="field full"><label for="' + id + '">' + esc(f.key) +
        ' <span class="mono" style="opacity:.5;text-transform:none;letter-spacing:0">· 목록 (한 줄에 하나)</span></label>' +
        '<textarea id="' + id + '" data-ckey="' + esc(f.key) + '" data-ctype="list" rows="' + Math.max(2, arr.length) + '">' + esc(arr.join('\n')) + '</textarea></div>';
    }
    var tv = (typeof ov === 'string') ? ov : f.def;
    var inp = tv.length > 56
      ? '<textarea id="' + id + '" data-ckey="' + esc(f.key) + '" data-ctype="text" rows="3">' + esc(tv) + '</textarea>'
      : '<input id="' + id + '" data-ckey="' + esc(f.key) + '" data-ctype="text" type="text" value="' + esc(tv) + '">';
    return '<div class="field full"><label for="' + id + '">' + esc(f.key) + '</label>' + inp + '</div>';
  }
  function renderContentEditor() {
    if (!contentFields) { $('#editor').innerHTML = '<p class="note">페이지 문구를 불러오는 중…</p>'; return; }
    if (!contentFields.length) { $('#editor').innerHTML = '<p class="note">편집 가능한 문구를 찾지 못했습니다.</p>'; return; }
    var html = '<p class="muted" style="font-size:.86rem;margin-bottom:14px">사이트에 박힌 설명 문구입니다. 고치면 그 값으로 바뀌고, <b>비우면 원래 문구</b>로 돌아갑니다.</p>';
    PAGES.forEach(function (pg) {
      var fs = contentFields.filter(function (f) { return f.page === pg; });
      if (!fs.length) return;
      html += '<div class="panel ed-entry"><div class="ed-head"><b style="font-size:.95rem">' + (PAGE_LABEL[pg] || pg) +
        '</b><span class="mono" style="opacity:.45;font-size:.68rem">' + pg + '</span></div><div class="ed-grid">' +
        fs.map(contentField).join('') + '</div></div>';
    });
    $('#editor').innerHTML = html;
  }
  function updateContent(key, el) {
    var f = contentFields && contentFields.filter(function (x) { return x.key === key; })[0];
    if (el.getAttribute('data-ctype') === 'list') {
      var arr = el.value.split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; });
      if (f && sameArr(arr, f.def)) delete state.content[key];
      else if (!arr.length) delete state.content[key];
      else state.content[key] = arr;
    } else {
      var v = el.value;
      if ((f && v === f.def) || v.trim() === '') delete state.content[key];
      else state.content[key] = v;
    }
    buildTabs();
  }

  $('#editor').addEventListener('input', function (e) {
    var ck = e.target.getAttribute('data-ckey');
    if (ck) { updateContent(ck, e.target); renderPreview(); return; }
    var k = e.target.getAttribute('data-k'); if (!k) return;
    var sc = SCHEMA[active];
    if (sc.type === 'object') { state[active][k] = e.target.value; renderPreview(); return; }
    var entry = e.target.closest('.ed-entry'); if (!entry) return;
    var i = +entry.getAttribute('data-i');
    state[active][i][k] = e.target.value;
    var t = entry.querySelector('.ed-head b'); if (t) t.textContent = sc.title(state[active][i]);
    renderPreview();
  });
  $('#editor').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act'), arr = state[active];
    if (act === 'add') { arr.push({}); buildTabs(); renderEditor(); renderPreview(); return; }
    var entry = b.closest('.ed-entry'); if (!entry) return;
    var i = +entry.getAttribute('data-i');
    if (act === 'del') arr.splice(i, 1);
    else if (act === 'up' && i > 0) arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
    else if (act === 'down' && i < arr.length - 1) arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
    buildTabs(); renderEditor(); renderPreview();
  });

  function renderPreview() {
    var sc = SCHEMA[active];
    if (sc.type === 'content') { renderContentPreview(); return; }
    if (sc.type === 'object') { $('#preview').innerHTML = sc.preview(state[active]); return; }
    var arr = state[active];
    $('#preview').innerHTML = arr.length ? sc.preview(arr) : '<p class="note">' + sc.empty + '</p>';
  }
  function renderContentPreview() {
    if (!contentFields || !contentFields.length) { $('#preview').innerHTML = '<p class="note">불러오는 중…</p>'; return; }
    var body = contentFields.map(function (f) {
      var ov = state.content[f.key];
      var isOv = (f.type === 'list') ? Array.isArray(ov) : (typeof ov === 'string');
      var eff = (f.type === 'list') ? (Array.isArray(ov) ? ov : f.def).join(' · ') : (typeof ov === 'string' ? ov : f.def);
      return '<div style="padding:8px 0;border-bottom:1px solid var(--line)">' +
        '<span class="mono" style="font-size:.64rem;letter-spacing:.04em;color:' + (isOv ? 'var(--gold)' : 'var(--ink-2)') + '">' +
        esc(f.key) + (isOv ? ' · 수정됨' : '') + '</span>' +
        '<p style="margin-top:3px;font-size:.9rem">' + esc(eff) + '</p></div>';
    }).join('');
    $('#preview').innerHTML = '<p class="note" style="margin-bottom:10px">현재 문구 — <span style="color:var(--gold)">노란색</span>이 수정한 항목. 저장하면 사이트에 반영됩니다.</p>' + body;
  }

  /* ---------- save ---------- */
  function serialize() { return JSON.stringify(state, null, 2); }
  function toast(msg, err) {
    var t = $('#toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2800);
  }
  $('#btnDownload').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([serialize()], { type: 'application/json' }));
    a.download = 'data.json'; a.click(); URL.revokeObjectURL(a.href);
    toast('data.json 다운로드됨 · assets/ 에 커밋하세요');
  });
  $('#btnCopy').addEventListener('click', function () {
    (navigator.clipboard ? navigator.clipboard.writeText(serialize()) : Promise.reject())
      .then(function () { toast('JSON 복사됨'); })
      .catch(function () { toast('복사 실패 — 다운로드를 사용하세요', true); });
  });
  $('#btnSave').addEventListener('click', function () {
    $('#btnSave').disabled = true;
    fetch(SAVE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': $('#apiSecret').value },
      body: serialize()
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.ok) toast('서버에 저장됨 · 재배포 중 (1–2분)');
        else toast('서버 저장 실패: ' + ((res.j && (res.j.error || res.j.detail)) || '설정 확인'), true);
      })
      .catch(function () { toast('서버 저장 안 됨 — 백엔드 미설정 시 JSON 다운로드를 사용하세요', true); })
      .finally(function () { $('#btnSave').disabled = false; });
  });
})();
