/* SNU Rocket Team HANARO — shared interactions */
(function () {
  'use strict';

  document.documentElement.classList.add('js-ready');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Starfield ---------- */
  var canvas = document.getElementById('starfield');
  if (canvas && canvas.getContext && document.body.classList.contains('home')) {
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
    } else {
    var stars = [];
    var shooting = null;
    var w = 0;
    var h = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    var resizeRaf = null;
    var drawRaf = null;
    var lastFrame = 0;

    var makeStar = function () {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * 0.55 + 0.15,
        tw: Math.random() * 0.015 + 0.004,
        ph: Math.random() * Math.PI * 2,
        vy: Math.random() * 0.03 + 0.01
      };
    };

    var resize = function () {
      var pw = w;
      var ph = h;
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(w < 821 ? 120 : 200, Math.floor((w * h) / 6500));
      if (!stars.length || !pw || !ph) {
        stars = [];
        for (var i = 0; i < count; i++) stars.push(makeStar());
      } else {
        // keep existing stars in place (scaled) so mobile URL-bar resizes don't reshuffle the sky
        var sx = w / pw;
        var sy = h / ph;
        for (var j = 0; j < stars.length; j++) {
          stars[j].x *= sx;
          stars[j].y *= sy;
        }
        while (stars.length < count) stars.push(makeStar());
        if (stars.length > count) stars.length = count;
      }

      if (reduceMotion) draw(); // repaint the static frame (resizing wipes the canvas)
    };

    var spawnShooting = function () {
      shooting = {
        x: Math.random() * w * 0.7 + w * 0.15,
        y: Math.random() * h * 0.3,
        vx: -(Math.random() * 4 + 5),
        vy: Math.random() * 2 + 2.2,
        life: 1
      };
    };

    var t = 0;
    var draw = function (ts) {
      if (!reduceMotion && ts && ts - lastFrame < 32) {
        drawRaf = requestAnimationFrame(draw);
        return;
      }
      if (ts) lastFrame = ts;
      ctx.clearRect(0, 0, w, h);
      t += 1;

      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var alpha = s.a + Math.sin(t * s.tw + s.ph) * 0.18;
        if (alpha < 0.03) alpha = 0.03;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = i % 9 === 0 ? '#fe9c9c' : i % 7 === 0 ? '#f8b62b' : '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();

        if (!reduceMotion) {
          s.y -= s.vy;
          if (s.y < -4) {
            s.y = h + 4;
            s.x = Math.random() * w;
          }
        }
      }

      if (!reduceMotion) {
        if (!shooting && Math.random() < 0.0018) spawnShooting();
        if (shooting) {
          var sh = shooting;
          ctx.globalAlpha = sh.life * 0.9;
          var grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 9, sh.y - sh.vy * 9);
          grad.addColorStop(0, 'rgba(255,255,255,0.95)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(sh.x, sh.y);
          ctx.lineTo(sh.x - sh.vx * 9, sh.y - sh.vy * 9);
          ctx.stroke();
          sh.x += sh.vx;
          sh.y += sh.vy;
          sh.life -= 0.018;
          if (sh.life <= 0 || sh.x < -60 || sh.y > h + 60) shooting = null;
        }
      }

      ctx.globalAlpha = 1;
      if (!reduceMotion && !document.hidden) {
        drawRaf = requestAnimationFrame(draw);
      } else {
        drawRaf = null;
      }
    };

    resize();
    window.addEventListener('resize', function () {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(function () {
        resizeRaf = null;
        resize();
      });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && drawRaf) {
        cancelAnimationFrame(drawRaf);
        drawRaf = null;
      } else if (!document.hidden && !reduceMotion && !drawRaf) {
        lastFrame = 0;
        drawRaf = requestAnimationFrame(draw);
      }
    });
    if (reduceMotion) {
      draw(); // static single frame
    } else {
      drawRaf = requestAnimationFrame(draw);
    }
    }
  }

  /* ---------- Nav scrolled state ---------- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    var mobileMenu = document.querySelector('.mobile-menu');
    var previousFocus = null;
    var setMenu = function (open, restoreFocus) {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      if (mobileMenu) mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
      // keep focus and screen readers inside the overlay while it is open
      document.querySelectorAll('main, footer, .skip-link, .nav .brand').forEach(function (el) {
        if (open) {
          el.setAttribute('inert', '');
          el.setAttribute('aria-hidden', 'true');
        } else {
          el.removeAttribute('inert');
          el.removeAttribute('aria-hidden');
        }
      });
      if (open) {
        previousFocus = document.activeElement;
        requestAnimationFrame(function () {
          var firstLink = mobileMenu && mobileMenu.querySelector('a');
          if (firstLink) firstLink.focus();
        });
      } else if (restoreFocus && previousFocus && previousFocus.focus) {
        previousFocus.focus();
      }
    };

    toggle.addEventListener('click', function () {
      var isOpen = document.body.classList.contains('menu-open');
      setMenu(!isOpen, isOpen);
    });

    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        setMenu(false, false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
        setMenu(false, true);
      }
      if (e.key === 'Tab' && document.body.classList.contains('menu-open') && mobileMenu) {
        var focusables = [toggle].concat(Array.prototype.slice.call(mobileMenu.querySelectorAll('a')));
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    var desktopMq = window.matchMedia('(min-width: 821px)');
    var onMqChange = function (e) {
      if (e.matches && document.body.classList.contains('menu-open')) {
        setMenu(false, false);
      }
    };
    if (desktopMq.addEventListener) {
      desktopMq.addEventListener('change', onMqChange);
    } else if (desktopMq.addListener) {
      desktopMq.addListener(onMqChange);
    }
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('in');
    });
  }

  /* ---------- Count-up numbers ---------- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          cio.unobserve(el);

          var target = parseFloat(el.getAttribute('data-count'));
          var decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
          var plain = el.hasAttribute('data-plain'); // years etc: no thousand separators
          var duration = 1600;
          var start = null;

          var format = function (v) {
            var s = v.toFixed(decimals);
            return plain ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          };

          var tick = function (ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 4);
            el.textContent = format(target * eased);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (el) {
      cio.observe(el);
    });
  } else {
    counters.forEach(function (el) {
      var v = parseFloat(el.getAttribute('data-count'));
      var decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
      var s = v.toFixed(decimals);
      el.textContent = el.hasAttribute('data-plain') ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    });
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }
})();
