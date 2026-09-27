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
  // Internal links (index.html?tag=..., av.html, etc.) navigate in the same
  // tab; only genuinely external links open a new one.
  const isInternal = entry.link && !/^https?:\/\//.test(entry.link);
  const linkAttrs = isInternal ? '' : ' target="_blank" rel="noopener"';
  const titleHtml = entry.link
    ? `<a href="${escapeHtml(entry.link)}"${linkAttrs}>${escapeHtml(entry.title)}</a>`
    : escapeHtml(entry.title);
  // If a section has "more" text behind a もっと読む toggle, the image and
  // afterEmbed button (if any) wait behind that same toggle too, instead of
  // always showing.
  const hasMore = (entry.sections || []).some(s => s.more);
  const moreExtraClass = hasMore ? ' entry-more-extra' : '';
  const moreExtraAttr = hasMore ? ' hidden' : '';

  const mainContent = `
      ${entry.link && !entry.embed && !entry.linkInBody ? `<p class="entry-link-url">${entry.linkPrefix ? escapeHtml(entry.linkPrefix) + ' ' : '↗ '}<a href="${escapeHtml(entry.link)}"${linkAttrs}>${escapeHtml(entry.linkLabel || entry.link)}</a></p>` : ''}
      ${entry.sections ? renderSections(entry.sections) : (entry.body ? `<p class="entry-body">${renderTextWithLinks(entry.body)}</p>` : '')}
      ${entry.image ? `<img class="entry-image${moreExtraClass}"${moreExtraAttr} src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.title)}" loading="lazy">` : ''}
      ${entry.images ? `<div class="entry-image-row">${entry.images.map(src => `<img src="${escapeHtml(src)}" alt="${escapeHtml(entry.title)}" loading="lazy">`).join('')}</div>` : ''}
      ${entry.embed ? `<div class="entry-embed">${entry.embed}</div>` : ''}
      ${entry.afterEmbed ? `<p class="entry-after-embed${moreExtraClass}"${moreExtraAttr}>${renderTextWithLinks(entry.afterEmbed)}</p>` : ''}
      ${entry.rotator ? (
        entry.rotatorLinked && entry.link
          ? `<a class="entry-rotator" href="${escapeHtml(entry.link)}" target="_blank" rel="noopener" data-rotator="${escapeHtml(entry.rotator)}"><span class="rotator-text"></span></a>`
          : `<div class="entry-rotator" data-rotator="${escapeHtml(entry.rotator)}"><span class="rotator-text"></span></div>`
      ) : ''}
      ${entry.avPreview ? `<div class="entry-av-preview" data-av-preview data-href="${escapeHtml(entry.link || '')}"><span class="av-preview-combo"></span><button class="av-preview-reroll" type="button" aria-label="組み合わせを変える">⟳</button></div>` : ''}
      ${entry.quickReply ? `<div class="entry-quick-reply"><textarea class="quick-reply-textarea" rows="1" placeholder="${escapeHtml(entry.quickReply)}"></textarea><button class="quick-reply-send" type="button">送る</button></div>` : ''}
      ${entry.bodyAfter ? `<p class="entry-body">${renderTextWithLinks(entry.bodyAfter)}</p>` : ''}
  `;

  const embedHtml = entry.embedFrom
    ? `<div class="entry-embed-page" data-embed-from="${escapeHtml(entry.embedFrom)}"><p class="empty-state">読み込み中…</p></div>`
    : '';

  // 埋め込みページを持つエントリ(GitHuman)だけ、手紙部分と全文部分を
  // 別々の枠(.entry-box)に分ける。それ以外のエントリは今までどおりフラット。
  const bodyHtml = entry.embedFrom
    ? `<div class="entry-box">${mainContent}</div><div class="entry-box entry-box-embed">${embedHtml}</div>`
    : mainContent + embedHtml;

  return `
    <article class="entry" data-tags="${tags.join(' ')}">
      <div class="entry-meta">
        <time>${escapeHtml(entry.dateLabel || formatDate(entry.date))}</time>
        ${tagHtml}
      </div>
      <h3 class="entry-title">${titleHtml}</h3>
      ${bodyHtml}
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

// トップの解説キャプション(.caption、静的HTML)専用の「さらに読む」— 上の
// .read-more-btn はフィードの.entry/.entry-section前提なので使い回さず、
// 別のボタンクラスに分けてある(同じセレクタで拾うと .closest('.entry') が
// nullになって壊れる)。
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.caption-more-btn');
  if (!btn) return;
  const more = btn.parentElement.querySelector('.caption-more');
  const willShow = more.hidden;
  more.hidden = !willShow;
  btn.textContent = willShow ? '閉じる' : 'さらに読む';
});

// tane.html(企画の種の全文)の各セクション。GitHubエントリに埋め込まれた
// 分も含め、クリックで開閉するだけの単純な委譲ハンドラなので、
// initEmbeddedPages()が後からコンテンツを差し込んでも配線し直す必要がない。
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.tane-accordion-toggle');
  if (!btn) return;
  const body = btn.nextElementSibling;
  const willShow = body.hidden;
  body.hidden = !willShow;
  btn.setAttribute('aria-expanded', String(willShow));
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

// ---- av.html preview: a tiny, click-to-reroll taste of "video × music" for
// the home feed. Only fetches the small JSON lists (labels/titles) — never
// the actual video/audio files — so it stays cheap even though av.html
// itself is heavier once you're on that page.
let avVideos = null;
let avMusic = null;

async function loadAvPreviewData() {
  if (avVideos && avMusic) return;
  try {
    const [vRes, mRes] = await Promise.all([fetch('data/av-videos.json'), fetch('data/av-music.json')]);
    avVideos = await vRes.json();
    avMusic = await mRes.json();
  } catch (e) {
    avVideos = [];
    avMusic = [];
  }
}

function randomAvCombo() {
  const v = avVideos[Math.floor(Math.random() * avVideos.length)];
  const m = avMusic[Math.floor(Math.random() * avMusic.length)];
  return `${v.label} × ${m.title}`;
}

async function initAvPreviews() {
  const els = document.querySelectorAll('.entry-av-preview[data-av-preview]');
  if (!els.length) return;
  await loadAvPreviewData();
  if (!avVideos.length || !avMusic.length) return;
  els.forEach(el => {
    const comboEl = el.querySelector('.av-preview-combo');
    const btn = el.querySelector('.av-preview-reroll');
    comboEl.textContent = randomAvCombo();
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      comboEl.textContent = randomAvCombo();
      btn.classList.add('spin');
      setTimeout(() => btn.classList.remove('spin'), 300);
    });
    // The whole box is a link to av.html too — only the reroll button (which
    // stops propagation above) opts out of that.
    const href = el.dataset.href;
    if (href) {
      el.classList.add('is-linked');
      el.addEventListener('click', () => { window.location.href = href; });
    }
  });
}

// ---- Embed another page's content inline in an entry (entry.embedFrom:
// "url.html#containerId"). Used so the GitHuman entry can show tane.html's
// full text right below itself instead of just linking out to it — one
// source of truth (tane.html), fetched and inlined rather than duplicated
// into entries.json.
async function initEmbeddedPages() {
  const els = document.querySelectorAll('.entry-embed-page[data-embed-from]');
  for (const el of els) {
    const [url, selector] = el.dataset.embedFrom.split('#');
    try {
      const res = await fetch(url);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const source = selector ? doc.getElementById(selector) : doc.body;
      el.innerHTML = source ? source.innerHTML : '<p class="empty-state">読み込めませんでした。</p>';
      // tane.htmlの中身は種６のようにそれ自身の.entry-quick-replyを持つことが
      // あるので、差し込んだ後にもう一度配線する(data-wiredで二重配線は防止済み)。
      if (typeof initQuickReply === 'function') initQuickReply();
    } catch (e) {
      el.innerHTML = '<p class="empty-state">読み込めませんでした。</p>';
    }
  }
}

// Quick reply ("ひとこと〜") now lives in assets/js/quick-reply.js, shared
// across every page's footer — it self-initializes on load, so nothing to
// call here.

// トップレベルのナビは top/publication/playground(+about、別ページ)の4つ。
// 旧来の.audio/.text/.visual/.app/.seedタグは「playgroundのサブタグ」という
// 位置づけになり、playgroundを選んだときだけ#subTagFilterに出てくる。
const PLAYGROUND_SUB_TAGS = ['.audio', '.text', '.visual', '.app', '.seed'];

// これらのタグが付いたエントリは"all"(top)表示には出ない(タグを選んだと
// きだけ出る)。.seedは元からの仕様、publicationはGitHumanの全文を
// たたんでおくために追加。
const TAGS_HIDDEN_FROM_ALL = ['.seed', 'publication'];

function renderFeed(filterTag) {
  stopRotators();
  const list = document.getElementById('feedList');
  const isAll = !filterTag || filterTag === 'all';
  const isPlayground = filterTag === 'playground';
  const filtered = isAll
    ? allEntries.filter(e => !(e.tags || []).some(t => TAGS_HIDDEN_FROM_ALL.includes(t)) && !e.hideFromAll)
    : isPlayground
      ? allEntries.filter(e => (e.tags || []).some(t => PLAYGROUND_SUB_TAGS.includes(t)))
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

  // publicationはGitHuman本体1件だけの特別枠なので、季節見出しは出さない
  const showYearHeadings = filterTag !== 'publication';
  let lastGroup = null;
  for (const entry of rest) {
    const group = groupKeyOf(entry.date);
    if (showYearHeadings && group !== lastGroup) {
      html += `<h2 class="feed-year">${group}</h2>`;
      lastGroup = group;
    }
    html += renderEntry(entry);
  }
  list.innerHTML = html;
  initRotators();
  initAvPreviews();
  initEmbeddedPages();
  if (typeof initQuickReply === 'function') initQuickReply();
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
  // top/playground/publicationは束ねる側の概念なので、個別の説明文は出さない
  if (!tag || tag === 'all' || tag === 'playground' || tag === 'publication') {
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
    <p class="tag-desc-text">${renderTextWithLinks(info.desc || '')}</p>
  `;
}

// 選んだタグに応じて、トップレベルの行とサブタグの行、両方のactive状態と
// サブタグ行の表示/非表示を合わせる。サブタグ(.audio等)を選んだときは、
// トップレベル側は親であるplaygroundをactiveにする。
function updateTagButtons(tag) {
  const isSub = PLAYGROUND_SUB_TAGS.includes(tag);
  const topActiveTag = isSub ? 'playground' : tag;
  document.querySelectorAll('#tagFilter .tag-pill[data-tag]').forEach(b => {
    b.classList.toggle('active', b.dataset.tag === topActiveTag);
  });
  const subBar = document.getElementById('subTagFilter');
  subBar.hidden = !(tag === 'playground' || isSub);
  subBar.querySelectorAll('.tag-pill[data-tag]').forEach(b => {
    b.classList.toggle('active', b.dataset.tag === tag);
  });
}

function selectTag(tag) {
  updateTagButtons(tag);
  renderFeed(tag);
  updateTagDesc(tag);
}

function buildTagFilter() {
  const bar = document.getElementById('tagFilter');
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-pill[data-tag]');
    if (!btn) return;
    selectTag(btn.dataset.tag);
  });

  const subBar = document.getElementById('subTagFilter');
  const used = new Set(allEntries.flatMap(e => e.tags || []));
  PLAYGROUND_SUB_TAGS.filter(t => used.has(t)).forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-pill sub-tag';
    btn.dataset.tag = tag;
    btn.type = 'button';
    btn.textContent = tag;
    subBar.appendChild(btn);
  });
  subBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-pill[data-tag]');
    if (!btn) return;
    selectTag(btn.dataset.tag);
  });
}

async function init() {
  await loadTitles();
  const local = await loadLocalEntries();
  await loadTagDescriptions();
  allEntries = local.filter(e => !e.hidden).sort((a, b) => new Date(b.date) - new Date(a.date));
  buildTagFilter();

  // ?tag=.audio (etc.) in the URL pre-selects that filter on load, so an
  // entry (or an external link) can point straight at a tag's view instead
  // of only "top" — used by the GitHuman entry to link into publication.
  const initialTag = new URLSearchParams(location.search).get('tag') || 'all';
  selectTag(initialTag);
}

init();
