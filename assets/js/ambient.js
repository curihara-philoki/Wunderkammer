document.getElementById('year').textContent = new Date().getFullYear();

// Track list lives in data/ambient-tracks.json. A track with a "title"
// already has its name decided (from a past suggestion) and shows that
// instead of the filename, with no further suggestion form; the rest show
// the filename as a placeholder with the form still open. Rendering itself
// is shared with the "random pick" button below — see assets/js/ambient-shared.js.

let tracks = [];

async function init() {
  const res = await fetch('data/ambient-tracks.json');
  tracks = await res.json();
  document.getElementById('ambientList').innerHTML = tracks
    .map(t => `<div class="ambient-track" data-file="${ambientEscapeHtml(t.file)}">${ambientTrackInner(t)}</div>`)
    .join('');
}

init();

ambientBindSuggestForms(document.getElementById('ambientList'));

// "どれにするか迷ったら" button: picks one still-undecided track, scrolls
// to it, flashes it, plays it, and focuses its suggestion input.
document.getElementById('ambientRandomBtn').addEventListener('click', () => {
  const open = tracks.filter(t => !t.title);
  const pool = open.length ? open : tracks;
  if (!pool.length) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  const el = document.querySelector(`.ambient-track[data-file="${CSS.escape(pick.file)}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('is-picked');
  void el.offsetWidth; // restart the flash animation on repeat clicks
  el.classList.add('is-picked');
  el.querySelector('.ambient-input')?.focus({ preventScroll: true });

  document.querySelectorAll('.ambient-track audio').forEach(a => { if (a !== el.querySelector('audio')) a.pause(); });
  el.querySelector('audio')?.play().catch(() => {});
});
