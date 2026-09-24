// Text overlay for av.html — a poem from data/poems.json, layered on top
// of the video. Each poem has its own fixed display pattern (the "pattern"
// field), not a random pick, so a given poem always looks the same way.
// Rerolled by av.js's selectVideo() every time the video changes (picks a
// new random poem, which brings its own pattern along), same as the music.

let poems = [];

async function loadPoems() {
  try {
    const res = await fetch('data/poems.json');
    poems = await res.json();
  } catch (e) {
    poems = [];
  }
}
loadPoems();

function randomPoem() {
  if (!poems.length) return null;
  return poems[Math.floor(Math.random() * poems.length)];
}

let stopCurrentPattern = null;

function clearTextOverlay() {
  if (stopCurrentPattern) { stopCurrentPattern(); stopCurrentPattern = null; }
  document.getElementById('avTextOverlay').innerHTML = '';
  const left = document.getElementById('avTextLeft');
  const right = document.getElementById('avTextRight');
  left.innerHTML = '';
  right.innerHTML = '';
  left.hidden = true;
  right.hidden = true;
}

// ---- 鏡文字で、右から左に流れる ----
function patternMirrorFlow(container, text) {
  const span = document.createElement('span');
  span.className = 'av-text-item av-text-mirror';
  span.textContent = text;
  container.appendChild(span);

  const w = container.clientWidth;
  const duration = 11000;
  const start = performance.now();
  let raf;
  function tick(now) {
    const t = ((now - start) % duration) / duration;
    const travel = w + span.offsetWidth;
    const x = w - t * travel;
    span.style.transform = `translateX(${x}px) scaleX(-1)`;
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); span.remove(); };
}

// ---- タイピングされながら、だんだん以前の文字が消えていく ----
function patternTypewriterFade(container, text) {
  const wrap = document.createElement('div');
  wrap.className = 'av-text-item av-text-typewriter';
  container.appendChild(wrap);

  const WINDOW = 16;
  const chars = [...text];
  let i = 0;
  const intervalId = setInterval(() => {
    const ch = document.createElement('span');
    ch.textContent = chars[i % chars.length];
    wrap.appendChild(ch);
    i++;

    const visible = [...wrap.children].filter(c => !c.classList.contains('fade-out'));
    if (visible.length > WINDOW) {
      const old = visible[0];
      old.classList.add('fade-out');
      setTimeout(() => old.remove(), 500);
    }
  }, 220);
  return () => { clearInterval(intervalId); wrap.remove(); };
}

// ---- 上から下に流れる ----
function patternFlowTopBottom(container, text) {
  const span = document.createElement('span');
  span.className = 'av-text-item av-text-vertical';
  span.textContent = text;
  container.appendChild(span);

  const h = container.clientHeight;
  const duration = 9000;
  const start = performance.now();
  let raf;
  function tick(now) {
    const t = ((now - start) % duration) / duration;
    const travel = h + span.offsetHeight;
    const y = -span.offsetHeight + t * travel;
    span.style.transform = `translateY(${y}px)`;
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); span.remove(); };
}

// ---- ランダムな場所に一文字ずつ、鏡文字で表示される ----
function patternRandomScatterMirror(container, text) {
  const chars = [...text];
  let i = 0;
  const intervalId = setInterval(() => {
    const w = container.clientWidth, h = container.clientHeight;
    const ch = document.createElement('span');
    ch.className = 'av-text-item av-text-scatter';
    ch.textContent = chars[i % chars.length];
    ch.style.left = `${Math.random() * Math.max(0, w - 30)}px`;
    ch.style.top = `${Math.random() * Math.max(0, h - 30)}px`;
    ch.style.opacity = '0';
    container.appendChild(ch);
    requestAnimationFrame(() => { ch.style.opacity = '1'; });
    setTimeout(() => { ch.style.opacity = '0'; }, 1300);
    setTimeout(() => ch.remove(), 1900);
    i++;
  }, 260);
  return () => { clearInterval(intervalId); };
}

// ---- 中央から上下左右に対称に出てくる ----
function patternCenterSymmetric(container, text) {
  const chars = [...text];
  let i = 0;
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const intervalId = setInterval(() => {
    const w = container.clientWidth, h = container.clientHeight;
    const cx = w / 2, cy = h / 2;
    const dist = 24 + (i % 10) * 20;
    const ch = chars[i % chars.length];
    DIRS.forEach(([dx, dy]) => {
      const el = document.createElement('span');
      el.className = 'av-text-item av-text-center';
      el.textContent = ch;
      el.style.left = `${cx + dx * dist}px`;
      el.style.top = `${cy + dy * dist}px`;
      el.style.opacity = '0';
      container.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = '1'; });
      setTimeout(() => { el.style.opacity = '0'; }, 1100);
      setTimeout(() => el.remove(), 1700);
    });
    i++;
  }, 260);
  return () => { clearInterval(intervalId); };
}

// ---- 動画の外、右隣・左隣の帯に、縦に流れる電光掲示板 ----
// #avTextOverlay(動画の上)は使わず、#avTextRight/#avTextLeft(動画の外)に
// テキストを2連結して流し込み、CSSアニメーションでtranslateY(-50%)ぶん
// ずらし続けることで途切れなく循環するティッカーにする。右は上→下、
// 左は下→上、かつ鏡文字(scaleX(-1)、CSS側で列全体にかけている)。
function patternDualEdge(_container, text) {
  const rightCol = document.getElementById('avTextRight');
  const leftCol = document.getElementById('avTextLeft');
  const unit = text + '　';
  const duration = Math.max(4, unit.length * 0.4);

  function buildTrack(dirClass) {
    const track = document.createElement('div');
    track.className = `av-ticker-track ${dirClass}`;
    track.style.animationDuration = `${duration}s`;
    track.textContent = unit + unit;
    return track;
  }

  // 右: 下から上へ／左: 上から下へ(鏡文字はCSS側で.av-ticker-col-leftに掛けている)
  rightCol.appendChild(buildTrack('av-ticker-up'));
  leftCol.appendChild(buildTrack('av-ticker-down'));
  rightCol.hidden = false;
  leftCol.hidden = false;

  return () => {
    rightCol.hidden = true;
    leftCol.hidden = true;
    rightCol.innerHTML = '';
    leftCol.innerHTML = '';
  };
}

// Each poem in data/poems.json names its own pattern by key.
const PATTERN_FNS = {
  mirrorFlow: patternMirrorFlow,
  typewriterFade: patternTypewriterFade,
  flowTopBottom: patternFlowTopBottom,
  randomScatterMirror: patternRandomScatterMirror,
  centerSymmetric: patternCenterSymmetric,
  dualEdge: patternDualEdge,
};

function playRandomTextPattern() {
  clearTextOverlay();
  const poem = randomPoem();
  if (!poem) return;
  const container = document.getElementById('avTextOverlay');
  const fn = PATTERN_FNS[poem.pattern] || patternTypewriterFade;
  stopCurrentPattern = fn(container, poem.text);
}
