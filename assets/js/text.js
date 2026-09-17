document.getElementById('year').textContent = new Date().getFullYear();

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// data/palindromes-full.txt convention:
// - blocks are separated by blank lines. One block = one entry (can be multi-line).
// - a ONE-blank-line gap starts a new group with some extra space above; a
//   TWO-OR-MORE-blank-line gap starts a new group with even more space above.
//   No blank line at all keeps a block going (see the "／" note below).
// - a block that is just "-" or "—" starts a new page instead of being an entry.
// - "／" inside a line is a manual line break (rendered as a real line break),
//   so a multi-line entry can be written as a single txt line, e.g.
//   "天才さんて／憧れがコア／劇まで巻き毛" displays the same as three real lines.
// - a line can end with "＿reading" (full-width underscore) to show the whole line
//   with that reading as furigana above it, e.g. "神のお声＿かみのおこえ".
//   The reading must be kana-only, otherwise the ＿ is left as plain text
//   (so "血の＿＿＿"-style blanks in puzzle text are untouched). A block whose
//   LAST line is only "＿reading" applies that reading to the whole block instead,
//   shown as a small line underneath (real multi-line <ruby> isn't practical).
// - a block whose first line starts with "★" is also in the home page's
//   rotator (data/palindromes.json); the ★ is stripped, no visible marker.
// - a block whose first line starts with "▪" renders in a smaller font
//   (for entries the front page shouldn't shout, e.g. blunter jokes).
// - a block whose first line starts with "＊" is a palindrome haiku (5-7-5).
// - a block whose first line starts with "＋" got votes in the (manual,
//   for now) popularity count.
//   ★▪＊＋ are all stripped, no visible marker, and can combine in any order.
// - a block whose LAST line starts with "©" has an author credit; whatever
//   follows "©" is shown small underneath as-is.
// - a kanji run immediately followed by "[reading]" shows just that run
//   with the reading as furigana above it, e.g. "今日[けふ]" — for one
//   word inline, anywhere in a line. A whole line can instead end with
//   "＿reading" (full-width underscore) to put the reading over the WHOLE
//   line, e.g. "神のお声＿かみのおこえ"; the reading must be kana-only, so
//   "血の＿＿＿"-style blanks in puzzle text are left untouched. A block
//   whose LAST line is only "＿reading" applies that reading to the whole
//   block instead, shown as a small line underneath (real multi-line
//   <ruby> isn't practical) — and counts as one single unit for 文字数順
//   (see below), rather than being split by line.
// - data/palindromes-submitted.txt uses the same block format (no page
//   breaks) and is rendered as a plain list under "投稿された回文" on
//   text.html, below the submit button.
// - 文字数順 counts mora, not raw characters: any "[reading]" or "＿reading"
//   annotation is used where present; kanji left un-annotated is counted
//   as 1 character each (an approximation, since we can't look up readings
//   automatically) — so counts get more accurate as readings are added.
//   A multi-line block is counted per LINE, not as one summed block,
//   unless it carries a whole-block "＿reading" (see above).

const KANA_ONLY = /^[ぁ-んァ-ヶーゝゞ　\s]+$/;
const KANJI_RUN = /([一-鿿々〆ヶゝゞ]+)\[([^\]]+)\]/g;

function renderLine(line) {
  const cut = line.indexOf('＿');
  if (cut !== -1) {
    const text = line.slice(0, cut);
    const reading = line.slice(cut + 1);
    if (text && KANA_ONLY.test(reading)) {
      return `<ruby>${escapeHtml(text)}<rt>${escapeHtml(reading)}</rt></ruby>`;
    }
  }
  let html = '';
  let last = 0;
  for (const m of line.matchAll(KANJI_RUN)) {
    html += escapeHtml(line.slice(last, m.index));
    html += `<ruby>${escapeHtml(m[1])}<rt>${escapeHtml(m[2])}</rt></ruby>`;
    last = m.index + m[0].length;
  }
  html += escapeHtml(line.slice(last));
  return html;
}

// The mora-counting text for one line: substitute any reading in for the
// kanji it annotates, otherwise leave the line as-is.
function moraText(line) {
  const cut = line.indexOf('＿');
  if (cut !== -1) {
    const text = line.slice(0, cut);
    const reading = line.slice(cut + 1);
    if (text && KANA_ONLY.test(reading)) return reading;
  }
  return line.replace(KANJI_RUN, (_, kanji, reading) => reading);
}

function parseBlock(block) {
  const lines = block.split('\n').flatMap(l => l.split('／')).map(l => l.replace(/\s+$/, ''));

  let onTop = false;
  let small = false;
  let haiku = false;
  let popular = false;
  while (['★', '▪', '＊', '＋'].some(m => lines[0].startsWith(m))) {
    if (lines[0].startsWith('★')) onTop = true;
    else if (lines[0].startsWith('▪')) small = true;
    else if (lines[0].startsWith('＊')) haiku = true;
    else popular = true;
    lines[0] = lines[0].slice(1);
  }

  let credit = null;
  if (lines.length > 1 && lines[lines.length - 1].startsWith('©')) {
    credit = lines[lines.length - 1].slice(1);
    lines.pop();
  }

  let wholeReading = null;
  if (lines.length > 1 && lines[lines.length - 1].startsWith('＿')) {
    const candidate = lines[lines.length - 1].slice(1);
    if (KANA_ONLY.test(candidate)) {
      wholeReading = candidate;
      lines.pop();
    }
  }

  // For 文字数順: a whole-block reading covers all lines at once, so the
  // block counts as one unit; otherwise each line is its own count (a
  // multi-line block is usually several distinct palindromes grouped
  // together, not one long one, so their lengths shouldn't be summed).
  const counts = wholeReading
    ? [{ html: lines.map(renderLine).join('<br>'), length: wholeReading.length }]
    : lines.map(line => ({ html: renderLine(line), length: moraText(line).length }));

  let html = lines.map(renderLine).join('<br>');
  if (wholeReading) html += `<br><span class="text-entry-reading">${escapeHtml(wholeReading)}</span>`;
  if (credit) html += `<br><span class="text-entry-credit">${escapeHtml(credit)}</span>`;

  return { html, onTop, small, haiku, popular, multiline: lines.length > 1, counts };
}

// ---- Voting ----
// A small ♡ button per entry posts the entry's plain text into a
// single-short-answer Google Form (no page navigation, no-cors so we can't
// read the response back). Tallying who "won" is still a manual read of
// the form's response spreadsheet — this just collects the votes.
const VOTE_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLScEhGtxMN1ZeqSuzg7NYeBdKgvBEnmJIltvnSS_Fd0-sPHZJQ/formResponse';
const VOTE_FORM_FIELD = 'entry.1063006385';
const VOTED_KEY = 'wunderkammer-voted';

function plainTextOf(html) {
  return html
    .replace(/<rt>.*?<\/rt>/gi, '')
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function getVoted() {
  try { return new Set(JSON.parse(localStorage.getItem(VOTED_KEY) || '[]')); } catch { return new Set(); }
}
function addVoted(text) {
  try {
    const s = getVoted();
    s.add(text);
    localStorage.setItem(VOTED_KEY, JSON.stringify([...s]));
  } catch { /* private mode etc: voting still works, just not remembered */ }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.vote-btn');
  if (!btn || btn.disabled) return;
  const text = btn.dataset.text;
  btn.disabled = true;
  btn.textContent = '…';
  fetch(VOTE_FORM_ACTION, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `${VOTE_FORM_FIELD}=${encodeURIComponent(text)}`,
  }).then(() => {
    btn.textContent = '♡';
    addVoted(text);
  }).catch(() => {
    btn.textContent = '♡';
    btn.disabled = false;
  });
});

function entryHtml(entry) {
  const gapClass = ['', ' is-new-cluster', ' is-new-section'];
  const bodyClass = (entry.multiline ? ' is-multiline' : '') + (entry.small ? ' is-small' : '');
  const plain = plainTextOf(entry.html);
  const voted = getVoted().has(plain);
  return `
    <div class="text-entry${gapClass[entry.gap]}">
      <p class="text-entry-body${bodyClass}">${entry.html}</p>
      <button class="vote-btn" type="button" data-text="${escapeHtml(plain)}" aria-label="投票"${voted ? ' disabled' : ''}>♡</button>
    </div>
  `;
}

function gapFor(sep) {
  const blankLines = (sep.match(/\n/g) || []).length - 1;
  if (blankLines === 1) return 1;
  if (blankLines >= 2) return 2;
  return 0;
}

async function loadPages() {
  const res = await fetch('data/palindromes-full.txt');
  const raw = await res.text();
  // Keep the separators so we can tell a one-blank-line gap apart from
  // a two-or-more-blank-line gap.
  const parts = raw.split(/(\n[ \t]*\n+)/);

  const pages = [[]];
  let gap = 0;
  for (let i = 0; i < parts.length; i += 2) {
    const block = parts[i].trim();
    if (!block) continue;
    if (block === '-' || block === '—') {
      pages.push([]);
      gap = 0;
      continue;
    }
    pages[pages.length - 1].push({ ...parseBlock(block), gap });
    gap = gapFor(parts[i + 1] || '');
  }
  return pages.filter(p => p.length);
}

async function loadSubmitted() {
  const res = await fetch('data/palindromes-submitted.txt');
  if (!res.ok) return [];
  const raw = await res.text();
  const parts = raw.split(/(\n[ \t]*\n+)/);

  const list = [];
  let gap = 0;
  for (let i = 0; i < parts.length; i += 2) {
    const block = parts[i].trim();
    if (!block) continue;
    list.push({ ...parseBlock(block), gap });
    gap = gapFor(parts[i + 1] || '');
  }
  return list;
}

// ---- Sort modes ----
// "default" keeps the hand-curated pages (page breaks + gap tiers) as-is.
// "newest" flips the page ORDER only; each page's own entries stay in place.
// "length" drops the curated grouping (it wouldn't mean anything once
// reordered), splits every block into its counts (see parseBlock), and
// re-chunks those, longest first, into flat pages.
// "popular" keeps only entries marked ★ and/or ＋, ranked by how many of
// those two marks they carry (both beats one beats neither, so neither
// is excluded).
// "haiku" keeps only ＊-marked entries, in their normal (default) order.
const CHUNK_SIZE = 10;

function chunk(items) {
  const chunks = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) chunks.push(items.slice(i, i + CHUNK_SIZE));
  return chunks;
}

function pagesForSort(mode) {
  if (mode === 'newest') return pages.slice().reverse();
  if (mode === 'length') {
    const items = pages.flat().flatMap(e => e.counts.map(c => ({ html: c.html, length: c.length, small: e.small, multiline: false, gap: 0 })));
    return chunk(items.sort((a, b) => b.length - a.length));
  }
  if (mode === 'popular') {
    const items = pages.flat()
      .filter(e => e.onTop || e.popular)
      .map(e => ({ ...e, gap: 0, score: (e.onTop ? 1 : 0) + (e.popular ? 1 : 0) }))
      .sort((a, b) => b.score - a.score);
    return chunk(items);
  }
  if (mode === 'haiku') {
    return chunk(pages.flat().filter(e => e.haiku).map(e => ({ ...e, gap: 0 })));
  }
  return pages;
}

let pages = [];
let sortMode = 'default';
let pageIndex = 0;

function renderPage() {
  const list = document.getElementById('palindromeList');
  const sorted = pagesForSort(sortMode);
  const page = sorted[pageIndex] || [];

  list.innerHTML = page.map(entryHtml).join('');

  document.getElementById('pageIndicator').textContent = `${pageIndex + 1} / ${sorted.length}`;
  document.getElementById('prevPage').disabled = pageIndex === 0;
  document.getElementById('nextPage').disabled = pageIndex === sorted.length - 1;
}

document.getElementById('prevPage').addEventListener('click', () => {
  if (pageIndex > 0) { pageIndex--; renderPage(); window.scrollTo({ top: 0 }); }
});
document.getElementById('nextPage').addEventListener('click', () => {
  if (pageIndex < pagesForSort(sortMode).length - 1) { pageIndex++; renderPage(); window.scrollTo({ top: 0 }); }
});

document.getElementById('textSort').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-sort]');
  if (!btn || btn.classList.contains('active')) return;
  document.querySelectorAll('#textSort .tag-pill').forEach(b => b.classList.toggle('active', b === btn));
  sortMode = btn.dataset.sort;
  pageIndex = 0;
  renderPage();
  window.scrollTo({ top: 0 });
});

async function init() {
  pages = await loadPages();
  renderPage();

  const submitted = await loadSubmitted();
  document.getElementById('submittedList').innerHTML = submitted.map(entryHtml).join('');
}

init();
