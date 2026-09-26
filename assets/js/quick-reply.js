// Shared "ひとこと〜" quick-reply box — one lives near the bottom of every
// page, and index.html can also render one inline on a specific entry (e.g.
// GitHuman's, via entry.quickReply) that appears/disappears as the feed
// re-renders. Posts to the same "massage in the bottle" Google Form as the
// submit-modal popup (SUBMIT_FORM_ACTION/SUBMIT_FIELD_MESSAGE/
// SUBMIT_FIELD_NAME are declared in assets/js/submit-modal.js, which must be
// loaded before this file on every page that uses this). Self-initializes at
// load, and safe to call again later (e.g. after renderFeed() re-renders
// the feed) — already-wired boxes are skipped via data-wired.

function autoGrowTextarea(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function initQuickReply() {
  document.querySelectorAll('.entry-quick-reply').forEach(box => {
    if (box.dataset.wired) return;
    box.dataset.wired = 'true';
    const textarea = box.querySelector('.quick-reply-textarea');
    const btn = box.querySelector('.quick-reply-send');
    textarea.addEventListener('input', () => autoGrowTextarea(textarea));

    btn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (!text) { textarea.focus(); return; }

      btn.disabled = true;
      btn.textContent = '…';

      fetch(SUBMIT_FORM_ACTION, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `${SUBMIT_FIELD_MESSAGE}=${encodeURIComponent(text)}&${SUBMIT_FIELD_NAME}=`,
      }).then(() => {
        btn.textContent = 'そんな反応をくれて、ありがとう';
        textarea.value = '';
        autoGrowTextarea(textarea);
        setTimeout(() => { btn.disabled = false; btn.textContent = '送る'; }, 2600);
      }).catch(() => {
        btn.disabled = false;
        btn.textContent = '送る';
      });
    });
  });
}

initQuickReply();
