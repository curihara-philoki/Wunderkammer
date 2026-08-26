document.getElementById('year').textContent = new Date().getFullYear();

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// data/palindromes-full.txt convention:
// - blocks are separated by blank lines. One block = one entry (can be multi-line).
// - a block that is just "-" or "—" starts a new page instead of being an entry.
// - a line can end with "＿reading" (full-width underscore) to show the whole line
//   with that reading as furigana above it, e.g. "神のお声＿かみのおこえ".
//   The reading must be kana-only, otherwise the ＿ is left as plain text
//   (so "血の＿＿＿"-style blanks in puzzle text are untouched).
// - a block whose first line starts with "★" is also in the home page's
//   rotator (data/palindromes.json); the ★ is stripped and shown as a small tag.

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
  const blocks = raw.split(/\n[ \t]*\n+/).map(b => b.trim()).filter(Boolean);

  const pages = [[]];
  for (const block of blocks) {
    if (block === '-' || block === '—') {
      pages.push([]);
      continue;
    }
    const lines = block.split('\n').map(l => l.trim());
    const onTop = lines[0].startsWith('★');
    if (onTop) lines[0] = lines[0].slice(1);
    const html = lines.map(renderLine).join('<br>');
    pages[pages.length - 1].push({ html, onTop });
  }
  return pages.filter(p => p.length);
}

// ---- Render ----
let pages = [];
let pageIndex = 0;

function renderPage() {
  const list = document.getElementById('palindromeList');
  const page = pages[pageIndex] || [];

  list.innerHTML = page.map(entry => `
    <div class="text-entry">
      <p class="text-entry-body">${entry.html}</p>
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
