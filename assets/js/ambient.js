document.getElementById('year').textContent = new Date().getFullYear();

// Track list lives in data/ambient-tracks.json (shared with the random
// pick shown on the home page). A track with a "title" already has its
// name decided (from a past suggestion) and shows that instead of the
// filename, with no further suggestion form; the rest show the filename
// as a placeholder with the form still open.

// Title-suggestion form: same no-backend, no-cors POST trick as the
// palindrome vote button, but with two fields so the placeholder title
// travels alongside the suggestion automatically.
const SUGGEST_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSfHQuYkzFidXpT0_eWglxLcHpAKWUv9sIw81ZYUozRcCE1a3A/formResponse';
const SUGGEST_FIELD_TRACK = 'entry.1093501399';
const SUGGEST_FIELD_TITLE = 'entry.193625014';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function trackHtml({ file, title }) {
  const src = `assets/ambi/${encodeURIComponent(file)}.m4a`;
  const decided = Boolean(title);
  return `
    <div class="ambient-track">
      <p class="ambient-title">${decided ? escapeHtml(title) : `${escapeHtml(file)}（仮）`}</p>
      <audio controls preload="none" src="${src}"></audio>
      ${decided ? '' : `
      <form class="ambient-suggest" data-track="${escapeHtml(file)}">
        <input type="text" class="ambient-input" placeholder="タイトル案" required>
        <button type="submit">送る</button>
      </form>
      `}
    </div>
  `;
}

async function init() {
  const res = await fetch('data/ambient-tracks.json');
  const tracks = await res.json();
  document.getElementById('ambientList').innerHTML = tracks.map(trackHtml).join('');
}

init();

document.getElementById('ambientList').addEventListener('submit', (e) => {
  const form = e.target.closest('.ambient-suggest');
  if (!form) return;
  e.preventDefault();

  const input = form.querySelector('.ambient-input');
  const title = input.value.trim();
  if (!title) return;

  const btn = form.querySelector('button');
  btn.disabled = true;
  btn.textContent = '…';

  fetch(SUGGEST_FORM_ACTION, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `${SUGGEST_FIELD_TRACK}=${encodeURIComponent(form.dataset.track)}&${SUGGEST_FIELD_TITLE}=${encodeURIComponent(title)}`,
  }).then(() => {
    btn.textContent = '送りました';
    input.value = '';
    setTimeout(() => { btn.disabled = false; btn.textContent = '送る'; }, 1500);
  }).catch(() => {
    btn.disabled = false;
    btn.textContent = '送る';
  });
});
