/**
 * RIVO - the contact brief.
 *
 * Progressive enhancement over a plain form: without JavaScript the browser
 * posts to /api/contact.php and the endpoint redirects back to /?contact=sent.
 * With JavaScript the same payload goes over fetch as JSON and the answer is
 * written into the status line, so the page never reloads.
 *
 * The hidden `t` field is stamped here: the endpoint refuses a form that was
 * filled in faster than a person can type, or one left open for half a day.
 */

const MESSAGES = {
  sending: 'Sending…',
  sent: 'Thank you — we will come back to you shortly.',
  invalid: 'Please check the highlighted fields.',
  offline: 'No connection. Please try again, or email hello@rivomade.com.',
};

export function initContactForm(form) {
  if (!form) return null;

  const status = form.querySelector('[data-status]');
  const button = form.querySelector('button[type="submit"]');
  const stamp = form.querySelector('[data-stamp]');
  if (stamp) stamp.value = String(Date.now());

  const say = (text, state) => {
    if (!status) return;
    status.textContent = text;
    status.dataset.state = state || '';
  };

  /* a field's own note line, and the red rule under the control */
  const mark = (name, note) => {
    const control = form.elements[name];
    const slot = form.querySelector(`[data-error-for="${name}"]`);
    if (control) control.setAttribute('aria-invalid', note ? 'true' : 'false');
    if (slot) slot.textContent = note || '';
  };
  const clearMarks = () => ['name', 'email', 'phone', 'message'].forEach((n) => mark(n, ''));

  /* the same rules the endpoint applies, so a mistake is caught before the round trip */
  const check = (data) => {
    const errors = {};
    if (data.name.trim().length < 2) errors.name = 'Please give your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) errors.email = 'Please give a valid email address.';
    if (data.phone.trim() && !/^[0-9+().\/\s-]{6,}$/.test(data.phone.trim())) errors.phone = 'That phone number does not look right.';
    if (data.message.trim().length < 10) errors.message = 'Please tell us a little about the project.';
    return errors;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.busy) return;

    const data = Object.fromEntries(new FormData(form).entries());
    clearMarks();

    const errors = check(data);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([name, note]) => mark(name, note));
      say(MESSAGES.invalid, 'error');
      const first = form.elements[Object.keys(errors)[0]];
      if (first && first.focus) first.focus();
      return;
    }

    form.dataset.busy = '1';
    if (button) button.disabled = true;
    say(MESSAGES.sending, 'busy');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'fetch',
        },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        form.reset();
        if (stamp) stamp.value = String(Date.now());
        say(result.message || MESSAGES.sent, 'ok');
        form.classList.add('is-sent');
        return;
      }

      if (result.fields) Object.entries(result.fields).forEach(([name, note]) => mark(name, String(note)));
      say(result.error || MESSAGES.offline, 'error');
    } catch {
      say(MESSAGES.offline, 'error');
    } finally {
      delete form.dataset.busy;
      if (button) button.disabled = false;
    }
  });

  /* a note as soon as a marked field is corrected */
  form.addEventListener('input', (event) => {
    const name = event.target && event.target.name;
    if (name && event.target.getAttribute('aria-invalid') === 'true') mark(name, '');
  });

  /* the no-JS path came back as /?contact=sent - report it and tidy the address */
  const outcome = new URLSearchParams(window.location.search).get('contact');
  if (outcome === 'sent') {
    say(MESSAGES.sent, 'ok');
    form.classList.add('is-sent');
  } else if (outcome === 'error') {
    say(MESSAGES.offline, 'error');
  }
  if (outcome) {
    const url = new URL(window.location.href);
    url.searchParams.delete('contact');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }

  return { form, say };
}
