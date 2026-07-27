/* HANARO — SNU Rocket Team · site interactions (built fresh)
   nav · mobile menu · scroll reveals · count-up · mission clock
   · project filter · archive tabs · contact mailto form */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- theme (기본 = 밝은 화면, 선택은 localStorage에 기억) ----
     첫 페인트 전 적용은 각 페이지 <head>의 인라인 스크립트가 담당(깜빡임 방지). */
  var themeBtn = $('#themeToggle');
  var setThemeLabel = function (dark) {
    if (!themeBtn) return;
    themeBtn.setAttribute('aria-label', dark ? '밝은 화면으로 전환' : '어두운 화면으로 전환');
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  };
  setThemeLabel(document.documentElement.getAttribute('data-theme') === 'dark');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
      if (dark) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('hanaro-theme', dark ? 'dark' : 'light'); } catch (e) { /* private mode */ }
      setThemeLabel(dark);
    });
  }

  /* ---- nav scrolled state ---- */
  var nav = $('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 10); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- mobile menu (focus-trapped via inert) ---- */
  var toggle = $('.nav-toggle');
  if (toggle) {
    var setMenu = function (open) {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      $$('main, .footer').forEach(function (el) {
        if (open) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
        else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
      });
    };
    toggle.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
    $$('.mobile a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
    });
    /* 981px = css/style.css의 햄버거 분기점(max-width:980px)과 반드시 일치시킬 것.
       데스크톱 메뉴로 돌아갈 때만 모바일 메뉴를 닫는다. */
    var mq = window.matchMedia('(min-width: 981px)');
    if (mq.addEventListener) mq.addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* ---- scroll reveals ---- */
  var revEls = $$('.reveal');
  if (revEls.length && 'IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revEls.forEach(function (el) { io.observe(el); });
  } else {
    revEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- count-up numbers ---- */
  var counters = $$('[data-count]');
  var fmt = function (el, v) {
    var dec = (el.getAttribute('data-count').split('.')[1] || '').length;
    var s = v.toFixed(dec);
    return el.hasAttribute('data-plain') ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  if (counters.length && 'IntersectionObserver' in window && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; cio.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count')), start = null, dur = 1400;
        var step = function (ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          el.textContent = fmt(el, target * (1 - Math.pow(1 - p, 4)));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = fmt(el, parseFloat(el.getAttribute('data-count'))); });
  }

  /* ---- mission clock (hero telemetry) ---- */
  var clock = $('#clock');
  if (clock) {
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var d = new Date();
      clock.textContent = 'T ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds()) + ' UTC';
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---- CMS content: projects / launches / awards / sponsors (from data.json) ---- */
  if (window.HANARO_CMS) window.HANARO_CMS.hydrate();

  /* ---- archive tabs ---- */
  var tablist = $('.tabs[role="tablist"]');
  if (tablist) {
    var tabs = $$('[role="tab"]', tablist);
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var sel = function (i) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (panels[k]) panels[k].hidden = !on;
      });
    };
    sel(0);
    tablist.addEventListener('click', function (e) { var t = e.target.closest('[role="tab"]'); if (t) sel(tabs.indexOf(t)); });
    tablist.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement), n;
      if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1; else return;
      e.preventDefault(); tabs[n].focus(); sel(n);
    });
  }

  /* ---- contact form → mailto composer ---- */
  var form = $('#contactForm');
  if (form) {
    var typeSel = $('#f-type');
    var v = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    $$('[data-preset]').forEach(function (a) {
      a.addEventListener('click', function () { if (typeSel) typeSel.value = a.getAttribute('data-preset'); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var to = form.getAttribute('data-to') || '';
      var type = typeSel ? typeSel.value : '문의';
      var subject = '[하나로 문의 · ' + type + '] ' + v('f-name');
      var body = '문의 유형: ' + type + '\n이름 · 소속: ' + v('f-name') + '\n회신 이메일: ' + v('f-email') + '\n\n' + v('f-msg') + '\n';
      window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  /* ---- footer year ---- */
  var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
})();
