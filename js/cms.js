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
  function tel(s) { return String(s || '').replace(/[^0-9+]/g, ''); }
  var DONE = /(완료|성공|success)/i;
  var qs = function (s) { return document.querySelector(s); };
  var qsa = function (s) { return document.querySelectorAll(s); };

  /* ---- collection item renderers (match css/style.css components exactly) ---- */
  function launchRow(x) {
    var cls = x.status === 'warn' ? 'warn' : 'go';
    var label = x.statusLabel || (x.status === 'warn' ? '부분 성공' : '발사 완료');
    return '<div class="log-row"><span class="yr mono">' + esc(x.year) + '</span>' +
      '<div><p class="nm">' + esc(x.name) + '</p>' + (x.desc ? '<p class="ds">' + esc(x.desc) + '</p>' : '') + '</div>' +
      '<div class="mt"><span class="pill ' + cls + '">' + esc(label) + '</span></div></div>';
  }
  function awardRow(x) {
    return '<div class="log-row"><span class="yr mono">' + esc(x.year) + '</span>' +
      '<div><p class="nm">' + esc(x.name) + '</p>' + (x.desc ? '<p class="ds">' + esc(x.desc) + '</p>' : '') + '</div>' +
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
    return '<article class="panel" data-year="' + esc(x.year || '') + '">' +
      '<span class="eyebrow no-rule">' + esc(x.event || 'Project') + '</span>' +
      '<h3 style="margin-top:6px">' + esc(x.name) + '</h3>' +
      (x.ko ? '<p class="muted" style="margin-top:2px;font-size:.9rem">' + esc(x.ko) + '</p>' : '') +
      (x.summary ? '<p style="margin-top:10px">' + esc(x.summary) + '</p>' : '') +
      (tags ? '<div class="tags">' + tags + '</div>' : '') + pill + '</article>';
  }
  function sponsorItem(x) {
    return '<div class="panel" style="text-align:center">' +
      '<b style="font-size:1.1rem;letter-spacing:-.01em">' + esc(x.name) + '</b>' +
      (x.kind ? '<span class="muted" style="display:block;font-size:.8rem;margin-top:5px">' + esc(x.kind) + '</span>' : '') + '</div>';
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
      if (n.nodeType === 3) { out += n.textContent; return; }
      if (n.nodeType !== 1) return;
      var t = n.tagName.toLowerCase();
      if (t === 'br') out += '\n';
      else if (t === 'span' && n.classList.contains('g')) out += '*' + n.textContent + '*';
      else if (t === 'span' && n.classList.contains('c')) out += '~' + n.textContent + '~';
      else out += n.textContent;
    });
    return out.replace(/\s+$/, '').replace(/^\s+/, '');
  }
  function applyContent(content, root) {
    content = content || {};
    var els = (root || document).querySelectorAll(CMS_SEL);
    Array.prototype.forEach.call(els, function (el) {
      if (el.hasAttribute('data-cms-text')) {
        var v = content[el.getAttribute('data-cms-text')];
        if (typeof v === 'string' && v.trim() !== '') el.textContent = v;
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
        out.push({ key: el.getAttribute('data-cms-text'), type: 'text', def: (el.textContent || '').trim() });
      } else if (el.hasAttribute('data-cms-rich')) {
        out.push({ key: el.getAttribute('data-cms-rich'), type: 'rich', def: htmlToMarkup(el) });
      } else {
        out.push({
          key: el.getAttribute('data-cms-list'), type: 'list',
          item: (el.getAttribute('data-cms-item') || 'li'),
          def: listItems(el).map(function (c) { return (c.textContent || '').trim(); })
        });
      }
    });
    return out;
  }

  /* ---- location: address + map ---- */
  function applyLocation(loc) {
    loc = loc || {};
    Array.prototype.forEach.call(qsa('#cms-address'), function (el) { el.textContent = loc.address || ''; });
    var m = qs('#cms-map');
    if (m) {
      m.innerHTML = loc.mapEmbed
        ? '<iframe src="' + esc(loc.mapEmbed) + '" loading="lazy" title="위치 지도" style="width:100%;height:100%;min-height:220px;border:0;display:block"></iframe>'
        : '<div style="min-height:220px;display:grid;place-items:center"><p class="ph-note">지도 임베드 미입력</p></div>';
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
    fillProjects(data.projects);
    applySupport(data.support);
    applyLocation(data.location);
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
    esc: esc, launchRow: launchRow, awardRow: awardRow, projectCard: projectCard,
    sponsorItem: sponsorItem, contactCard: contactCard, apply: apply, hydrate: hydrate,
    applyContent: applyContent, readContentDefaults: readContentDefaults
  };
})();
