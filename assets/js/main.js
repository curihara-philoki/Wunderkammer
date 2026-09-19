document.getElementById('year').textContent = new Date().getFullYear();

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// Escapes text, then turns [label](url) into a link.
function renderTextWithLinks(str) {
  return escapeHtml(str).replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );
}

// ---- Title cycle: steps through the list in order, once per second ----
let titlePool = [];
let titleIndex = 0;

// data/titles.txt: one title per line, optional " | description" suffix
async function loadTitles() {
  try {
    const res = await fetch('data/titles.txt');
    const text = await res.text();
    titlePool = text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [title, desc] = line.split('|').map(s => s.trim());
        return { title, desc: desc || '' };
      });
  } catch (e) {
    titlePool = [{ title: 'Wunderkammer', desc: '' }];
  }
  startTitleCycle();
}

// {{...}} in a title marks a portion to render smaller, e.g. "mockup {{of}} museum"
function renderTitleHtml(raw) {
  return raw
    .split(/(\{\{[^}]*\}\})/g)
    .map(part => {
      const m = part.match(/^\{\{([^}]*)\}\}$/);
      return m ? `<span class="title-small">${escapeHtml(m[1])}</span>` : escapeHtml(part);
    })
    .join('');
}

function setTitle(pick) {
  document.getElementById('heroTitle').innerHTML = renderTitleHtml(pick.title);
  document.getElementById('heroDesc').textContent = pick.desc || '';
}

function startTitleCycle() {
  if (!titlePool.length) return;
  const titleEl = document.getElementById('heroTitle');
  setTitle(titlePool[titleIndex]);

  setInterval(() => {
    titleEl.classList.add('is-transitioning');
    setTimeout(() => {
      titleIndex = (titleIndex + 1) % titlePool.length;
      setTitle(titlePool[titleIndex]);
      titleEl.classList.remove('is-transitioning');
    }, 300);
  }, 2400);
}

// ---- Season / year grouping ----
function seasonOf(month) {
  if (month === 3 || month === 4) return '春';
  if (month === 5) return '初夏';
  if (month >= 6 && month <= 8) return '夏';
  if (month >= 9 && month <= 11) return '秋';
  return '冬';
}

function groupKeyOf(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年 ${seasonOf(d.getMonth() + 1)}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ---- Feed ----
let allEntries = [];

async function loadLocalEntries() {
  try {
    const res = await fetch('data/entries.json');
    return await res.json();
  } catch (e) {
    return [];
  }
}

function renderSections(sections) {
  return sections.map(s => `
    <div class="entry-section">
      <p class="entry-lead">${renderTextWithLinks(s.lead)}${s.more ? ' <button class="read-more-btn" type="button">もっと読む</button>' : ''}</p>
      ${s.more ? `<p class="entry-more" hidden>${renderTextWithLinks(s.more)}</p>` : ''}
    </div>
  `).join('');
}

function renderEntry(entry) {
  const tags = entry.tags || [];
  const tagHtml = tags.map(t => `<span class="tag-pill small">${escapeHtml(t)}</span>`).join('');
  const titleHtml = entry.link
    ? `<a href="${escapeHtml(entry.link)}" target="_blank" rel="noopener">${escapeHtml(entry.title)}</a>`
    : escapeHtml(entry.title);
  // If a section has "more" text behind a もっと読む toggle, the image and
  // afterEmbed button (if any) wait behind that same toggle too, instead of
  // always showing.
  const hasMore = (entry.sections || []).some(s => s.more);
  const moreExtraClass = hasMore ? ' entry-more-extra' : '';
  const moreExtraAttr = hasMore ? ' hidden' : '';

  return `
    <article class="entry" data-tags="${tags.join(' ')}">
      <div class="entry-meta">
        <time>${escapeHtml(entry.dateLabel || formatDate(entry.date))}</time>
        ${tagHtml}
      </div>
      <h3 class="entry-title">${titleHtml}</h3>
      ${entry.link && !entry.embed && !entry.linkInBody ? `<p class="entry-link-url">${entry.linkPrefix ? escapeHtml(entry.linkPrefix) + ' ' : '↗ '}<a href="${escapeHtml(entry.link)}" target="_blank" rel="noopener">${escapeHtml(entry.linkLabel || entry.link)}</a></p>` : ''}
      ${entry.sections ? renderSections(entry.sections) : (entry.body ? `<p class="entry-body">${renderTextWithLinks(entry.body)}</p>` : '')}
      ${entry.randomFrom ? `<div class="entry-random" data-random-from="${escapeHtml(entry.randomFrom)}"></div>` : ''}
      ${entry.image ? `<img class="entry-image${moreExtraClass}"${moreExtraAttr} src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.title)}" loading="lazy">` : ''}
      ${entry.images ? `<div class="entry-image-row">${entry.images.map(src => `<img src="${escapeHtml(src)}" alt="${escapeHtml(entry.title)}" loading="lazy">`).join('')}</div>` : ''}
      ${entry.embed ? `<div class="entry-embed">${entry.embed}</div>` : ''}
      ${entry.afterEmbed ? `<p class="entry-after-embed${moreExtraClass}"${moreExtraAttr}>${renderTextWithLinks(entry.afterEmbed)}</p>` : ''}
      ${entry.rotator ? (
        entry.rotatorLinked && entry.link
          ? `<a class="entry-rotator" href="${escapeHtml(entry.link)}" target="_blank" rel="noopener" data-rotator="${escapeHtml(entry.rotator)}"><span class="rotator-text"></span></a>`
          : `<div class="entry-rotator" data-rotator="${escapeHtml(entry.rotator)}"><span class="rotator-text"></span></div>`
      ) : ''}
    </article>
  `;
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.read-more-btn');
  if (!btn) return;
  const article = btn.closest('.entry');
  const more = btn.closest('.entry-section').querySelector('.entry-more');
  const willShow = more.hidden;
  more.hidden = !willShow;
  article.querySelectorAll('.entry-more-extra').forEach(el => { el.hidden = !willShow; });
  btn.textContent = willShow ? '閉じる' : 'もっと読む';
});

// ---- Rotators: same order+fade cycle as the hero title, embedded in a feed entry ----
let rotatorData = {};
let rotatorCancels = [];

async function loadRotatorData(name) {
  if (rotatorData[name]) return rotatorData[name];
  try {
    const res = await fetch(`data/${name}.json`);
    rotatorData[name] = await res.json();
  } catch (e) {
    rotatorData[name] = [];
  }
  return rotatorData[name];
}

function stopRotators() {
  rotatorCancels.forEach(cancel => cancel());
  rotatorCancels = [];
}

// Rotator items are either a plain string, or { text, fast } for a quick-cut
// group of related lines (e.g. a 3-line palindrome split into 3 beats).
function rotatorTextOf(item) {
  return typeof item === 'string' ? item : item.text;
}

function setRotatorText(textEl, item) {
  const text = rotatorTextOf(item);
  textEl.textContent = text;
  const lines = (text.match(/\n/g) || []).length + 1;
  textEl.classList.remove('lines-2', 'lines-3plus');
  if (lines === 2) textEl.classList.add('lines-2');
  else if (lines >= 3) textEl.classList.add('lines-3plus');
}

// Longer entries (more lines) stay on screen a bit longer; "fast" items
// (part of a related group) cut to the next one quickly.
function rotatorDelayFor(item) {
  if (typeof item === 'object' && item.fast) return 1200;
  const lines = (rotatorTextOf(item).match(/\n/g) || []).length + 1;
  return 3200 + (lines - 1) * 800;
}

async function initRotators() {
  const els = document.querySelectorAll('.entry-rotator[data-rotator]');
  for (const el of els) {
    const items = await loadRotatorData(el.dataset.rotator);
    if (!items.length) continue;
    const textEl = el.querySelector('.rotator-text');
    let idx = 0;
    let stopped = false;
    let timeoutId;
    setRotatorText(textEl, items[idx]);

    function scheduleNext() {
      timeoutId = setTimeout(() => {
        if (stopped) return;
        textEl.classList.add('is-transitioning');
        timeoutId = setTimeout(() => {
          if (stopped) return;
          idx = (idx + 1) % items.length;
          setRotatorText(textEl, items[idx]);
          textEl.classList.remove('is-transitioning');
          scheduleNext();
        }, 300);
      }, rotatorDelayFor(items[idx]));
    }
    scheduleNext();

    rotatorCancels.push(() => { stopped = true; clearTimeout(timeoutId); });
  }
}

// One random item from a JSON list (e.g. data/ambient-tracks.json),
// picked fresh on each page load — not a cycling rotator, just a teaser.
// Items that already have a "title" (decided) are skipped, since the
// point is to tease the still-unnamed ones and invite a suggestion.
async function initRandomPicks() {
  const els = document.querySelectorAll('.entry-random[data-random-from]');
  for (const el of els) {
    try {
      const res = await fetch(el.dataset.randomFrom);
      const items = await res.json();
      const open = items.filter(item => !item.title);
      const pool = open.length ? open : items;
      if (!pool.length) continue;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      el.innerHTML = ambientTrackInner(pick);
      ambientBindSuggestForms(el);
    } catch (e) { /* leave blank */ }
  }
}

function renderFeed(filterTag) {
  stopRotators();
  const list = document.getElementById('feedList');
  const isAll = !filterTag || filterTag === 'all';
  const filtered = isAll
    ? allEntries.filter(e => !(e.tags || []).includes('.seed') && !e.hideFromAll)
    : allEntries.filter(e => (e.tags || []).includes(filterTag));

  if (!filtered.length) {
    list.innerHTML = '<p class="empty-state">まだ何もありません。</p>';
    return;
  }

  let html = '';
  let rest = filtered;

  if (isAll) {
    const pinned = filtered.filter(e => e.pinned);
    rest = filtered.filter(e => !e.pinned);
    html += pinned.map(renderEntry).join('');
  }

  let lastGroup = null;
  for (const entry of rest) {
    const group = groupKeyOf(entry.date);
    if (group !== lastGroup) {
      html += `<h2 class="feed-year">${group}</h2>`;
      lastGroup = group;
    }
    html += renderEntry(entry);
  }
  list.innerHTML = html;
  initRotators();
  initRandomPicks();
}

let tagDescriptions = {};

async function loadTagDescriptions() {
  try {
    const res = await fetch('data/tags.json');
    tagDescriptions = await res.json();
  } catch (e) {
    tagDescriptions = {};
  }
}

function updateTagDesc(tag) {
  const el = document.getElementById('tagDesc');
  if (!tag || tag === 'all') {
    el.innerHTML = '';
    return;
  }
  const info = tagDescriptions[tag];
  if (!info) {
    el.innerHTML = '';
    return;
  }
  const links = (info.links || [])
    .map(l => `<a class="tag-desc-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`)
    .join('');
  el.innerHTML = `
    ${links ? `<div class="tag-desc-links">${links}</div>` : ''}
    <p class="tag-desc-text">${escapeHtml(info.desc || '')}</p>
  `;
}

const TAG_ORDER = ['.audio', '.text', '.visual', '.app', '.seed'];

function buildTagFilter() {
  const bar = document.getElementById('tagFilter');
  const used = new Set(allEntries.flatMap(e => e.tags || []));
  const tags = TAG_ORDER.filter(t => used.has(t));

  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-pill';
    btn.dataset.tag = tag;
    btn.textContent = tag;
    bar.appendChild(btn);
  });

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-pill');
    if (!btn) return;
    bar.querySelectorAll('.tag-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderFeed(btn.dataset.tag);
    updateTagDesc(btn.dataset.tag);
  });
}

async function init() {
  await loadTitles();
  const local = await loadLocalEntries();
  await loadTagDescriptions();
  allEntries = local.filter(e => !e.hidden).sort((a, b) => new Date(b.date) - new Date(a.date));
  buildTagFilter();
  renderFeed('all');
}

init();
