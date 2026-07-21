const SEED_REPO = 'curihara-philoki/Wunderkammer';

async function loadSeeds() {
  const list = document.getElementById('seedList');
  try {
    const res = await fetch(`https://api.github.com/repos/${SEED_REPO}/issues?state=open&per_page=20&sort=created&direction=desc`);
    if (!res.ok) throw new Error('fetch failed');
    const issues = (await res.json()).filter(i => !i.pull_request);

    if (!issues.length) {
      list.innerHTML = '<p class="empty-state">まだ種は蒔かれていません。最初のひとつを置いていってください。</p>';
      return;
    }

    list.innerHTML = issues.map(issue => {
      const snippet = (issue.body || '').replace(/[#*_`>]/g, '').trim().slice(0, 160);
      const date = new Date(issue.created_at).toLocaleDateString('ja-JP');
      return `
        <a class="seed" href="${issue.html_url}" target="_blank" rel="noopener">
          <div class="seed-title">${issue.title}</div>
          ${snippet ? `<div class="seed-body">${snippet}${snippet.length === 160 ? '…' : ''}</div>` : ''}
          <div class="seed-meta">${issue.user.login} · ${date}</div>
        </a>
      `;
    }).join('');
  } catch (e) {
    list.innerHTML = '<p class="empty-state">種箱の読み込みに失敗しました。少し時間をおいて再読み込みしてください。</p>';
  }
}

loadSeeds();
