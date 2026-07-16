/* HANARO — shared content renderers (used by public pages AND the admin preview,
   so the site format stays identical). Data comes from assets/data.json, or from
   a preinjected window.HANARO_DATA (used by the offline preview bundle). */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var DONE = /(완료|성공|success)/i;

  /* ---- entry renderers (match css/style.css components exactly) ---- */
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

  function fill(sel, arr, fn, empty) {
    var els = document.querySelectorAll(sel);
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
    var grid = document.querySelector('#cms-projects');
    if (grid) {
      grid.innerHTML = (arr && arr.length) ? arr.map(projectCard).join('')
        : '<p class="note">등록된 프로젝트가 없습니다.</p>';
    }
    var bar = document.querySelector('#cms-filter');
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

  function apply(data) {
    data = data || {};
    fill('#cms-launches', data.launches, launchRow, '등록된 발사 기록이 없습니다.');
    fill('#cms-awards', data.awards, awardRow, '등록된 수상 내역이 없습니다.');
    fill('#cms-sponsors', data.sponsors, sponsorItem, '등록된 후원사가 없습니다.');
    fillProjects(data.projects);
    var cnt = document.querySelector('#cms-launch-count');
    if (cnt) cnt.textContent = (data.launches && data.launches.length) || 0;
  }

  function hydrate() {
    if (window.HANARO_DATA) { apply(window.HANARO_DATA); return Promise.resolve(window.HANARO_DATA); }
    return fetch('assets/data.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) apply(d); return d; })
      .catch(function () { /* keep static fallback */ return null; });
  }

  window.HANARO_CMS = {
    esc: esc, launchRow: launchRow, awardRow: awardRow, projectCard: projectCard,
    sponsorItem: sponsorItem, apply: apply, hydrate: hydrate
  };
})();
