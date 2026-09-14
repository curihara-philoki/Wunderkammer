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
//   (for entries the front page shouldn't shout, e.g. blunter jokes);
//   the ▪ is stripped, no visible marker. Can combine with ★ in any order.
// - a block whose LAST line starts with "©" has an author credit; whatever
//   follows "©" is shown small underneath as-is.
// - data/palindromes-submitted.txt uses the same block format (no page
//   breaks) and is rendered as a plain list under "投稿された回文" on
//   text.html, below the submit button.

const KANA_ONLY = /^[ぁ-んァ-ヶーゝゞ　\s]+$/;

function renderLine(line) {
  const cut = line.indexOf('＿');
  if (cut === -1) return escapeHtml(line);
  const text = line.slice(0, cut);
  const reading = line.slice(cut + 1);
  if (!text || !KANA_ONLY.test(reading)) return escapeHtml(line);
  return `<ruby>${escapeHtml(text)}<rt>${escapeHtml(reading)}</rt></ruby>`;
}

function parseBlock(block) {
  const lines = block.split('\n').flatMap(l => l.split('／')).map(l => l.replace(/\s+$/, ''));

  let onTop = false;
  let small = false;
  while (lines[0].startsWith('★') || lines[0].startsWith('▪')) {
    if (lines[0].startsWith('★')) onTop = true;
    else small = true;
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

  let html = lines.map(renderLine).join('<br>');
  if (wholeReading) html += `<br><span class="text-entry-reading">${escapeHtml(wholeReading)}</span>`;
  if (credit) html += `<br><span class="text-entry-credit">${escapeHtml(credit)}</span>`;

  return { html, onTop, small, multiline: lines.length > 1 };
}

function entryHtml(entry) {
  const gapClass = ['', ' is-new-cluster', ' is-new-section'];
  const bodyClass = (entry.multiline ? ' is-multiline' : '') + (entry.small ? ' is-small' : '');
  return `
    <div class="text-entry${gapClass[entry.gap]}">
      <p class="text-entry-body${bodyClass}">${entry.html}</p>
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

// ---- Render ----
let pages = [];
let pageIndex = 0;

function renderPage() {
  const list = document.getElementById('palindromeList');
  const page = pages[pageIndex] || [];

  list.innerHTML = page.map(entryHtml).join('');

  document.getElementById('pageIndicator').textContent = `${pageIndex + 1} / ${pages.length}`;
  document.getElementById('prevPage').disabled = pageIndex === 0;
  document.getElementById('nextPage').disabled = pageIndex === pages.length - 1;
}

document.getElementById('prevPage').addEventListener('click', () => {
  if (pageIndex > 0) { pageIndex--; renderPage(); window.scrollTo({ top: 0 }); }
});
document.getElementById('nextPage').addEventListener('click', () => {
  if (pageIndex < pages.length - 1) { pageIndex++; renderPage(); window.scrollTo({ top: 0 }); }
});

async function init() {
  pages = await loadPages();
  renderPage();

  const submitted = await loadSubmitted();
  document.getElementById('submittedList').innerHTML = submitted.map(entryHtml).join('');
}

init();
