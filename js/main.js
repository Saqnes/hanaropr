/* SNU Rocket Team HANARO — shared interactions */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Starfield ---------- */
  var canvas = document.getElementById('starfield');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var stars = [];
    var shooting = null;
    var w = 0;
    var h = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

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
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(240, Math.floor((w * h) / 6500));
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
    var draw = function () {
      ctx.clearRect(0, 0, w, h);
      t += 1;

      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var alpha = s.a + Math.sin(t * s.tw + s.ph) * 0.18;
        if (alpha < 0.03) alpha = 0.03;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = i % 9 === 0 ? '#ffe0a0' : i % 7 === 0 ? '#ffc2cf' : '#ffffff';
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
      if (!reduceMotion) {
        requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    if (reduceMotion) {
      draw(); // static single frame
    } else {
      requestAnimationFrame(draw);
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
    var setMenu = function (open) {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      // keep focus and screen readers inside the overlay while it is open
      document.querySelectorAll('main, footer').forEach(function (el) {
        if (open) {
          el.setAttribute('inert', '');
          el.setAttribute('aria-hidden', 'true');
        } else {
          el.removeAttribute('inert');
          el.removeAttribute('aria-hidden');
        }
      });
    };

    toggle.addEventListener('click', function () {
      setMenu(!document.body.classList.contains('menu-open'));
    });

    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        setMenu(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
        setMenu(false);
        toggle.focus();
      }
    });

    var desktopMq = window.matchMedia('(min-width: 821px)');
    var onMqChange = function (e) {
      if (e.matches && document.body.classList.contains('menu-open')) {
        setMenu(false);
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

  /* ======================================================================
     MZ interactions — word reveal · scramble · magnetic · cursor · marquee
     All progressive + motion-safe. Content stays intact without JS.
     ====================================================================== */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* --- Word-by-word blur-fade-up on big headings --- */
  function splitWords(el) {
    var walk = function (node) {
      var out = [];
      Array.prototype.forEach.call(node.childNodes, function (child) {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(function (tok) {
            if (tok === '') return;
            if (/^\s+$/.test(tok)) {
              out.push(document.createTextNode(tok));
            } else {
              var s = document.createElement('span');
              s.className = 'w';
              s.textContent = tok;
              out.push(s);
            }
          });
        } else if (child.nodeName === 'BR') {
          out.push(child.cloneNode());
        } else {
          /* wrap whole element (e.g. gradient <em>) as one word to keep its styling */
          var s = document.createElement('span');
          s.className = 'w';
          s.appendChild(child.cloneNode(true));
          out.push(s);
        }
      });
      return out;
    };
    var nodes = walk(el);
    el.innerHTML = '';
    nodes.forEach(function (n) { el.appendChild(n); });
    Array.prototype.forEach.call(el.querySelectorAll('.w'), function (w, i) {
      w.style.setProperty('--wi', i);
    });
  }

  if (!reduceMotion) {
    var wordIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            wordIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    document.querySelectorAll('.hero-tagline, .page-hero h1, .cta-band h2').forEach(function (el) {
      el.classList.remove('reveal');
      splitWords(el);
      el.classList.add('words-ready');
      wordIO.observe(el);
    });
  }

  /* --- Text scramble / decode on section labels --- */
  if (!reduceMotion) {
    var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·/#<>@%';
    var scramble = function (el) {
      var text = el.getAttribute('data-final');
      var len = text.length;
      var revealed = 0;
      var run = function () {
        revealed += 0.6;
        var out = '';
        for (var i = 0; i < len; i++) {
          if (text[i] === ' ' || i < revealed) out += text[i];
          else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        el.textContent = out;
        if (revealed < len) requestAnimationFrame(run);
        else el.textContent = text;
      };
      run();
    };
    var scrIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            scramble(e.target);
            scrIO.unobserve(e.target);
          }
        });
      },
      { threshold: 1 }
    );
    document.querySelectorAll('.sec-label').forEach(function (el) {
      el.setAttribute('data-final', el.textContent);
      scrIO.observe(el);
    });
  }

  /* --- Magnetic buttons --- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.btn-primary, .nav-cta').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        btn.style.transform = 'translate(' + mx * 0.25 + 'px,' + my * 0.35 + 'px)';
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.transform = '';
      });
    });
  }

  /* --- Custom cursor (dot + trailing ring, monochrome) --- */
  if (finePointer && !reduceMotion) {
    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.documentElement.classList.add('cursor-on');

    var mx = window.innerWidth / 2;
    var my = window.innerHeight / 2;
    var rx = mx;
    var ry = my;
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    });
    var ringLoop = function () {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(ringLoop);
    };
    requestAnimationFrame(ringLoop);

    var HOT = 'a, button, .btn, [role="button"], summary, input, .card, .team-card, .contact-card, .nav-toggle';
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest && e.target.closest(HOT)) ring.classList.add('hot');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest && e.target.closest(HOT)) ring.classList.remove('hot');
    });
  }

  /* --- Scroll-reactive marquee skew --- */
  if (!reduceMotion) {
    var marquees = document.querySelectorAll('.marquee');
    if (marquees.length) {
      var lastY = window.scrollY;
      window.addEventListener(
        'scroll',
        function () {
          var y = window.scrollY;
          var skew = Math.max(-4, Math.min(4, (y - lastY) * 0.35));
          lastY = y;
          marquees.forEach(function (m) { m.style.setProperty('--mq-skew', skew + 'deg'); });
        },
        { passive: true }
      );
      var decay = function () {
        marquees.forEach(function (m) {
          var cur = parseFloat(m.style.getPropertyValue('--mq-skew')) || 0;
          if (Math.abs(cur) > 0.05) m.style.setProperty('--mq-skew', cur * 0.88 + 'deg');
        });
        requestAnimationFrame(decay);
      };
      requestAnimationFrame(decay);
    }
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }
})();
