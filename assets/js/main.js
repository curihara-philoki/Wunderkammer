document.getElementById('year').textContent = new Date().getFullYear();

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

async function loadFrames(jsonPath, gridId, altGrid) {
  const grid = document.getElementById(gridId);
  try {
    const res = await fetch(jsonPath);
    const items = await res.json();
    if (!items.length) return;
    grid.innerHTML = items.map(item => `
      <figure class="frame">
        <img src="${item.image}" alt="${item.title || ''}" loading="lazy">
        <figcaption class="frame-caption">
          <strong>${item.title || ''}</strong>
          ${item.caption || ''}
        </figcaption>
      </figure>
    `).join('');
  } catch (e) {
    // keep empty-state message if the data file is missing or malformed
  }
}

loadFrames('data/gallery.json', 'galleryGrid');
loadFrames('data/mockups.json', 'mockupGrid');
