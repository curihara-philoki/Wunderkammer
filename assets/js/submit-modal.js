// Site-styled popup for the shared "massage in the bottle" submission
// form (used for palindrome, seed-box, and audio-request submissions —
// they're all the same Google Form under the hood). Any <a> pointing at
// that form is intercepted site-wide and opens this modal instead of
// navigating away; submission posts with fetch's no-cors trick, same as
// the vote button and the ambient title-suggestion form.

const SUBMIT_FORM_HREF = 'https://forms.gle/tRfJgfEQicBDCUx79';
const SUBMIT_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSfWHUed2Ml2FSO5MvpdtIjwmL6EZ6CZ2-xAO1Blmpl5Ok-xOA/formResponse';
const SUBMIT_FIELD_MESSAGE = 'entry.788266422';
const SUBMIT_FIELD_NAME = 'entry.659438393';

let modalEl = null;

function buildSubmitModal() {
  const overlay = document.createElement('div');
  overlay.className = 'submit-modal-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="submit-modal" role="dialog" aria-modal="true" aria-label="投稿">
      <button class="submit-modal-close" type="button" aria-label="閉じる">×</button>
      <p class="submit-modal-title">なんでも放流</p>
      <textarea class="submit-modal-textarea" placeholder="massage your message" required></textarea>
      <input type="text" class="submit-modal-input" placeholder="ラジオネーム・メールアドレス（任意）">
      <button class="submit-modal-send" type="button">送る</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('.submit-modal-close');
  const sendBtn = overlay.querySelector('.submit-modal-send');
  const textarea = overlay.querySelector('.submit-modal-textarea');
  const nameInput = overlay.querySelector('.submit-modal-input');

  function close() {
    overlay.hidden = true;
    textarea.value = '';
    nameInput.value = '';
    sendBtn.disabled = false;
    sendBtn.textContent = '送る';
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });

  sendBtn.addEventListener('click', () => {
    const message = textarea.value.trim();
    if (!message) { textarea.focus(); return; }

    sendBtn.disabled = true;
    sendBtn.textContent = '…';

    fetch(SUBMIT_FORM_ACTION, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `${SUBMIT_FIELD_MESSAGE}=${encodeURIComponent(message)}&${SUBMIT_FIELD_NAME}=${encodeURIComponent(nameInput.value.trim())}`,
    }).then(() => {
      sendBtn.textContent = '送りました';
      setTimeout(close, 1200);
    }).catch(() => {
      sendBtn.disabled = false;
      sendBtn.textContent = '送る';
    });
  });

  return { overlay, textarea };
}

function openSubmitModal() {
  if (!modalEl) modalEl = buildSubmitModal();
  modalEl.overlay.hidden = false;
  modalEl.textarea.focus();
}

document.addEventListener('click', (e) => {
  const link = e.target.closest(`a[href="${SUBMIT_FORM_HREF}"]`);
  if (!link) return;
  e.preventDefault();
  openSubmitModal();
});
