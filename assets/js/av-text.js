// Text overlay for av.html — a poem from data/poems.json, layered on top
// of the video. Each poem has its own fixed display pattern (the "pattern"
// field), so a given poem always looks the same way. Each video in
// data/av-videos.json names its own fixed poem by "poem" (a poems.json
// "id") — video and poem are a fixed pair, not a random reroll; a video
// with no "poem" field just shows no text.

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
  const below = document.getElementById('avTypewriterBelow');
  below.innerHTML = '';
  below.hidden = true;
  const mutterRow = document.getElementById('avMutterRow');
  const mutterLeft = document.getElementById('avMutterLeft');
  const mutterRight = document.getElementById('avMutterRight');
  mutterLeft.textContent = '';
  mutterRight.textContent = '';
  mutterLeft.classList.remove('show');
  mutterRight.classList.remove('show');
  mutterRow.hidden = true;
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

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- 動画の下、タイプライター風に最大3文字だけ表示して古い文字から消える ----
// 1周目は原文の順番どおり。2周目以降は毎周シャッフルし直した順で打っていく
// (合ってたはずの報告が、繰り返すたびに思い出し方を間違えていくような感じ)。
function patternTypewriterBelow(_container, text) {
  const el = document.getElementById('avTypewriterBelow');
  el.hidden = false;

  const WINDOW = 3;
  const original = [...text];
  let chars = original;
  let i = 0;
  const intervalId = setInterval(() => {
    if (i > 0 && i % chars.length === 0) chars = shuffled(original);
    const ch = document.createElement('span');
    ch.textContent = chars[i % chars.length];
    el.appendChild(ch);
    i++;

    const visible = [...el.children].filter(c => !c.classList.contains('fade-out'));
    if (visible.length > WINDOW) {
      const old = visible[0];
      old.classList.add('fade-out');
      setTimeout(() => old.remove(), 500);
    }
  }, 260);
  return () => { clearInterval(intervalId); el.hidden = true; el.innerHTML = ''; };
}

// ---- 動画の下、左端・右端に候補の台詞がランダムな間隔で出ては消える ----
// text はスペース区切りの単語リスト。左右それぞれ独立に、ランダムな待ち時間
// (表示時間もランダム)で単語を出し替え続ける。
function patternCornerMutter(_container, text) {
  const words = text.split(/\s+/).filter(Boolean);
  const row = document.getElementById('avMutterRow');
  const left = document.getElementById('avMutterLeft');
  const right = document.getElementById('avMutterRight');
  row.hidden = false;

  function loop(el) {
    let timeoutId;
    function tick() {
      el.textContent = words[Math.floor(Math.random() * words.length)];
      el.classList.add('show');
      const visibleMs = 900 + Math.random() * 1400;
      setTimeout(() => el.classList.remove('show'), visibleMs);
      const nextInMs = visibleMs + 700 + Math.random() * 3000;
      timeoutId = setTimeout(tick, nextInMs);
    }
    tick();
    return () => clearTimeout(timeoutId);
  }

  const stopLeft = loop(left);
  const stopRight = loop(right);
  return () => {
    stopLeft();
    stopRight();
    row.hidden = true;
    left.textContent = '';
    right.textContent = '';
    left.classList.remove('show');
    right.classList.remove('show');
  };
}

// ---- 動画の下、右から左への文。右端から一文字ずつ現れては消える(1文字ぶんずつ左へ) ----
// text は穴埋めテンプレート文字列。「＿」は助詞(が/か/に/で/も/の/を/は)、
// 「＊」はわ/か/らのどれかに、「△」はうそ/そうのどちらかに、それぞれ
// ランダムに置き換わる(例:「なにがほんとかそうかわからない」)。1文が右端
// から左へ一文字ずつ現れては消え終わったら、次の一文を新たに抽選して続く。
const RANDOM_BLANKS = {
  '＿': ['が', 'か', 'に', 'で', 'も', 'の', 'を', 'は'],
  '＊': ['わ', 'か', 'ら'],
  '△': ['うそ', 'そう'],
};

function fillBlanks(template) {
  return [...template].map(ch => {
    const options = RANDOM_BLANKS[ch];
    return options ? options[Math.floor(Math.random() * options.length)] : ch;
  }).join('');
}

function patternRandomBlanks(_container, template) {
  const el = document.getElementById('avTypewriterBelow');
  el.hidden = false;
  el.innerHTML = '';

  const STEP = 22;
  let timeoutId;

  function playOnce() {
    const chars = [...fillBlanks(template)];
    const w = el.clientWidth;
    let i = 0;
    function spawnNext() {
      if (i >= chars.length) {
        timeoutId = setTimeout(playOnce, 600);
        return;
      }
      const span = document.createElement('span');
      span.className = 'av-blanks-char';
      span.textContent = chars[i];
      span.style.left = `${Math.max(0, w - STEP - i * STEP)}px`;
      span.style.opacity = '0';
      el.appendChild(span);
      requestAnimationFrame(() => { span.style.opacity = '1'; });
      i++;
      timeoutId = setTimeout(() => {
        span.style.opacity = '0';
        timeoutId = setTimeout(() => { span.remove(); spawnNext(); }, 250);
      }, 200);
    }
    spawnNext();
  }
  playOnce();

  return () => {
    clearTimeout(timeoutId);
    el.hidden = true;
    el.innerHTML = '';
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
  typewriterBelow: patternTypewriterBelow,
  cornerMutter: patternCornerMutter,
  randomBlanks: patternRandomBlanks,
};

function playPoemById(id) {
  clearTextOverlay();
  const poem = poems.find(p => p.id === id);
  if (!poem) return;
  const container = document.getElementById('avTextOverlay');
  const fn = PATTERN_FNS[poem.pattern] || patternTypewriterFade;
  stopCurrentPattern = fn(container, poem.text);
}
