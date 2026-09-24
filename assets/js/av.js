document.getElementById('year').textContent = new Date().getFullYear();

// Hidden-player technique adapted from otaotaotao/music.txt: YouTube and
// SoundCloud both expose a JS API that lets us control playback with no
// visible player at all, so the music plays purely in the background
// while the GIF is what's actually shown. Spotify/Apple Music/Bandcamp
// don't allow that (native embeds only) — not supported here yet since
// none of the current tracks need it, but data/av-music.json could add
// one later as a small visible embed next to the stage.

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function whenYTReady(cb) {
  if (window.YT && window.YT.Player) { cb(); return; }
  const iv = setInterval(() => {
    if (window.YT && window.YT.Player) { clearInterval(iv); cb(); }
  }, 100);
}

const IS_IOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Mobile browsers (iOS Safari especially, but not only) sometimes ignore
// the very first play() call on a fresh YouTube/SoundCloud iframe — the
// same quirk otaotaotao/music.txt works around. Retrying a couple of
// times, muted-first on iOS, is that fix.
function tryPlayUntil(player, maxAttempts) {
  let attempt = 0;
  function attempt_() {
    player.play();
    attempt++;
    setTimeout(() => {
      if (player.isPlaying() || attempt > maxAttempts) return;
      attempt_();
    }, 300);
  }
  attempt_();
}

function startPlayback(player) {
  if (IS_IOS) {
    player.mute();
    player.unmute();
  }
  tryPlayUntil(player, 3);
}

// Short crossfade between the old and new player. iOS Safari ignores JS
// volume changes on embedded video/audio (a platform restriction, not a
// bug — same note as in otaotaotao/music.txt), so a smooth fade isn't
// possible there; it gets a plain cut instead.
const CROSSFADE_MS = 900;

function crossfadeTo(newPlayer, oldPlayer) {
  if (newPlayer === oldPlayer) return;
  if (IS_IOS) {
    startPlayback(newPlayer);
    if (oldPlayer) oldPlayer.pause();
    return;
  }
  newPlayer.setVolume(0);
  tryPlayUntil(newPlayer, 3);
  const steps = 20;
  let i = 0;
  const iv = setInterval(() => {
    i++;
    const t = i / steps;
    if (oldPlayer) oldPlayer.setVolume(Math.max(0, Math.round(100 * (1 - t))));
    newPlayer.setVolume(Math.min(100, Math.round(100 * t)));
    if (i >= steps) {
      clearInterval(iv);
      if (oldPlayer) oldPlayer.pause();
    }
  }, CROSSFADE_MS / steps);
}

function hiddenSlot(id) {
  const div = document.createElement('div');
  div.id = id;
  div.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  document.body.appendChild(div);
  return div;
}

// A fresh player isn't ready the instant it's created, but crossfadeTo()
// wants to call setVolume(0) and then play() on it right away, in that
// order — so calls made before "ready" queue up (in order) and flush once
// the player actually exists, instead of the single most-recent-call-wins
// slot this used to be (which silently dropped the volume-then-play pair
// down to just "play", breaking the fade-in for a track's first play).
function makeYouTubePlayer(id, videoId) {
  let yt = null;
  let ready = false;
  let queue = [];
  function call(fn) { if (ready) fn(); else queue.push(fn); }
  hiddenSlot(id);
  whenYTReady(() => {
    yt = new YT.Player(id, {
      height: '0',
      width: '0',
      videoId,
      playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
      events: { onReady: () => { ready = true; queue.forEach(fn => fn()); queue = []; } },
    });
  });
  return {
    play() { call(() => yt.playVideo()); },
    pause() { if (ready) yt.pauseVideo(); },
    mute() { if (ready) yt.mute(); },
    unmute() { if (ready) yt.unMute(); },
    setVolume(v) { call(() => yt.setVolume(v)); },
    isPlaying() { return ready && yt.getPlayerState() === 1; },
  };
}

function makeSoundCloudPlayer(id, url) {
  const iframe = document.createElement('iframe');
  iframe.id = id;
  iframe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;border:0;';
  iframe.scrolling = 'no';
  iframe.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) +
    '&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false';
  document.body.appendChild(iframe);

  let widget = null;
  let ready = false;
  let queue = [];
  let playing = false;
  function call(fn) { if (ready) fn(); else queue.push(fn); }
  widget = SC.Widget(iframe);
  widget.bind(SC.Widget.Events.READY, () => {
    ready = true;
    queue.forEach(fn => fn());
    queue = [];
  });
  widget.bind(SC.Widget.Events.PLAY, () => { playing = true; });
  widget.bind(SC.Widget.Events.PAUSE, () => { playing = false; });
  widget.bind(SC.Widget.Events.FINISH, () => { playing = false; });
  return {
    play() { call(() => widget.play()); },
    pause() { if (ready) widget.pause(); },
    mute() { if (ready) widget.setVolume(0); },
    unmute() { if (ready) widget.setVolume(100); },
    setVolume(v) { call(() => widget.setVolume(v)); },
    isPlaying() { return playing; },
  };
}

let videos = [];
let musicTracks = [];
const playerCache = {};
let currentPlayer = null;
let currentMusicIndex = null;

// GIFs are plain <img> (self-looping, silent, no control needed); real
// video files (.mov etc.) need a <video> element instead — autoplay/loop/
// muted mirrors a GIF's behavior, and muted keeps this from ever fighting
// the background music for audio (also required for autoplay to work at
// all in most browsers).
function isVideoFile(file) {
  return /\.(mov|mp4|webm|m4v)$/i.test(file);
}

function mediaSrc(file) {
  return `assets/video/${encodeURIComponent(file)}`;
}

// Switching video is treated as "reroll the combination" — the music
// crossfades to a new (different, if there's a choice) random track at
// the same time, unless a caller is about to set the music explicitly
// right after (the random-combo button).
function selectVideo(index, { rerollMusic = true } = {}) {
  const v = videos[index];
  const img = document.getElementById('avVideoImg');
  const mov = document.getElementById('avVideoMov');
  if (isVideoFile(v.file)) {
    img.hidden = true;
    img.removeAttribute('src');
    mov.src = mediaSrc(v.file);
    mov.hidden = false;
  } else {
    mov.hidden = true;
    mov.removeAttribute('src');
    img.src = mediaSrc(v.file);
    img.alt = v.label;
    img.hidden = false;
  }
  document.querySelectorAll('.av-video-list button').forEach((btn, i) => btn.classList.toggle('active', i === index));

  if (typeof playPoemById === 'function') playPoemById(v.poem);

  if (rerollMusic && musicTracks.length) {
    const others = musicTracks.map((_, i) => i).filter(i => i !== currentMusicIndex);
    const pool = others.length ? others : musicTracks.map((_, i) => i);
    selectMusic(pool[Math.floor(Math.random() * pool.length)]);
  }
}

function updateNowPlaying() {
  const el = document.getElementById('avNowPlaying');
  if (currentMusicIndex === null) { el.textContent = ''; return; }
  const t = musicTracks[currentMusicIndex];
  el.textContent = `♪ ${t.title}${t.author ? ' / ' + t.author : ''}`;
}

function selectMusic(index) {
  if (index === currentMusicIndex) return;
  const previousPlayer = currentPlayer;

  document.getElementById('avBandcamp').hidden = true;
  document.getElementById('avBandcamp').innerHTML = '';

  currentMusicIndex = index;
  document.querySelectorAll('.av-music-list button').forEach((btn, i) => btn.classList.toggle('active', i === index));
  updateNowPlaying();

  const track = musicTracks[index];

  if (track.platform === 'bandcamp') {
    if (previousPlayer) previousPlayer.pause();
    currentPlayer = null;
    const bc = document.getElementById('avBandcamp');
    bc.hidden = false;
    bc.innerHTML = `<a href="${escapeHtml(track.url)}" target="_blank" rel="noopener" class="contact-btn">♪ Bandcampで聴く ↗</a>`;
    return;
  }

  if (playerCache[index]) {
    currentPlayer = playerCache[index];
    crossfadeTo(currentPlayer, previousPlayer);
    return;
  }

  const slotId = `avSlot${index}`;
  const player = track.platform === 'youtube'
    ? makeYouTubePlayer(slotId, track.id)
    : makeSoundCloudPlayer(slotId, track.url);
  playerCache[index] = player;
  currentPlayer = player;
  crossfadeTo(player, previousPlayer);
}

function videoButtonHtml(v, i) {
  // Video-file thumbnails are a plain placeholder, not a live frame — a
  // <video> per thumbnail (even with no autoplay) still triggers its own
  // range requests just to seek/preview, which piles up fast against a
  // simple dev server once there's more than a couple. GIFs are a normal
  // static-ish image load, so those still get a real thumbnail.
  const thumb = isVideoFile(v.file)
    ? `<span class="av-video-placeholder" aria-hidden="true">▶</span>`
    : `<img src="${mediaSrc(v.file)}" alt="${escapeHtml(v.label)}" loading="lazy">`;
  return `<button type="button" data-index="${i}">${thumb}<span class="av-item-title">${escapeHtml(v.label)}</span></button>`;
}

function musicButtonHtml(t, i) {
  return `<button type="button" data-index="${i}"><span class="av-item-title">${escapeHtml(t.title)}</span>${t.author ? `<span class="av-music-author">${escapeHtml(t.author)}</span>` : ''}</button>`;
}

async function init() {
  const [videosRes, musicRes] = await Promise.all([
    fetch('data/av-videos.json'),
    fetch('data/av-music.json'),
  ]);
  videos = await videosRes.json();
  musicTracks = await musicRes.json();

  document.getElementById('avVideoList').innerHTML = videos.map(videoButtonHtml).join('');
  document.getElementById('avMusicList').innerHTML = musicTracks.map(musicButtonHtml).join('');

  if (musicTracks.some(t => t.platform === 'youtube')) {
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(s);
  }
  if (musicTracks.some(t => t.platform === 'soundcloud')) {
    const s = document.createElement('script');
    s.src = 'https://w.soundcloud.com/player/api.js';
    document.body.appendChild(s);
  }
}

init();

document.getElementById('avVideoList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-index]');
  if (!btn) return;
  selectVideo(Number(btn.dataset.index));
});

document.getElementById('avMusicList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-index]');
  if (!btn) return;
  selectMusic(Number(btn.dataset.index));
});

document.getElementById('avRandomBtn').addEventListener('click', () => {
  if (!videos.length || !musicTracks.length) return;
  selectVideo(Math.floor(Math.random() * videos.length), { rerollMusic: false });
  selectMusic(Math.floor(Math.random() * musicTracks.length));
});
