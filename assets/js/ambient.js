document.getElementById('year').textContent = new Date().getFullYear();

// Track list lives in data/ambient-tracks.json (shared with the random
// pick shown on the home page). A track with a "title" already has its
// name decided (from a past suggestion) and shows that instead of the
// filename, with no further suggestion form; the rest show the filename
// as a placeholder with the form still open. Rendering itself is shared
// with the home-feed teaser — see assets/js/ambient-shared.js.

async function init() {
  const res = await fetch('data/ambient-tracks.json');
  const tracks = await res.json();
  document.getElementById('ambientList').innerHTML = tracks
    .map(t => `<div class="ambient-track">${ambientTrackInner(t)}</div>`)
    .join('');
}

init();

ambientBindSuggestForms(document.getElementById('ambientList'));
