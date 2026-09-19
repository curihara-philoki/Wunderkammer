// Shared between ambient.html (full track list) and main.js (the one
// random still-open track teased on the home feed), so both render the
// same player+suggestion-form markup and post to the same form.

const AMBIENT_SUGGEST_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSfHQuYkzFidXpT0_eWglxLcHpAKWUv9sIw81ZYUozRcCE1a3A/formResponse';
const AMBIENT_SUGGEST_FIELD_TRACK = 'entry.1093501399';
const AMBIENT_SUGGEST_FIELD_TITLE = 'entry.193625014';

function ambientEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// Just the title/player/form for one track — no outer wrapper, so callers
// can wrap it however fits their layout (a list item vs. a feed teaser).
function ambientTrackInner({ file, title }) {
  const src = `assets/ambi/${encodeURIComponent(file)}.m4a`;
  const decided = Boolean(title);
  return `
    ${decided ? `<p class="ambient-original">${ambientEscapeHtml(file)}（仮）</p>` : ''}
    <p class="ambient-title">${decided ? ambientEscapeHtml(title) : `${ambientEscapeHtml(file)}（仮）`}</p>
    <audio controls preload="none" src="${src}"></audio>
    ${decided ? '' : `
    <form class="ambient-suggest" data-track="${ambientEscapeHtml(file)}">
      <input type="text" class="ambient-input" placeholder="タイトル案" required>
      <button type="submit">送る</button>
    </form>
    `}
  `;
}

// Delegated submit handler for any container holding .ambient-suggest forms.
function ambientBindSuggestForms(container) {
  container.addEventListener('submit', (e) => {
    const form = e.target.closest('.ambient-suggest');
    if (!form) return;
    e.preventDefault();

    const input = form.querySelector('.ambient-input');
    const title = input.value.trim();
    if (!title) return;

    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = '…';

    fetch(AMBIENT_SUGGEST_FORM_ACTION, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `${AMBIENT_SUGGEST_FIELD_TRACK}=${encodeURIComponent(form.dataset.track)}&${AMBIENT_SUGGEST_FIELD_TITLE}=${encodeURIComponent(title)}`,
    }).then(() => {
      btn.textContent = '送りました';
      input.value = '';
      setTimeout(() => { btn.disabled = false; btn.textContent = '送る'; }, 1500);
    }).catch(() => {
      btn.disabled = false;
      btn.textContent = '送る';
    });
  });
}
