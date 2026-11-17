import {
  families as flavours,
  ingredients as ingredientArt,
  bits
} from './catalog.js';

export function startExperience({
  openFamily,
  tickPackages
}) {
  const $ = s => document.querySelector(s),
    $$ = s => [...document.querySelectorAll(s)],
    root = document.documentElement;
  document.body.classList.add('experience-ready');
  const mod = x => ((x % flavours.length) + flavours.length) % flavours.length,
    clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)),
    lerp = (a, b, t) => a + (b - a) * t,
    sine = t => -(Math.cos(Math.PI * t) - 1) / 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches,
    fine = matchMedia('(pointer:fine)').matches;

  function crop(el, box) {
    const i = bits.indexOf(box);
    el.style.backgroundImage = `url("${ingredientArt[Math.max(0,i)]}")`;
    el.style.backgroundSize = 'contain';
    el.style.backgroundPosition = 'center';
  }

  function sprite(el, i) {
    el.style.backgroundImage = `url("${flavours[i].snapshot||flavours[i].image}")`;
    el.style.backgroundSize = 'contain';
    el.style.backgroundPosition = 'center';
    el.style.setProperty('--aspect', flavours[i].photoAspect || .475);
    el.dataset.flavour = i;
    return el;
  }

  function bezier(x1, y1, x2, y2) {
    return x => {
      let t = x;
      for (let i = 0; i < 6; i++) {
        let v = 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3 - x,
          d = 3 * (1 - t) ** 2 * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
        if (Math.abs(d) > .00001) t = clamp(t - v / d)
      }
      return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3;
    };
  }
  const glide = bezier(.25, .75, .2, 1),
    entrance = bezier(.16, 1, .3, 1);
  let vw = innerWidth,
    vh = innerHeight,
    u = 1,
    hu = 1,
    k = 1,
    phone = false,
    pos = -2.6,
    target = 0,
    selected = 0,
    entered = false,
    autoplay = !reduced,
    lastInteraction = performance.now(),
    slide = null,
    reveal = null,
    drag = null,
    centered = false;
  const cards = [],
    fallbacks = [];
  flavours.forEach((f, i) => {
    const card = $$('.family-card')[i];
    sprite(card.querySelector('.pk'), i);
    cards.push(card);
    card.tiltX = card.tiltY = 0;

    card.addEventListener('pointermove', e => {
      if (!fine || reduced) return;
      const r = card.getBoundingClientRect();
      card.tiltX = (e.clientX - r.left) / r.width - .5;
      card.tiltY = (e.clientY - r.top) / r.height - .5;
      card.style.transitionDuration = '.15s';
      card.style.transform = `translateY(-8px) rotateX(${-card.tiltY*12}deg) rotateY(${card.tiltX*12}deg)`;
      card.style.boxShadow = '0 24px 40px -18px #5d2b4240';
    });
    card.addEventListener('pointerleave', () => {
      card.tiltX = card.tiltY = 0;
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });

  function goToFamily(i) {
    let delta = i - mod(target);
    if (delta > flavours.length / 2) delta -= flavours.length;
    if (delta < -flavours.length / 2) delta += flavours.length;
    goTo(target + delta);
  }
  $('#explore').onclick = () => openFamily(selected);
  const floating = [
    [.12, .20, 120, -18, 0],
    [.86, .18, 96, 22, 2],
    [.07, .74, 84, 12, 3],
    [.655, .15, 78, -10, 4],
    [.205, .885, 70, 30, 1]
  ];
  floating.forEach((b, i) => {
    const el = document.createElement('div');
    el.className = 'spr bit';
    crop(el, bits[b[4]]);
    el.style.cssText += `;left:${b[0]*100}%;top:${b[1]*100}%;--alpha:.6;rotate:${b[3]}deg;animation-delay:${300+90*i}ms,${300+90*i}ms;animation-duration:900ms,${7000+900*i}ms`;
    $('.bits').append(el);
  });
  let randSeed = 9182;

  function random() {
    randSeed = (Math.imul(randSeed, 1664525) + 1013904223) >>> 0;
    return randSeed / 4294967296;
  }

  function updateSprites() {
    cards.forEach((c, i) => c.classList.toggle('live', i === selected));
  }

  function resize() {
    vw = innerWidth;
    vh = innerHeight;
    phone = vw < 820;
    u = Math.min(vw / 1440, vh / 900);
    hu = phone ? Math.min(vw / 560, vh / 980) : u;
    k = phone ? Math.min(vw / 390, vh / 780) : u;
    root.style.setProperty('--u', u + 'px');
    root.style.setProperty('--k', k);
    $('#gl').style.height = vh + 'px';
    $$('.bit').forEach((el, i) => {
      let b = floating[i],
        w = b[2] * hu * (phone ? 1.3 : 1);
      el.style.width = w + 'px';
      el.style.height = w * bits[b[4]][3] / bits[b[4]][2] + 'px';
      el.style.display = phone && [1, 3, 4].includes(i) ? 'none' : '';
    });
    fitTitle();
    resizeGL();
    highlight();
  }
  const measure = document.createElement('canvas').getContext('2d');

  function fitTitle() {
    measure.font = '800 100px Manrope';
    let name = flavours[selected].name.toUpperCase(),
      w = measure.measureText(phone ? name.split(' ').sort((a, b) => measure.measureText(b).width - measure.measureText(a).width)[0] : name).width;
    let size = phone ? Math.min(clamp(.125 * vw, 40, 64), (vw - 36) * 100 / w) : Math.min(96 * u, 760 * u * 100 / w);
    if (phone && vw > vh) size = Math.min(size, 36);
    $('#title').style.fontSize = size + 'px';
    requestAnimationFrame(() => root.style.setProperty('--title-h', $('#title').offsetHeight + 'px'));
  }

  function letters(name) {
    return name.toUpperCase().split(' ').map(w => `<span class="word">${[...w].map(l=>`<span class="letter">${l}</span>`).join('')}</span>`).join('');
  }
  let titleGeneration = 0;

  function swapTitle(dir, instant = false) {
    const title = $('#title'),
      gen = ++titleGeneration;
    const old = document.createElement('span');
    old.className = 'title-old';
    old.innerHTML = title.innerHTML;
    title.innerHTML = letters(flavours[selected].name);
    title.setAttribute('aria-label', flavours[selected].name);
    if (!reduced && !instant) {
      title.append(old);
      old.querySelectorAll('.letter').forEach((l, i) => l.animate([{
        transform: 'translateY(0)',
        opacity: 1
      }, {
        transform: `translateY(${-dir*110}%)`,
        opacity: 0
      }], {
        duration: 300,
        delay: i * 11,
        easing: 'cubic-bezier(.45,0,.75,.3)',
        fill: 'both'
      }));
      title.querySelectorAll(':scope > .word .letter').forEach((l, i) => l.animate([{
        transform: `translateY(${dir*110}%)`,
        opacity: 0
      }, {
        transform: 'translateY(0)',
        opacity: 1
      }], {
        duration: 620,
        delay: 120 + i * 22,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'both'
      }));
      setTimeout(() => old.remove(), 650);
    }
    fitTitle();
    const count = $('#count');
    if (reduced || instant) {
      count.textContent = String(selected + 1).padStart(2, '0');
      return;
    }
    count.getAnimations().forEach(a => a.cancel());
    count.animate([{
      translate: '0 0',
      opacity: 1
    }, {
      translate: '0 -10px',
      opacity: 0
    }], {
      duration: 220,
      easing: 'cubic-bezier(.5,0,.75,0)',
      fill: 'forwards'
    });
    setTimeout(() => {
      if (gen !== titleGeneration) return;
      count.textContent = String(selected + 1).padStart(2, '0');
      count.animate([{
        translate: '0 14px',
        opacity: 0
      }, {
        translate: '0 0',
        opacity: 1
      }], {
        duration: 380,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'forwards'
      });
    }, 280);
  }

  function finishReveal() {
    if (reveal) {
      root.style.setProperty('--flav', reveal.color);
      reveal = null;
    }
    $('.reveal').style.cssText = '';
  }

  function changeFlavour(i, dir) {
    finishReveal();
    selected = mod(i);
    $('#explore').innerHTML = `Ver sabores de ${flavours[selected].name} <span aria-hidden="true">↗</span>`;
    $('#explore').setAttribute('aria-label', `Ver los sabores de ${flavours[selected].name}`);
    swapTitle(dir);
    updateSprites();
    if (reduced) {
      root.style.setProperty('--flav', flavours[selected].color);
    } else {
      reveal = {
        start: performance.now(),
        color: flavours[selected].color
      };
      $('.reveal').style.setProperty('--rv', reveal.color);
      $('.reveal').style.clipPath = 'none';
    }
  }

  function goTo(to, duration) {
    lastInteraction = performance.now();
    to = Math.round(to);
    let previous = target;
    target = to;
    if (reduced) {
      pos = target;
      if (mod(target) !== selected) changeFlavour(target, target >= previous ? 1 : -1);
      slide = null;
      return;
    }
    slide = {
      from: pos,
      to,
      start: performance.now(),
      duration: duration ?? 650 + 160 * Math.max(0, Math.abs(to - pos) - 1),
      changed: false,
      dir: to >= previous ? 1 : -1,
      entrance: false
    };
  }
  $('#play').onclick = () => goTo(target + 1);

  function toggleAuto() {
    autoplay = !autoplay;
    $('#auto').setAttribute('aria-pressed', String(autoplay));
    $('#auto').setAttribute('aria-label', autoplay ? 'Pausar carrusel de productos' : 'Reproducir carrusel de productos');
    $('.auto-ring').textContent = autoplay ? 'Ⅱ' : '▶';
    lastInteraction = performance.now();
  }
  $('#auto').onclick = toggleAuto;
  if (reduced) {
    $('#auto').setAttribute('aria-pressed', 'false');
    $('#auto').setAttribute('aria-label', 'Reproducir carrusel de productos');
    $('.auto-ring').textContent = '▶';
  }
  const slots = [
    [0, 0, 430, 0, 0],
    [245, 24, 330, 4, 16],
    [452, 44, 312, 8, 26],
    [660, 80, 296, 12, 34],
    [860, 118, 280, 15, 40]
  ];

  function arcState(j, now) {
    let offset = j - pos,
      a = Math.min(4, Math.abs(offset)),
      lo = Math.floor(a),
      hi = Math.min(4, lo + 1),
      t = a - lo,
      s = slots[lo].map((v, i) => lerp(v, slots[hi][i], t)),
      sign = Math.sign(offset),
      b = reduced ? 0 : Math.sin(now / 4600 * Math.PI * 2 + 1.37 * j),
      hero = $('#sabores').getBoundingClientRect();
    return {
      x: vw / 2 + s[0] * hu * sign * (phone ? 1.02 : 1),
      y: hero.top + (phone ? hero.height * .4 : hero.height / 2 - 78 * u) + s[1] * hu - (reduced ? 0 : (.5 * b + .5) * 9 * hu),
      h: s[2] * hu,
      rz: s[3] * sign + .4 * b,
      ry: s[4] * sign,
      rx: 0,
      z: -Math.abs(offset) * 34 * hu,
      op: 1 - clamp((Math.abs(offset) - 3.3) / .6),
      sx: 1,
      sy: 1,
      shadow: 1
    };
  }

  function blend(a, b, t) {
    const out = {};
    for (const key of Object.keys(a)) out[key] = lerp(a[key], b[key] ?? a[key], t);
    return out;
  }

  function highlight() {
    const links = $$('.navpill a'),
      active = links.find(l => l.classList.contains('active'));
    if (active) {
      $('#navHighlight').style.left = active.offsetLeft + 'px';
      $('#navHighlight').style.width = active.offsetWidth + 'px';
    }
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lastInteraction = performance.now();
    history.pushState(null, '', a.getAttribute('href'));
    target.scrollIntoView({
      behavior: reduced ? 'instant' : 'smooth'
    });
    if (a.classList.contains('skip-link')) {
      $('#catalogueSearch').focus({
        preventScroll: true
      });
    }
  }));
  const observer = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('seen');
  }), {
    threshold: .18
  });
  observer.observe($('#menu'));
  observer.observe($('#paquetes'));
  const arc = $('.arc');
  arc.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    lastInteraction = performance.now();
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      pos0: pos,
      prev: pos,
      time: performance.now(),
      velocity: 0,
      moving: false
    };
  });
  arc.addEventListener('pointermove', e => {
    if (!drag) {
      if (fine) $('#sabores').style.cursor = hit(e.clientX, e.clientY) !== null ? 'pointer' : 'grab';
      return;
    }
    if (e.pointerId !== drag.id) return;
    let dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (!drag.moving && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
      drag = null;
      return;
    }
    if (!drag.moving && Math.abs(dx) > 6) {
      drag.moving = true;
      drag.pos0 = pos;
      slide = null;
      arc.setPointerCapture(e.pointerId);
      document.body.classList.add('dragging');
    }
    if (drag.moving) {
      pos = drag.pos0 - dx / (245 * hu * (phone ? 1.02 : 1));
      let now = performance.now();
      drag.velocity = lerp(drag.velocity, (pos - drag.prev) / Math.max(1, now - drag.time), .4);
      drag.prev = pos;
      drag.time = now;
      lastInteraction = now;
    }
  });

  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    document.body.classList.remove('dragging');
    if (arc.hasPointerCapture(e.pointerId)) arc.releasePointerCapture(e.pointerId);
    if (d.moving) {
      let to = Math.round(pos + clamp(d.velocity * 220, -2, 2));
      goTo(to, Math.max(380, 650 * Math.min(1, Math.abs(to - pos) + .35)));
    } else if (e.type !== 'pointercancel') {
      let j = hit(e.clientX, e.clientY);
      if (j !== null) openFamily(mod(j));
    }
  }
  arc.addEventListener('pointerup', release);
  arc.addEventListener('pointercancel', release);
  addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.body.classList.contains('cart-open')) return;
    if ($('#sabores').getBoundingClientRect().bottom >= vh * .5 && ['ArrowRight', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      goTo(target + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let THREE, renderer, scene, camera, geoFront, geoBack, textures = [],
    bars = [],
    traveller, raycaster, ndc, glReady = false;
  const BH = 2.65;
  let bodyShape, sideGeometry, stickGeometry, woodTexture;
  const geometryCache = {};

  function geometry(back, type = 'paleta') {
    const sh = new THREE.Shape();
    let minY = -.66,
      bodyH = 1.92,
      bodyW = 1;
    if (type === 'boli') {
      minY = -1.22;
      bodyH = 2.44;
      bodyW = .6;
      sh.moveTo(-.2, -1.22);
      sh.lineTo(.2, -1.22);
      sh.lineTo(.3, -1.05);
      sh.lineTo(.3, 1.05);
      sh.lineTo(.2, 1.22);
      sh.lineTo(-.2, 1.22);
      sh.lineTo(-.3, 1.05);
      sh.lineTo(-.3, -1.05);
      sh.closePath();
    } else if (type === 'bag') {
      minY = -1.18;
      bodyH = 2.48;
      bodyW = 1.1;
      sh.moveTo(-.42, -1.18);
      sh.lineTo(.42, -1.18);
      sh.quadraticCurveTo(.58, -1.18, .55, -.9);
      sh.lineTo(.42, .72);
      sh.quadraticCurveTo(.33, .98, .12, 1.1);
      sh.lineTo(.1, 1.22);
      sh.lineTo(.23, 1.3);
      sh.lineTo(-.23, 1.3);
      sh.lineTo(-.1, 1.22);
      sh.lineTo(-.12, 1.1);
      sh.quadraticCurveTo(-.33, .98, -.42, .72);
      sh.lineTo(-.55, -.9);
      sh.quadraticCurveTo(-.58, -1.18, -.42, -1.18);
    } else {
      sh.moveTo(-.39, -.66);
      sh.lineTo(.39, -.66);
      sh.quadraticCurveTo(.5, -.66, .5, -.55);
      sh.lineTo(.5, 1.08);
      sh.quadraticCurveTo(.5, 1.26, .32, 1.26);
      sh.lineTo(-.32, 1.26);
      sh.quadraticCurveTo(-.5, 1.26, -.5, 1.08);
      sh.lineTo(-.5, -.55);
      sh.quadraticCurveTo(-.5, -.66, -.39, -.66);
    }
    bodyShape = sh;
    const g = new THREE.ShapeGeometry(sh, 24),
      pos = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, back ? 1 - (pos.getX(i) + bodyW / 2) / bodyW : (pos.getX(i) + bodyW / 2) / bodyW, (pos.getY(i) - minY) / bodyH);
      pos.setZ(i, back ? -.136 : .136);
    }
    if (back) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i += 3) {
        const tmp = idx[i];
        idx[i] = idx[i + 2];
        idx[i + 2] = tmp;
      }
    }
    g.computeVertexNormals();
    return g;
  }

  function createCutoutGeometry(canvas, aspect, depth) {
    const W = BH * aspect,
      H = BH,
      ctx = canvas.getContext('2d'),
      pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      left = [],
      right = [];
    for (let y = 0; y < canvas.height; y += 4) {
      let l = -1,
        r = -1;
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 160) {
          if (l < 0) l = x;
          r = x;
        }
      }
      if (l >= 0) {
        left.push([(l / canvas.width - .5) * W, (.5 - y / canvas.height) * H]);
        right.push([((r + 1) / canvas.width - .5) * W, (.5 - y / canvas.height) * H]);
      }
    }
    const outline = new THREE.Shape();
    const pts = [...left, ...right.reverse()];
    pts.forEach((p, i) => i ? outline.lineTo(p[0], p[1]) : outline.moveTo(p[0], p[1]));
    outline.closePath();
    const front = new THREE.ShapeGeometry(outline, 1),
      back = front.clone();
    for (const [g, sign] of [
        [front, 1],
        [back, -1]
      ]) {
      const pos = g.attributes.position,
        uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, pos.getX(i) / W + .5, pos.getY(i) / H + .5);
        pos.setZ(i, sign * (depth / 2 + .003));
      }
      if (sign < 0) {
        const idx = g.index.array;
        for (let i = 0; i < idx.length; i += 3) {
          const x = idx[i];
          idx[i] = idx[i + 2];
          idx[i + 2] = x;
        }
      }
      g.computeVertexNormals();
    }
    const side = new THREE.ExtrudeGeometry(outline, {
      depth,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 1
    });
    side.translate(0, 0, -depth / 2);
    return {
      front,
      back,
      side
    };
  }

  function canvasTexture(c) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  function makeBar() {
    const group = new THREE.Group(),
      mat = () => new THREE.MeshPhysicalMaterial({
        roughness: .8,
        metalness: 0,
        clearcoat: .08,
        clearcoatRoughness: .7,
        envMapIntensity: .32
      }),
      front = new THREE.Mesh(geoFront, mat()),
      back = new THREE.Mesh(geoBack, mat()),
      sides = new THREE.Mesh(sideGeometry, mat()),
      stick = new THREE.Mesh(stickGeometry, new THREE.MeshStandardMaterial({
        map: woodTexture,
        roughness: .95
      }));
    stick.position.y = -.97;
    group.add(sides, front, back, stick);
    const cup = new THREE.Group(),
      cupMat = new THREE.MeshStandardMaterial({
        color: '#e9e1d6',
        roughness: .9
      }),
      cupBody = new THREE.Mesh(new THREE.CylinderGeometry(.55, .43, 1.08, 48), cupMat),
      creamMat = new THREE.MeshStandardMaterial({
        color: '#e9e1d6',
        roughness: .95
      }),
      cream = new THREE.Mesh(new THREE.SphereGeometry(.52, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), creamMat),
      rim = new THREE.Mesh(new THREE.TorusGeometry(.55, .018, 8, 64), new THREE.MeshStandardMaterial({
        color: '#fff1e9',
        roughness: .45
      }));
    cupBody.position.y = -.2;
    cream.position.y = .34;
    rim.rotation.x = Math.PI / 2;
    rim.position.y = .34;
    cup.add(cupBody, cream, rim);
    const cookie = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .04, 32), new THREE.MeshStandardMaterial({
      color: '#30242d',
      roughness: 1
    }));
    cookie.position.set(.1, .83, .02);
    cup.add(cookie);
    for (let n = 0; n < 18; n++) {
      const crumb = new THREE.Mesh(new THREE.DodecahedronGeometry(.018 + (n % 3) * .007), cookie.material);
      const a = n * 2.399,
        r = .14 + (n % 4) * .08;
      crumb.position.set(Math.cos(a) * r, .36 + Math.sqrt(Math.max(0, .52 ** 2 - r * r)), Math.sin(a) * r);
      cup.add(crumb);
    }
    cup.scale.setScalar(1.65);
    cup.position.y = -.1;
    cup.visible = false;
    group.add(cup);
    group.rotation.order = 'ZYX';
    scene.add(group);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.04 * BH), new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: .5
    }));
    shadow.renderOrder = -1;
    scene.add(shadow);
    return {
      group,
      front,
      back,
      sides,
      stick,
      cup,
      cupBody,
      cream,
      shadow,
      flavour: -1,
      j: 0
    };
  }

  function applyFamily(bar, i) {
    const f = flavours[i],
      photo = f.type === 'photo',
      g = photo ? f.photoGeometry : geometryCache[f.type === 'cup' ? 'paleta' : f.type];
    bar.front.geometry = g.front;
    bar.back.geometry = g.back;
    bar.sides.geometry = g.side;
    if (!bar.originalFront) {
      bar.originalFront = bar.front.material;
      bar.originalBack = bar.back.material;
      bar.photoFront = new THREE.MeshBasicMaterial({
        transparent: true,
        alphaTest: .5
      });
      bar.photoBack = new THREE.MeshBasicMaterial({
        transparent: true,
        alphaTest: .5
      });
    }
    bar.front.material = photo ? bar.photoFront : bar.originalFront;
    bar.back.material = photo ? bar.photoBack : bar.originalBack;
    bar.front.material.map = textures[i][0];
    bar.back.material.map = textures[i][1];
    if (!photo) {
      bar.front.material.bumpMap = textures[i][0];
      bar.back.material.bumpMap = textures[i][1];
      bar.front.material.bumpScale = bar.back.material.bumpScale = .006;
    }
    bar.front.material.needsUpdate = bar.back.material.needsUpdate = true;
    bar.sides.material.color.set(f.sideColor || f.iceColor || f.color);
    bar.front.visible = bar.back.visible = bar.sides.visible = f.type !== 'cup';
    bar.stick.visible = f.type === 'paleta';
    bar.cup.visible = f.type === 'cup';
    bar.cupBody.material.map = textures[i][0];
    bar.cream.material.map = textures[i][0];
    bar.cupBody.material.needsUpdate = bar.cream.material.needsUpdate = true;
    bar.widthFactor = photo ? f.photoAspect / .475 : 1;
    bar.flavour = i;
  }
  let shadowTexture;

  function setBar(bar, state, i, j) {
    bar.j = j;
    if (bar.flavour !== i) applyFamily(bar, i);
    const s = state,
      h = s.h / BH;
    bar.group.visible = s.op > .01 && s.h > 0;
    bar.shadow.visible = bar.group.visible;
    if (!bar.group.visible) return;
    bar.group.position.set(s.x - vw / 2, vh / 2 - s.y, s.z);
    bar.group.scale.set(h * s.sx, h * s.sy, h);
    bar.group.rotation.set(s.rx * Math.PI / 180, s.ry * Math.PI / 180, -s.rz * Math.PI / 180, 'ZYX');
    bar.front.material.opacity = bar.back.material.opacity = bar.sides.material.opacity = bar.stick.material.opacity = s.op;
    bar.front.material.transparent = bar.back.material.transparent = bar.sides.material.transparent = bar.stick.material.transparent = s.op < 1;
    bar.cup.traverse(o => {
      if (o.isMesh) {
        o.material.transparent = s.op < 1;
        o.material.opacity = s.op;
      }
    });
    bar.shadow.position.set(s.x - vw / 2, vh / 2 - s.y - s.h * .05, s.z - s.h * .32);
    bar.shadow.rotation.z = -s.rz * Math.PI / 180;
    bar.shadow.scale.set(h * (bar.widthFactor || 1) * Math.max(.3, Math.abs(Math.cos(s.ry * Math.PI / 180))), h, 1);
    bar.shadow.material.opacity = .5 * s.op * s.shadow;
  }

  function resizeGL() {
    if (!renderer) return;
    const D = clamp(1500 * Math.min(vw / 1440, vh / 900), 1000, 2200);
    camera.position.set(0, 0, D);
    camera.fov = 2 * Math.atan((vh / 2) / D) * 180 / Math.PI;
    camera.aspect = vw / vh;
    camera.near = 10;
    camera.far = 4 * D;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.75 : 2));
    renderer.setSize(vw, vh, false);
  }
  async function initGL() {
    try {
      [THREE] = await Promise.all([import('three'), Promise.all([document.fonts.load('800 100px Manrope'), document.fonts.load('400 14px "DM Mono"'), document.fonts.load('500 14px "DM Mono"'), document.fonts.load('700 14px "DM Sans"')])]);
      document.body.dataset.fonts = 'loaded';
      const {
        RoomEnvironment
      } = await import('three/addons/environments/RoomEnvironment.js');
      renderer = new THREE.WebGLRenderer({
        canvas: $('#gl'),
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera();
      const pmrem = new THREE.PMREMGenerator(renderer),
        room = new RoomEnvironment();
      scene.environment = pmrem.fromScene(room, .04).texture;
      room.dispose();
      pmrem.dispose();
      scene.add(new THREE.AmbientLight(0xffffff, .8));
      let key = new THREE.DirectionalLight(0xffffff, 1.4);
      key.position.set(-.6, .9, 1.4);
      scene.add(key);
      const brandImage = $('.pinwi-logo');
      await brandImage.decode().catch(() => {});
      textures = await Promise.all(flavours.map(async (f) => {
        const image = new Image();
        image.src = f.image;
        await image.decode();
        const c = document.createElement('canvas');
        c.width = f.type === 'photo' ? Math.round(1024 * f.photoAspect) : 512;
        c.height = 1024;
        const ctx = c.getContext('2d');
        ctx.drawImage(image, ...f.box, 0, 0, c.width, c.height);
        if (f.type === 'photo') {
          f.photoGeometry = createCutoutGeometry(c, f.photoAspect, f.photoDepth);
          f.iceColor = f.sideColor;
          return [canvasTexture(c), canvasTexture(c)];
        }
        if (['boli', 'bag', 'cup'].includes(f.type)) {
          const base = f.type === 'boli' ? '#a9ce39' : f.type === 'bag' ? '#e7caaa' : '#e8ded3';
          ctx.fillStyle = base;
          ctx.fillRect(0, 0, 512, 1024);
          let sheen = ctx.createLinearGradient(0, 0, 512, 0);
          sheen.addColorStop(0, '#00000025');
          sheen.addColorStop(.25, '#ffffff45');
          sheen.addColorStop(.75, '#ffffff00');
          sheen.addColorStop(1, '#00000030');
          ctx.fillStyle = sheen;
          ctx.fillRect(0, 0, 512, 1024);
          for (let n = 0; n < (f.type === 'boli' ? 70 : 500); n++) {
            ctx.fillStyle = f.type === 'boli' ? '#d7ea7350' : (n % 3 ? '#4d302c88' : '#fff9ed90');
            let x = random() * 512,
              y = random() * 1024,
              r = f.type === 'boli' ? 1 + random() * 3 : 2 + random() * 7;
            ctx.beginPath();
            ctx.ellipse(x, y, r, r * .6, random() * 3, 0, Math.PI * 2);
            ctx.fill();
          }
          if (f.type !== 'cup') {
            ctx.fillStyle = '#fffbfd';
            ctx.beginPath();
            ctx.roundRect(68, 340, 376, 340, 35);
            ctx.fill();
            ctx.drawImage(brandImage, 100, 350, 312, 262);
            ctx.fillStyle = '#5d2b42';
            ctx.textAlign = 'center';
            ctx.font = '800 30px Manrope';
            ctx.fillText(f.feature.flavor.toUpperCase(), 256, 652);
            if (f.type === 'boli') {
              ctx.fillStyle = '#eeeea288';
              for (let z = 0; z < 20; z++) {
                ctx.fillRect(z * 28, 0, 8, 60);
                ctx.fillRect(z * 28, 964, 8, 60);
              }
            }
          }
        }
        const pix = ctx.getImageData(250, 500, 1, 1).data;
        f.iceColor = `rgb(${pix[0]},${pix[1]},${pix[2]})`;
        const back = document.createElement('canvas');
        back.width = 512;
        back.height = 1024;
        const bc = back.getContext('2d');
        bc.translate(512, 0);
        bc.scale(-1, 1);
        bc.drawImage(c, 0, 0);
        return [canvasTexture(c), canvasTexture(back)];
      }));
      ['paleta', 'boli', 'bag'].forEach(type => {
        const front = geometry(false, type),
          back = geometry(true, type),
          side = new THREE.ExtrudeGeometry(bodyShape, {
            depth: .2,
            bevelEnabled: true,
            bevelSegments: 5,
            steps: 1,
            bevelSize: .035,
            bevelThickness: .035,
            curveSegments: 24
          });
        side.translate(0, 0, -.1);
        geometryCache[type] = {
          front,
          back,
          side
        };
      });
      geoFront = geometryCache.paleta.front;
      geoBack = geometryCache.paleta.back;
      sideGeometry = geometryCache.paleta.side;
      stickGeometry = new THREE.CapsuleGeometry(.085, .49, 6, 12);
      const wood = document.createElement('canvas');
      wood.width = 64;
      wood.height = 256;
      const wc = wood.getContext('2d');
      wc.fillStyle = '#e8c591';
      wc.fillRect(0, 0, 64, 256);
      for (let i = 0; i < 100; i++) {
        wc.strokeStyle = i % 2 ? '#c59d6030' : '#fff1c330';
        wc.lineWidth = .4;
        wc.beginPath();
        wc.moveTo(random() * 64, 0);
        wc.bezierCurveTo(random() * 64, 80, random() * 64, 180, random() * 64, 256);
        wc.stroke();
      }
      woodTexture = canvasTexture(wood);
      const sc = document.createElement('canvas');
      sc.width = sc.height = 128;
      const ctx = sc.getContext('2d'),
        g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(75,33,64,.45)');
      g.addColorStop(1, 'rgba(75,33,64,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      shadowTexture = new THREE.CanvasTexture(sc);
      const ps = new THREE.Scene();
      ps.environment = scene.environment;
      ps.add(new THREE.AmbientLight(0xffffff, .8));
      const pl = key.clone();
      ps.add(pl);
      const pb = makeBar();
      scene.remove(pb.group, pb.shadow);
      ps.add(pb.group);
      const pc = new THREE.OrthographicCamera(-BH * .475 / 2, BH * .475 / 2, BH / 2, -BH / 2, .1, 20);
      pc.position.z = 6;
      renderer.setPixelRatio(1);
      renderer.setSize(228, 480, false);
      for (let i = 0; i < flavours.length; i++) {
        const aspect = flavours[i].photoAspect || .475;
        renderer.setSize(Math.round(480 * aspect), 480, false);
        pc.left = -BH * aspect / 2;
        pc.right = BH * aspect / 2;
        pc.updateProjectionMatrix();
        applyFamily(pb, i);
        renderer.render(ps, pc);
        flavours[i].snapshot = renderer.domElement.toDataURL('image/png');
      }
      ps.remove(pb.group);
      document.querySelectorAll('.pk[data-flavour]').forEach(el => sprite(el, Number(el.dataset.flavour)));
      bars = Array.from({
        length: 11
      }, makeBar);
      traveller = makeBar();
      raycaster = new THREE.Raycaster();
      ndc = new THREE.Vector2();
      glReady = true;
      document.body.classList.add('gl');
      resizeGL();
    } catch (error) {
      useFallback(error);
    }
    fitTitle();
  }

  function useFallback(error) {
    console.warn('Vista 3D no disponible; se muestran fotografías.', error);
    glReady = false;
    document.body.classList.remove('gl');
    document.body.classList.add('no-gl');
    if (!fallbacks.length) {
      for (let i = 0; i < 11; i++) {
        const el = document.createElement('div');
        el.className = 'spr fallback-bar';
        $('.fallback-arc').append(el);
        fallbacks.push(el);
      }
    }
    updateSprites();
  }
  $('#gl').addEventListener('webglcontextlost', event => {
    event.preventDefault();
    useFallback('WebGL context lost');
  });

  function hit(x, y) {
    if (glReady) {
      ndc.set(x / vw * 2 - 1, -y / vh * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const visible = [...bars, traveller].filter(b => b.group.visible);
      let intersections = raycaster.intersectObjects(visible.flatMap(b => [b.front, b.back]));
      if (intersections.length) {
        const b = visible.find(b => b.front === intersections[0].object || b.back === intersections[0].object);
        return b.j;
      }
    } else {
      for (let j = Math.floor(pos) - 4; j <= Math.floor(pos) + 4; j++) {
        let s = arcState(j, performance.now());
        if (Math.abs(x - s.x) < s.h / BH / 2 && Math.abs(y - s.y) < s.h / 2) return j;
      }
    }
    return null;
  }

  function enterHero() {
    if (entered) return;
    entered = true;
    $('#intro').hidden = true;
    document.body.classList.remove('locked');
    document.body.classList.add('entered');
    lastInteraction = performance.now();
    if (reduced) pos = target = 0;
    else slide = {
      from: -2.6,
      to: 0,
      start: performance.now(),
      duration: 1700,
      changed: true,
      entrance: true
    };
  }
  let introSeen = false;
  try {
    introSeen = sessionStorage.getItem('pinwi.intro-seen') === '1';
    sessionStorage.setItem('pinwi.intro-seen', '1');
  } catch {}
  $('#skip').onclick = enterHero;
  if (reduced || introSeen) enterHero();
  else {
    $('#intro').hidden = false;
    document.body.classList.add('locked');
    setTimeout(() => $('#intro').classList.add('leaving'), 1250);
    setTimeout(enterHero, 1700);
    setTimeout(enterHero, 5000);
  }
  let frameRequest = null,
    previousFrameAt = 0;

  function frame(now) {
    frameRequest = null;
    if (document.hidden) return;
    frameRequest = requestAnimationFrame(frame);
    const interval = phone ? 32 : 15;
    if (now - previousFrameAt < interval) return;
    previousFrameAt = now;
    if (slide) {
      let t = clamp((now - slide.start) / slide.duration);
      pos = lerp(slide.from, slide.to, (slide.entrance ? entrance : glide)(t));
      if (!slide.changed && t >= .12) {
        slide.changed = true;
        if (mod(target) !== selected) changeFlavour(target, slide.dir);
      }
      if (t >= 1) {
        pos = slide.to;
        slide = null;
      }
    }
    if (reveal) {
      let t = clamp((now - reveal.start) / 420),
        cy = phone ? $('#sabores').offsetHeight * .4 : $('#sabores').offsetHeight / 2 - 78 * u,
        cx = vw / 2,
        R = 1.45 * Math.hypot(vw / 2, Math.max(cy, $('#sabores').offsetHeight - cy)),
        r = R * glide(t),
        f = Math.max(60, .35 * r),
        mask = `radial-gradient(circle at ${cx}px ${cy}px,#000 ${Math.max(0,r-f)}px,transparent ${r}px)`;
      $('.reveal').style.maskImage = mask;
      $('.reveal').style.webkitMaskImage = mask;
      if (t >= 1) finishReveal();
    }
    const hr = $('#sabores').getBoundingClientRect(),
      sr = $('#menu').getBoundingClientRect(),
      rr = $('#paquetes').getBoundingClientRect(),
      vr = $('#visitanos').getBoundingClientRect(),
      journey = clamp((vh - sr.top) / (.85 * vh));
    if (phone && journey > 0 && !centered) {
      centered = true;
      const strip = $('.cards'),
        card = cards[selected];
      strip.scrollTo({
        left: card.offsetLeft - (strip.clientWidth - card.clientWidth) / 2,
        behavior: reduced ? 'instant' : 'smooth'
      });
    }
    if (journey === 0) centered = false;
    const cRect = cards[selected].querySelector('.pk').getBoundingClientRect(),
      card = cards[selected],
      A = arcState(target, now),
      C = {
        x: cRect.left + cRect.width / 2,
        y: cRect.top + cRect.height / 2,
        h: cRect.height,
        rz: 0,
        ry: card.tiltX * 14,
        rx: -card.tiltY * 14,
        z: 30,
        op: 1,
        sx: 1,
        sy: 1,
        shadow: .7
      },
      state = journey > 0 ? blend(A, C, sine(journey)) : A;
    if (glReady && (hr.bottom > 0 || sr.bottom > 0) && !document.body.classList.contains('searching-menu')) {
      bars.forEach((bar, i) => {
        const j = Math.floor(pos) - 5 + i,
          s = arcState(j, now);
        s.op *= 1 - clamp(1.6 * journey);
        if (j === target) s.op = 0;
        setBar(bar, s, mod(j), j);
      });
      setBar(traveller, state, selected, target);
      renderer.render(scene, camera);
    } else if (!glReady && fallbacks.length) {
      fallbacks.forEach((el, i) => {
        let j = Math.floor(pos) - 5 + i,
          s = arcState(j, now);
        sprite(el, mod(j));
        el.style.cssText += `;left:${s.x}px;top:${s.y+scrollY}px;width:${s.h/BH}px;height:${s.h}px;rotate:${s.rz}deg;opacity:${s.op*(1-clamp(1.6*journey))}`;
      });
    }
    const active = vr.top < vh * .35 ? 3 : rr.top < vh * .35 ? 2 : sr.top < vh * .35 ? 1 : 0;
    $$('.navpill a').forEach((a, i) => {
      if (a.classList.contains('active') !== (i === active)) {
        a.classList.toggle('active', i === active);
        if (i === active) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
        highlight();
      }
    });
    $('nav').classList.toggle('light', active === 1);
    $('nav').classList.toggle('dark', active >= 2);
    tickPackages(now, rr);
    if (autoplay && entered && !document.body.classList.contains('cart-open') && !drag && !slide && hr.bottom >= vh * .6 && !document.hidden && now - lastInteraction >= 3200) goTo(target + 1);
  }
  updateSprites();
  swapTitle(1, true);
  resize();
  addEventListener('resize', resize);
  document.fonts.ready.then(() => {
    fitTitle();
    highlight();
  });
  initGL();
  frameRequest = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && frameRequest === null) frameRequest = requestAnimationFrame(frame);
  });

  return {
    goToFamily,
    interact() {
      lastInteraction = performance.now();
    }
  };
}
