document.getElementById('year').textContent = new Date().getFullYear();

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// data/palindromes-full.txt convention:
// - blocks are separated by blank lines. One block = one entry (can be multi-line).
// - a SINGLE blank line keeps an entry close to the one before it; TWO starts a
//   new group with some extra space above; THREE OR MORE starts a new group with
//   even more space above.
// - a block that is just "-" or "—" starts a new page instead of being an entry.
// - a line can end with "＿reading" (full-width underscore) to show the whole line
//   with that reading as furigana above it, e.g. "神のお声＿かみのおこえ".
//   The reading must be kana-only, otherwise the ＿ is left as plain text
//   (so "血の＿＿＿"-style blanks in puzzle text are untouched). A block whose
//   LAST line is only "＿reading" applies that reading to the whole block instead,
//   shown as a small line underneath (real multi-line <ruby> isn't practical).
// - a block whose first line starts with "★" is also in the home page's
//   rotator (data/palindromes.json); the ★ is stripped, no visible marker.

const KANA_ONLY = /^[ぁ-んァ-ヶーゝゞ　\s]+$/;

function renderLine(line) {
  const cut = line.indexOf('＿');
  if (cut === -1) return escapeHtml(line);
  const text = line.slice(0, cut);
  const reading = line.slice(cut + 1);
  if (!text || !KANA_ONLY.test(reading)) return escapeHtml(line);
  return `<ruby>${escapeHtml(text)}<rt>${escapeHtml(reading)}</rt></ruby>`;
}

async function loadPages() {
  const res = await fetch('data/palindromes-full.txt');
  const raw = await res.text();
  // Keep the separators so we can tell a single blank line (same cluster)
  // apart from two-or-more (new cluster).
  const parts = raw.split(/(\n[ \t]*\n+)/);

  const pages = [[]];
  let gap = 0; // 0 = tight, 1 = two blank lines, 2 = three-or-more blank lines
  for (let i = 0; i < parts.length; i += 2) {
    const block = parts[i].trim();
    if (!block) continue;
    if (block === '-' || block === '—') {
      pages.push([]);
      gap = 0;
      continue;
    }
    const lines = block.split('\n').map(l => l.replace(/\s+$/, ''));

    const onTop = lines[0].startsWith('★');
    if (onTop) lines[0] = lines[0].slice(1);

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

    pages[pages.length - 1].push({ html, onTop, gap, multiline: lines.length > 1 });
    gap = 0;

    const sep = parts[i + 1] || '';
    const blankLines = (sep.match(/\n/g) || []).length - 1;
    if (blankLines === 2) gap = 1;
    else if (blankLines >= 3) gap = 2;
  }
  return pages.filter(p => p.length);
}

// ---- Render ----
let pages = [];
let pageIndex = 0;

function renderPage() {
  const list = document.getElementById('palindromeList');
  const page = pages[pageIndex] || [];

  const gapClass = ['', ' is-new-cluster', ' is-new-section'];
  list.innerHTML = page.map(entry => `
    <div class="text-entry${gapClass[entry.gap]}">
      <p class="text-entry-body${entry.multiline ? ' is-multiline' : ''}">${entry.html}</p>
    </div>
  `).join('');

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
}

init();
