const root = document.documentElement;
root.classList.add('js');
const ROOT = root.dataset.root || '';
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const page = document.body.dataset.page;

const yr = $('#year');
if (yr) yr.textContent = new Date().getFullYear();

/* ---------- scroll progress, back to top ---------- */
const bar = $('#progress span');
const toTop = $('#toTop');
function onScroll() {
  const h = root.scrollHeight - innerHeight;
  if (bar) bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
  if (toTop) toTop.hidden = scrollY < 600;
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();
toTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));

/* ---------- mobile nav ---------- */
const toggle = $('#navToggle');
const links = $('#navLinks');
function setMenu(open) {
  links.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
toggle?.addEventListener('click', () => setMenu(!links.classList.contains('open')));
links?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && links?.classList.contains('open')) { setMenu(false); toggle.focus(); } });
document.addEventListener('click', (e) => { if (links?.classList.contains('open') && !e.target.closest('.nav')) setMenu(false); });

/* ---------- active section (scroll spy) ---------- */
if (page === 'home') {
  const sections = $$('main section[id]');
  const navMap = Object.fromEntries($$('[data-nav]').map((a) => [a.dataset.nav, a]));
  const spy = () => {
    const y = scrollY + 140;
    let cur = sections[0]?.id;
    for (const s of sections) if (s.offsetTop <= y) cur = s.id;
    if (innerHeight + scrollY >= root.scrollHeight - 4) cur = sections[sections.length - 1].id;
    for (const [id, a] of Object.entries(navMap)) {
      const on = id === cur;
      a.classList.toggle('active', on);
      on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
    }
  };
  addEventListener('scroll', spy, { passive: true });
  addEventListener('resize', spy);
  spy();
} else if (page === 'assignment') {
  $('[data-nav="assignments"]')?.classList.add('active');
}

/* ---------- reveal animations ---------- */
const reveals = $$('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  reveals.forEach((el) => io.observe(el));
} else reveals.forEach((el) => el.classList.add('in'));

/* ---------- modal helper (focus management, Escape, outside click) ---------- */
let lastFocus = null;
const openStack = [];
function openModal(el) {
  lastFocus = document.activeElement;
  el.hidden = false;
  document.body.style.overflow = 'hidden';
  openStack.push(el);
  (el.querySelector('[data-close]') || el).focus?.();
}
function closeModal(el) {
  el.hidden = true;
  const i = openStack.indexOf(el);
  if (i >= 0) openStack.splice(i, 1);
  if (!openStack.length) document.body.style.overflow = '';
  if (!openStack.length) lastFocus?.focus?.();
}
$$('.modal').forEach((m) => {
  m.addEventListener('mousedown', (e) => { if (e.target === m || (m.id === 'lightbox' && e.target === $('#lbStage') && !dragMoved)) closeModal(m); });
  $$('[data-close]', m).forEach((b) => b.addEventListener('click', () => closeModal(m)));
});
addEventListener('keydown', (e) => {
  const top = openStack[openStack.length - 1];
  if (!top) return;
  if (e.key === 'Escape') { closeModal(top); return; }
  if (e.key === 'Tab') { // simple focus trap
    const f = $$('button:not([hidden]),a[href]:not([hidden]),[tabindex="0"]', top).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  if (top.id === 'lightbox') {
    if (e.key === '+' || e.key === '=') zoomBy(1.25);
    if (e.key === '-') zoomBy(0.8);
    if (e.key === '0') resetZoom();
    if (e.key === 'ArrowLeft') lbStep(-1);
    if (e.key === 'ArrowRight') lbStep(1);
  }
});

/* ---------- lightbox with zoom + pan ---------- */
const lb = $('#lightbox');
let dragMoved = false;
let lbItems = [], lbIdx = 0, scale = 1, tx = 0, ty = 0;
const lbImg = $('#lbImg');
function applyT() {
  lbImg.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
  $('#lbZoom').textContent = Math.round(scale * 100) + '%';
  $('#lbStage').style.cursor = scale > 1 ? 'grab' : 'zoom-in';
}
function resetZoom() { scale = 1; tx = ty = 0; applyT(); }
function zoomBy(f) {
  scale = Math.min(6, Math.max(1, scale * f));
  if (scale === 1) tx = ty = 0;
  applyT();
}
function showLb(i) {
  lbIdx = i;
  const it = lbItems[i];
  lbImg.src = it.src;
  lbImg.alt = it.alt || '';
  $('#lbCap').textContent = it.caption + (lbItems.length > 1 ? ` (${i + 1} / ${lbItems.length})` : '');
  const dl = $('#lbDl');
  dl.hidden = !it.download;
  if (it.download) dl.href = it.download;
  $('#lbPrev').hidden = $('#lbNext').hidden = lbItems.length < 2;
  resetZoom();
}
function lbStep(d) { if (lbItems.length > 1) showLb((lbIdx + d + lbItems.length) % lbItems.length); }
function openLightbox(items, i) { lbItems = items; showLb(i); if (lb.hidden) openModal(lb); }
if (lb) {
  $('#lbIn').addEventListener('click', () => zoomBy(1.25));
  $('#lbOut').addEventListener('click', () => zoomBy(0.8));
  $('#lbReset').addEventListener('click', resetZoom);
  $('#lbPrev').addEventListener('click', () => lbStep(-1));
  $('#lbNext').addEventListener('click', () => lbStep(1));
  const stage = $('#lbStage');
  stage.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 0.87); }, { passive: false });
  stage.addEventListener('dblclick', () => (scale > 1 ? resetZoom() : zoomBy(2.5)));
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.lb-nav')) return;
    drag = { x: e.clientX, y: e.clientY, tx, ty }; dragMoved = false;
    stage.setPointerCapture(e.pointerId); stage.classList.add('drag');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || scale === 1) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
    tx = drag.tx + dx; ty = drag.ty + dy; applyT();
  });
  const end = () => { drag = null; stage.classList.remove('drag'); setTimeout(() => (dragMoved = false), 0); };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
}

/* ---------- projects ---------- */
const readJson = (id) => { try { return JSON.parse($(id)?.textContent || 'null'); } catch { return null; } };
const projects = readJson('#projects-data') || [];
const certs = readJson('#certs-data') || [];
const projItems = (p) => p.images.map((im) => ({ src: im.src, w: im.w, h: im.h, alt: im.alt, caption: p.name }));

$$('.project-card').forEach((card) => {
  const p = projects.find((x) => x.id === card.dataset.project);
  const main = $('img[data-main]', card);
  let idx = 0;
  $$('.thumb', card).forEach((t) => t.addEventListener('click', () => {
    idx = +t.dataset.idx;
    main.src = p.images[idx].src; main.alt = p.images[idx].alt;
    main.width = p.images[idx].w; main.height = p.images[idx].h;
    $$('.thumb', card).forEach((x) => x.classList.toggle('on', x === t));
  }));
  $('[data-zoom-project]', card).addEventListener('click', () => openLightbox(projItems(p), idx));
});

const detModal = $('#detailsModal');
$$('[data-details]').forEach((b) => b.addEventListener('click', () => {
  const p = projects.find((x) => x.id === b.dataset.details);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('#detTitle').textContent = p.name;
  $('#detBody').innerHTML = `<p>${esc(p.description)}</p>
    <h4>Technologies used</h4><ul class="chips chips-tech">${p.tech.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <h4>Main features</h4><ul class="features">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
    <h4>Screenshots</h4><div class="det-shots">${p.images.map((im, i) => `<button type="button" data-shot="${i}" aria-label="Enlarge screenshot ${i + 1}"><img src="${im.src}" alt="${esc(im.alt)}" loading="lazy"></button>`).join('')}</div>
    <div class="btn-row" style="margin-top:22px"><a class="btn btn-dark btn-sm" href="${p.github}" target="_blank" rel="noopener noreferrer">GitHub Repository</a></div>`;
  $$('[data-shot]', $('#detBody')).forEach((s) => s.addEventListener('click', () => openLightbox(projItems(p), +s.dataset.shot)));
  openModal(detModal);
}));

/* ---------- certificates ---------- */
$$('[data-cert]').forEach((b) => b.addEventListener('click', () => {
  const items = certs.map((c) => ({ src: c.preview, w: c.w, h: c.h, alt: c.alt, caption: `${c.issuer} — ${c.title}`, download: c.file }));
  openLightbox(items, certs.findIndex((c) => c.id === b.dataset.cert));
}));

/* ---------- assignments: search + filters ---------- */
const grid = $('#aGrid');
if (grid) {
  const cards = $$('.a-card', grid);
  const input = $('#aSearch');
  let cat = 'All';
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let n = 0;
    cards.forEach((c) => {
      const show = (cat === 'All' || c.dataset.cat === cat) && (!q || c.dataset.search.includes(q) || c.dataset.n === q.replace(/^0+/, ''));
      c.hidden = !show;
      if (show) { n++; c.classList.add('in'); }
    });
    $('#aEmpty').hidden = n > 0;
    $('#aStatus').textContent = (q || cat !== 'All') ? `Showing ${n} ${n === 1 ? 'result' : 'results'}` : '';
  };
  input.addEventListener('input', apply);
  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    cat = b.dataset.filter;
    $$('[data-filter]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
    apply();
  }));
}

/* ---------- view code modal (assignments) ---------- */
const codeModal = $('#codeModal');
let codeCache = null;
async function loadCode() {
  // Loaded with a <script> tag (not fetch) so it also works when the site is opened from disk (file://).
  if (!codeCache) codeCache = new Promise((res, rej) => {
    if (window.ASSIGNMENT_CODE) return res(window.ASSIGNMENT_CODE);
    const sc = document.createElement('script');
    sc.src = ROOT + 'assets/assignments-code.js';
    sc.onload = () => res(window.ASSIGNMENT_CODE);
    sc.onerror = () => { codeCache = null; rej(new Error('load failed')); };
    document.head.append(sc);
  });
  return codeCache;
}
async function openCode(n) {
  const title = document.querySelector(`.a-card[data-n="${n}"] h3`)?.textContent || $('.a-head h1')?.textContent || '';
  $('#codeTitle').textContent = `Assignment ${String(n).padStart(2, '0')} — ${title}`;
  const view = $('#codeView code');
  const tabs = $('#codeTabs');
  view.textContent = 'Loading…'; tabs.innerHTML = '';
  openModal(codeModal);
  try {
    const files = (await loadCode())[n];
    const list = [];
    files.forEach((f) => {
      const multi = files.length > 1 ? ` (${f.name.replace('.html', '')})` : '';
      list.push({ label: 'Assignment code' + multi, text: f.snippet });
      list.push({ label: 'Full page source' + multi, text: f.full });
    });
    const select = (i) => {
      $$('.tab', tabs).forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
      view.textContent = list[i].text; $('#codeView').scrollTop = 0;
    };
    list.forEach((l, i) => {
      const t = document.createElement('button');
      t.type = 'button'; t.className = 'tab'; t.setAttribute('role', 'tab'); t.textContent = l.label;
      t.addEventListener('click', () => select(i));
      tabs.append(t);
    });
    select(0);
  } catch {
    view.textContent = 'Could not load the source code. Please refresh and try again.';
  }
}
$$('[data-code]').forEach((b) => b.addEventListener('click', () => openCode(b.dataset.code)));
$('#codeCopy')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget, label = $('span', btn);
  try { await navigator.clipboard.writeText($('#codeView code').textContent); label.textContent = 'Copied'; }
  catch { label.textContent = 'Press Ctrl+C'; const r = document.createRange(); r.selectNodeContents($('#codeView code')); getSelection().removeAllRanges(); getSelection().addRange(r); }
  setTimeout(() => (label.textContent = 'Copy'), 1600);
});

/* ---------- assignment page: size the iframe to its content ---------- */
const frame = $('#demo');
if (frame) {
  const fit = () => {
    try {
      const d = frame.contentDocument;
      if (!d?.documentElement) return;
      frame.style.height = Math.max(420, Math.ceil(d.body.getBoundingClientRect().height) + 4) + 'px';
    } catch { /* cross-origin: keep CSS height */ }
  };
  frame.addEventListener('load', () => {
    fit();
    try {
      const d = frame.contentDocument;
      new ResizeObserver(fit).observe(d.body);
      d.addEventListener('click', () => setTimeout(fit, 50));
      d.addEventListener('input', () => setTimeout(fit, 50));
    } catch { /* ignore */ }
  });
  addEventListener('resize', fit);
}

/* ---------- WhatsApp widget ---------- */
const waPanel = $('#waPanel'), waToggle = $('#waToggle');
function setWa(open) {
  waPanel.hidden = !open;
  waPanel.setAttribute('aria-hidden', String(!open));
  waToggle.setAttribute('aria-expanded', String(open));
  waToggle.setAttribute('aria-label', open ? 'Close WhatsApp chat' : 'Open WhatsApp chat');
  if (open) $('#waName').focus();
}
waToggle?.addEventListener('click', () => setWa(waPanel.hidden));
$('#waClose')?.addEventListener('click', () => { setWa(false); waToggle.focus(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && waPanel && !waPanel.hidden && !openStack.length) { setWa(false); waToggle.focus(); } });
$('#waForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#waName').value.trim();
  const msg = $('#waMsg').value.trim();
  const err = $('#waErr');
  if (msg.length < 2) { err.textContent = 'Please type a message before sending.'; $('#waMsg').focus(); return; }
  if (name && !/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{0,59}$/u.test(name)) { err.textContent = 'Please use letters only in the name field.'; $('#waName').focus(); return; }
  err.textContent = '';
  const text = (name ? `Hi Vinod, I'm ${name}. ` : 'Hi Vinod, ') + msg;
  window.open(`${$('#wa').dataset.wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  $('#waMsg').value = '';
});
