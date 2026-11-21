// GSAP-driven motion layer for ChurchCare.
// Every helper is a no-op when GSAP is missing or the user prefers reduced motion.
//
// Mood: calm and serene. Motion is carried by soft fades with short, low-distance
// drifts. Nothing overshoots (no back/elastic eases), nothing snaps, and no tween
// animates a layout property (height/width/top/left) because those reflow every
// frame and read as jitter.

const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceQuery.matches || !window.gsap;

const EASE = 'power2.out';      // default settle
const GLIDE = 'sine.out';       // slowest, gentlest arrival
const LEAVING = 'power1.inOut'; // things that exit

export function ready(){
  const gsap = window.gsap;
  if(!gsap || gsap.__churchcare) return Boolean(gsap);
  gsap.defaults({ ease: EASE, duration: .6 });
  gsap.config({ nullTargetWarn: false });
  gsap.__churchcare = true;
  document.documentElement.dataset.motion = 'gsap';
  return true;
}

// ---------------------------------------------------------------- shell / page

export function shellIn(first){
  const gsap = window.gsap; if(!gsap) return;
  const sidebar = document.querySelector('.sidebar');
  const topbar = document.querySelector('.topbar');
  if(reduced()){
    gsap.set([sidebar, topbar, '.sidebar-footer', '.header-actions'], { clearProps: 'all' });
    navIndicator(false);
    return;
  }
  if(first){
    const tl = gsap.timeline({ defaults: { ease: EASE } });
    tl.from(sidebar, { x: -12, opacity: 0, duration: .9 }, 0)
      .from('.brand', { y: -6, opacity: 0, duration: .7 }, .14)
      .from('.nav-group', { x: -8, opacity: 0, duration: .8, stagger: .1 }, .22)
      .from('.sidebar-footer', { y: 8, opacity: 0, duration: .8 }, .36)
      .from(topbar, { y: -8, opacity: 0, duration: .7 }, .08)
      .from('.header-actions', { opacity: 0, duration: .7 }, .32);
  }
  navIndicator(!first);
  pulseBell();
}

// Sliding accent bar next to the active nav item. The height is applied
// instantly and only the transform is tweened — animating `height` reflows the
// whole nav on every frame, which is exactly what makes this bar look jittery.
export function navIndicator(animate){
  const gsap = window.gsap; if(!gsap) return;
  const nav = document.querySelector('.sidebar nav');
  const active = document.querySelector('.nav-item.active');
  if(!nav || !active) return;
  let bar = nav.querySelector('.nav-indicator');
  if(!bar){
    bar = document.createElement('span');
    bar.className = 'nav-indicator';
    nav.appendChild(bar);
  }
  const y = active.offsetTop + 6;
  const height = active.offsetHeight - 12;
  if(reduced() || !animate){ gsap.set(bar, { height, y, opacity: 1 }); return; }
  const resizing = bar.style.height !== `${height}px`;
  if(resizing) gsap.set(bar, { height });
  gsap.to(bar, { y, opacity: 1, duration: resizing ? .3 : .6, ease: GLIDE, overwrite: 'auto' });
}

// Fade the outgoing page out as one unit. A very small drift keeps it from
// feeling like a hard cut, while the low intensity keeps it quiet.
export function pageOut(){
  const gsap = window.gsap; if(!gsap || reduced()) return Promise.resolve();
  const content = document.querySelector('.content');
  if(!content) return Promise.resolve();
  gsap.killTweensOf(content);
  return gsap.to(content, { opacity: 0, y: -6, duration: .26, ease: LEAVING, overwrite: 'auto' }).then(() => {});
}

export function pageIn(){
  const gsap = window.gsap; if(!gsap) return;
  const content = document.querySelector('.content');
  if(!content) return;
  if(reduced()){
    gsap.set(content, { clearProps: 'all' });
    gsap.set(content.querySelectorAll('*'), { clearProps: 'all' });
    return;
  }
  gsap.killTweensOf(content);
  gsap.set(content, { clearProps: 'opacity,transform' });

  // The container fades in first so freshly injected markup can never flash at
  // full opacity for a frame before the child tweens take over.
  const tl = gsap.timeline({ defaults: { ease: EASE } });
  tl.from(content, { opacity: 0, y: 8, duration: .7, ease: GLIDE }, 0);

  const title = content.querySelector('.page-title');
  if(title){
    tl.from('.page-title .date-line', { y: 5, opacity: 0, duration: .5 }, .1)
      .from('.page-title h1', { y: 9, opacity: 0, duration: .7 }, .14)
      .from('.page-title p', { y: 7, opacity: 0, duration: .6 }, .2);
    if(title.querySelector('.button')) tl.from('.page-title .button', { x: 8, opacity: 0, duration: .6 }, .24);
  }

  const metrics = content.querySelectorAll('.stats > .metric');
  if(metrics.length) tl.from(metrics, { y: 12, opacity: 0, duration: .7, stagger: .09 }, .18);

  const panels = content.querySelectorAll('.overview > .card, .settings-grid > .card');
  if(panels.length) tl.from(panels, { y: 14, opacity: 0, duration: .8, stagger: .11 }, .3);

  const table = content.querySelector('.table-card');
  if(table) tl.from(table, { y: 14, opacity: 0, duration: .8 }, .38);

  const toolbar = content.querySelector('.toolbar');
  if(toolbar) tl.from(toolbar, { y: 6, opacity: 0, duration: .5 }, .26);

  // Anything the page-specific selectors above did not cover.
  const known = '.page-title, .stats, .overview, .settings-grid, .table-card, .toolbar';
  const loose = [...content.children].filter(node => !node.matches(known));
  if(loose.length) tl.from(loose, { y: 10, opacity: 0, duration: .7, stagger: .07 }, .24);

  countUpMetrics();
  drawChart(tl);
  staggerRows(tl);
}

function countUpMetrics(){
  const gsap = window.gsap;
  document.querySelectorAll('.metric-value').forEach(node => {
    const value = Number(node.textContent.trim());
    if(!Number.isFinite(value) || value === 0) return;
    const counter = { n: 0 };
    gsap.to(counter, {
      n: value, duration: 1.4, ease: 'sine.out', delay: .35,
      onUpdate: () => { node.textContent = Math.round(counter.n); },
      onComplete: () => { node.textContent = String(value); }
    });
  });
}

function drawChart(tl){
  const gsap = window.gsap;
  const svg = document.querySelector('.chart svg');
  if(!svg) return;
  const line = svg.querySelector('polyline');
  const area = svg.querySelector('polygon');
  tl.from(svg.querySelectorAll('line, text'), { opacity: 0, duration: .6, stagger: .015 }, .34);
  if(area){
    gsap.set(area, { transformOrigin: '50% 100%', scaleY: 0 });
    tl.to(area, { scaleY: 1, duration: 1.2, ease: 'sine.inOut' }, .5);
  }
  if(line && line.getTotalLength){
    const length = line.getTotalLength();
    if(length) tl.fromTo(line,
      { strokeDasharray: length, strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 1.5, ease: 'sine.inOut', clearProps: 'strokeDasharray,strokeDashoffset' }, .45);
  }
  const dots = svg.querySelectorAll('circle');
  if(dots.length) tl.from(dots, { scale: .2, opacity: 0, transformOrigin: '50% 50%', duration: .7, stagger: .09 }, .95);
  tl.from('.chart-legend', { opacity: 0, y: 4, duration: .5 }, 1.05);
}

function staggerRows(tl){
  const rows = document.querySelectorAll('.birthday-list .birthday-row, .table-wrap tbody tr, .timeline-item');
  if(rows.length) tl.from(rows, { opacity: 0, y: 8, duration: .55, stagger: .05, ease: EASE }, '-=0.35');
}

// ---------------------------------------------------------------------- login

export function loginIn(){
  const gsap = window.gsap; if(!gsap) return;
  const card = document.querySelector('.login .card');
  if(!card) return;
  if(reduced()){
    gsap.set([card, ...document.querySelectorAll('.login *')], { clearProps: 'all' });
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: EASE } });
  tl.from('.login .glow', { opacity: 0, scale: .8, duration: 2.4, ease: 'sine.inOut', stagger: .4 }, 0)
    .from(card, { y: 18, opacity: 0, duration: 1, ease: GLIDE }, .1)
    .from('.login .brand-icon', { scale: .8, opacity: 0, duration: .8 }, .4)
    .from('.login .brand div', { x: -6, opacity: 0, duration: .6 }, .48)
    .from('.login h1', { y: 8, opacity: 0, duration: .6 }, .52)
    .from('.login p.muted:not(.login-hint)', { y: 6, opacity: 0, duration: .55 }, .58)
    .from('.login .field', { y: 8, opacity: 0, duration: .65, stagger: .1 }, .66)
    .from('.login form .button', { y: 6, opacity: 0, duration: .6 }, .9)
    .from('.login-hint', { opacity: 0, duration: .7 }, 1.05);
}

export function loginError(){
  const gsap = window.gsap; if(!gsap || reduced()) return;
  gsap.fromTo('.login .card', { x: 0 }, { keyframes: [{ x: -6 }, { x: 5 }, { x: -3 }, { x: 0 }], duration: .5, ease: 'sine.inOut' });
}

// --------------------------------------------------------------------- dialog

let modalOutTween = null;

export function modalIn(){
  const gsap = window.gsap; if(!gsap) return;
  stopModalOut();
  const dialog = document.querySelector('#dialog');
  if(!dialog || reduced()) return;
  gsap.killTweensOf(dialog);
  gsap.fromTo(dialog, { y: 12, scale: .985, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .55, ease: GLIDE });
  gsap.from('.modal-head h2', { y: 5, opacity: 0, duration: .5, delay: .06 });
  gsap.from('.modal-body > *', { y: 9, opacity: 0, duration: .6, stagger: .06, delay: .1 });
}

export function modalOut(done){
  const gsap = window.gsap;
  const dialog = document.querySelector('#dialog');
  if(!gsap || reduced() || !dialog || !dialog.open){ done(); return; }
  stopModalOut();
  modalOutTween = gsap.to(dialog, { y: 6, opacity: 0, duration: .3, ease: LEAVING, onComplete: () => { modalOutTween = null; done(); } });
}

// Called before a new modal opens so a pending close animation cannot hide it.
export function stopModalOut(){
  if(modalOutTween){ const tween = modalOutTween; modalOutTween = null; tween.progress(1).kill(); }
}

// ---------------------------------------------------------------------- toast

export function toastIn(){
  const gsap = window.gsap; if(!gsap) return;
  const toast = document.querySelector('#toast'); if(!toast) return;
  gsap.killTweensOf(toast);
  if(reduced()) return gsap.set(toast, { clearProps: 'all' });
  gsap.fromTo(toast, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: GLIDE });
}

export function toastOut(done){
  const gsap = window.gsap; if(!gsap) return done && done();
  const toast = document.querySelector('#toast'); if(!toast) return done && done();
  gsap.killTweensOf(toast);
  if(reduced()){ toast.style.opacity = ''; return done && done(); }
  gsap.to(toast, { y: 8, opacity: 0, duration: .45, ease: LEAVING, onComplete: () => { if(done) done(); } });
}

// ------------------------------------------------------------- mobile drawer

export function drawerIn(){
  const gsap = window.gsap;
  const layout = document.querySelector('.layout'), sidebar = document.querySelector('.sidebar'), overlay = document.querySelector('.overlay');
  if(!layout || !sidebar) return;
  layout.classList.add('nav-open');
  if(!gsap || reduced()) return;
  gsap.killTweensOf([sidebar, overlay]);
  gsap.set(sidebar, { x: '-100%' });
  gsap.to(sidebar, { x: 0, duration: .55, ease: GLIDE, overwrite: 'auto' });
  if(overlay) gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: .5, ease: 'sine.out' });
}

export function drawerOut(){
  const gsap = window.gsap;
  const layout = document.querySelector('.layout'), sidebar = document.querySelector('.sidebar'), overlay = document.querySelector('.overlay');
  if(!layout || !sidebar) return;
  if(!gsap || reduced()){ layout.classList.remove('nav-open'); return; }
  gsap.killTweensOf([sidebar, overlay]);
  gsap.to(sidebar, { x: '-100%', duration: .42, ease: LEAVING, overwrite: 'auto' });
  if(overlay) gsap.to(overlay, { opacity: 0, duration: .4, ease: LEAVING, onComplete: () => layout.classList.remove('nav-open') });
  else layout.classList.remove('nav-open');
}

// ---------------------------------------------------------- micro-interaction
// Press and hover elevation are CSS transitions (see styles.css): they run on
// the compositor, survive rapid pointer changes, and never fight each other for
// the same inline transform the way two GSAP tweens did.

export function press(){
  // Intentionally CSS-driven (`:active`). Kept as a no-op so callers stay valid.
}

export function lift(node, up){
  if(!node) return;
  node.classList.toggle('is-lift', Boolean(up));
}

function pulseBell(){
  const gsap = window.gsap; if(!gsap || reduced()) return;
  gsap.killTweensOf('.bell-dot');
  if(document.querySelector('.bell-dot')) gsap.fromTo('.bell-dot', { opacity: 1 }, { opacity: .45, duration: 1.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
}

// ------------------------------------------------------- in-place list update

export function listIn(){
  const gsap = window.gsap; if(!gsap || reduced()) return;
  const wrap = document.querySelector('#member-results'); if(!wrap) return;
  const rows = wrap.querySelectorAll('tr, .empty');
  if(!rows.length) return;
  gsap.killTweensOf(rows);
  gsap.fromTo(rows, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: .5, stagger: .025, ease: GLIDE, overwrite: 'auto' });
}
