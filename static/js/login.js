(function () {
  var STORAGE_KEY = "ub_session";
  var errEl = document.getElementById("login-error");
  var loginForm = document.getElementById("login-form");
  var tabLogin = document.getElementById("tab-login");
  var tabSignup = document.getElementById("tab-signup");
  var signupNameWrap = document.getElementById("signup-name-wrap");
  var displayNameInput = document.getElementById("display-name");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var submitBtn = document.getElementById("submit-auth-btn");
  var mode = "login";

  // Create gallery-style slideshow background with 10 images
  var backdrop = document.querySelector('.login-backdrop');
  if (backdrop) {
    var totalImages = 10;
    var cycleDuration = 60000; // 60 seconds total (6 seconds per image)
    var imageDisplayPercent = 100 / totalImages; // 10% per image
    var transitionDuration = 2; // 2% = 1.2 seconds for slower transition
    
    // Create image layers 3-10 (1 and 2 are in CSS)
    for (var i = 3; i <= totalImages; i++) {
      var img = document.createElement('div');
      img.className = 'login-slideshow-img' + i;
      img.style.cssText = 'position:absolute;inset:0;background:url(/images/login' + i + '.jpeg) center/cover;filter:blur(2px);transform:scale(1.05);z-index:' + i + ';';
      backdrop.appendChild(img);
      
      // Calculate timing for this image with slower transitions
      var startPercent = (i - 1) * imageDisplayPercent;
      var fadeInStart = startPercent - transitionDuration;
      var fadeInEnd = startPercent;
      var displayEndPercent = i * imageDisplayPercent;
      var fadeOutStart = displayEndPercent - transitionDuration;
      var fadeOutEnd = displayEndPercent;
      
      // Create keyframes for sliding animation with slower transitions
      var keyframes = [
        { opacity: 0, transform: 'scale(1.05) translateX(100%)', offset: 0 },
        { opacity: 0, transform: 'scale(1.05) translateX(100%)', offset: Math.max(0, fadeInStart / 100) },
        { opacity: 1, transform: 'scale(1.05) translateX(0)', offset: fadeInEnd / 100 },
        { opacity: 1, transform: 'scale(1.05) translateX(0)', offset: fadeOutStart / 100 },
        { opacity: 0, transform: 'scale(1.05) translateX(-100%)', offset: fadeOutEnd / 100 },
        { opacity: 0, transform: 'scale(1.05) translateX(-100%)', offset: 1 }
      ];
      
      img.animate(keyframes, {
        duration: cycleDuration,
        iterations: Infinity,
        easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
      });
    }
    
    // Create overlay
    var overlay = document.createElement('div');
    overlay.className = 'login-slideshow-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;background:linear-gradient(135deg,rgba(30,12,18,0.65) 0%,rgba(80,24,32,0.55) 40%,rgba(200,100,60,0.45) 100%);z-index:20;';
    backdrop.appendChild(overlay);
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.hidden = false;
  }

  function clearError(el) {
    el.textContent = "";
    el.hidden = true;
  }

  // --- Verification step UI ---
  var pendingSignupData = null;

  function showVerifyStep(email) {
    // Hide the main form, show verification UI
    loginForm.style.display = 'none';
    var verifyWrap = document.getElementById('verify-wrap');
    if (!verifyWrap) {
      verifyWrap = document.createElement('div');
      verifyWrap.id = 'verify-wrap';
      verifyWrap.innerHTML =
        '<p style="font-size:0.9rem;color:#555;margin:0 0 1rem;">A 6-digit code was sent to <strong id="verify-email-display"></strong>. Enter it below to complete sign up.</p>' +
        '<div class="field-icon-wrap">' +
        '<span class="field-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></span>' +
        '<input type="text" id="verify-code-input" class="field-input" placeholder="6-digit code" maxlength="6" inputmode="numeric" autocomplete="one-time-code" />' +
        '</div>' +
        '<p id="verify-error" class="error-msg" hidden></p>' +
        '<button type="button" id="verify-submit-btn" class="btn-login-gradient" style="margin-top:0.5rem;">Verify & Create Account</button>' +
        '<button type="button" id="verify-back-btn" class="btn-signup-outline" style="margin-top:0.5rem;">← Back</button>';
      loginForm.parentNode.insertBefore(verifyWrap, loginForm.nextSibling);
    }
    document.getElementById('verify-email-display').textContent = email;
    var verifyError = document.getElementById('verify-error');
    var verifyInput = document.getElementById('verify-code-input');
    verifyInput.value = '';
    verifyError.hidden = true;
    verifyWrap.style.display = 'block';
    verifyInput.focus();

    document.getElementById('verify-submit-btn').onclick = function () {
      var code = verifyInput.value.trim();
      if (!code || code.length !== 6) {
        verifyError.textContent = 'Please enter the 6-digit code.';
        verifyError.hidden = false;
        return;
      }
      verifyError.hidden = true;
      api('/api/auth/verify-and-signup', { email: email, code: code })
        .then(function (data) {
          verifyWrap.style.display = 'none';
          loginForm.style.display = '';
          var user = data.user || {};
          var sessionData = {
            user_id: user.id,
            email: user.email,
            display_name: user.display_name,
            photo_url: user.photo_url || '',
            display_name_changed: !!user.display_name_changed,
            role: user.role || 'user',
            at: Date.now(),
          };
          try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData)); } catch (ignore) {}
          window.location.href = '/wall';
        })
        .catch(function (e) {
          verifyError.textContent = e.message || 'Invalid code. Please try again.';
          verifyError.hidden = false;
        });
    };

    document.getElementById('verify-back-btn').onclick = function () {
      verifyWrap.style.display = 'none';
      loginForm.style.display = '';
    };
  }

  function setMode(nextMode) {
    mode = nextMode;
    clearError(errEl);
    if (mode === "signup") {
      signupNameWrap.classList.remove("hidden");
      tabSignup.classList.add("active");
      tabLogin.classList.remove("active");
      submitBtn.textContent = "Sign Up";
      passwordInput.autocomplete = "new-password";
      displayNameInput.required = true;
    } else {
      signupNameWrap.classList.add("hidden");
      tabLogin.classList.add("active");
      tabSignup.classList.remove("active");
      submitBtn.textContent = "Log In";
      passwordInput.autocomplete = "current-password";
      displayNameInput.required = false;
    }
  }

  function api(path, payload) {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    }).then(function (r) {
      return r.text().then(function (text) {
        var body = {};
        if (text) {
          try {
            body = JSON.parse(text);
          } catch (parseErr) {
            var snippet = text.replace(/\s+/g, " ").trim().slice(0, 120);
            var nonJsonErr = new Error(
              r.ok
                ? "The server returned a non-JSON response."
                : "The server returned a non-JSON error response" + (snippet ? ": " + snippet : ".")
            );
            nonJsonErr.status = r.status;
            throw nonJsonErr;
          }
        }
        if (!r.ok) {
          var err = new Error(body.error || "Request failed.");
          err.status = r.status;
          throw err;
        }
        return body;
      });
    });
  }

  tabLogin.addEventListener("click", function () {
    setMode("login");
  });
  tabSignup.addEventListener("click", function () {
    setMode("signup");
  });

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError(errEl);
    var email = (emailInput.value || "").trim().toLowerCase();
    var password = passwordInput.value || "";

    if (!email || !password) {
      showError(errEl, "Email and password are required.");
      return;
    }

    if (mode === "signup") {
      var displayName = (displayNameInput.value || "").trim();
      if (!displayName) {
        showError(errEl, "Display name is required for sign up.");
        return;
      }
      // Step 1: send verification code
      submitBtn.textContent = "Signing up…";
      submitBtn.disabled = true;
      api("/api/auth/send-verification", {
        email: email,
        password: password,
        display_name: displayName,
      })
        .then(function () {
          submitBtn.textContent = "Sign Up";
          submitBtn.disabled = false;
          showVerifyStep(email);
        })
        .catch(function (e2) {
          submitBtn.textContent = "Sign Up";
          submitBtn.disabled = false;
          showError(errEl, e2.message || "Could not send verification email.");
        });
      return;
    }

    // Login flow
    api("/api/auth/login", { email: email, password: password })
      .then(function (data) {
        var user = data.user || {};
        var sessionData = {
          user_id: user.id,
          email: user.email,
          display_name: user.display_name,
          photo_url: user.photo_url || "",
          display_name_changed: !!user.display_name_changed,
          role: user.role || "user",
          at: Date.now(),
        };
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
        } catch (ignore) {}
        window.location.href = "/wall";
      })
      .catch(function (e2) {
        if (
          e2.status === 404 ||
          (e2.message || "").toLowerCase().indexOf("no account") !== -1
        ) {
          setMode("signup");
          showError(errEl, "This email has no account yet. Please sign up to continue.");
          return;
        }
        showError(errEl, e2.message || "Could not continue. Please try again.");
      });
  });

  setMode("login");

  // Privacy Modal functionality
  var privacyLink = document.getElementById("privacy-link");
  var privacyModal = document.getElementById("privacy-modal");
  var privacyModalClose = document.getElementById("privacy-modal-close");
  var privacyModalOk = document.getElementById("privacy-modal-ok");

  function openPrivacyModal() {
    privacyModal.classList.remove("hidden");
    privacyModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closePrivacyModal() {
    privacyModal.classList.add("hidden");
    privacyModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (privacyLink) {
    privacyLink.addEventListener("click", function(e) {
      e.preventDefault();
      openPrivacyModal();
    });
  }

  if (privacyModalClose) {
    privacyModalClose.addEventListener("click", closePrivacyModal);
  }

  if (privacyModalOk) {
    privacyModalOk.addEventListener("click", closePrivacyModal);
  }

  // Close modal when clicking overlay
  if (privacyModal) {
    privacyModal.addEventListener("click", function(e) {
      if (e.target === privacyModal || e.target.classList.contains("privacy-modal-overlay")) {
        closePrivacyModal();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && !privacyModal.classList.contains("hidden")) {
      closePrivacyModal();
    }
  });
})();
