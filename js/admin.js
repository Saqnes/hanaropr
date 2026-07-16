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
        { k: 'summary', t: 'textarea', ph: '목표·성과 요약', full: true },
        { k: 'image', t: 'image', label: '대표 사진', full: true },
        { k: 'featured', t: 'check', label: '메인(홈)에 대표 프로젝트로 노출', full: true }
      ],
      title: function (x) { return (x.featured ? '★ ' : '') + (x.name || '새 프로젝트'); }
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
    content: { type: 'content', label: '페이지 문구' },
    images: { type: 'images', label: '사진' }
  };
  var ORDER = ['projects', 'launches', 'awards', 'sponsors', 'contacts', 'support', 'location', 'site', 'content', 'images'];

  var state = { site: {}, contacts: [], support: {}, location: {}, projects: [], launches: [], awards: [], sponsors: [], content: {}, images: {} };
  var active = 'projects';

  /* page copy (data-cms-text / data-cms-list) discovery */
  var PAGES = ['index.html', 'about.html', 'projects.html', 'teams.html', 'archive.html', 'support.html', 'contact.html'];
  var PAGE_LABEL = { 'index.html': '홈', 'about.html': '소개', 'projects.html': '프로젝트', 'teams.html': '팀', 'archive.html': '아카이브', 'support.html': '후원', 'contact.html': '연락처' };
  var contentFields = null; /* null = not loaded yet; else array of {key,type,item,def,page} */
  var imageSlots = null;    /* null = not loaded; else array of {key,label,page} */
  var pendingImg = {};      /* committed path -> local dataURL (for instant preview before redeploy) */

  /* ---------- gate ---------- */
  function sha256(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function unlock() { $('#gate').style.display = 'none'; $('#app').hidden = false; loadData(); loadContentFields(); loadImageSlots(); }
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
          var t = SCHEMA[k].type;
          if (t === 'object' || t === 'content' || t === 'images') state[k] = (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) ? d[k] : {};
          else state[k] = Array.isArray(d[k]) ? d[k] : [];
        });
        buildTabs(); renderEditor(); renderPreview(); ensurePreviewPage();
      })
      .catch(function () { buildTabs(); renderEditor(); renderPreview(); ensurePreviewPage(); });
  }

  /* ---------- tabs ---------- */
  function buildTabs() {
    var t = $('#adminTabs');
    t.innerHTML = ORDER.map(function (k) {
      var count;
      if (SCHEMA[k].type === 'object') count = '';
      else if (SCHEMA[k].type === 'content') count = ' <span class="mono" style="opacity:.6">(' + Object.keys(state.content || {}).length + ')</span>';
      else if (SCHEMA[k].type === 'images') count = ' <span class="mono" style="opacity:.6">(' + Object.keys(state.images || {}).length + ')</span>';
      else count = ' <span class="mono" style="opacity:.6">(' + state[k].length + ')</span>';
      return '<button class="tab" role="tab" data-col="' + k + '" aria-selected="' + (k === active) + '">' + SCHEMA[k].label + count + '</button>';
    }).join('');
    t.onclick = function (e) {
      var b = e.target.closest('[data-col]'); if (!b) return;
      active = b.getAttribute('data-col'); ensurePreviewPage(); buildTabs(); renderEditor(); renderPreview();
    };
  }

  /* ---------- editor ---------- */
  function imgWidget(k, src) {
    var pv = pendingImg[src] || src;
    return '<div class="imgw">' +
      (src ? '<img class="imgw-pv" src="' + esc(pv) + '" alt="">' : '<div class="imgw-pv empty">사진 없음</div>') +
      '<div class="imgw-act">' +
      '<label class="btn btn-line imgw-file">사진 선택<input type="file" accept="image/*" data-imgfile="' + esc(k) + '" hidden></label>' +
      (src ? '<button type="button" class="btn btn-line imgw-del" data-imgdel="' + esc(k) + '">제거</button>' : '') +
      '</div></div>';
  }
  function field(colKey, i, f) {
    var raw = (i === null ? state[colKey][f.k] : state[colKey][i][f.k]);
    var val = raw || '';
    var id = 'f-' + colKey + '-' + (i === null ? 'o' : i) + '-' + f.k;
    if (f.t === 'check') {
      return '<div class="field full"><label class="ck"><input id="' + id + '" data-k="' + f.k + '" data-t="check" type="checkbox"' + (raw ? ' checked' : '') + '><span>' + (f.label || f.k) + '</span></label></div>';
    }
    if (f.t === 'image') {
      return '<div class="field full"><label>' + (f.label || '사진') + '</label>' + imgWidget(f.k, val) + '</div>';
    }
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
    if (sc.type === 'images') { renderImagesEditor(); return; }
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
    if (f.type === 'rich') {
      var rv = (typeof ov === 'string') ? ov : f.def;
      return '<div class="field full"><label for="' + id + '">' + esc(f.key) +
        ' <span class="mono" style="opacity:.5;text-transform:none;letter-spacing:0">· 강조 *별표* · 줄바꿈 Enter</span></label>' +
        '<textarea id="' + id + '" data-ckey="' + esc(f.key) + '" data-ctype="rich" rows="' + Math.max(2, Math.ceil(rv.length / 40)) + '">' + esc(rv) + '</textarea></div>';
    }
    var tv = (typeof ov === 'string') ? ov : f.def;
    var inp = tv.length > 56
      ? '<textarea id="' + id + '" data-ckey="' + esc(f.key) + '" data-ctype="text" rows="3">' + esc(tv) + '</textarea>'
      : '<input id="' + id + '" data-ckey="' + esc(f.key) + '" data-ctype="text" type="text" value="' + esc(tv) + '">';
    return '<div class="field full"><label for="' + id + '">' + esc(f.key) + '</label>' + inp + '</div>';
  }
  var openPages = {};
  function renderContentEditor() {
    if (!contentFields) { $('#editor').innerHTML = '<p class="note">페이지 문구를 불러오는 중…</p>'; return; }
    if (!contentFields.length) { $('#editor').innerHTML = '<p class="note">편집 가능한 문구를 찾지 못했습니다.</p>'; return; }
    var pagesWith = PAGES.filter(function (pg) { return contentFields.some(function (f) { return f.page === pg; }); });
    if (!Object.keys(openPages).length) { openPages[pagesWith.indexOf(previewPage) >= 0 ? previewPage : pagesWith[0]] = true; }
    var html = '<p class="muted" style="font-size:.86rem;margin-bottom:14px">사이트에 박힌 설명 문구입니다. 페이지를 펼쳐 고치면 오른쪽 미리보기에 즉시 반영, <b>비우면 원래 문구</b>로 돌아갑니다.</p>';
    pagesWith.forEach(function (pg) {
      var fs = contentFields.filter(function (f) { return f.page === pg; });
      var open = !!openPages[pg];
      var nOv = fs.filter(function (f) { return Object.prototype.hasOwnProperty.call(state.content, f.key); }).length;
      html += '<div class="panel ed-entry" style="padding:0 16px">' +
        '<button type="button" class="acc-head" data-accpg="' + pg + '" aria-expanded="' + open + '">' +
        '<span class="caret">▸</span><span>' + (PAGE_LABEL[pg] || pg) + '</span><span class="pg">' + pg + '</span>' +
        (nOv ? '<span class="ct">' + nOv + ' 수정</span>' : '') + '</button>' +
        '<div class="acc-body"' + (open ? '' : ' hidden') + '><div class="ed-grid">' + fs.map(contentField).join('') + '</div></div></div>';
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

  /* ---------- images ---------- */
  function fileToDataURL(file) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(file); });
  }
  function uploadFile(file) {
    if (!/^image\//.test(file.type || '')) { toast('이미지 파일만 올릴 수 있어요', true); return Promise.resolve(null); }
    return fileToDataURL(file).then(function (dataUrl) {
      var b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      return fetch('/api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': $('#apiSecret').value },
        body: JSON.stringify({ filename: file.name, contentType: file.type, dataBase64: b64 })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: false, j: {} }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.ok && res.j.path) {
            var p = res.j.path.replace(/^\/+/, '');
            pendingImg[p] = dataUrl; // instant preview until redeploy
            toast('사진 업로드됨 · 저장 후 재배포되면 사이트 반영');
            return p;
          }
          if (dataUrl.length < 900000) { toast('업로드 서버 미설정 — 사진을 파일에 직접 저장(용량 주의)', true); return dataUrl; }
          toast('사진 업로드 실패: ' + ((res.j && res.j.error) || '서버 확인') + ' (사진이 너무 큼)', true);
          return null;
        }).catch(function () {
          if (dataUrl.length < 900000) { toast('업로드 서버 미설정 — 사진을 파일에 직접 저장(용량 주의)', true); return dataUrl; }
          toast('사진 업로드 실패 (사진이 너무 큼)', true); return null;
        });
    });
  }
  function setImageValue(k, url, ctx) {
    if (ctx.slot) { if (url) state.images[k] = url; else delete state.images[k]; }
    else if (ctx.entry) {
      var i = +ctx.entry.getAttribute('data-i');
      if (SCHEMA[active].type === 'object') state[active][k] = url; else state[active][i][k] = url;
    }
    buildTabs(); renderEditor(); renderPreview();
  }
  function loadImageSlots() {
    imageSlots = [];
    var seen = {};
    return Promise.all(PAGES.map(function (pg) {
      return fetch(pg, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        CMS.readImageSlots(doc).forEach(function (s) { if (seen[s.key]) return; seen[s.key] = 1; s.page = pg; imageSlots.push(s); });
      }).catch(function () { });
    })).then(function () { buildTabs(); if (active === 'images') { renderEditor(); renderPreview(); } });
  }
  function renderImagesEditor() {
    if (!imageSlots) { $('#editor').innerHTML = '<p class="note">사진 자리를 불러오는 중…</p>'; return; }
    if (!imageSlots.length) { $('#editor').innerHTML = '<p class="note">사진 자리가 없습니다.</p>'; return; }
    var html = '<p class="muted" style="font-size:.86rem;margin-bottom:14px">사이트의 각 사진 자리입니다. 사진을 올리면 그 자리에 채워지고, <b>저장·재배포 후</b> 실제 사이트에 반영됩니다.</p>';
    PAGES.forEach(function (pg) {
      var ss = imageSlots.filter(function (s) { return s.page === pg; });
      if (!ss.length) return;
      html += '<div class="panel ed-entry"><div class="ed-head"><b style="font-size:.95rem">' + (PAGE_LABEL[pg] || pg) +
        '</b><span class="mono" style="opacity:.45;font-size:.68rem">' + pg + '</span></div><div class="ed-grid">' +
        ss.map(function (s) {
          return '<div class="field full"><label>' + esc(s.label || s.key) +
            ' <span class="mono" style="opacity:.4;text-transform:none;letter-spacing:0">' + esc(s.key) + '</span></label>' +
            imgWidget(s.key, state.images[s.key] || '') + '</div>';
        }).join('') + '</div></div>';
    });
    $('#editor').innerHTML = html;
  }

  $('#editor').addEventListener('focusin', function (e) {
    var ck = e.target.getAttribute('data-ckey'); if (!ck) return;
    var f = contentFields && contentFields.filter(function (x) { return x.key === ck; })[0];
    if (f && f.page && f.page !== previewPage) { loadFrame(f.page); setTimeout(function () { focusFrameEl(ck); }, 700); }
    else focusFrameEl(ck);
  });
  $('#editor').addEventListener('input', function (e) {
    var ck = e.target.getAttribute('data-ckey');
    if (ck) { updateContent(ck, e.target); renderPreview(); return; }
    var k = e.target.getAttribute('data-k'); if (!k) return;
    var sc = SCHEMA[active];
    var v = e.target.getAttribute('data-t') === 'check' ? e.target.checked : e.target.value;
    if (sc.type === 'object') { state[active][k] = v; renderPreview(); return; }
    var entry = e.target.closest('.ed-entry'); if (!entry) return;
    var i = +entry.getAttribute('data-i');
    state[active][i][k] = v;
    var t = entry.querySelector('.ed-head b'); if (t) t.textContent = sc.title(state[active][i]);
    if (e.target.getAttribute('data-t') === 'check') buildTabs();
    renderPreview();
  });
  /* image upload: file chosen in any imgWidget */
  $('#editor').addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute('data-imgfile') == null || !t.files || !t.files[0]) return;
    var k = t.getAttribute('data-imgfile');
    var entry = t.closest('.ed-entry');
    var ctx = (entry && active !== 'images') ? { entry: entry } : { slot: true };
    var w = t.closest('.imgw'); if (w) w.classList.add('busy');
    uploadFile(t.files[0]).then(function (url) {
      if (w) w.classList.remove('busy');
      if (url) setImageValue(k, url, ctx);
    });
  });
  $('#editor').addEventListener('click', function (e) {
    var acc = e.target.closest('[data-accpg]');
    if (acc) {
      var pg = acc.getAttribute('data-accpg');
      openPages[pg] = !openPages[pg];
      if (openPages[pg] && pg !== previewPage) loadFrame(pg);
      renderEditor();
      return;
    }
    var del = e.target.closest('[data-imgdel]');
    if (del) {
      var dk = del.getAttribute('data-imgdel');
      var entry0 = del.closest('.ed-entry');
      setImageValue(dk, '', (entry0 && active !== 'images') ? { entry: entry0 } : { slot: true });
      return;
    }
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

  /* ---------- live preview: the real page in an iframe, driven by editor state ---------- */
  var PREVIEW_PAGE_FOR = {
    projects: 'projects.html', launches: 'archive.html', awards: 'archive.html',
    sponsors: 'support.html', contacts: 'contact.html', support: 'support.html',
    location: 'contact.html', site: 'index.html', content: 'index.html', images: 'teams.html'
  };
  var previewPage = '';
  var _pvTimer = 0;

  /* swap freshly-uploaded image paths (not yet redeployed) for their local dataURLs
     so the preview shows the photo instantly */
  function previewState() {
    if (!Object.keys(pendingImg).length) return state;
    var s; try { s = JSON.parse(JSON.stringify(state)); } catch (e) { return state; }
    (s.projects || []).forEach(function (p) { if (p.image && pendingImg[p.image]) p.image = pendingImg[p.image]; });
    if (s.images) Object.keys(s.images).forEach(function (k) { if (pendingImg[s.images[k]]) s.images[k] = pendingImg[s.images[k]]; });
    return s;
  }
  function applyToFrame() {
    var f = $('#cmsFrame'); if (!f) return;
    try {
      var w = f.contentWindow;
      if (w && w.HANARO_CMS && w.HANARO_CMS.apply) w.HANARO_CMS.apply(previewState());
    } catch (e) { /* scripts not ready yet */ }
  }
  function loadFrame(pg) {
    previewPage = pg;
    var sel = $('#cmsPage'); if (sel && sel.value !== pg) sel.value = pg;
    var f = $('#cmsFrame'); if (!f) return;
    fetch(pg, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
      if (!html) return;
      var snap = JSON.stringify(previewState()).replace(/</g, '\\u003c');
      var inject = '<base href="/">' +
        '<style>.reveal{opacity:1!important;transform:none!important}</style>' +
        '<scr' + 'ipt>window.HANARO_DATA=' + snap + ';</scr' + 'ipt>';
      html = html.replace(/<head([^>]*)>/i, '<head$1>' + inject);
      var doc = f.contentDocument;
      doc.open(); doc.write(html); doc.close();
      setTimeout(applyToFrame, 180);
      setTimeout(applyToFrame, 550);
    }).catch(function () { });
  }
  function ensurePreviewPage() {
    var pg = PREVIEW_PAGE_FOR[active] || 'index.html';
    if (pg !== previewPage) loadFrame(pg);
    else applyToFrame();
  }
  function focusFrameEl(key) {
    var f = $('#cmsFrame'); if (!f) return;
    try {
      var el = f.contentDocument.querySelector('[data-cms-text="' + key + '"],[data-cms-rich="' + key + '"],[data-cms-list="' + key + '"]');
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      var prev = el.style.outline;
      el.style.outline = '2px solid #f5a623'; el.style.outlineOffset = '2px';
      setTimeout(function () { el.style.outline = prev; }, 1400);
    } catch (e) { }
  }
  function renderPreview() {
    clearTimeout(_pvTimer);
    _pvTimer = setTimeout(applyToFrame, 120);
  }

  /* preview page controls */
  $('#cmsPage').addEventListener('change', function () { loadFrame(this.value); });
  $('#cmsReload').addEventListener('click', function () { loadFrame(previewPage || 'index.html'); });

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
