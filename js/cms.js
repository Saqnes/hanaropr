/* HANARO — shared content renderers (used by public pages AND the admin preview,
   so the site format stays identical). Data comes from assets/data.json, or from
   a preinjected window.HANARO_DATA (used by the offline preview bundle).

   NOTE: assets/data.json is a PUBLIC file. Anything here is visible to anyone.
   Editing is protected (Cloudflare Access + /api/save); display data is public. */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* 이스케이프 + 줄바꿈 보존(관리자가 여러 줄로 입력한 설명을 그대로 표시) */
  function escLines(s) { return esc(s).replace(/\r?\n/g, '<br>'); }
  function tel(s) { return String(s || '').replace(/[^0-9+]/g, ''); }
  var DONE = /(완료|성공|success)/i;
  var qs = function (s) { return document.querySelector(s); };
  var qsa = function (s) { return document.querySelectorAll(s); };

  /* ---- collection item renderers (match css/style.css components exactly) ---- */
  /* "2025-05-17" → {y:'2025', m:'05', d:'17'} ; 그 외 형식이면 null */
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s == null ? '' : s).trim());
    return m ? { y: m[1], m: m[2], d: m[3] } : null;
  }
  /* 발사 기록 날짜 셀: ISO 날짜면 연도(크게)+월.일(작게), 아니면 date/year 원문 */
  function launchYearCell(x) {
    var dt = parseDate(x.date);
    if (dt) return '<span class="yr mono">' + dt.y + '<small>' + dt.m + '.' + dt.d + '</small></span>';
    return '<span class="yr mono">' + esc(x.date || x.year || '') + '</span>';
  }
  /* 관리자 아코디언 헤더용 짧은 라벨 */
  function launchLabel(x) {
    var dt = parseDate(x.date);
    if (dt) return dt.y + '.' + dt.m + '.' + dt.d;
    return x.date || x.year || '';
  }
  function launchRow(x) {
    var cls = x.status === 'warn' ? 'warn' : 'go';
    var label = x.statusLabel || (x.status === 'warn' ? '부분 성공' : '발사 완료');
    return '<div class="log-row">' + launchYearCell(x) +
      '<div><p class="nm">' + esc(x.name) + '</p>' + (x.desc ? '<p class="ds">' + escLines(x.desc) + '</p>' : '') + '</div>' +
      '<div class="mt"><span class="pill ' + cls + '">' + esc(label) + '</span></div></div>';
  }
  function awardRow(x) {
    return '<div class="log-row"><span class="yr mono">' + esc(x.year) + '</span>' +
      '<div><p class="nm">' + esc(x.name) + '</p>' + (x.desc ? '<p class="ds">' + escLines(x.desc) + '</p>' : '') + '</div>' +
      '<div class="mt"><span class="pill go">' + esc(x.rank || '수상') + '</span></div></div>';
  }
  function projectCard(x) {
    var tags = [x.year, x.event, x.team].filter(Boolean)
      .map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var pill = '';
    if (x.status) {
      var cls = DONE.test(x.status) ? 'go' : 'warn';
      pill = '<div style="margin-top:14px"><span class="pill ' + cls + '">' + esc(x.status) + '</span></div>';
    }
    return '<article class="panel' + (x.image ? ' has-img' : '') + '" data-year="' + esc(x.year || '') + '">' +
      (x.image ? '<img class="p-img" src="' + esc(x.image) + '" alt="' + esc(x.name || '') + '" loading="lazy">' : '') +
      '<span class="eyebrow no-rule">' + esc(x.event || 'Project') + '</span>' +
      '<h3 style="margin-top:6px">' + esc(x.name) + '</h3>' +
      (x.ko ? '<p class="muted" style="margin-top:2px;font-size:.9rem">' + esc(x.ko) + '</p>' : '') +
      (x.summary ? '<p style="margin-top:10px">' + escLines(x.summary) + '</p>' : '') +
      (tags ? '<div class="tags">' + tags + '</div>' : '') + pill + '</article>';
  }
  function sponsorItem(x) {
    return '<div class="panel" style="text-align:center">' +
      '<b style="font-size:1.1rem;letter-spacing:-.01em">' + esc(x.name) + '</b>' +
      (x.kind ? '<span class="muted" style="display:block;font-size:.8rem;margin-top:5px">' + esc(x.kind) + '</span>' : '') + '</div>';
  }
  /* 조직도 회장단 노드 — 회장단(contacts) 데이터를 그대로 씀 */
  function orgNode(x) {
    return '<div class="node lead"><span class="role">' + esc(x.role || '회장단') + '</span>' +
      '<div class="who">' + esc(x.name || '') + '</div></div>';
  }
  function contactCard(x) {
    var links = '';
    if (x.email) links += '<a href="mailto:' + esc(x.email) + '">✉&nbsp; ' + esc(x.email) + '</a>';
    if (x.phone) links += '<a href="tel:' + esc(tel(x.phone)) + '">☎&nbsp; ' + esc(x.phone) + '</a>';
    return '<div class="panel"><span class="eyebrow no-rule">' + esc(x.role || '연락처') + '</span>' +
      '<h3 style="margin-top:6px">' + esc(x.name) + '</h3>' +
      (links ? '<div class="footer-links" style="margin-top:12px">' + links + '</div>' : '') + '</div>';
  }

  function fill(sel, arr, fn, empty) {
    var els = qsa(sel);
    if (!els.length) return;
    var html = (arr && arr.length) ? arr.map(fn).join('')
      : '<p class="note" style="padding:6px 0">' + empty + '</p>';
    Array.prototype.forEach.call(els, function (el) { el.innerHTML = html; });
  }

  function bindFilter(bar, grid) {
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      Array.prototype.forEach.call(bar.querySelectorAll('.chip'), function (c) {
        c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
      });
      var f = b.getAttribute('data-filter');
      Array.prototype.forEach.call(grid.querySelectorAll('[data-year]'), function (c) {
        c.hidden = !(f === 'all' || c.getAttribute('data-year') === f);
      });
    });
  }
  function fillProjects(arr) {
    var grid = qs('#cms-projects');
    if (grid) grid.innerHTML = (arr && arr.length) ? arr.map(projectCard).join('') : '<p class="note">등록된 프로젝트가 없습니다.</p>';
    var bar = qs('#cms-filter');
    if (bar) {
      if (arr && arr.length) {
        var years = arr.map(function (p) { return p.year; }).filter(Boolean);
        years = years.filter(function (y, i) { return years.indexOf(y) === i; }).sort().reverse();
        bar.innerHTML = '<button class="chip" data-filter="all" aria-pressed="true">전체</button>' +
          years.map(function (y) { return '<button class="chip" data-filter="' + esc(y) + '" aria-pressed="false">' + esc(y) + '</button>'; }).join('');
        if (grid && years.length) bindFilter(bar, grid); else bar.innerHTML = '';
      } else { bar.innerHTML = ''; }
    }
  }

  /* ---- site-wide fields (footer contact, form recipient) ---- */
  function applySite(site) {
    site = site || {};
    Array.prototype.forEach.call(qsa('[data-site]'), function (el) {
      var k = el.getAttribute('data-site');
      var v = site[k] || '';
      if (k === 'email') {
        if (v) { el.textContent = v; if (el.tagName === 'A') el.href = 'mailto:' + v; el.hidden = false; } else { el.hidden = true; }
      } else if (k === 'instagram' || k === 'notion') {
        if (v) { el.href = v; el.hidden = false; } else { el.hidden = true; }
      } else if (k === 'apply') {
        /* 입부 지원 링크(구글폼) — 값이 있으면 덮어쓰고, 없으면 HTML의 기본 링크 유지 */
        if (v) el.href = v;
      } else if (k === 'address') {
        el.textContent = v; el.hidden = !v;
      }
    });
    var form = qs('#contactForm');
    if (form && site.email) form.setAttribute('data-to', site.email);
  }

  /* ---- support: account + foundation ---- */
  function applySupport(s) {
    s = s || {};
    var acc = qs('#cms-account');
    if (acc) {
      if (s.number || s.bank) {
        acc.innerHTML = '<span class="eyebrow no-rule" style="margin-bottom:6px">' + (esc(s.bank) || '계좌') + '</span>' +
          '<p class="mono" style="font-size:1.05rem;word-break:break-all">' + esc(s.number) + '</p>' +
          (s.holder ? '<p class="muted" style="font-size:.82rem;margin-top:4px">예금주 · ' + esc(s.holder) + '</p>' : '');
      } else {
        acc.innerHTML = '<p class="ph-note">계좌 정보 미입력 — 관리자 페이지에서 입력</p>';
      }
    }
    var f = qs('#cms-foundation');
    if (f) { if (s.foundation) { f.href = s.foundation; f.hidden = false; } else { f.hidden = true; } }
  }

  /* ---- editable page copy ----
     data-cms-text  = plain single string    (textContent)
     data-cms-rich  = text + accent/newline   (simple markup: *gold*, ~coral~, newline=<br>)
     data-cms-list  = list items (li, or spans via data-cms-item)
     The HTML keeps its current text as the default; content[key] overrides it. */
  var CMS_SEL = '[data-cms-text],[data-cms-rich],[data-cms-list]';
  function listItems(el) {
    var tag = (el.getAttribute('data-cms-item') || 'li').toLowerCase();
    return Array.prototype.filter.call(el.children, function (c) {
      return c.tagName.toLowerCase() === tag;
    });
  }
  /* collapse HTML source whitespace the way the browser renders inline text
     (runs of spaces/newlines -> single space), then trim ends. */
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  /* simple, safe markup <-> html (only ever emits the known accent spans) */
  function markupToHtml(str) {
    return esc(str)
      .replace(/\n/g, '<br>')
      .replace(/\*([^*]+)\*/g, '<span class="g">$1</span>')
      .replace(/~([^~]+)~/g, '<span class="c">$1</span>');
  }
  function htmlToMarkup(el) {
    var out = '';
    Array.prototype.forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3) { out += n.textContent.replace(/\s+/g, ' '); return; }
      if (n.nodeType !== 1) return;
      var t = n.tagName.toLowerCase();
      if (t === 'br') out += '\n';
      else if (t === 'span' && n.classList.contains('g')) out += '*' + norm(n.textContent) + '*';
      else if (t === 'span' && n.classList.contains('c')) out += '~' + norm(n.textContent) + '~';
      else out += n.textContent.replace(/\s+/g, ' ');
    });
    /* keep <br> newlines, but drop the surrounding source-indent whitespace */
    return out.replace(/[ \t]*\n[ \t]*/g, '\n').replace(/ {2,}/g, ' ').replace(/^\s+|\s+$/g, '');
  }
  function applyContent(content, root) {
    content = content || {};
    var els = (root || document).querySelectorAll(CMS_SEL);
    Array.prototype.forEach.call(els, function (el) {
      if (el.hasAttribute('data-cms-text')) {
        var v = content[el.getAttribute('data-cms-text')];
        /* 값이 채워지면 '입력하세요' 플레이스홀더 서식(.ph)을 벗김 — 실제 내용이
           점선 박스로 보이지 않게. 다시 비우면 원래 서식 복구(미리보기 반복 적용 대비). */
        if (el.classList.contains('ph') && !el.hasAttribute('data-ph')) el.setAttribute('data-ph', '1');
        if (typeof v === 'string' && v.trim() !== '') {
          /* 줄바꿈을 입력했으면 그대로 보이게(<br>). escLines가 항상 이스케이프 → XSS 안전 */
          if (/\n/.test(v)) el.innerHTML = escLines(v); else el.textContent = v;
          if (el.hasAttribute('data-ph')) el.classList.remove('ph');
        } else if (el.hasAttribute('data-ph')) el.classList.add('ph');
      } else if (el.hasAttribute('data-cms-rich')) {
        var rv = content[el.getAttribute('data-cms-rich')];
        if (typeof rv === 'string' && rv.trim() !== '') el.innerHTML = markupToHtml(rv);
      } else {
        var lv = content[el.getAttribute('data-cms-list')];
        if (Array.isArray(lv) && lv.length) {
          var tag = el.getAttribute('data-cms-item') || 'li';
          el.innerHTML = lv.map(function (it) { return '<' + tag + '>' + esc(it) + '</' + tag + '>'; }).join('');
        }
      }
    });
  }
  /* For the admin editor: read the current (default) copy out of a parsed document. */
  function readContentDefaults(root) {
    var out = [];
    var els = (root || document).querySelectorAll(CMS_SEL);
    Array.prototype.forEach.call(els, function (el) {
      if (el.hasAttribute('data-cms-text')) {
        out.push({ key: el.getAttribute('data-cms-text'), type: 'text', def: norm(el.textContent) });
      } else if (el.hasAttribute('data-cms-rich')) {
        out.push({ key: el.getAttribute('data-cms-rich'), type: 'rich', def: htmlToMarkup(el) });
      } else {
        out.push({
          key: el.getAttribute('data-cms-list'), type: 'list',
          item: (el.getAttribute('data-cms-item') || 'li'),
          def: listItems(el).map(function (c) { return norm(c.textContent); })
        });
      }
    });
    return out;
  }

  /* ---- photo slots (data-cms-img) — uploaded image fills the placeholder panel ---- */
  function applyImages(imgs) {
    imgs = imgs || {};
    Array.prototype.forEach.call(qsa('[data-cms-img]'), function (el) {
      var url = imgs[el.getAttribute('data-cms-img')];
      var old = el.querySelector('img.slot-img'); if (old) old.remove();
      var ph = el.querySelector('.ph-note');
      if (!url) { el.classList.remove('has-photo'); if (ph) ph.style.display = ''; return; }
      if (ph) ph.style.display = 'none';
      var img = document.createElement('img');
      img.className = 'slot-img'; img.src = url; img.alt = ''; img.loading = 'lazy';
      el.insertBefore(img, el.firstChild);
      el.classList.add('has-photo');
    });
  }
  /* For the admin editor: discover photo slots + a human label. */
  function readImageSlots(root) {
    var out = [];
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-cms-img]'), function (el) {
      var lbl = el.getAttribute('data-cms-img-label') || '';
      if (!lbl) { var eb = el.querySelector('.eyebrow'); if (eb) lbl = norm(eb.textContent); }
      if (!lbl) { var ph = el.querySelector('.ph-note'); if (ph) lbl = norm(ph.textContent); }
      if (!lbl) { var cap = el.querySelector('figcaption, .cap'); if (cap) lbl = norm(cap.textContent); }
      if (!lbl) { var im = el.tagName === 'IMG' ? el : el.querySelector('img'); if (im && im.getAttribute('alt')) lbl = norm(im.getAttribute('alt')); }
      out.push({ key: el.getAttribute('data-cms-img'), label: lbl });
    });
    return out;
  }

  /* ---- location: address + map ---- */
  function applyLocation(loc) {
    loc = loc || {};
    Array.prototype.forEach.call(qsa('#cms-address'), function (el) { el.textContent = loc.address || ''; });
    var m = qs('#cms-map');
    if (m) {
      if (loc.mapEmbed) {
        /* 관리자가 지도 임베드 URL을 넣으면 iframe 지도로 덮어씀 */
        m.innerHTML = '<iframe src="' + esc(loc.mapEmbed) + '" loading="lazy" title="위치 지도" style="width:100%;height:100%;min-height:220px;border:0;display:block"></iframe>';
      } else if (!m.firstElementChild) {
        /* 비어 있을 때만 안내 문구 — HTML에 박힌 지도(카카오맵 등)는 그대로 유지 */
        m.innerHTML = '<div style="min-height:220px;display:grid;place-items:center"><p class="ph-note">지도 임베드 미입력</p></div>';
      }
    }
  }

  function apply(data) {
    data = data || {};
    applySite(data.site);
    applyContent(data.content);
    fill('#cms-launches', data.launches, launchRow, '등록된 발사 기록이 없습니다.');
    fill('#cms-awards', data.awards, awardRow, '등록된 수상 내역이 없습니다.');
    fill('#cms-sponsors', data.sponsors, sponsorItem, '등록된 후원사가 없습니다.');
    fill('#cms-contacts', data.contacts, contactCard, '등록된 연락처가 없습니다.');
    /* 팀 페이지 조직도 회장단 줄 — 회장단(contacts)을 그대로 반영.
       비어 있으면 HTML의 기본 플레이스홀더 노드를 그대로 둠. */
    var orgLeads = qs('#cms-org-leads');
    if (orgLeads && data.contacts && data.contacts.length) {
      orgLeads.innerHTML = data.contacts.map(orgNode).join('');
    }
    fillProjects(data.projects);
    // featured projects on the home page
    var featured = (data.projects || []).filter(function (p) { return p.featured; });
    var hp = qs('#cms-home-projects');
    if (hp) hp.innerHTML = featured.length ? featured.map(projectCard).join('') : '';
    var hpSec = qs('#home-projects-sec');
    if (hpSec) hpSec.hidden = !featured.length;
    applySupport(data.support);
    applyLocation(data.location);
    applyImages(data.images);
    var cnt = qs('#cms-launch-count');
    if (cnt) cnt.textContent = (data.launches && data.launches.length) || 0;
  }

  function hydrate() {
    if (window.HANARO_DATA) { apply(window.HANARO_DATA); return Promise.resolve(window.HANARO_DATA); }
    return fetch('assets/data.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) apply(d); return d; })
      .catch(function () { return null; });
  }

  window.HANARO_CMS = {
    esc: esc, launchRow: launchRow, launchLabel: launchLabel, awardRow: awardRow, projectCard: projectCard,
    sponsorItem: sponsorItem, contactCard: contactCard, apply: apply, hydrate: hydrate,
    applyContent: applyContent, readContentDefaults: readContentDefaults,
    applyImages: applyImages, readImageSlots: readImageSlots
  };
})();
