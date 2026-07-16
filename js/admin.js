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

  var SCHEMA = {
    projects: {
      label: '프로젝트', empty: '등록된 프로젝트가 없습니다.',
      preview: function (a) { return '<div class="grid g2">' + a.map(CMS.projectCard).join('') + '</div>'; },
      fields: [
        { k: 'name', t: 'text', ph: '로켓 이름', full: false },
        { k: 'ko', t: 'text', ph: '한글 이름(선택)', full: false },
        { k: 'year', t: 'text', ph: '연도 (예: 2025)', full: false },
        { k: 'event', t: 'text', ph: '대회/라벨 (예: IREC)', full: false },
        { k: 'team', t: 'text', ph: '담당 팀 (예: 전 팀)', full: false },
        { k: 'status', t: 'select', opts: ['', '설계', '제작', '시험', '발사', '완료'], full: false },
        { k: 'summary', t: 'textarea', ph: '목표·성과 요약', full: true }
      ],
      title: function (x) { return x.name || '새 프로젝트'; }
    },
    launches: {
      label: '발사 기록', empty: '등록된 발사 기록이 없습니다.',
      preview: function (a) { return '<div class="log">' + a.map(CMS.launchRow).join('') + '</div>'; },
      fields: [
        { k: 'year', t: 'text', ph: '연도', full: false },
        { k: 'status', t: 'select', opts: ['go', 'warn'], optLabels: { go: '성공(발사 완료)', warn: '부분/이상' }, full: false },
        { k: 'name', t: 'text', ph: '기체 · 대회', full: true },
        { k: 'desc', t: 'text', ph: '설명', full: true }
      ],
      title: function (x) { return (x.year ? x.year + ' · ' : '') + (x.name || '새 발사 기록'); }
    },
    awards: {
      label: '수상', empty: '등록된 수상 내역이 없습니다.',
      preview: function (a) { return '<div class="log">' + a.map(CMS.awardRow).join('') + '</div>'; },
      fields: [
        { k: 'year', t: 'text', ph: '연도', full: false },
        { k: 'rank', t: 'text', ph: '순위/상 (예: 금상)', full: false },
        { k: 'name', t: 'text', ph: '대회 · 상 이름', full: true },
        { k: 'desc', t: 'text', ph: '설명', full: true }
      ],
      title: function (x) { return (x.year ? x.year + ' · ' : '') + (x.name || '새 수상'); }
    },
    sponsors: {
      label: '후원사', empty: '등록된 후원사가 없습니다.',
      preview: function (a) { return '<div class="grid g4">' + a.map(CMS.sponsorItem).join('') + '</div>'; },
      fields: [
        { k: 'name', t: 'text', ph: '후원사명', full: false },
        { k: 'kind', t: 'text', ph: '영문/구분 (선택)', full: false }
      ],
      title: function (x) { return x.name || '새 후원사'; }
    }
  };
  var ORDER = ['projects', 'launches', 'awards', 'sponsors'];

  var state = { projects: [], launches: [], awards: [], sponsors: [] };
  var active = 'projects';

  /* ---------- gate ---------- */
  function sha256(str) {
    var buf = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256', buf).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function unlock() { $('#gate').hidden = true; $('#gate').style.display = 'none'; $('#app').hidden = false; loadData(); }

  if (sessionStorage.getItem('hanaro_admin') === '1') { unlock(); }
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
        if (d) ORDER.forEach(function (k) { state[k] = Array.isArray(d[k]) ? d[k] : []; });
        buildTabs(); renderEditor(); renderPreview();
      })
      .catch(function () { buildTabs(); renderEditor(); renderPreview(); });
  }

  /* ---------- tabs ---------- */
  function buildTabs() {
    var t = $('#adminTabs');
    t.innerHTML = ORDER.map(function (k) {
      return '<button class="tab" role="tab" data-col="' + k + '" aria-selected="' + (k === active) + '">' +
        SCHEMA[k].label + ' <span class="mono" style="opacity:.6">(' + state[k].length + ')</span></button>';
    }).join('');
    t.onclick = function (e) {
      var b = e.target.closest('[data-col]'); if (!b) return;
      active = b.getAttribute('data-col');
      buildTabs(); renderEditor(); renderPreview();
    };
  }

  /* ---------- editor ---------- */
  function field(colKey, i, f) {
    var val = state[colKey][i][f.k] || '';
    var id = 'f-' + colKey + '-' + i + '-' + f.k;
    var lab = '<label for="' + id + '">' + f.k + '</label>';
    var inp;
    if (f.t === 'textarea') {
      inp = '<textarea id="' + id + '" data-k="' + f.k + '" placeholder="' + (f.ph || '') + '">' + CMS.esc(val) + '</textarea>';
    } else if (f.t === 'select') {
      inp = '<select id="' + id + '" data-k="' + f.k + '">' + f.opts.map(function (o) {
        var label = (f.optLabels && f.optLabels[o]) || (o === '' ? '— 없음 —' : o);
        return '<option value="' + o + '"' + (o === val ? ' selected' : '') + '>' + label + '</option>';
      }).join('') + '</select>';
    } else {
      inp = '<input id="' + id + '" data-k="' + f.k + '" type="text" value="' + CMS.esc(val) + '" placeholder="' + (f.ph || '') + '">';
    }
    return '<div class="field' + (f.full ? ' full' : '') + '">' + lab + inp + '</div>';
  }

  function renderEditor() {
    var sc = SCHEMA[active], arr = state[active];
    var html = arr.map(function (x, i) {
      var fields = sc.fields.map(function (f) { return field(active, i, f); }).join('');
      return '<div class="panel ed-entry" data-i="' + i + '">' +
        '<div class="ed-head"><span class="idx">#' + (i + 1) + '</span>' +
        '<b style="font-size:.95rem">' + CMS.esc(sc.title(x)) + '</b><span class="sp"></span>' +
        '<button class="ed-btn" data-act="up" title="위로">↑</button>' +
        '<button class="ed-btn" data-act="down" title="아래로">↓</button>' +
        '<button class="ed-btn danger" data-act="del" title="삭제">삭제</button></div>' +
        '<div class="ed-grid">' + fields + '</div></div>';
    }).join('');
    html += '<button class="ed-add" data-act="add" type="button">+ ' + sc.label + ' 추가</button>';
    $('#editor').innerHTML = html;
  }

  /* editor events (delegated) */
  $('#editor').addEventListener('input', function (e) {
    var k = e.target.getAttribute('data-k'); if (!k) return;
    var entry = e.target.closest('.ed-entry'); if (!entry) return;
    var i = +entry.getAttribute('data-i');
    state[active][i][k] = e.target.value;
    // update entry title + preview live
    var titleEl = entry.querySelector('.ed-head b');
    if (titleEl) titleEl.textContent = SCHEMA[active].title(state[active][i]);
    renderPreview();
  });
  $('#editor').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act'), arr = state[active];
    if (act === 'add') { arr.push({}); buildTabs(); renderEditor(); renderPreview(); return; }
    var entry = b.closest('.ed-entry'); if (!entry) return;
    var i = +entry.getAttribute('data-i');
    if (act === 'del') { arr.splice(i, 1); }
    else if (act === 'up' && i > 0) { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); }
    else if (act === 'down' && i < arr.length - 1) { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); }
    buildTabs(); renderEditor(); renderPreview();
  });

  /* ---------- preview (uses shared cms renderers) ---------- */
  function renderPreview() {
    var sc = SCHEMA[active], arr = state[active];
    $('#preview').innerHTML = arr.length ? sc.preview(arr) : '<p class="note">' + sc.empty + '</p>';
  }

  /* ---------- save ---------- */
  function serialize() { return JSON.stringify(state, null, 2); }
  function toast(msg, err) {
    var t = $('#toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  $('#btnDownload').addEventListener('click', function () {
    var blob = new Blob([serialize()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'data.json'; a.click();
    URL.revokeObjectURL(a.href);
    toast('data.json 다운로드됨 · assets/ 에 커밋하세요');
  });
  $('#btnCopy').addEventListener('click', function () {
    (navigator.clipboard ? navigator.clipboard.writeText(serialize()) : Promise.reject())
      .then(function () { toast('JSON 복사됨'); })
      .catch(function () { toast('복사 실패 — 다운로드를 사용하세요', true); });
  });
  $('#btnSave').addEventListener('click', function () {
    var secret = $('#apiSecret').value;
    $('#btnSave').disabled = true;
    fetch(SAVE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: serialize()
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.ok) toast('서버에 저장됨 · 재배포 중 (1–2분)');
        else toast('서버 저장 실패: ' + (res.j && (res.j.error || res.j.detail) || '설정 확인'), true);
      })
      .catch(function () { toast('서버 저장 안 됨 — 백엔드 미설정 시 JSON 다운로드를 사용하세요', true); })
      .finally(function () { $('#btnSave').disabled = false; });
  });
})();
