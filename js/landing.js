/* Landing Studio · runtime (sem dependências)
1) Site: nav, revelação de seções, tour com scroll-spy, alternância de preços.
2) Cenas: mockups de produto que "funcionam sozinhos" (estilo Attio).
Regras que este arquivo garante:
- O HTML estático já é o estado final completo. Sem JS, ou com
prefers-reduced-motion, nada some e nada anima.
- Uma cena só é "armada" (esconde partes para a entrada) quando está fora
da tela, então nunca há piscada.
- Cenas tocam só quando visíveis (≥ 20%), param fora da tela e com a aba
oculta. Só transform/opacity/clip-path; nada de layout em loop.
Para criar uma cena nova: registre recipes.nome = { arm(el), async play(api) }
e use data-scene="nome" no HTML. Veja references/product-scenes.md. */
(() => {
'use strict';
const root = document.documentElement;
const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
const LANG = root.lang || 'pt-BR';
const EN = LANG.startsWith('en');
const t = (pt, en) => (EN ? en : pt);
const ord = (n) => (EN ? n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th') : n + 'º');
const hasIO = 'IntersectionObserver' in window;
root.classList.add('js');
const offscreen = (el) => {
if (!el.getClientRects().length) return true;
const r = el.getBoundingClientRect();
return r.top > window.innerHeight * 0.9 || r.bottom < 0;
};
/* ======================================================================
1. Site
====================================================================== */
function initNav() {
const nav = document.querySelector('[data-nav]');
if (!nav) return;
const hero = document.querySelector('.hero');
const readDark = () =>
getComputedStyle(root).getPropertyValue('--hero-dark').trim() === '1' ||
!!(hero && hero.classList.contains('hero--dark'));
let heroDark = readDark();
let heroUnderNav = !!hero;
const paint = () => {
nav.classList.toggle('is-scrolled', window.scrollY > 4);
nav.classList.toggle('is-on-dark', heroDark && heroUnderNav);
nav.classList.toggle('is-on-hero', heroUnderNav);
};
let ticking = false;
window.addEventListener('scroll', () => {
if (ticking) return;
ticking = true;
requestAnimationFrame(() => { ticking = false; paint(); });
}, { passive: true });
if (hero && hasIO) {
new IntersectionObserver(([e]) => { heroUnderNav = e.isIntersecting; paint(); },
{ rootMargin: `-${nav.offsetHeight}px 0px 0px 0px` }).observe(hero);
}
document.addEventListener('landing:direction', () => { heroDark = readDark(); paint(); });
paint();
const toggle = nav.querySelector('[data-nav-toggle]');
const menu = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
if (!toggle || !menu) return;
const labelOpen = toggle.dataset.labelOpen || 'Abrir menu';
const labelClose = toggle.dataset.labelClose || 'Fechar menu';
let closing = 0;
const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
const setOpen = (open) => {
toggle.setAttribute('aria-expanded', String(open));
toggle.setAttribute('aria-label', open ? labelClose : labelOpen);
nav.classList.toggle('is-open', open);
root.classList.toggle('menu-open', open);
clearTimeout(closing);
if (open) {
menu.hidden = false;
requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
const first = menu.querySelector('a');
if (first) setTimeout(() => first.focus({ preventScroll: true }), 120);
} else {
menu.classList.remove('is-open');
closing = setTimeout(() => { menu.hidden = true; }, RM.matches ? 0 : 560);
}
};
toggle.addEventListener('click', () => setOpen(!isOpen()));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
document.addEventListener('keydown', (e) => {
if (!isOpen()) return;
if (e.key === 'Escape') { setOpen(false); toggle.focus(); return; }
if (e.key !== 'Tab') return;
const items = [toggle, ...menu.querySelectorAll('a')];
const i = items.indexOf(document.activeElement);
if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
});
window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
}
function initReveal() {
if (RM.matches || !hasIO) return;
const io = new IntersectionObserver((entries) => {
for (const e of entries) {
if (!e.isIntersecting) continue;
e.target.classList.add('is-in');
io.unobserve(e.target);
}
}, { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('[data-reveal]').forEach((el) => {
if (!offscreen(el)) return;
el.classList.add('is-armed');
io.observe(el);
});
}
function initTour() {
if (!hasIO) return;
document.querySelectorAll('[data-tour]').forEach((tour) => {
const links = [...tour.querySelectorAll('[data-tour-link]')];
if (!links.length) return;
const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
const setCurrent = (id) => links.forEach((a) => {
if (a === byId.get(id)) a.setAttribute('aria-current', 'true');
else a.removeAttribute('aria-current');
});
const io = new IntersectionObserver((entries) => {
entries.forEach((e) => { if (e.isIntersecting) setCurrent(e.target.id); });
}, { rootMargin: '-40% 0px -55% 0px' });
byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
setCurrent(decodeURIComponent(links[0].hash.slice(1)));
});
}
function initAudience() {
document.querySelectorAll('[data-aud-link]').forEach((a) => {
if (a.dataset.audLink === root.dataset.aud) a.setAttribute('aria-current', 'page');
});
}
function initBilling() {
document.querySelectorAll('[data-billing]').forEach((group) => {
const scope = group.closest('section') || document;
const options = [...group.querySelectorAll('[data-billing-option]')];
options.forEach((btn) => btn.addEventListener('click', () => {
const mode = btn.dataset.billingOption;
options.forEach((o) => o.setAttribute('aria-pressed', String(o === btn)));
scope.querySelectorAll('[data-price-monthly]').forEach((p) => {
p.textContent = mode === 'yearly' ? p.dataset.priceYearly : p.dataset.priceMonthly;
});
scope.querySelectorAll('[data-billing-note]').forEach((n) => { n.hidden = n.dataset.billingNote !== mode; });
}));
});
}
/* ---- efeitos do herói e do painel final (estilo 21st.dev, sem React) ---- */
function initRotator() {
document.querySelectorAll('.rotator[data-words]').forEach((rot) => {
const words = rot.dataset.words.split('|');
const word = rot.querySelector('.rotator__word');
if (!word || words.length < 2 || RM.matches) return;
let k = Math.max(0, words.indexOf(word.textContent.trim()));
const widths = {};
const measure = () => {
if (!rot.getClientRects().length) return; // título da outra versão: mede quando aparecer
const probe = document.createElement('span');
probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
rot.appendChild(probe);
const em = parseFloat(getComputedStyle(rot).fontSize) || 16;
for (const w of words) { probe.textContent = w; widths[w] = (probe.offsetWidth / em + 0.02).toFixed(3); }
probe.remove();
const title = rot.closest('h1');
if (title) {
rot.style.transition = 'none';
title.style.minHeight = '';
let tallest = 0;
for (const w of words) { rot.style.width = `${widths[w]}em`; tallest = Math.max(tallest, title.offsetHeight); }
title.style.minHeight = `${tallest}px`;
void rot.offsetWidth;
rot.style.transition = '';
}
rot.style.width = `${widths[words[k]]}em`;
};
measure();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
let resizing = 0;
addEventListener('resize', () => { clearTimeout(resizing); resizing = setTimeout(measure, 150); });
document.addEventListener('landing:audience', measure);
let visible = true;
if (hasIO) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(rot);
const letters = (w) => {
word.textContent = '';
for (const ch of w) {
const s = document.createElement('span');
s.className = 'rotator__ch';
s.textContent = ch;
word.appendChild(s);
}
return [...word.children];
};
letters(words[k]);
setInterval(() => {
if (document.hidden || !visible || RM.matches || root.classList.contains('is-still')) return;
const ghost = word.cloneNode(true);
ghost.className = 'rotator__word rotator__ghost';
ghost.setAttribute('aria-hidden', 'true');
rot.appendChild(ghost);
const out = [...ghost.children];
out.forEach((c, i) => c.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-0.7em)', opacity: 0 }],
{ duration: 230, delay: i * 10, easing: 'ease-in', fill: 'forwards' }));
setTimeout(() => ghost.remove(), 260 + out.length * 10);
k = (k + 1) % words.length;
rot.style.width = `${widths[words[k]]}em`;
rot.classList.remove('is-swap');
void rot.offsetWidth;
rot.classList.add('is-swap');
letters(words[k]).forEach((c, i) => c.animate([{ transform: 'translateY(0.8em)', opacity: 0 }, { transform: 'none', opacity: 1 }],
{ duration: 520, delay: 140 + i * 24, easing: EASE, fill: 'backwards' }));
}, 2600);
});
}
function initGrain() {
const canvas = document.querySelector('[data-grain]');
const hero = canvas && canvas.closest('.hero');
if (!canvas || !hero) return;
let gl = null;
try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }); } catch (e) { gl = null; }
if (!gl) return;
const vert = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const frag = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
'uniform vec2 r;uniform float t;uniform vec4 b;uniform float l;' +
'float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}' +
'float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}' +
'float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}' +
'void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);float s=t*.07;' +
'float a=fb(p*.8+vec2(s*.5,-s*.3));' +
'float e=fb(p*1.1+vec2(-s*.4,s*.6)+vec2(4.1,1.7)+a*.8);' +
'float k=fb(p*.6+vec2(s*.25,s*.2)+vec2(9.3,6.2)+e*.6);' +
'vec3 c=vec3(.004,.014,.022);' +
'c=mix(c,vec3(.02,.13,.24),smoothstep(.3,.6,k));' +
'c=mix(c,vec3(.02,.46,.52),smoothstep(.36,.6,a)*.9);' +
'c=mix(c,vec3(.12,.8,.82),smoothstep(.42,.64,e)*smoothstep(.32,.58,a));' +
'float v=1.-smoothstep(.35,1.05,length((uv-.5)*vec2(1.15,1.35)));c*=mix(.25,1.,v);' +
'float d=length((uv-b.xy)/b.zw);c*=mix(.55,1.,smoothstep(.6,1.4,d));' +
'vec3 L=vec3(.985,.995,1.);' +
'L=mix(L,vec3(.84,.9,.99),smoothstep(.3,.6,k)*.7);' +
'L=mix(L,vec3(.72,.95,.96),smoothstep(.36,.6,a)*.85);' +
'L=mix(L,vec3(.45,.87,.89),smoothstep(.42,.64,e)*smoothstep(.32,.58,a)*.8);' +
'L=mix(L,vec3(.985,.995,1.),(1.-smoothstep(.6,1.4,d))*.75);' +
'c=mix(c,L,l);' +
'c+=(h(gl_FragCoord.xy+fract(t)*vec2(17.,31.))-.5)*.012;' +
'gl_FragColor=vec4(c,1.);}';
const shader = (type, src) => {
const sh = gl.createShader(type);
gl.shaderSource(sh, src);
gl.compileShader(sh);
return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
};
const vs = shader(gl.VERTEX_SHADER, vert);
const fs = shader(gl.FRAGMENT_SHADER, frag);
if (!vs || !fs) return;
const prog = gl.createProgram();
gl.attachShader(prog, vs);
gl.attachShader(prog, fs);
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
gl.useProgram(prog);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(prog, 'p');
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
const uR = gl.getUniformLocation(prog, 'r');
const uT = gl.getUniformLocation(prog, 't');
const uB = gl.getUniformLocation(prog, 'b');
gl.uniform1f(gl.getUniformLocation(prog, 'l'), root.dataset.hero === 'light' ? 1 : 0);
const inner = hero.querySelector('.hero__inner');
const size = () => {
const w = Math.max(1, Math.round(hero.clientWidth * 0.5));
const h = Math.max(1, Math.round(hero.clientHeight * 0.5));
if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
gl.viewport(0, 0, w, h);
gl.uniform2f(uR, w, h);
const hr = hero.getBoundingClientRect();
const ir = inner ? inner.getBoundingClientRect() : hr;
const cy = 1 - (ir.top - hr.top + ir.height / 2) / hr.height;
gl.uniform4f(uB, 0.5, cy, Math.max(0.2, (ir.width * 0.42) / hr.width), Math.max(0.08, (ir.height * 0.62) / hr.height));
};
const draw = (sec) => { gl.uniform1f(uT, sec); gl.drawArrays(gl.TRIANGLES, 0, 3); };
size();
draw(12);
hero.classList.add('has-grain');
if (RM.matches) { addEventListener('resize', () => { size(); draw(12); }); return; }
let visible = true;
let raf = 0;
let last = 0;
let clock = 12;
const running = () => visible && !document.hidden && !root.classList.contains('is-still');
const loop = (now) => {
raf = 0;
if (!running()) return;
if (now - last >= 33) {
clock += Math.min(now - last, 100) / 1000;
last = now;
draw(clock);
}
raf = requestAnimationFrame(loop);
};
const kick = () => { if (!raf && running()) { last = performance.now(); raf = requestAnimationFrame(loop); } };
if (hasIO) new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(hero);
document.addEventListener('visibilitychange', kick);
document.addEventListener('landing:still', kick);
let resizing = 0;
addEventListener('resize', () => { clearTimeout(resizing); resizing = setTimeout(() => { size(); draw(clock); }, 120); });
canvas.addEventListener('webglcontextlost', () => { visible = false; hero.classList.remove('has-grain'); });
kick();
}
function initTrail() {
const sec = document.querySelector('[data-trail]');
const stage = sec && sec.querySelector('.trail__stage');
const tpl = sec && sec.querySelector('template[data-trail-items]');
if (sec) sec.querySelectorAll('.trail__row').forEach((row) => row.append(row.firstElementChild.cloneNode(true)));
if (!stage || !tpl || RM.matches) return;
const items = [...tpl.content.children];
if (!items.length) return;
let k = 0;
let lx = -999;
let ly = -999;
let visible = false;
let lastPointer = 0;
let raf = 0;
let t0 = 0;
let warmed = false;
const warm = () => {
if (warmed) return;
warmed = true;
tpl.content.querySelectorAll('img').forEach((img) => { const i = new Image(); i.src = img.getAttribute('src'); });
};
const spawn = (x, y) => {
const node = items[k++ % items.length].cloneNode(true);
const rot = (Math.random() * 12 - 6).toFixed(1);
node.style.left = x + 'px';
node.style.top = y + 'px';
stage.appendChild(node);
node.animate([
{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.5) rotate(' + rot * 2 + 'deg)' },
{ opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(' + rot + 'deg)' },
], { duration: 460, easing: EASE, fill: 'forwards' });
setTimeout(() => {
const out = node.animate([
{ opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(' + rot + 'deg)' },
{ opacity: 0, transform: 'translate(-50%, -30%) scale(0.78) rotate(' + rot + 'deg)' },
], { duration: 640, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
out.finished.then(() => node.remove(), () => node.remove());
}, 1050);
while (stage.children.length > 12) stage.firstElementChild.remove();
};
const maybeSpawn = (x, y, gap) => {
if (Math.hypot(x - lx, y - ly) < gap) return;
lx = x;
ly = y;
spawn(x, y);
};
const fine = window.matchMedia('(pointer: fine)').matches;
if (fine) {
sec.addEventListener('pointermove', (e) => {
if (root.classList.contains('is-still')) return;
const r = sec.getBoundingClientRect();
lastPointer = performance.now();
maybeSpawn(e.clientX - r.left, e.clientY - r.top, 90);
});
}
const auto = (now) => {
raf = 0;
if (!visible || document.hidden || root.classList.contains('is-still')) return;
if (!fine || now - lastPointer > 2600) {
const w = sec.clientWidth;
const h = sec.clientHeight;
const t = (now - t0) / 1000;
const x = w * (fine ? 0.62 : 0.55) + Math.sin(t * 0.8) * w * (fine ? 0.28 : 0.3);
const y = h * 0.36 + Math.sin(t * 1.6) * h * 0.2;
maybeSpawn(x, y, fine ? 150 : 110);
}
raf = requestAnimationFrame(auto);
};
const kick = () => { if (!raf && visible) raf = requestAnimationFrame(auto); };
if (hasIO) {
new IntersectionObserver(([e]) => {
visible = e.isIntersecting;
if (visible) { warm(); if (!t0) t0 = performance.now(); kick(); }
}, { rootMargin: '200px 0px' }).observe(sec);
}
document.addEventListener('visibilitychange', kick);
document.addEventListener('landing:still', kick);
}
function splitWords(el) {
let i = 0;
const walk = (node) => {
for (const child of [...node.childNodes]) {
if (child.nodeType === 3) {
const frag = document.createDocumentFragment();
for (const part of child.textContent.split(/(\s+)/)) {
if (!part) continue;
if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
const w = document.createElement('span');
w.className = 'w';
w.style.setProperty('--i', String(i++));
w.textContent = part;
frag.appendChild(w);
}
child.replaceWith(frag);
} else if (child.nodeType === 1 && child.tagName !== 'SUB') {
walk(child);
}
}
};
walk(el);
}
function initWords() {
if (RM.matches || !hasIO) return;
const io = new IntersectionObserver((entries) => {
for (const e of entries) {
if (!e.isIntersecting) continue;
e.target.classList.add('is-in');
io.unobserve(e.target);
}
}, { rootMargin: '0px 0px -12% 0px' });
document.querySelectorAll('[data-words]:not(.rotator)').forEach((el) => {
if (!offscreen(el)) return;
splitWords(el);
el.classList.add('is-armed');
io.observe(el);
});
}
function initHero3D() {
const stage = document.querySelector('.phones');
if (!stage || RM.matches) return;
const hero = stage.closest('.hero');
let sp = 1;
let rx = 0;
let ry = 0;
let tx = 0;
let ty = 0;
let raf = 0;
const target = () => {
const r = stage.getBoundingClientRect();
const p = 1 - (r.top - innerHeight * 0.3) / (innerHeight * 0.55);
return Math.min(1, Math.max(0, p));
};
const paint = () => {
stage.style.setProperty('--sp', sp.toFixed(4));
stage.style.setProperty('--rx', `${rx.toFixed(3)}deg`);
stage.style.setProperty('--ry', `${ry.toFixed(3)}deg`);
};
const tick = () => {
raf = 0;
const t = target();
sp += (t - sp) * 0.12;
rx += (tx - rx) * 0.08;
ry += (ty - ry) * 0.08;
paint();
if (Math.abs(t - sp) > 0.0008 || Math.abs(tx - rx) > 0.01 || Math.abs(ty - ry) > 0.01) raf = requestAnimationFrame(tick);
};
const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
sp = target();
paint();
addEventListener('scroll', kick, { passive: true });
addEventListener('resize', kick);
if (hero && window.matchMedia('(pointer: fine)').matches) {
hero.addEventListener('pointermove', (e) => {
const r = stage.getBoundingClientRect();
ty = ((e.clientX - (r.left + r.width / 2)) / r.width) * 7;
tx = -((e.clientY - (r.top + r.height / 3)) / innerHeight) * 5;
kick();
});
hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
}
}
function initMagnetic() {
if (RM.matches || !window.matchMedia('(pointer: fine)').matches) return;
document.querySelectorAll('.btn--lg, .nav .btn--primary').forEach((btn) => {
let x = 0;
let y = 0;
let tx = 0;
let ty = 0;
let raf = 0;
const tick = () => {
raf = 0;
x += (tx - x) * 0.2;
y += (ty - y) * 0.2;
btn.style.setProperty('--mx', `${x.toFixed(2)}px`);
btn.style.setProperty('--my', `${y.toFixed(2)}px`);
if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) raf = requestAnimationFrame(tick);
};
const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
btn.addEventListener('pointermove', (e) => {
const r = btn.getBoundingClientRect();
tx = (e.clientX - r.left - r.width / 2) * 0.2;
ty = (e.clientY - r.top - r.height / 2) * 0.3;
kick();
});
btn.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
});
}
function initSpotlight() {
if (!window.matchMedia('(pointer: fine)').matches) return;
document.querySelectorAll('.bento__cell').forEach((cell) => {
cell.addEventListener('pointermove', (e) => {
const r = cell.getBoundingClientRect();
cell.style.setProperty('--x', `${Math.round(e.clientX - r.left)}px`);
cell.style.setProperty('--y', `${Math.round(e.clientY - r.top)}px`);
});
});
}
function initStill() {
const btn = document.querySelector('[data-still]');
if (!btn || RM.matches) return;
const icon = btn.querySelector('use');
const set = (still, save) => {
root.classList.toggle('is-still', still);
btn.setAttribute('aria-pressed', String(still));
const text = still ? t('Retomar animações', 'Resume animations') : t('Pausar animações', 'Pause animations');
btn.setAttribute('aria-label', text);
btn.title = text;
if (icon) icon.setAttribute('href', still ? '#i-play' : '#i-pause');
document.dispatchEvent(new CustomEvent('landing:still'));
if (save) { try { localStorage.setItem('gtg-landing-still', still ? '1' : '0'); } catch (e) { /* sem armazenamento */ } }
};
let saved = false;
try { saved = localStorage.getItem('gtg-landing-still') === '1'; } catch (e) { /* sem armazenamento */ }
btn.hidden = false;
if (saved) set(true, false);
btn.addEventListener('click', () => set(!root.classList.contains('is-still'), true));
}
/* ======================================================================
2. Motor de cenas
====================================================================== */
class Stop extends Error {}
const recipes = Object.create(null);
const EASE = 'cubic-bezier(.16,1,.3,1)';
function makeApi(signal, el, state) {
const check = () => { if (signal.aborted) throw new Stop(); };
const wait = (ms) => new Promise((resolve, reject) => {
if (signal.aborted) { reject(new Stop()); return; }
const onAbort = () => { clearTimeout(t); reject(new Stop()); };
const t = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
signal.addEventListener('abort', onAbort, { once: true });
});
const frame = () => new Promise((resolve, reject) => {
requestAnimationFrame(() => (signal.aborted ? reject(new Stop()) : resolve()));
});
return { el, state, signal, check, wait, frame, entrance: false };
}
/* ---- números ---- */
const fmtCache = new Map();
function formatNumber(n, node) {
const d = node.dataset;
const kind = d.format || 'int';
const dec = d.decimals != null ? Number(d.decimals) : (kind === 'percent' || kind === 'decimal' ? 1 : 0);
const key = `${kind}|${dec}|${d.currency || ''}`;
let f = fmtCache.get(key);
if (!f) {
const o = { minimumFractionDigits: dec, maximumFractionDigits: dec };
if (kind === 'currency') Object.assign(o, { style: 'currency', currency: d.currency || 'BRL' });
if (kind === 'percent') o.style = 'percent';
if (kind === 'compact') Object.assign(o, { notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: dec || 1 });
f = new Intl.NumberFormat(LANG, o);
fmtCache.set(key, f);
}
return (d.prefix || '') + f.format(kind === 'percent' ? n / 100 : n) + (d.suffix || '');
}
function countTo(api, node, to, ms = 1400, from = 0) {
return new Promise((resolve, reject) => {
const t0 = performance.now();
const tick = (t) => {
if (api.signal.aborted) { reject(new Stop()); return; }
const p = Math.min(1, (t - t0) / ms);
node.textContent = formatNumber(p === 1 ? to : from + (to - from) * (1 - Math.pow(1 - p, 3)), node);
if (p < 1) requestAnimationFrame(tick); else resolve();
};
requestAnimationFrame(tick);
});
}
/* ---- movimento ---- */
function appear(node, y = -6, duration = 440) {
return node.animate(
[{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }],
{ duration, easing: EASE, fill: 'backwards' }
);
}
function flip(api, nodes, mutate, duration = 560) {
const first = new Map(nodes.map((n) => [n, n.getBoundingClientRect()]));
mutate();
const last = new Map();
const anims = [];
first.forEach((a, n) => {
if (!n.isConnected) return;
const b = n.getBoundingClientRect();
last.set(n, b);
const dx = a.left - b.left;
const dy = a.top - b.top;
if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
anims.push(n.animate(
[{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
{ duration, easing: EASE }
));
});
const finished = Promise.all(anims.map((x) => x.finished.catch(() => {}))).then(() => api.check());
return { last, finished };
}
async function enter(api, nodes, stagger = 60) {
for (const n of nodes) {
n.classList.add('is-in');
await api.wait(stagger);
}
}
/* ---- palco: cursor e toasts vivem no .app mais próximo ---- */
const stageOf = (el) => el.closest('.app') || el;
function aim(api, rect) {
const stage = stageOf(api.el);
const cur = stage.querySelector('.cursor');
if (!cur || !rect) return false;
const s = stage.getBoundingClientRect();
if (!cur.classList.contains('is-on')) {
cur.style.transition = 'none';
cur.style.transform = `translate(${(s.width * 0.78).toFixed(1)}px, ${(s.height * 0.92).toFixed(1)}px)`;
void cur.offsetWidth;
cur.style.transition = '';
cur.classList.add('is-on');
}
const x = rect.left - s.left + Math.min(rect.width / 2, 28);
const y = rect.top - s.top + rect.height / 2;
cur.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
return true;
}
async function cursorTo(api, target, click = true) {
if (!target || !aim(api, target.getBoundingClientRect())) return;
await api.wait(900);
if (!click) return;
const cur = stageOf(api.el).querySelector('.cursor');
cur.classList.add('is-click');
await api.wait(180);
cur.classList.remove('is-click');
}
const TOAST_ICON = { ok: 'i-check', info: 'i-bell', violet: 'i-sparkle', warn: 'i-clock' };
function toast(api, source) {
const text = source.dataset.toast;
if (!text) return;
const tone = source.dataset.toastTone || 'ok';
const stage = stageOf(api.el);
let box = stage.querySelector('.toasts');
if (!box) {
box = document.createElement('div');
box.className = 'toasts';
stage.appendChild(box);
}
const t = document.createElement('div');
t.className = 'toast';
t.innerHTML =
`<span class="toast__icon toast__icon--${tone}"><svg class="i" aria-hidden="true"><use href="#${TOAST_ICON[tone] || TOAST_ICON.ok}"/></svg></span>` +
'<span><b class="toast__title"></b> <span class="toast__text"></span><br><span class="toast__time"></span></span>';
t.querySelector('.toast__title').textContent = source.dataset.toastTitle || '';
t.querySelector('.toast__text').textContent = text;
t.querySelector('.toast__time').textContent = stage.dataset.toastTime || 'agora';
box.appendChild(t);
while (box.children.length > 2) box.firstElementChild.remove();
requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('is-shown')));
api.wait(3400)
.then(() => { t.classList.remove('is-shown'); return api.wait(500); })
.then(() => t.remove())
.catch(() => {});
}
/* ---- blocos reutilizáveis ---- */
function applySwap(tag) {
const [tone, label] = tag.dataset.swap.split('|');
tag.classList.forEach((c) => { if (c.startsWith('tag--')) tag.classList.remove(c); });
tag.classList.add(`tag--${tone}`, 'is-swapping');
tag.textContent = label;
tag.setAttribute('data-swapped', '');
}
function bump(api, scope) {
scope.querySelectorAll('[data-bump]').forEach((k) => {
const from = Number(k.dataset.count);
const to = from + Number(k.dataset.bump);
k.dataset.count = String(to);
countTo(api, k, to, 700, from).catch(() => {});
});
}
async function insertFromQueue(api) {
const { el, state } = api;
const list = el.querySelector('[data-rows]');
const tpl = el.querySelector('template[data-queue]');
if (!list || !tpl || !tpl.content.children.length) return;
const items = tpl.content.children;
state.q = ((state.q ?? -1) + 1) % items.length;
const node = items[state.q].cloneNode(true);
const max = Number(list.dataset.max) || list.children.length;
const { finished } = flip(api, [...list.children], () => {
list.prepend(node);
appear(node, -10, 520);
}, 520);
node.classList.add('is-highlight');
toast(api, node);
bump(api, el);
await finished;
while (list.children.length > max) list.lastElementChild.remove();
await api.wait(1600);
node.classList.remove('is-highlight');
}
/* ======================================================================
Receitas de cena
====================================================================== */
const zeroCounters = (el) => el.querySelectorAll('[data-count]').forEach((n) => { n.textContent = formatNumber(0, n); });
recipes.queue = {
async play(api) {
if (api.entrance) {
await enter(api, [...api.el.querySelectorAll('[data-enter]')], 70);
api.el.classList.remove('is-armed');
}
await api.wait(Number(api.el.dataset.interval) || 2600);
await insertFromQueue(api);
},
};
recipes.counters = {
arm: zeroCounters,
async play(api) {
if (!api.entrance) return;
await Promise.all([...api.el.querySelectorAll('[data-count]')]
.map((n) => countTo(api, n, Number(n.dataset.count), 1800)));
api.el.classList.remove('is-armed');
},
};
/* ---- receitas do GoTeamGo ----
O HTML traz o estado final (o que aparece sem JS ou com movimento reduzido).
arm() volta a cena para o "antes" usando data-before; play() anda até o final. */
function swapBefore(el) {
el.querySelectorAll('[data-before]').forEach((n) => {
if (n.dataset.after == null) n.dataset.after = n.textContent;
n.textContent = n.dataset.before;
});
}
function swapAfter(el) {
el.querySelectorAll('[data-before]').forEach((n) => {
if (n.dataset.after == null) return;
n.textContent = n.dataset.after;
n.classList.remove('is-pop');
void n.offsetWidth;
n.classList.add('is-pop');
});
}
recipes.ranking = {
reset: 'fade',
arm(el) {
swapBefore(el);
const row = el.querySelector('[data-climb]');
if (!row) return;
if (row.nextElementSibling) row.nextElementSibling.after(row);
const pts = row.querySelector('[data-from]');
const mirror = el.querySelector('[data-pts-mirror]');
if (pts) pts.textContent = formatNumber(Number(pts.dataset.from), pts);
if (pts && mirror) mirror.textContent = pts.textContent;
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
await api.wait(1100);
const row = el.querySelector('[data-climb]');
const pts = row && row.querySelector('[data-from]');
if (!row || !pts) return;
toast(api, row);
const from = Number(pts.dataset.from);
const to = Number(pts.dataset.count);
const mirror = el.querySelector('[data-pts-mirror]');
await Promise.all([countTo(api, pts, to, 1100, from), mirror ? countTo(api, mirror, to, 1100, from) : null]);
await api.wait(350);
const prev = row.previousElementSibling;
if (prev) await flip(api, [...row.parentElement.children], () => prev.before(row), 700).finished;
swapAfter(el);
await api.wait(3400);
},
};
recipes.queuecall = {
reset: 'fade',
arm(el) {
swapBefore(el);
el.querySelectorAll('[data-arrive]').forEach((n) => { n.hidden = true; });
const pq = el.querySelector('[data-state]');
if (pq) pq.dataset.state = 'before';
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
await api.wait(900);
const btn = el.querySelector('[data-call]');
await cursorTo(api, btn);
if (btn) {
btn.classList.add('is-press');
await api.wait(160);
btn.classList.remove('is-press');
}
swapAfter(el);
el.querySelectorAll('[data-arrive]').forEach((n) => {
n.hidden = false;
n.classList.add('is-highlight');
appear(n, -8, 480);
});
await api.wait(700);
const push = el.querySelector('[data-push]');
if (push) push.classList.add('is-shown');
await api.wait(900);
const pq = el.querySelector('[data-state]');
if (pq) {
pq.dataset.state = 'after';
const card = pq.querySelector('[data-show="after"]');
if (card) appear(card, 10, 520);
}
await api.wait(2400);
if (push) push.classList.remove('is-shown');
await api.wait(2600);
},
};
recipes.quiz = {
reset: 'fade',
arm(el) {
el.dataset.qz = 'play';
const q = (s) => el.querySelector(s);
if (q('[data-qz-time]')) q('[data-qz-time]').textContent = '20';
if (q('[data-qz-secs]')) q('[data-qz-secs]').textContent = '20 s';
if (q('[data-qz-answers]')) q('[data-qz-answers]').textContent = '0';
q('.qz-timer')?.style.setProperty('--p', '1');
q('.qz-bar')?.style.setProperty('--p', '1');
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
const q = (s) => el.querySelector(s);
const time = q('[data-qz-time]'), secs = q('[data-qz-secs]'), answers = q('[data-qz-answers]');
const ring = q('.qz-timer'), bar = q('.qz-bar');
let s = 20;
const tick = (a) => {
s -= 1;
time.textContent = String(s);
secs.textContent = `${s} s`;
ring.style.setProperty('--p', String(s / 20));
bar.style.setProperty('--p', String(s / 20));
if (a != null) answers.textContent = String(a);
};
await api.wait(700);
for (const a of [1, 2, 3, 5, 5, 6]) { await api.wait(560); tick(a); }
const btn = q('.qz-btn.qz-b');
await cursorTo(api, btn);
await press(api, btn);
el.dataset.qz = 'sent';
const sent = q('[data-show="sent"]');
if (sent) appear(sent, 8, 380);
for (const a of [7, 8]) { await api.wait(620); tick(a); }
await api.wait(500);
delete el.dataset.qz;
const res = q('[data-show="reveal"]');
if (res) appear(res, 10, 480);
const gain = q('[data-qz-gain]');
if (gain) await countTo(api, gain, 850, 1100);
await api.wait(3600);
},
};
recipes.missao = {
reset: 'fade',
arm(el) {
el.querySelector('[data-pick]')?.classList.remove('is-on');
const fb = el.querySelector('[data-fb]');
if (fb) fb.hidden = true;
swapBefore(el);
const r = el.querySelector('[data-ms-r]');
if (r) r.dataset.state = 'before';
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
await api.wait(900);
const pick = el.querySelector('[data-pick]');
await cursorTo(api, pick);
pick.classList.add('is-on');
await api.wait(500);
const btn = el.querySelector('[data-ms-btn]');
await cursorTo(api, btn);
await press(api, btn);
const fb = el.querySelector('[data-fb]');
fb.hidden = false;
appear(fb, 6, 420);
swapAfter(el);
await api.wait(1300);
const r = el.querySelector('[data-ms-r]');
r.dataset.state = 'after';
const body = r.querySelector('.ph-body[data-show="after"]');
if (body) appear(body, 10, 520);
const score = r.querySelector('[data-ms-score]');
if (score) await countTo(api, score, 80, 1000);
await api.wait(3800);
},
};
recipes.winphone = {
reset: 'fade',
arm(el) {
const p = el.querySelector('[data-win-phone]');
if (p) p.dataset.state = 'before';
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
await api.wait(4600);
const p = el.querySelector('[data-win-phone]');
p.dataset.state = 'after';
const won = p.querySelector('[data-show="after"]');
if (won) appear(won, 12, 560);
const sheet = p.querySelector('.sx-sheet');
if (sheet) sheet.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 640, delay: 450, easing: EASE, fill: 'backwards' });
await api.wait(3200);
},
};
recipes.draw = {
reset: 'fade',
arm(el) {
const reel = el.querySelector('[data-reel]');
if (reel) reel.textContent = reel.dataset.reel.split('|')[0];
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
const reel = el.querySelector('[data-reel]');
if (!reel) return;
const names = reel.dataset.reel.split('|');
const winner = names[names.length - 1];
await api.wait(700);
let delay = 70;
for (let k = 0; k < 18; k++) {
reel.textContent = names[k % (names.length - 1)];
reel.animate([{ transform: 'translateY(-55%)', opacity: 0.25 }, { transform: 'none', opacity: 1 }], { duration: Math.min(delay, 220), easing: 'ease-out' });
await api.wait(delay);
delay = Math.round(delay * 1.12);
}
reel.textContent = winner;
reel.animate([{ transform: 'scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: EASE });
el.classList.remove('is-armed');
const win = el.querySelector('[data-win]');
if (win) win.classList.add('is-on');
await api.wait(3600);
},
};
recipes.feed = {
async play(api) {
await api.wait(1400);
const like = api.el.querySelector('.fd-post [data-like]:not(.is-liked)');
const count = like && like.querySelector('b');
if (like) {
like.classList.add('is-liked', 'is-pop');
if (count) count.textContent = String(Number(count.textContent) + 1);
await api.wait(1500);
}
await insertFromQueue(api);
await api.wait(1200);
},
};
recipes.post = {
reset: 'fade',
arm(el) {
el.querySelectorAll('[data-fill]').forEach((n) => { n.hidden = true; });
el.querySelectorAll('[data-empty]').forEach((n) => { n.hidden = false; });
const ai = el.querySelector('[data-ai]');
if (ai) { ai.className = 'tag tag--info'; ai.textContent = t('Processando', 'Processing'); }
const row = el.querySelector('.mod-row.is-new');
if (row) row.hidden = true;
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
const fill = (name) => {
const empty = el.querySelector(`[data-empty="${name}"]`);
const full = el.querySelector(`[data-fill="${name}"]`);
if (empty) empty.hidden = true;
if (full) { full.hidden = false; appear(full, 6, 420); }
};
await api.wait(700);
for (const name of ['photo', 'strava']) {
await cursorTo(api, el.querySelector(`[data-empty="${name}"]`));
fill(name);
await api.wait(650);
}
fill('act');
await api.wait(250);
fill('pts');
await api.wait(700);
const btn = el.querySelector('[data-post-btn]');
if (btn) {
await cursorTo(api, btn);
const label = btn.textContent;
btn.classList.add('is-press');
btn.textContent = t('Enviando imagens...', 'Uploading images...');
await api.wait(1100);
btn.classList.remove('is-press');
btn.textContent = label;
}
const row = el.querySelector('.mod-row.is-new');
if (row) { row.hidden = false; row.classList.add('is-highlight'); appear(row, -8, 480); }
const sheet = el.querySelector('[data-sheet]');
if (sheet) sheet.classList.add('is-shown');
await api.wait(1500);
const ai = el.querySelector('[data-ai]');
if (ai) { ai.dataset.swap = 'ai|Aprovado pela IA'; applySwap(ai); }
await api.wait(3400);
},
};
recipes.esg = {
reset: 'fade',
arm: zeroCounters,
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(3000); return; }
await api.frame();
el.classList.remove('is-armed');
await Promise.all([...el.querySelectorAll('[data-count]')].map((n) => countTo(api, n, Number(n.dataset.count), 1700)));
await api.wait(5600);
},
};
/* ---- cenas da versão "Para você" ---- */
async function press(api, node) {
if (!node) return;
node.classList.add('is-press');
await api.wait(160);
node.classList.remove('is-press');
}
recipes.challenge = {
reset: 'fade',
arm(el) {
const sheet = el.querySelector('[data-sheet]');
if (sheet) sheet.classList.remove('is-shown');
el.querySelectorAll('.cp-choice').forEach((c) => c.classList.remove('is-picked'));
const pay = el.querySelector('[data-pay-state]');
if (pay) pay.dataset.payState = 'before';
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
await api.wait(900);
const solo = el.querySelector('[data-solo]');
await cursorTo(api, solo);
await press(api, solo);
const sheet = el.querySelector('[data-sheet]');
if (sheet) sheet.classList.add('is-shown');
await api.wait(1300);
const paid = el.querySelector('[data-pay]');
await cursorTo(api, paid);
if (paid) paid.classList.add('is-picked');
await api.wait(1000);
const copy = el.querySelector('[data-copy]');
await cursorTo(api, copy);
await press(api, copy);
const copied = el.querySelector('[data-copied]');
if (copied) copied.classList.add('is-shown');
await api.wait(1700);
if (copied) copied.classList.remove('is-shown');
const pay = el.querySelector('[data-pay-state]');
if (pay) {
pay.dataset.payState = 'after';
const ok = pay.querySelector('.pay-ok');
if (ok) appear(ok, 10, 520);
}
await api.wait(3800);
},
};
const PILL = { pending: ['is-pending', t('Aguardando aceite', 'Waiting for acceptance')], accepted: ['is-accepted', t('Em andamento', 'In progress')], finished: ['is-finished', t('Finalizado', 'Finished')] };
function setPill(el, k) {
const p = el.querySelector('[data-pill]');
if (!p) return;
p.classList.remove('is-pending', 'is-accepted', 'is-finished', 'is-pop');
p.classList.add(PILL[k][0]);
p.textContent = PILL[k][1];
void p.offsetWidth;
p.classList.add('is-pop');
}
recipes.duel = {
reset: 'fade',
arm(el) {
const body = el.querySelector('[data-x1]');
if (body) body.dataset.x1 = 'wait';
setPill(el, 'pending');
el.querySelectorAll('.x1-choice').forEach((c) => c.classList.remove('is-picked'));
const pts = el.querySelector('[data-pts]');
if (pts) { pts.dataset.count = '420'; pts.textContent = '420'; }
const pct = el.querySelector('[data-pct]');
if (pct) pct.textContent = '80%';
const bar = el.querySelector('[data-bar]');
if (bar) bar.style.setProperty('--p', '0.8');
const next = el.querySelector('[data-next]');
if (next) next.textContent = t('Próximo nível em 30 pts', 'Next level in 30 pts');
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
const body = el.querySelector('[data-x1]');
await api.wait(900);
const accept = el.querySelector('[data-accept]');
await cursorTo(api, accept);
await press(api, accept);
setPill(el, 'accepted');
if (body) { body.dataset.x1 = 'play'; const c = body.querySelector('[data-show="play"]'); if (c) appear(c, 8, 460); }
await api.wait(1100);
const winner = el.querySelector('[data-winner]');
await cursorTo(api, winner);
if (winner) winner.classList.add('is-picked');
await api.wait(800);
if (body) { body.dataset.x1 = 'after'; const c = body.querySelector('[data-show="after"]'); if (c) appear(c, 8, 460); }
setPill(el, 'finished');
await api.wait(700);
const pts = el.querySelector('[data-pts]');
if (pts) { pts.dataset.count = '445'; countTo(api, pts, 445, 900, 420).catch(() => {}); }
const pct = el.querySelector('[data-pct]');
if (pct) pct.textContent = '97%';
const bar = el.querySelector('[data-bar]');
if (bar) bar.style.setProperty('--p', '0.97');
const next = el.querySelector('[data-next]');
if (next) next.textContent = t('Próximo nível em 5 pts', 'Next level in 5 pts');
await api.wait(4200);
},
};
recipes.bracket = {
reset: 'fade',
arm(el) {
el.querySelectorAll('.tr-p').forEach((p) => {
p.classList.remove('is-adv', 'is-out');
p.classList.add(p.dataset.slot ? 'is-wait' : 'is-pend');
});
const champ = el.querySelector('[data-champ]');
if (champ) champ.classList.add('is-wait');
const st = el.querySelector('[data-st]');
if (st) { st.classList.remove('is-done'); st.textContent = t('Em andamento', 'In progress'); }
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
const tree = el.querySelector('[data-tree]');
const resolve = (r) => el.querySelectorAll(`.tr-p[data-r="${r}"]`).forEach((p) => {
p.classList.remove('is-pend', 'is-wait');
p.classList.add(p.dataset.res === 'adv' ? 'is-adv' : 'is-out');
});
const fill = (slot) => {
const p = el.querySelector(`.tr-p[data-slot="${slot}"]`);
if (!p) return;
p.classList.remove('is-wait');
p.classList.add('is-pend');
appear(p, 6, 420);
};
const panTo = (name) => {
const col = el.querySelector(`[data-col="${name}"]`);
if (!tree || !col) return;
const x = tree.scrollLeft + col.getBoundingClientRect().left - tree.getBoundingClientRect().left;
tree.scrollTo({ left: Math.max(0, x - 6), behavior: 'smooth' });
};
await api.wait(900);
resolve(1);
await api.wait(700);
fill(1);
await api.wait(900);
resolve(2);
await api.wait(700);
fill(2);
await api.wait(800);
panTo('final');
await api.wait(1000);
resolve(3);
await api.wait(800);
panTo('champ');
await api.wait(700);
const champ = el.querySelector('[data-champ]');
if (champ) champ.classList.remove('is-wait');
const st = el.querySelector('[data-st]');
if (st) { st.classList.add('is-done', 'is-pop'); st.textContent = t('Finalizado', 'Finished'); }
await api.wait(4200);
},
};
const fmtInt = (n) => new Intl.NumberFormat(LANG).format(n);
recipes.social = {
reset: 'fade',
arm(el) {
const st = el.querySelector('.st');
if (st) st.dataset.st = 'a';
const seg = el.querySelector('[data-st-seg]');
if (seg) { seg.classList.remove('is-done'); if (!seg.firstElementChild) seg.appendChild(document.createElement('b')); }
const like = el.querySelector('[data-so-like]');
if (like) like.classList.remove('is-liked', 'is-pop');
el.querySelectorAll('[data-so-count], [data-so-count2]').forEach((n) => { n.textContent = '23'; });
const cmt = el.querySelector('[data-cmt]');
if (cmt) cmt.classList.remove('is-shown');
const fresh = el.querySelector('[data-cmt-new]');
if (fresh) fresh.hidden = true;
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
const fill = async (seg, ms) => {
const bar = seg && seg.firstElementChild;
if (!bar) return;
const a = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
await Promise.race([a.finished, api.wait(ms + 50)]);
api.check();
};
const story = async () => {
await fill(el.querySelector('[data-st-seg]'), 4200);
const st = el.querySelector('.st');
if (st) st.dataset.st = 'b';
const name = el.querySelector('[data-st-name]');
if (name) name.textContent = '@rafael.n';
const av = el.querySelector('[data-st-av]');
if (av) { av.textContent = 'RN'; av.classList.replace('av--2', 'av--5'); }
const prog = el.querySelector('[data-st-prog]');
if (prog) prog.innerHTML = '<i><b></b></i>';
await fill(prog && prog.firstElementChild, 4400);
};
const post = async () => {
await api.wait(1200);
const like = el.querySelector('[data-so-like]');
if (like) like.classList.add('is-liked', 'is-pop');
el.querySelectorAll('[data-so-count], [data-so-count2]').forEach((n) => { n.textContent = '24'; n.classList.add('is-pop'); });
const push = el.querySelector('[data-push]');
if (push) push.classList.add('is-shown');
await api.wait(2200);
if (push) push.classList.remove('is-shown');
const open = el.querySelector('[data-so-comments]');
await cursorTo(api, open);
const cmt = el.querySelector('[data-cmt]');
if (cmt) cmt.classList.add('is-shown');
await api.wait(1300);
const fresh = el.querySelector('[data-cmt-new]');
if (fresh) { fresh.hidden = false; fresh.classList.add('is-highlight'); appear(fresh, -8, 480); }
await api.wait(2400);
};
await Promise.all([story(), post()]);
await api.wait(1400);
},
};
recipes.trophy = {
reset: 'fade',
arm(el) {
const medal = el.querySelector('[data-pf-medal]');
if (medal) medal.classList.add('is-locked');
const won = el.querySelector('[data-pf-won]');
if (won) won.textContent = '4';
const pts = el.querySelector('[data-pf-pts]');
if (pts) { pts.dataset.count = '2140'; pts.textContent = fmtInt(2140); }
const set = (sel, v) => { const n = el.querySelector(sel); if (n) n.textContent = v; };
set('[data-lv-pill]', t('Nível 12', 'Level 12'));
set('[data-lv-text]', t('Progresso no nível: 2.140 / 2.200 Pontos (140 / 200 no nível)', 'Level progress: 2,140 / 2,200 Points (140 / 200 in level)'));
set('[data-lv-next]', t('Próximo nível em: 60 Pontos', 'Next level in: 60 Points'));
const bar = el.querySelector('[data-lv-bar]');
if (bar) bar.style.setProperty('--p', '0.7');
const l12 = el.querySelector('[data-lv-12]');
const l13 = el.querySelector('[data-lv-13]');
if (l12) l12.className = 'lv__lvl is-now';
if (l13) l13.className = 'lv__lvl is-lock';
},
async play(api) {
const { el } = api;
if (!api.entrance) { await api.wait(2600); return; }
await api.wait(1100);
const medal = el.querySelector('[data-pf-medal]');
if (medal) { medal.classList.remove('is-locked'); medal.classList.add('is-unlock'); }
const won = el.querySelector('[data-pf-won]');
if (won) { won.textContent = '5'; won.classList.add('is-pop'); }
const push = el.querySelector('[data-push]');
if (push) push.classList.add('is-shown');
const pts = el.querySelector('[data-pf-pts]');
if (pts) { pts.dataset.count = '2200'; countTo(api, pts, 2200, 1000, 2140).catch(() => {}); }
await api.wait(1400);
const bar = el.querySelector('[data-lv-bar]');
if (bar) bar.style.setProperty('--p', '1');
const set = (sel, v) => { const n = el.querySelector(sel); if (n) n.textContent = v; };
set('[data-lv-text]', t('Progresso no nível: 2.200 / 2.200 Pontos (200 / 200 no nível)', 'Level progress: 2,200 / 2,200 Points (200 / 200 in level)'));
await api.wait(900);
const l12 = el.querySelector('[data-lv-12]');
const l13 = el.querySelector('[data-lv-13]');
if (l12) l12.className = 'lv__lvl is-done';
if (l13) l13.className = 'lv__lvl is-now is-pop';
const pill = el.querySelector('[data-lv-pill]');
if (pill) { pill.textContent = t('Nível 13', 'Level 13'); pill.classList.add('is-pop'); }
if (bar) bar.style.setProperty('--p', '0');
set('[data-lv-text]', t('Progresso no nível: 2.200 / 2.420 Pontos (0 / 220 no nível)', 'Level progress: 2,200 / 2,420 Points (0 / 220 in level)'));
set('[data-lv-next]', t('Próximo nível em: 220 Pontos', 'Next level in: 220 Points'));
await api.wait(1800);
if (push) push.classList.remove('is-shown');
await api.wait(2800);
},
};
function initGame() {
const board = document.querySelector('[data-game]');
if (!board) return;
const $ = (s) => board.querySelector(s);
const bar = $('[data-gb-ring]'), tip = $('[data-gb-tip]'), ring = $('.gb-ring'), wave = $('[data-gb-wave]');
const lvlEl = $('[data-gb-lvl]'), ligaEl = $('[data-gb-liga]'), ptsEl = $('[data-gb-pts]'), nextEl = $('[data-gb-next]'), meEl = $('[data-gb-mept]'), wonEl = $('[data-gb-won]');
const btn = $('[data-gb-post]'), again = $('[data-gb-reset]'), toasts = $('[data-gb-toasts]'), live = $('[data-gb-live]'), burstEl = $('[data-gb-burst]');
const mods = [...board.querySelectorAll('[data-gb-mod]')];
const rows = [...board.querySelectorAll('[data-gb-row]')];
const me = rows.find((r) => r.hasAttribute('data-me'));
const LIGAS = EN ? ['Beginner', 'Consistent', 'Athlete', 'Competitor', 'Elite', 'Pro Marathoner'] : ['Iniciante', 'Consistente', 'Atleta', 'Competidor', 'Elite', 'Maratonista Profissional'];
const MEDALS = EN ? { 2: '10 km in a week', 4: '100 km in a month' } : { 2: '10 km na semana', 4: '100 km no mês' };
const COLORS = ['#f4b400', '#ffd36a', '#2de0e7', '#0ac5cc', '#ff6b8a', '#9fe9ec'];
const GOLD = ['#f4b400', '#ffd36a', '#fff3c4', '#f6b73c'];
const fmt = (n) => new Intl.NumberFormat(LANG).format(n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const levelOf = (p) => { let lvl = 12, start = 2000, w = 200; while (p >= start + w) { start += w; w += 20; lvl += 1; } return { lvl, start, end: start + w }; };
const progress = (p) => { const L = levelOf(p); return Math.round(((p - L.start) / (L.end - L.start)) * 100); };
rows.forEach((r) => { r.dataset.start = r.dataset.pts; });
let pts = 2140, posts = 0, add = 57, touched = false, inView = false, demoTimer = 0, demoDone = false, shown = false;
let gen = 0; // sobe a cada recomeço: contagens e subidas de nível pendentes de antes param
const setRing = (v, snap) => {
if (snap) { bar.classList.add('is-snap'); tip.classList.add('is-snap'); }
bar.style.strokeDashoffset = String(100 - v);
tip.style.transform = `rotate(${v * 3.6}deg)`;
if (snap) { void bar.getBoundingClientRect(); bar.classList.remove('is-snap'); tip.classList.remove('is-snap'); }
};
const tween = (el, from, to) => {
if (RM.matches || from === to) { el.textContent = fmt(to); return; }
const t0 = performance.now();
const g = gen;
const step = (t) => {
if (g !== gen) return;
const k = Math.min(1, (t - t0) / 650);
el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
if (k < 1) requestAnimationFrame(step);
};
requestAnimationFrame(step);
};
const restartAnim = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const order = () => {
const sorted = [...rows].sort((a, b) => Number(b.dataset.pts) - Number(a.dataset.pts));
sorted.forEach((r, i) => { r.style.setProperty('--i', i); r.querySelector('i').textContent = ord(i + 1); });
return sorted.indexOf(me) + 1;
};
const setLevel = (L) => {
const liga = Math.min(6, Math.ceil(L.lvl / 10));
lvlEl.textContent = L.lvl;
ligaEl.textContent = `${t('Liga', 'League')} ${liga} • ${LIGAS[liga - 1]}`;
nextEl.textContent = fmt(L.end);
};
const toast = (title, text) => {
const t = document.createElement('div');
t.className = 'gb-toast';
t.innerHTML = '<span class="gb-toast__logo"><svg><use href="#logo-mark"/></svg></span><span><b></b><small></small></span>';
t.querySelector('b').textContent = title;
t.querySelector('small').textContent = text;
toasts.prepend(t);
while (toasts.children.length > 2) toasts.lastElementChild.remove();
setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 400); }, 2600);
};
const burst = (colors, n, spread) => {
if (RM.matches) return;
const g = document.createElement('span');
g.innerHTML = Array.from({ length: n }, (_, i) => {
const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
const d = spread + (i % 3) * 30;
return `<i style="--x:${Math.round(Math.cos(a) * d)}px;--y:${Math.round(Math.sin(a) * d * 0.8)}px;--r:${(i * 67) % 360}deg;--k:${colors[i % colors.length]}"></i>`;
}).join('');
burstEl.appendChild(g);
setTimeout(() => g.remove(), 1400);
};
const float = (n) => {
if (RM.matches) return;
const f = document.createElement('span');
f.className = 'gb-float';
f.textContent = `+${n}`;
btn.parentNode.appendChild(f);
setTimeout(() => f.remove(), 1200);
};
const buzz = (pattern, trusted) => { if (trusted && navigator.vibrate) navigator.vibrate(pattern); };
const press = () => { btn.classList.add('is-press'); setTimeout(() => btn.classList.remove('is-press'), 160); };
const select = (k) => { add = Number(mods[k].dataset.gbMod); mods.forEach((m, i) => m.setAttribute('aria-pressed', String(i === k))); };
const levelUp = (L) => {
setLevel(L);
restartAnim(lvlEl, 'is-roll');
restartAnim(ring, 'is-up');
restartAnim(wave, 'is-go');
restartAnim(board, 'is-flash');
burst(COLORS, 26, 130);
};
const post = (trusted) => {
const oldPts = pts;
const old = levelOf(pts);
const oldRank = order();
pts += add;
posts += 1;
me.dataset.pts = pts;
const L = levelOf(pts);
const rank = order();
const said = [t(`Mais ${add} pontos.`, `${add} more points.`)];
tween(ptsEl, oldPts, pts);
tween(meEl, oldPts, pts);
float(add);
if (L.lvl > old.lvl) {
if (RM.matches) { setLevel(L); setRing(progress(pts), true); }
else {
setRing(100);
const g = gen;
setTimeout(() => { if (g !== gen) return; setRing(0, true); requestAnimationFrame(() => setRing(progress(pts))); levelUp(L); }, 480);
}
toast(t(`Subiu para o nível ${L.lvl}`, `Up to level ${L.lvl}`), `${t('Liga', 'League')} ${Math.min(6, Math.ceil(L.lvl / 10))} • ${LIGAS[Math.min(6, Math.ceil(L.lvl / 10)) - 1]}`);
said.push(t(`Nível ${L.lvl}.`, `Level ${L.lvl}.`));
buzz([18, 40, 28], trusted);
} else {
setRing(progress(pts));
buzz(12, trusted);
}
if (rank < oldRank) {
const passed = rows.filter((r) => r !== me && Number(r.dataset.pts) >= oldPts && Number(r.dataset.pts) < pts).map((r) => r.querySelector('b').textContent);
me.classList.toggle('is-top', rank === 1);
if (rank === 1) { burst(GOLD, 22, 115); buzz([25, 30, 25, 30, 45], trusted); }
toast(rank === 1 ? t('1º no ranking do desafio', '1st in the challenge ranking') : t(`Subiu para ${rank}º no ranking`, `Up to ${ord(rank)} in the ranking`), t(`Você passou ${passed.join(' e ')}`, `You passed ${passed.join(' and ')}`));
said.push(t(`${rank}º no ranking.`, `${ord(rank)} in the ranking.`));
}
const medal = MEDALS[posts];
if (medal) {
const m = board.querySelector(`[data-gb-medal="${posts}"]`);
if (m) m.classList.add('is-won', 'is-new');
wonEl.textContent = String(board.querySelectorAll('.gb-medal.is-won').length);
toast(t('Parabéns, você conquistou uma medalha!', 'Congrats, you earned a medal!'), t(`Você conquistou a(s) medalha(s): ${medal}`, `You earned the medal(s): ${medal}`));
said.push(t(`Medalha ${medal}.`, `Medal: ${medal}.`));
}
live.textContent = said.join(' ');
if (posts >= 4) again.hidden = false;
};
const restart = () => {
gen += 1;
pts = 2140; posts = 0;
rows.forEach((r) => { r.dataset.pts = r.dataset.start; });
board.querySelectorAll('[data-gb-medal]').forEach((m) => m.classList.remove('is-won', 'is-new'));
wonEl.textContent = '2';
me.classList.remove('is-top');
toasts.innerHTML = '';
setLevel(levelOf(pts));
setRing(progress(pts), true);
ptsEl.textContent = fmt(pts);
meEl.textContent = fmt(pts);
order();
again.hidden = true;
};
const stopDemo = () => { touched = true; clearTimeout(demoTimer); btn.classList.remove('is-idle'); };
btn.addEventListener('click', (e) => { if (e.isTrusted) stopDemo(); press(); post(e.isTrusted); });
mods.forEach((m, k) => m.addEventListener('click', (e) => { if (e.isTrusted) stopDemo(); select(k); }));
again.addEventListener('click', () => { restart(); select(0); btn.focus(); });
const demo = async () => {
demoDone = true;
btn.classList.remove('is-idle');
for (const k of [0, 0, 1, 0]) {
if (touched || !inView || root.classList.contains('is-still')) return;
select(k); press(); post(false);
await sleep(1800);
}
await sleep(2600);
if (!touched) { restart(); select(0); btn.classList.add('is-idle'); }
};
if (hasIO && !RM.matches) {
setRing(0, true); // o anel enche quando o tabuleiro aparece
new IntersectionObserver(([e]) => {
if (e.intersectionRatio >= 0.2 && !shown) { shown = true; setTimeout(() => setRing(progress(pts)), 250); }
inView = e.intersectionRatio >= 0.45;
clearTimeout(demoTimer);
if (inView && !touched && !demoDone) demoTimer = setTimeout(demo, 1600);
}, { threshold: [0, 0.2, 0.45] }).observe(board);
}
}
function initVideo() {
document.querySelectorAll('[data-video]').forEach((a) => {
const warm = () => {
if (document.querySelector('link[data-yt]')) return;
['https://www.youtube-nocookie.com', 'https://i.ytimg.com'].forEach((href) => {
const l = document.createElement('link');
l.rel = 'preconnect'; l.href = href; l.dataset.yt = '';
document.head.appendChild(l);
});
};
a.addEventListener('pointerenter', warm, { once: true });
a.addEventListener('focus', warm, { once: true });
a.addEventListener('click', (e) => {
e.preventDefault();
const f = document.createElement('iframe');
f.src = `https://www.youtube-nocookie.com/embed/${a.dataset.video}?autoplay=1&rel=0&modestbranding=1`;
f.title = t('Veja como a gamificação pode transformar a sua empresa | GoTeamGo', 'See how gamification can transform your company | GoTeamGo (in Portuguese)');
f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
f.allowFullscreen = true;
f.referrerPolicy = 'strict-origin-when-cross-origin';
a.replaceWith(f);
f.focus();
});
});
}
function initConsent() {
const tags = (document.querySelector('meta[name="gtg-tags"]')?.content || '').split(/\s+/).filter(Boolean);
const box = document.querySelector('[data-consent]');
if (!tags.length || !box) return;
window.dataLayer = window.dataLayer || [];
const gtag = window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
let loaded = false;
const load = () => {
if (loaded) return;
loaded = true;
gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
gtag('js', new Date());
tags.forEach((id) => gtag('config', id));
const s = document.createElement('script');
s.async = true;
s.src = 'https://www.googletagmanager.com/gtag/js?id=' + tags[0];
document.head.appendChild(s);
};
const show = (on) => { box.hidden = !on; root.classList.toggle('consent-open', on); };
const choose = (v) => {
try { localStorage.setItem('gtg-consent', v); } catch (e) { /* sem armazenamento: pergunta de novo na próxima visita */ }
show(false);
if (v === 'granted') load();
};
let saved = null;
try { saved = localStorage.getItem('gtg-consent'); } catch (e) { /* idem */ }
if (saved === 'granted') load();
else if (saved !== 'denied') show(true);
box.querySelector('[data-consent-yes]').addEventListener('click', () => choose('granted'));
box.querySelector('[data-consent-no]').addEventListener('click', () => choose('denied'));
document.querySelectorAll('[data-consent-open]').forEach((b) => {
b.hidden = false;
b.addEventListener('click', () => show(true));
});
document.addEventListener('click', (e) => {
const a = e.target.closest('a[data-track]');
if (!a || !loaded) return;
const lead = /wa\.me|mailto:/.test(a.getAttribute('href') || '');
gtag('event', lead ? 'generate_lead' : 'cta_click', { cta: a.dataset.track, link_url: a.href });
});
}
function initWhatsApp() {
const wa = document.querySelector('[data-wa]');
if (!wa) return;
const paint = () => wa.classList.toggle('is-shown', window.scrollY > window.innerHeight * 0.6);
let ticking = false;
window.addEventListener('scroll', () => {
if (ticking) return;
ticking = true;
requestAnimationFrame(() => { ticking = false; paint(); });
}, { passive: true });
paint();
}
/* ---- controlador ---- */
function createController(el) {
const names = el.dataset.scene.trim().split(/\s+/).filter((n) => recipes[n]);
if (!names.length) return null;
const snapshot = el.innerHTML;
const once = el.dataset.loop === 'false';
const fade = (el.dataset.reset || (names.some((n) => recipes[n].reset === 'fade') ? 'fade' : 'none')) === 'fade';
const state = {};
let ctrl = null;
let armed = false;
let done = false;
const clearStage = () => {
const stage = stageOf(el);
stage.querySelectorAll('.toast').forEach((t) => t.remove());
const cur = stage.querySelector('.cursor');
if (cur) { cur.classList.remove('is-on', 'is-click'); cur.style.transform = ''; }
};
const arm = () => {
el.classList.add('is-armed');
names.forEach((n) => recipes[n].arm && recipes[n].arm(el));
armed = true;
};
const restore = (rearm) => {
el.getAnimations().forEach((a) => a.cancel());
el.innerHTML = snapshot;
el.scrollLeft = 0;
el.classList.remove('is-armed');
armed = false;
clearStage();
if (rearm) arm();
};
async function loop(signal) {
const api = makeApi(signal, el, state);
try {
for (;;) {
api.entrance = armed;
await Promise.all(names.map((n) => recipes[n].play(api)));
armed = false;
el.classList.remove('is-armed');
if (once) { done = true; ctrl = null; return; }
if (fade) {
const target = el.querySelector('[data-scene-body]') || el;
const out = target.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, fill: 'forwards' });
await out.finished;
api.check();
el.innerHTML = snapshot;
el.scrollLeft = 0;
clearStage();
arm();
out.cancel();
(el.querySelector('[data-scene-body]') || el).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
await api.wait(360);
}
}
} catch (err) {
if (!(err instanceof Stop)) console.error('[landing] cena', names.join(' '), err);
}
}
return {
el,
visible: false,
arm() { if (!done) arm(); },
start() {
if (ctrl || done || RM.matches || document.hidden || root.classList.contains('is-still')) return;
ctrl = new AbortController();
loop(ctrl.signal);
},
stop(rearm) {
if (!ctrl) return;
ctrl.abort();
ctrl = null;
restore(rearm);
},
calm() {
if (ctrl) { ctrl.abort(); ctrl = null; restore(false); } else if (armed) restore(false);
},
};
}
function initScenes() {
const els = [...document.querySelectorAll('[data-scene]')];
if (!els.length || !hasIO) return;
const ctrls = new Map();
els.forEach((el) => {
const c = createController(el);
if (!c) return;
ctrls.set(el, c);
if (!RM.matches && offscreen(el)) c.arm();
});
const io = new IntersectionObserver((entries) => {
for (const e of entries) {
const c = ctrls.get(e.target);
if (!c) continue;
if (e.isIntersecting && e.intersectionRatio >= 0.2) { c.visible = true; c.start(); }
else if (!e.isIntersecting) { c.visible = false; c.stop(true); }
}
}, { threshold: [0, 0.2] });
ctrls.forEach((_, el) => io.observe(el));
document.addEventListener('visibilitychange', () => {
ctrls.forEach((c) => {
if (document.hidden) c.stop(false);
else if (c.visible) c.start();
});
});
document.addEventListener('landing:still', () => {
ctrls.forEach((c) => {
if (root.classList.contains('is-still')) c.calm();
else if (c.visible) c.start();
});
});
RM.addEventListener('change', () => {
ctrls.forEach((c) => {
if (RM.matches) c.calm();
else if (c.visible) c.start();
});
});
}
initNav();
initAudience();
initGame();
initVideo();
initWhatsApp();
initConsent();
initReveal();
initTour();
initBilling();
initStill();
initGrain();
initTrail();
initWords();
initRotator();
initHero3D();
initMagnetic();
initSpotlight();
initScenes();
})();