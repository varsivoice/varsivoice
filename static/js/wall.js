(function () {
  var STORAGE_KEY = "ub_session";
  var REACTION_TYPES = ['heart', 'haha', 'wow', 'sad', 'angry'];
  var REACTION_EMOJI = { heart: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };
  function getReactionToken() { return 'user_' + String(currentUser.user_id); }
  var currentUser = null;
  var defaultProfileImages = [];
  var selectedDefaultPhoto = "";

  function ensureSession() {
    try {
      var raw = (window.AuthSession ? window.AuthSession.getRaw() : sessionStorage.getItem(STORAGE_KEY));
      if (!raw) {
        window.location.href = "/";
        return false;
      }
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.user_id) {
        window.location.href = "/";
        return false;
      }
      currentUser = parsed;
      return true;
    } catch (e) {
      window.location.href = "/";
      return false;
    }
  }

  if (!ensureSession()) return;

  function getLikeToken() {
    // Token is per-user so each account has independent like state.
    return "user_" + String(currentUser.user_id);
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function highlightText(text, keyword) {
    if (!keyword || !keyword.trim()) return escapeHtml(text);
    var escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(' + escaped + ')', 'gi');
    return escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  function renderMediaAttachment(imageUrl) {
    if (!imageUrl) return '';
    return '<img class="post-media" src="' + escapeHtml(imageUrl) + '" alt="Attached image" />';
  }

  function initials(name) {
    var clean = (name || "").trim();
    if (!clean) return "U";
    var parts = clean.split(/\s+/).slice(0, 2);
    return parts
      .map(function (p) {
        return p.charAt(0).toUpperCase();
      })
      .join("");
  }

  function avatarHtml(url, name, className) {
    if (url) {
      return (
        '<img class="' +
        className +
        '" src="' +
        escapeHtml(url) +
        '" alt="' +
        escapeHtml(name || "User") +
        '" />'
      );
    }
    return (
      '<div class="' +
      className +
      ' no-image" aria-hidden="true">' +
      escapeHtml(initials(name)) +
      "</div>"
    );
  }

  function profileHref(userId) {
    return "/profile/" + encodeURIComponent(String(userId || ""));
  }

  function editedLabel(item) {
    if (!item || !item.updated_at) return "";
    return ' <span class="edited-label">(edited)</span>';
  }

  function bindOwnerMenu(container) {
    var trigger = container.querySelector(".owner-menu-trigger");
    var menu = container.querySelector(".owner-menu-list");
    if (!trigger || !menu) return;
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.classList.toggle("hidden");
    });
    document.addEventListener("click", function () {
      menu.classList.add("hidden");
    });
    menu.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  function saveSession(user) {
    currentUser = {
      user_id: user.id,
      email: user.email,
      display_name: user.display_name,
      photo_url: user.photo_url || "",
      display_name_changed: !!user.display_name_changed,
      at: Date.now(),
    };
    try {
      (window.AuthSession ? window.AuthSession.set(currentUser) : sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser)));
    } catch (e) {}
  }

  function refreshProfileUI() {
    var headerAvatar = document.getElementById("header-avatar");
    var headerAvatarLink = document.getElementById("header-avatar-link");
    var composerName = document.getElementById("composer-name");
    var profileName = document.getElementById("profile-name");
    var composerAvatar = document.querySelector(".composer-avatar");

    var name = currentUser.display_name || "User";
    var photo = currentUser.photo_url || "";
    if (composerName) composerName.textContent = name;
    if (profileName) profileName.value = name;

    // Make avatar link point to user's profile
    if (headerAvatarLink) {
      headerAvatarLink.href = profileHref(currentUser.user_id);
      headerAvatarLink.setAttribute("aria-label", name + "'s profile");
    }

    if (headerAvatar) {
      if (photo) {
        headerAvatar.src = photo;
        headerAvatar.classList.remove("no-image");
      } else {
        headerAvatar.removeAttribute("src");
        headerAvatar.classList.add("no-image");
        headerAvatar.alt = initials(name);
        if (typeof nameToColor === 'function') headerAvatar.style.backgroundColor = nameToColor(name);
      }
    }

    if (composerAvatar) {
      if (photo) {
        composerAvatar.style.backgroundImage = 'url("' + photo.replace(/"/g, "") + '")';
        composerAvatar.style.backgroundSize = "cover";
        composerAvatar.style.backgroundPosition = "center";
        composerAvatar.textContent = "";
      } else {
        composerAvatar.style.backgroundImage = "";
        composerAvatar.textContent = initials(name);
        if (typeof nameToColor === 'function') {
          composerAvatar.style.backgroundColor = nameToColor(name);
        }
      }
    }

    var profilePhotoFile = document.getElementById("profile-photo-file");
    if (profilePhotoFile && !profilePhotoFile.files.length) {
      selectedDefaultPhoto = photo;
      renderDefaultProfileGallery();
    }
  }

  function renderDefaultProfileGallery() {
    var gallery = document.getElementById("default-profile-gallery");
    if (!gallery) return;
    gallery.innerHTML = "";
    if (!defaultProfileImages.length) {
      gallery.innerHTML = '<p class="hint" style="margin:0">No default pictures found.</p>';
      return;
    }
    defaultProfileImages.forEach(function (imgUrl) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "default-profile-option" +
        (selectedDefaultPhoto === imgUrl ? " selected" : "");
      btn.setAttribute("aria-label", "Choose profile picture");
      btn.innerHTML =
        '<img src="' + escapeHtml(imgUrl) + '" alt="Default profile option" />';
      btn.addEventListener("click", function () {
        selectedDefaultPhoto = imgUrl;
        var fileInput = document.getElementById("profile-photo-file");
        if (fileInput) fileInput.value = "";
        renderDefaultProfileGallery();
      });
      gallery.appendChild(btn);
    });
  }

  function loadDefaultProfileImages() {
    return api("/api/profile/default-images")
      .then(function (res) {
        defaultProfileImages = Array.isArray(res.images) ? res.images : [];
        if (!selectedDefaultPhoto && currentUser.photo_url) {
          selectedDefaultPhoto = currentUser.photo_url;
        }
        renderDefaultProfileGallery();
      })
      .catch(function () {
        defaultProfileImages = [];
        renderDefaultProfileGallery();
      });
  }

  function parseUtcDate(iso) {
    // SQLite stores datetime('now') as "YYYY-MM-DD HH:MM:SS" without timezone.
    // Appending Z tells the browser to treat it as UTC, not local time.
    if (!iso) return new Date(NaN);
    var s = String(iso).trim();
    if (!/[Zz+\-]\d*$/.test(s)) s += "Z";
    return new Date(s);
  }

  function formatDate(iso) {
    try {
      return parseUtcDate(iso).toLocaleString();
    } catch (e) {
      return iso;
    }
  }

  function formatRelativeTime(iso) {
    try {
      var d = parseUtcDate(iso);
      var sec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (sec < 10) return "just now";
      if (sec < 60) return sec + " sec ago";
      if (sec < 3600) return Math.floor(sec / 60) + " min ago";
      if (sec < 86400) return Math.floor(sec / 3600) + " h ago";
      if (sec < 604800) return Math.floor(sec / 86400) + " d ago";
      return formatDate(iso);
    } catch (e) {
      return iso;
    }
  }

  var feedEl = document.getElementById("feed");
  var statusEl = document.getElementById("feed-status");
  var searchEl = document.getElementById("search-q");
  var currentSort = "latest";
  var currentCategory = "All";
  var postContent = document.getElementById("post-content");
  var postCategory = document.getElementById("post-category");
  var charLeft = document.getElementById("char-left");
  var actionModal = document.getElementById("action-modal");
  var actionModalTitle = document.getElementById("action-modal-title");
  var actionModalMessage = document.getElementById("action-modal-message");
  var actionModalInput = document.getElementById("action-modal-input");
  var actionModalError = document.getElementById("action-modal-error");
  var actionModalCancel = document.getElementById("action-modal-cancel");
  var actionModalConfirm = document.getElementById("action-modal-confirm");
  var modalConfirmHandler = null;

  document.getElementById("btn-logout").addEventListener("click", function () {
    try {
      (window.AuthSession ? window.AuthSession.clear() : sessionStorage.removeItem(STORAGE_KEY));
    } catch (e) {}
    window.location.href = "/";
  });

  // --- Hamburger menu ---
  var hamburgerBtn = document.getElementById("hamburger-btn");
  var hamburgerMenu = document.getElementById("hamburger-menu");
  var themeLightBtn = document.getElementById("theme-light-btn");
  var themeDarkBtn = document.getElementById("theme-dark-btn");

  function closeHamburger() {
    hamburgerMenu.classList.add("hidden");
    hamburgerBtn.setAttribute("aria-expanded", "false");
  }

  hamburgerBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    var isOpen = !hamburgerMenu.classList.contains("hidden");
    if (isOpen) {
      closeHamburger();
    } else {
      hamburgerMenu.classList.remove("hidden");
      hamburgerBtn.setAttribute("aria-expanded", "true");
    }
  });

  document.addEventListener("click", function () {
    closeHamburger();
  });

  hamburgerMenu.addEventListener("click", function (e) { e.stopPropagation(); });

  // Show Admin Panel link for admins
  var adminPanelItem = document.getElementById("admin-panel-item");
  if (adminPanelItem && currentUser && (currentUser.role === 'main_admin' || currentUser.role === 'co_admin')) {
    adminPanelItem.classList.remove('hidden');
  }

  // --- Dark / Light mode ---
  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      themeDarkBtn.classList.add("active");
      themeDarkBtn.setAttribute("aria-pressed", "true");
      themeLightBtn.classList.remove("active");
      themeLightBtn.setAttribute("aria-pressed", "false");
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeLightBtn.classList.add("active");
      themeLightBtn.setAttribute("aria-pressed", "true");
      themeDarkBtn.classList.remove("active");
      themeDarkBtn.setAttribute("aria-pressed", "false");
    }
    try { localStorage.setItem("ub_theme", theme); } catch (e) {}
  }

  // Load saved theme
  try {
    var savedTheme = localStorage.getItem("ub_theme") || "light";
    applyTheme(savedTheme);
  } catch (e) { applyTheme("light"); }

  themeLightBtn.addEventListener("click", function () { applyTheme("light"); });
  themeDarkBtn.addEventListener("click", function () { applyTheme("dark"); });

  postContent.addEventListener("input", function () {
    charLeft.textContent = String(1000 - postContent.value.length);
  });

  function api(path, opts) {
    return fetch(path, opts).then(function (r) {
      if (!r.ok) {
        return r.json().then(function (j) {
          throw new Error(j.error || r.statusText);
        });
      }
      return r.json();
    });
  }

  function closeActionModal() {
    actionModal.classList.add("hidden");
    actionModal.setAttribute("aria-hidden", "true");
    actionModalError.textContent = "";
    actionModalError.classList.add("hidden");
    modalConfirmHandler = null;
  }

  function openActionModal(config) {
    actionModalTitle.textContent = config.title || "Confirm";
    actionModalMessage.textContent = config.message || "";
    actionModalInput.classList.toggle("hidden", !config.showInput);
    actionModalInput.value = config.initialValue || "";
    actionModalInput.readOnly = false;
    actionModalInput.disabled = false;
    actionModalInput.spellcheck = true;
    actionModalError.textContent = "";
    actionModalError.classList.add("hidden");
    actionModalConfirm.textContent = config.confirmText || "Confirm";
    actionModalConfirm.classList.toggle("btn-danger", !!config.danger);
    actionModal.classList.remove("hidden");
    actionModal.setAttribute("aria-hidden", "false");
    modalConfirmHandler = config.onConfirm || null;
    if (config.showInput) actionModalInput.focus();
  }

  actionModalCancel.addEventListener("click", closeActionModal);
  actionModal.addEventListener("click", function (e) {
    if (e.target === actionModal) closeActionModal();
  });
  var actionModalCard = document.querySelector(".action-modal-card");
  if (actionModalCard) {
    actionModalCard.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }
  actionModalConfirm.addEventListener("click", function () {
    if (!modalConfirmHandler) {
      closeActionModal();
      return;
    }
    modalConfirmHandler({
      value: (actionModalInput.value || "").trim(),
      setError: function (message) {
        actionModalError.textContent = message || "";
        actionModalError.classList.toggle("hidden", !message);
      },
      close: closeActionModal,
    });
  });

  function loadTrending() {
    var el = document.getElementById("trending-list");
    if (!el) return;
    api("/api/posts?sort=likes")
      .then(function (posts) {
        el.innerHTML = "";
        if (!posts.length) {
          el.innerHTML = '<p class="hint" style="margin:0">No posts yet.</p>';
          return;
        }
        // Filter posts that actually have reactions
        var withReactions = posts.filter(function (p) { return (p.like_count || 0) > 0; });
        // Always show top 3 posts with reactions (removed aggressive 2x ratio check)
        var showCount = 3;
        var display = withReactions.length ? withReactions.slice(0, showCount) : posts.slice(0, 3);
        display.forEach(function (p) {
          var snippet = (p.content || "").replace(/\s+/g, " ").trim().slice(0, 72);
          if ((p.content || "").length > 72) snippet += "…";
          var row = document.createElement("div");
          row.className = "trending-item trending-item--clickable";
          row.setAttribute("role", "button");
          row.setAttribute("tabindex", "0");
          row.setAttribute("title", "View post");
          var reactionCount = p.like_count || 0;
          row.innerHTML =
            avatarHtml(p.author_photo, p.author_name, "trending-av") +
            '<div class="trending-text">' +
            "<strong>" + escapeHtml(p.author_name || "Anonymous") + "</strong>" +
            '<span class="trending-snippet">' + escapeHtml(snippet) + '</span>' +
            '<div class="trending-meta"><span class="trending-heart" aria-hidden="true">♥</span> ' +
            escapeHtml(String(reactionCount)) +
            (reactionCount === 1 ? " reaction" : " reactions") +
            "</div></div>";
          row.addEventListener("click", function () { openPostModal(p.id); });
          row.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") openPostModal(p.id); });
          el.appendChild(row);
        });
      })
      .catch(function () {
        el.innerHTML = '<p class="hint" style="margin:0">Could not load trending.</p>';
      });
  }

  function loadPosts(randomize) {
    statusEl.textContent = "Loading…";
    var q = new URLSearchParams();
    q.set("sort", currentSort);
    var s = (searchEl.value || "").trim();
    if (s) q.set("q", s);
    if (currentCategory && currentCategory !== "All") q.set("category", currentCategory);
    
    // Check if any filters are active
    var hasActiveFilters = s || (currentCategory && currentCategory !== "All") || currentSort !== "latest";
    
    return api("/api/posts?" + q.toString())
      .then(function (posts) {
        // Only randomize if requested AND no filters are active
        if (randomize && !hasActiveFilters && posts.length > 0) {
          // Fisher-Yates shuffle algorithm
          for (var i = posts.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = posts[i];
            posts[i] = posts[j];
            posts[j] = temp;
          }
        }
        statusEl.textContent = posts.length
          ? ""
          : "No posts yet. Write the first one above.";
        feedEl.innerHTML = "";
        posts.forEach(function (p) {
          feedEl.appendChild(renderPostShell(p, s));
        });
        // Add end-of-content indicator
        if (posts.length > 0) {
          var endMsg = document.createElement('p');
          endMsg.className = 'status-msg';
          endMsg.textContent = "You've reached the end of the feed";
          feedEl.appendChild(endMsg);
        }
        return posts;
      })
      .then(function (posts) {
        posts.forEach(function (p) {
          hydratePost(p);
        });
        loadTrending();
        if (typeof applyAvatarColors === 'function') applyAvatarColors();
      })
      .catch(function (e) {
        statusEl.textContent =
          "Could not load posts. Is the server running? (" + e.message + ")";
      });
  }

  // --- Report modal ---
  var REPORT_REASONS = [
    { value: 'spam', label: '🚫 Spam', desc: 'Repetitive or unwanted content' },
    { value: 'bullying', label: '👊 Bullying', desc: 'Intimidation or personal attacks' },
    { value: 'inappropriate', label: '🔞 Inappropriate', desc: 'Offensive or explicit content' },
    { value: 'harassment', label: '😡 Harassment', desc: 'Bullying or targeted abuse' },
    { value: 'other', label: '📋 Other', desc: 'Another reason not listed' }
  ];

  function openReportModal(targetType, targetId) {
    var overlay = document.createElement('div');
    overlay.className = 'action-modal';
    overlay.setAttribute('aria-hidden', 'false');

    overlay.innerHTML =
      '<div class="report-modal-card">' +
      '<div class="ep-modal-header">' +
      '<h4 class="ep-modal-title">Report ' + (targetType === 'post' ? 'Post' : 'Comment') + '</h4>' +
      '<button type="button" class="ep-close-btn" id="report-close">✕</button>' +
      '</div>' +
      '<div class="report-reasons" id="report-body">' +
      '<p style="text-align:center;color:rgba(255,255,255,0.7);padding:1.5rem 0;">Checking…</p>' +
      '</div>' +
      '<p id="report-error" class="ep-error hidden"></p>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) document.body.removeChild(overlay); });
    overlay.querySelector('#report-close').addEventListener('click', function () { document.body.removeChild(overlay); });

    var reportBody = overlay.querySelector('#report-body');

    function showAlreadyReported() {
      reportBody.innerHTML =
        '<div style="text-align:center;padding:1.5rem 0;">' +
        '<p style="font-size:2rem;margin:0 0 0.5rem;">🚩</p>' +
        '<p style="font-size:1rem;font-weight:600;margin:0 0 0.5rem;">Report already submitted</p>' +
        '<p style="font-size:0.85rem;color:rgba(255,255,255,0.7);margin:0;">Thank you for flagging this. Please await our decision — we\'ll review it as soon as possible.</p>' +
        '</div>';
    }

    function showReasonPicker() {
      var reasonBtns = REPORT_REASONS.map(function (r) {
        return '<button type="button" class="report-reason-btn" data-reason="' + r.value + '">' +
          '<span class="report-reason-label">' + r.label + '</span>' +
          '<span class="report-reason-desc">' + r.desc + '</span>' +
          '</button>';
      }).join('');

      reportBody.innerHTML =
        '<p style="font-size:0.85rem;color:rgba(255,255,255,0.75);margin:0 0 1rem;">Why are you reporting this?</p>' +
        reasonBtns;

      var errorEl = overlay.querySelector('#report-error');
      reportBody.querySelectorAll('.report-reason-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var reason = btn.dataset.reason;
          reportBody.querySelectorAll('.report-reason-btn').forEach(function (b) { b.classList.remove('selected'); });
          btn.classList.add('selected');
          fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reporter_user_id: currentUser.user_id, target_type: targetType, target_id: targetId, reason: reason })
          }).then(function (r) {
            return r.json().then(function (j) {
              if (r.status === 409) { showAlreadyReported(); return null; }
              if (!r.ok) throw new Error(j.error || r.statusText);
              return j;
            });
          })
            .then(function (j) {
              if (!j) return;
              reportBody.innerHTML =
                '<div style="text-align:center;padding:1.5rem 0;">' +
                '<p style="font-size:2rem;margin:0 0 0.5rem;">✅</p>' +
                '<p style="font-size:1rem;font-weight:600;margin:0 0 0.4rem;">Report submitted!</p>' +
                '<p style="font-size:0.85rem;color:rgba(255,255,255,0.7);margin:0;">Thank you for helping keep the wall safe. We\'ll look into it shortly.</p>' +
                '</div>';
              setTimeout(function () { if (document.body.contains(overlay)) document.body.removeChild(overlay); }, 1800);
            })
            .catch(function (e) {
              reportBody.querySelectorAll('.report-reason-btn').forEach(function (b) { b.classList.remove('selected'); });
              errorEl.textContent = e.message || 'Could not submit report.';
              errorEl.classList.remove('hidden');
            });
        });
      });
    }

    // Check if already reported before showing reason picker
    fetch('/api/reports/check?reporter_user_id=' + currentUser.user_id +
      '&target_type=' + encodeURIComponent(targetType) +
      '&target_id=' + encodeURIComponent(targetId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.reported) {
          showAlreadyReported();
        } else {
          showReasonPicker();
        }
      })
      .catch(function () {
        // If check fails, just show the picker anyway
        showReasonPicker();
      });
  }

  function bindReactionWidget(wrap, targetType, targetId) {
    var trigger = wrap.querySelector('.btn-reaction-trigger');
    var picker = wrap.querySelector('.reaction-picker');
    if (!trigger || !picker) return;

    var showTimeout = null;
    var hideTimeout = null;

    function showPicker() {
      clearTimeout(hideTimeout);
      showTimeout = setTimeout(function() {
        picker.classList.remove('hidden');
      }, 300);
    }

    function hidePicker() {
      clearTimeout(showTimeout);
      hideTimeout = setTimeout(function() {
        picker.classList.add('hidden');
      }, 200);
    }

    trigger.addEventListener('mouseenter', showPicker);
    trigger.addEventListener('mouseleave', hidePicker);
    picker.addEventListener('mouseenter', function() {
      clearTimeout(hideTimeout);
    });
    picker.addEventListener('mouseleave', hidePicker);

    trigger.addEventListener('click', function() {
      toggleReaction(wrap, targetType, targetId, null);
    });

    var pickerButtons = picker.querySelectorAll('.btn-pick-reaction');
    pickerButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var reactionType = btn.dataset.reaction;
        toggleReaction(wrap, targetType, targetId, reactionType);
        picker.classList.add('hidden');
      });
    });
  }

  function toggleReaction(wrap, targetType, targetId, reactionType) {
    var activeReaction = wrap.dataset.userReaction || null;
    var typeToSend;
    if (reactionType !== null) {
      typeToSend = reactionType;
    } else {
      typeToSend = activeReaction ? activeReaction : 'heart';
    }
    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_type: targetType,
        target_id: targetId,
        user_token: getReactionToken(),
        reaction_type: typeToSend
      })
    })
      .then(function(r) { return r.json(); })
      .then(function(data) { applyReactionVisual(wrap, data); })
      .catch(function() {});
  }

  function applyReactionVisual(wrap, data) {
    var trigger = wrap.querySelector('.btn-reaction-trigger');
    var emojiEl = wrap.querySelector('.reaction-emoji');
    var countEl = wrap.querySelector('.reaction-count');
    if (!trigger || !emojiEl || !countEl) return;

    var userReaction = data.user_reaction || null;
    var counts = data.counts || {};
    var total = data.total || 0;

    // Build the top reaction emojis (up to 3 types that have count > 0)
    var topEmojis = [];
    REACTION_TYPES.forEach(function(type) {
      if (counts[type] && counts[type] > 0) topEmojis.push(type);
    });
    topEmojis = topEmojis.slice(0, 3);

    // Show: top reaction emojis (if any) + total count
    // If no reactions at all, show unfilled heart outline
    if (total === 0) {
      emojiEl.innerHTML = '<span class="heart-outline" aria-hidden="true">♡</span>';
      countEl.textContent = '';
    } else {
      var emojiHtml = topEmojis.map(function(type) {
        return '<span class="reaction-bubble" aria-hidden="true">' + REACTION_EMOJI[type] + '</span>';
      }).join('');
      // If user hasn't reacted, prepend a faint outline heart as a cue
      if (!userReaction) {
        emojiHtml = '<span class="heart-outline heart-outline--faint" aria-hidden="true">♡</span>' + emojiHtml;
      }
      emojiEl.innerHTML = emojiHtml;
      countEl.textContent = String(total);
    }

    // Style the trigger: active (user has reacted) vs inactive
    if (userReaction) {
      trigger.classList.add('reacted');
    } else {
      trigger.classList.remove('reacted');
    }

    trigger.setAttribute('aria-label', userReaction
      ? (userReaction.charAt(0).toUpperCase() + userReaction.slice(1) + ', ' + total + ' total')
      : ('React' + (total > 0 ? ', ' + total + ' total' : '')));
    wrap.dataset.userReaction = userReaction || '';

    var pickerButtons = wrap.querySelectorAll('.btn-pick-reaction');
    pickerButtons.forEach(function(btn) {
      if (btn.dataset.reaction === userReaction) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function renderPostShell(p, searchKeyword) {
    var wrap = document.createElement("article");
    wrap.className = "post-card";
    wrap.dataset.postId = String(p.id);
    wrap.innerHTML =
      '<div class="post-card-top">' +
      '<div class="post-author-row">' +
      '<a class="profile-link-avatar" href="' +
      profileHref(p.user_id) +
      '">' +
      avatarHtml(p.author_photo, p.author_name, "post-avatar-sm") +
      "</a>" +
      "<div>" +
      '<a class="post-anon-name profile-link-name" href="' +
      profileHref(p.user_id) +
      '">' +
      escapeHtml(p.author_name || "Anonymous") +
      "</a>" +
      '<span class="post-time">' +
      escapeHtml(formatRelativeTime(p.created_at)) +
      editedLabel(p) +
      "</span></div></div>" +
      '<div class="post-owner-actions"></div></div>' +
      '<div class="post-cat-pill">' +
      escapeHtml(p.category) +
      "</div>" +
      '<div class="post-body"></div>' +
      '<div class="post-actions">' +
      '<div class="reaction-wrap" data-target-type="post" data-target-id="' +
      p.id +
      '">' +
      '<button type="button" class="btn-reaction-trigger" aria-label="React">' +
      '<span class="reaction-emoji">❤️</span>' +
      '<span class="reaction-count"></span>' +
      '</button>' +
      '<div class="reaction-picker hidden" role="toolbar" aria-label="Pick a reaction">' +
      '</div>' +
      '</div>' +
      '<button type="button" class="btn-comment-toggle"><span aria-hidden="true">💬</span> <span class="ccount">' +
      (p.comment_count || 0) +
      "</span></button>" +
      (p.user_id !== currentUser.user_id ? '<button type="button" class="btn-report-post" aria-label="Report post" title="Report post">🚩</button>' : '') +
      "</div>" +
      '<div class="comments-block hidden" data-for-post="' +
      p.id +
      '">' +
      "<h4>Comments</h4>" +
      '<div class="comments-tree"></div>' +
      '<div class="comment-form">' +
      '<textarea placeholder="Write a comment…" aria-label="New comment"></textarea>' +
      '<p class="comment-form-error hidden" aria-live="polite"></p>' +
      '<div class="comment-image-preview hidden">' +
      '<img class="comment-preview-img" alt="Preview" />' +
      '<button type="button" class="comment-preview-remove" aria-label="Remove image">✕</button>' +
      '</div>' +
      '<div class="comment-form-actions">' +
      '<input type="file" class="comment-image-file hidden" accept="image/png,image/jpeg,image/gif,image/webp" />' +
      '<button type="button" class="btn-sm btn-attach-image">📎</button>' +
      '<span class="comment-image-label"></span>' +
      '<button type="button" class="btn-sm add-comment">Comment</button>' +
      '</div></div>';
    wrap.querySelector(".post-body").innerHTML = highlightText(p.content, searchKeyword);
    if (p.image_url) {
      var img = document.createElement('img');
      img.className = 'post-media';
      img.src = p.image_url;
      img.alt = 'Attached image';
      wrap.querySelector('.post-body').insertAdjacentElement('afterend', img);
    }
    var picker = wrap.querySelector('.reaction-picker');
    REACTION_TYPES.forEach(function(type) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-pick-reaction';
      btn.dataset.reaction = type;
      btn.setAttribute('aria-label', type.charAt(0).toUpperCase() + type.slice(1));
      btn.textContent = REACTION_EMOJI[type];
      picker.appendChild(btn);
    });
    if (p.user_id === currentUser.user_id) {
      var ownerActions = wrap.querySelector(".post-owner-actions");
      ownerActions.innerHTML =
        '<div class="owner-menu">' +
        '<button type="button" class="owner-menu-trigger" aria-label="Post options">...</button>' +
        '<div class="owner-menu-list hidden">' +
        '<button type="button" class="owner-menu-item btn-edit-post">Edit</button>' +
        '<button type="button" class="owner-menu-item btn-delete-post">Delete</button>' +
        "</div></div>";
      bindOwnerMenu(ownerActions);
    }
    return wrap;
  }

  function hydratePost(p) {
    var card = feedEl.querySelector('[data-post-id="' + p.id + '"]');
    if (!card) return;

    var reactionWrap = card.querySelector('.reaction-wrap');
    if (reactionWrap) {
      fetch('/api/reactions?target_type=post&target_id=' + p.id + '&token=' + encodeURIComponent(getReactionToken()))
        .then(function(r) { return r.json(); })
        .then(function(data) { applyReactionVisual(reactionWrap, data); })
        .catch(function() {});
      bindReactionWidget(reactionWrap, 'post', p.id);
    }

    var editPostBtn = card.querySelector(".btn-edit-post");
    if (editPostBtn) {
      editPostBtn.addEventListener("click", function () {
        openActionModal({
          title: "Edit Post",
          message: "Update your post content below.",
          showInput: true,
          initialValue: p.content || "",
          confirmText: "Save",
          onConfirm: function (ctx) {
            if (!ctx.value) {
              ctx.setError("Post content is required.");
              return;
            }
            api("/api/posts/" + p.id, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: currentUser.user_id,
                content: ctx.value,
                category: p.category || "Other",
              }),
            })
              .then(function () {
                ctx.close();
                loadPosts();
              })
              .catch(function (e) {
                ctx.setError(e.message || "Could not update post.");
              });
          },
        });
      });
    }

    var deletePostBtn = card.querySelector(".btn-delete-post");
    if (deletePostBtn) {
      deletePostBtn.addEventListener("click", function () {
        openActionModal({
          title: "Delete Post",
          message: "Are you sure you want to delete this post?",
          confirmText: "Delete",
          danger: true,
          onConfirm: function (ctx) {
            api("/api/posts/" + p.id, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: currentUser.user_id }),
            })
              .then(function () {
                ctx.close();
                loadPosts();
              })
              .catch(function (e) {
                ctx.setError(e.message || "Could not delete post.");
              });
          },
        });
      });
    }

    var block = card.querySelector(".comments-block");
    var toggle = card.querySelector(".btn-comment-toggle");
    toggle.addEventListener("click", function () {
      block.classList.toggle("hidden");
      if (!block.classList.contains("hidden")) loadCommentsForCard(card);
    });

    var reportPostBtn = card.querySelector(".btn-report-post");
    if (reportPostBtn) {
      reportPostBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openReportModal('post', p.id);
      });
    }

    var addBtn = block.querySelector(".add-comment");
    var ta = block.querySelector("textarea");
    var attachBtn = block.querySelector(".btn-attach-image");
    var commentImageFile = block.querySelector(".comment-image-file");
    var commentImageLabel = block.querySelector(".comment-image-label");
    var imagePreview = block.querySelector(".comment-image-preview");
    var previewImg = block.querySelector(".comment-preview-img");
    var previewRemove = block.querySelector(".comment-preview-remove");
    
    if (attachBtn && commentImageFile) {
      attachBtn.addEventListener("click", function() { commentImageFile.click(); });
      commentImageFile.addEventListener("change", function() {
        var file = commentImageFile.files[0];
        if (file) {
          // Show preview
          var reader = new FileReader();
          reader.onload = function(e) {
            previewImg.src = e.target.result;
            imagePreview.classList.remove("hidden");
          };
          reader.readAsDataURL(file);
          commentImageLabel.textContent = file.name;
        } else {
          // Hide preview
          imagePreview.classList.add("hidden");
          previewImg.src = "";
          commentImageLabel.textContent = "";
        }
      });
    }
    
    if (previewRemove) {
      previewRemove.addEventListener("click", function() {
        commentImageFile.value = "";
        imagePreview.classList.add("hidden");
        previewImg.src = "";
        commentImageLabel.textContent = "";
      });
    }
    bindEnterToSubmit(ta, function () {
      addBtn.click();
    });
    addBtn.addEventListener("click", function () {
      var text = (ta.value || "").trim();
      var imageFile = commentImageFile && commentImageFile.files[0];
      if (!text && !imageFile) return;
      var errorEl = block.querySelector(".comment-form-error");
      if (errorEl) { errorEl.textContent = ""; errorEl.classList.add("hidden"); }
      var imageFile = commentImageFile && commentImageFile.files[0];
      var fd = new FormData();
      fd.append("user_id", String(currentUser.user_id));
      fd.append("content", text);
      fd.append("parent_id", "");
      if (imageFile) fd.append("image", imageFile);
      fetch("/api/posts/" + p.id + "/comments", { method: "POST", body: fd })
        .then(function(r) { return r.json().then(function(j) { if (!r.ok) throw new Error(j.error || r.statusText); return j; }); })
        .then(function () {
          ta.value = "";
          if (commentImageFile) commentImageFile.value = "";
          if (commentImageLabel) commentImageLabel.textContent = "";
          if (imagePreview) imagePreview.classList.add("hidden");
          if (previewImg) previewImg.src = "";
          loadCommentsForCard(card);
          updateCommentCount(card, +1);
        })
        .catch(function (e) {
          if (errorEl) {
            errorEl.textContent = e.message || "Could not add comment.";
            errorEl.classList.remove("hidden");
          } else {
            statusEl.textContent = e.message || "Could not add comment.";
          }
        });
    });
  }

  function loadCommentsForCard(card) {
    var pid = card.dataset.postId;
    var tree = card.querySelector(".comments-tree");
    api("/api/posts/" + pid + "/comments")
      .then(function (rows) {
        tree.innerHTML = "";
        var byParent = {};
        rows.forEach(function (c) {
          var k = c.parent_id == null ? "root" : String(c.parent_id);
          if (!byParent[k]) byParent[k] = [];
          byParent[k].push(c);
        });
        (byParent.root || []).forEach(function (c) {
          var commentDiv = renderComment(c, pid, false);
          tree.appendChild(commentDiv);
          var commentWrap = commentDiv.querySelector('.reaction-wrap');
          if (commentWrap) {
            fetch('/api/reactions?target_type=comment&target_id=' + c.id + '&token=' + encodeURIComponent(getReactionToken()))
              .then(function(r) { return r.json(); })
              .then(function(data) { applyReactionVisual(commentWrap, data); })
              .catch(function() {});
            bindReactionWidget(commentWrap, 'comment', c.id);
          }
          (byParent[String(c.id)] || []).forEach(function (reply) {
            var replyDiv = renderComment(reply, pid, true);
            tree.appendChild(replyDiv);
            var replyWrap = replyDiv.querySelector('.reaction-wrap');
            if (replyWrap) {
              fetch('/api/reactions?target_type=comment&target_id=' + reply.id + '&token=' + encodeURIComponent(getReactionToken()))
                .then(function(r) { return r.json(); })
                .then(function(data) { applyReactionVisual(replyWrap, data); })
                .catch(function() {});
              bindReactionWidget(replyWrap, 'comment', reply.id);
            }
          });
        });
      })
      .catch(function () {
        tree.textContent = "Could not load comments.";
      });
  }

  function updateCommentCount(card, delta) {
    var ccountEl = card.querySelector(".btn-comment-toggle .ccount");
    if (!ccountEl) return;
    var current = parseInt(ccountEl.textContent, 10) || 0;
    ccountEl.textContent = String(current + delta);
  }

  function bindEnterToSubmit(textareaEl, submitFn) {
    if (!textareaEl) return;
    textareaEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitFn();
      }
    });
  }

  function renderComment(c, postId, isReply) {
    var div = document.createElement("div");
    div.className = "comment" + (isReply ? " reply" : "");
    div.innerHTML =
      '<div class="comment-head">' +
      '<a class="profile-link-avatar comment-avatar-wrap" href="' +
      profileHref(c.user_id) +
      '">' +
      avatarHtml(c.author_photo, c.author_name, "comment-avatar") +
      "</a>" +
      '<div class="comment-meta">' +
      '<a class="comment-author-link" href="' +
      profileHref(c.user_id) +
      '">' +
      escapeHtml(c.author_name || "User") +
      "</a>" +
      " · " +
      escapeHtml(formatRelativeTime(c.created_at)) +
      editedLabel(c) +
      (!isReply
        ? ' · <button type="button" class="btn-reply" style="background:none;border:none;color:var(--varsity-red);cursor:pointer;font-weight:600;padding:0;">Reply</button>'
        : "") +
      "</div>" +
      (c.user_id === currentUser.user_id
        ? '<div class="comment-owner-actions"><div class="owner-menu"><button type="button" class="owner-menu-trigger" aria-label="Comment options">...</button><div class="owner-menu-list hidden"><button type="button" class="owner-menu-item btn-comment-edit">Edit</button><button type="button" class="owner-menu-item btn-comment-delete">Delete</button></div></div></div>'
        : '<button type="button" class="btn-report-comment" aria-label="Report comment" title="Report comment">🚩</button>') +
      "</div>" +
      '<div class="comment-body"></div>' +
      '<div class="reaction-wrap" data-target-type="comment" data-target-id="' + c.id + '">' +
      '<button type="button" class="btn-reaction-trigger" aria-label="React">' +
      '<span class="reaction-emoji">❤️</span>' +
      '<span class="reaction-count"></span>' +
      '</button>' +
      '<div class="reaction-picker hidden" role="toolbar" aria-label="Pick a reaction">' +
      '</div>' +
      '</div>' +
      '<div class="reply-form hidden"></div>';
    div.querySelector(".comment-body").textContent = c.content;
    if (c.image_url) {
      var commentImg = document.createElement('img');
      commentImg.className = 'comment-media';
      commentImg.src = c.image_url;
      commentImg.alt = 'Attached image';
      div.querySelector('.comment-body').insertAdjacentElement('afterend', commentImg);
    }
    var commentPicker = div.querySelector('.reaction-picker');
    REACTION_TYPES.forEach(function(type) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-pick-reaction';
      btn.dataset.reaction = type;
      btn.setAttribute('aria-label', type.charAt(0).toUpperCase() + type.slice(1));
      btn.textContent = REACTION_EMOJI[type];
      commentPicker.appendChild(btn);
    });
    bindOwnerMenu(div);

    var reportCommentBtn = div.querySelector(".btn-report-comment");
    if (reportCommentBtn) {
      reportCommentBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openReportModal('comment', c.id);
      });
    }

    var replyBtn = div.querySelector(".btn-reply");
    var replyForm = div.querySelector(".reply-form");
    if (replyBtn) {
      replyBtn.addEventListener("click", function () {
        replyForm.classList.toggle("hidden");
        if (!replyForm.classList.contains("hidden") && !replyForm.dataset.ready) {
          replyForm.dataset.ready = "1";
          replyForm.innerHTML =
            '<textarea placeholder="Reply anonymously…" rows="2"></textarea>' +
            '<div class="comment-image-preview hidden">' +
            '<img class="comment-preview-img" alt="Preview" />' +
            '<button type="button" class="comment-preview-remove" aria-label="Remove image">✕</button>' +
            '</div>' +
            '<div class="comment-form-actions">' +
            '<input type="file" class="reply-image-file hidden" accept="image/png,image/jpeg,image/gif,image/webp" />' +
            '<button type="button" class="btn-sm btn-attach-reply-image">📎</button>' +
            '<span class="reply-image-label"></span>' +
            '<button type="button" class="btn-sm send-reply">Send reply</button>' +
            '</div>';
          var attachReplyBtn = replyForm.querySelector(".btn-attach-reply-image");
          var replyImageFile = replyForm.querySelector(".reply-image-file");
          var replyImageLabel = replyForm.querySelector(".reply-image-label");
          var replyImagePreview = replyForm.querySelector(".comment-image-preview");
          var replyPreviewImg = replyForm.querySelector(".comment-preview-img");
          var replyPreviewRemove = replyForm.querySelector(".comment-preview-remove");
          
          if (attachReplyBtn && replyImageFile) {
            attachReplyBtn.addEventListener("click", function() { replyImageFile.click(); });
            replyImageFile.addEventListener("change", function() {
              var file = replyImageFile.files[0];
              if (file) {
                // Show preview
                var reader = new FileReader();
                reader.onload = function(e) {
                  replyPreviewImg.src = e.target.result;
                  replyImagePreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
                if (replyImageLabel) replyImageLabel.textContent = file.name;
              } else {
                // Hide preview
                replyImagePreview.classList.add('hidden');
                replyPreviewImg.src = '';
                if (replyImageLabel) replyImageLabel.textContent = '';
              }
            });
          }
          
          if (replyPreviewRemove) {
            replyPreviewRemove.addEventListener('click', function() {
              replyImageFile.value = '';
              replyImagePreview.classList.add('hidden');
              replyPreviewImg.src = '';
              if (replyImageLabel) replyImageLabel.textContent = '';
            });
          }
          bindEnterToSubmit(replyForm.querySelector("textarea"), function () {
            replyForm.querySelector(".send-reply").click();
          });
          replyForm.querySelector(".send-reply").addEventListener("click", function () {
            var t = replyForm.querySelector("textarea");
            var text = (t.value || "").trim();
            if (!text) return;
            var imageFile = replyImageFile && replyImageFile.files[0];
            var fd = new FormData();
            fd.append("user_id", String(currentUser.user_id));
            fd.append("content", text);
            fd.append("parent_id", String(c.id));
            if (imageFile) fd.append("image", imageFile);
            fetch("/api/posts/" + postId + "/comments", { method: "POST", body: fd })
              .then(function(r) { return r.json().then(function(j) { if (!r.ok) throw new Error(j.error || r.statusText); return j; }); })
              .then(function () {
                t.value = "";
                if (replyImageFile) replyImageFile.value = "";
                if (replyImageLabel) replyImageLabel.textContent = "";
                if (replyImagePreview) replyImagePreview.classList.add("hidden");
                if (replyPreviewImg) replyPreviewImg.src = "";
                replyForm.classList.add("hidden");
                var card = document.querySelector('[data-post-id="' + postId + '"]');
                loadCommentsForCard(card);
                updateCommentCount(card, +1);
              })
              .catch(function (e) {
                statusEl.textContent = e.message || "Could not send reply.";
              });
          });
        }
      });
    }

    var editBtn = div.querySelector(".btn-comment-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        openActionModal({
          title: "Edit Comment",
          message: "Update your comment below.",
          showInput: true,
          initialValue: c.content || "",
          confirmText: "Save",
          onConfirm: function (ctx) {
            if (!ctx.value) {
              ctx.setError("Comment cannot be empty.");
              return;
            }
            api("/api/comments/" + c.id, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: currentUser.user_id,
                content: ctx.value,
              }),
            })
              .then(function () {
                ctx.close();
                var targetCard = document.querySelector('[data-post-id="' + postId + '"]');
                loadCommentsForCard(targetCard);
              })
              .catch(function (e) {
                ctx.setError(e.message || "Could not update comment.");
              });
          },
        });
      });
    }

    var deleteBtn = div.querySelector(".btn-comment-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        openActionModal({
          title: "Delete Comment",
          message: "Are you sure you want to delete this comment?",
          confirmText: "Delete",
          danger: true,
          onConfirm: function (ctx) {
            api("/api/comments/" + c.id, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: currentUser.user_id }),
            })
              .then(function () {
                ctx.close();
                var targetCard = document.querySelector('[data-post-id="' + postId + '"]');
                loadCommentsForCard(targetCard);
                updateCommentCount(targetCard, -1);
              })
              .catch(function (e) {
                ctx.setError(e.message || "Could not delete comment.");
              });
          },
        });
      });
    }
    return div;
  }

  document.getElementById("composer-submit").addEventListener("click", function () {
    var content = (postContent.value || "").trim();
    var category = postCategory.value;
    var imageFileInput = document.getElementById("post-image-file");
    var imageFile = imageFileInput && imageFileInput.files[0];
    if (!content && !imageFile) {
      statusEl.textContent = "Please write something or attach an image.";
      return;
    }
    var fd = new FormData();
    fd.append("user_id", String(currentUser.user_id));
    fd.append("content", content);
    fd.append("category", category);
    if (imageFile) fd.append("image", imageFile);
    fetch("/api/posts", { method: "POST", body: fd })
      .then(function(r) { return r.json().then(function(j) { if (!r.ok) throw new Error(j.error || r.statusText); return j; }); })
      .then(function() {
        postContent.value = "";
        charLeft.textContent = "1000";
        if (imageFileInput) { imageFileInput.value = ""; }
        var label = document.getElementById("post-image-label");
        if (label) label.textContent = "";
        var preview = document.getElementById("post-image-preview");
        var previewImg = document.getElementById("post-preview-img");
        if (preview) preview.classList.add("hidden");
        if (previewImg) previewImg.src = "";
        loadPosts();
      })
      .catch(function(e) { statusEl.textContent = e.message || "Could not post."; });
  });

  var postImageBtn = document.getElementById("post-image-btn");
  var postImageFile = document.getElementById("post-image-file");
  var postImageLabel = document.getElementById("post-image-label");
  var postImagePreview = document.getElementById("post-image-preview");
  var postPreviewImg = document.getElementById("post-preview-img");
  var postPreviewRemove = document.getElementById("post-preview-remove");
  
  if (postImageBtn && postImageFile) {
    postImageBtn.addEventListener("click", function() { postImageFile.click(); });
    postImageFile.addEventListener("change", function() {
      var file = postImageFile.files[0];
      if (file) {
        // Show preview
        var reader = new FileReader();
        reader.onload = function(e) {
          if (postPreviewImg) postPreviewImg.src = e.target.result;
          if (postImagePreview) postImagePreview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
        if (postImageLabel) postImageLabel.textContent = file.name;
      } else {
        // Hide preview
        if (postImagePreview) postImagePreview.classList.add("hidden");
        if (postPreviewImg) postPreviewImg.src = "";
        if (postImageLabel) postImageLabel.textContent = "";
      }
    });
  }
  
  if (postPreviewRemove) {
    postPreviewRemove.addEventListener("click", function() {
      if (postImageFile) postImageFile.value = "";
      if (postImagePreview) postImagePreview.classList.add("hidden");
      if (postPreviewImg) postPreviewImg.src = "";
      if (postImageLabel) postImageLabel.textContent = "";
    });
  }

  var tsearch;
  searchEl.addEventListener("input", function () {
    clearTimeout(tsearch);
    tsearch = setTimeout(loadPosts, 300);
  });

  // --- Filter button ---
  var filterBtn = document.getElementById("filter-btn");
  var filterMenu = document.getElementById("filter-menu");
  var activeFilterLabel = document.getElementById("active-filter-label");
  var SORT_LABELS = {
    "latest": "Newest first",
    "recent-comment": "Recently commented",
    "comments": "Most commented",
    "likes": "Most liked"
  };

  function closeFilterMenu() {
    if (filterMenu) filterMenu.classList.add("hidden");
    if (filterBtn) filterBtn.setAttribute("aria-expanded", "false");
    var chevron = filterBtn && filterBtn.querySelector(".filter-chevron");
    if (chevron) chevron.style.transform = "";
  }

  if (filterBtn) {
    filterBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = !filterMenu.classList.contains("hidden");
      if (isOpen) { closeFilterMenu(); } else {
        filterMenu.classList.remove("hidden");
        filterBtn.setAttribute("aria-expanded", "true");
        var chevron = filterBtn.querySelector(".filter-chevron");
        if (chevron) chevron.style.transform = "rotate(180deg)";
      }
    });
  }

  if (filterMenu) {
    filterMenu.addEventListener("click", function (e) { e.stopPropagation(); });
    filterMenu.querySelectorAll(".filter-option[data-sort], .filter-cat-pill[data-category]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.dataset.sort) {
          currentSort = btn.dataset.sort;
          filterMenu.querySelectorAll(".filter-option[data-sort]").forEach(function (b) {
            b.classList.toggle("active", b === btn);
            b.setAttribute("aria-selected", b === btn ? "true" : "false");
          });
        }
        if (btn.dataset.category !== undefined) {
          currentCategory = btn.dataset.category;
          filterMenu.querySelectorAll(".filter-cat-pill").forEach(function (b) {
            b.classList.toggle("active", b === btn);
          });
        }
        // Update filter button label
        if (filterBtn) {
          var sortLabel = SORT_LABELS[currentSort] || "Filter";
          var catLabel = currentCategory !== "All" ? " · " + currentCategory : "";
          filterBtn.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z"/></svg>' +
            sortLabel + catLabel +
            '<svg class="filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
        }
        // Show active filter label
        if (activeFilterLabel) {
          var parts = [];
          if (currentSort !== "latest") parts.push("Sorted by: " + SORT_LABELS[currentSort]);
          if (currentCategory !== "All") parts.push("Category: " + currentCategory);
          if (parts.length) {
            activeFilterLabel.textContent = parts.join(" · ");
            activeFilterLabel.classList.remove("hidden");
          } else {
            activeFilterLabel.classList.add("hidden");
          }
        }
        closeFilterMenu();
        loadPosts();
      });
    });
  }

  document.addEventListener("click", function () { closeFilterMenu(); });

  var saveProfileBtn = document.getElementById("save-profile");
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", function () {
      var name = (document.getElementById("profile-name").value || "").trim();
      var photoFileInput = document.getElementById("profile-photo-file");
      var selectedPhoto = photoFileInput && photoFileInput.files ? photoFileInput.files[0] : null;
      var status = document.getElementById("profile-status");
      status.textContent = "";
      if (!name) {
        status.textContent = "Display name is required.";
        return;
      }
      api("/api/users/" + currentUser.user_id + "/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: name,
          photo_url: selectedPhoto ? undefined : selectedDefaultPhoto || "",
        }),
      })
        .then(function (res) {
          if (!selectedPhoto) {
            saveSession(res.user);
            refreshProfileUI();
            status.textContent = "Profile updated.";
            loadPosts();
            return;
          }

          var formData = new FormData();
          formData.append("photo", selectedPhoto);
          return fetch("/api/users/" + currentUser.user_id + "/profile-photo", {
            method: "POST",
            body: formData,
          })
            .then(function (r) {
              return r.json().then(function (body) {
                if (!r.ok) {
                  throw new Error(body.error || "Could not upload image.");
                }
                return body;
              });
            })
            .then(function (photoRes) {
              saveSession(photoRes.user);
              refreshProfileUI();
              if (photoFileInput) photoFileInput.value = "";
              status.textContent = "Profile and photo updated.";
              loadPosts();
            });
        })
        .catch(function (e) {
          status.textContent = e.message || "Could not update profile.";
        });
    });
  }

  var profilePhotoFileInput = document.getElementById("profile-photo-file");
  if (profilePhotoFileInput) {
    profilePhotoFileInput.addEventListener("change", function () {
      if (this.files && this.files.length) {
        selectedDefaultPhoto = "";
        renderDefaultProfileGallery();
      }
    });
  }

  refreshProfileUI();
  loadDefaultProfileImages();
  loadPosts();

  // Add click handler for home link to refresh posts when already on home page
  var homeLink = document.querySelector('a[href="/wall"]');
  if (homeLink) {
    homeLink.addEventListener('click', function(e) {
      if (window.location.pathname === '/wall') {
        e.preventDefault();
        loadPosts(true); // Pass true to randomize
      }
    });
  }

  // --- Post modal (opened from notifications) ---
  var postModal = document.getElementById('post-modal');
  var postModalContent = document.getElementById('post-modal-content');
  var postModalClose = document.getElementById('post-modal-close');

  function closePostModal() {
    if (postModal) { postModal.classList.add('hidden'); postModal.setAttribute('aria-hidden', 'true'); }
    if (postModalContent) postModalContent.innerHTML = '';
  }

  if (postModalClose) postModalClose.addEventListener('click', closePostModal);
  if (postModal) postModal.addEventListener('click', function (e) { if (e.target === postModal) closePostModal(); });

  function openPostModal(postId) {
    if (!postModal || !postModalContent) return;
    postModalContent.innerHTML = '<p class="hint" style="text-align:center;padding:2rem;">Loading…</p>';
    postModal.classList.remove('hidden');
    postModal.setAttribute('aria-hidden', 'false');

    api('/api/posts/' + postId).then(function (data) {
      var p = data.post;
      if (!p) { postModalContent.innerHTML = '<p class="hint" style="text-align:center;padding:2rem;">Post not found.</p>'; return; }

      postModalContent.innerHTML = '';
      var card = renderPostShell(p);
      postModalContent.appendChild(card);

      // Wire reactions on the post
      var reactionWrap = card.querySelector('.reaction-wrap');
      if (reactionWrap) {
        fetch('/api/reactions?target_type=post&target_id=' + p.id + '&token=' + encodeURIComponent(getReactionToken()))
          .then(function (r) { return r.json(); })
          .then(function (data) { applyReactionVisual(reactionWrap, data); })
          .catch(function () {});
        bindReactionWidget(reactionWrap, 'post', p.id);
      }

      // Wire edit/delete if own post
      var editPostBtn = card.querySelector('.btn-edit-post');
      if (editPostBtn) {
        editPostBtn.addEventListener('click', function () {
          openActionModal({ title: 'Edit Post', message: 'Update your post below.', showInput: true, initialValue: p.content || '', confirmText: 'Save',
            onConfirm: function (ctx) {
              if (!ctx.value) { ctx.setError('Post content is required.'); return; }
              api('/api/posts/' + p.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id, content: ctx.value, category: p.category || 'Other' }) })
                .then(function () { ctx.close(); closePostModal(); loadPosts(); })
                .catch(function (e) { ctx.setError(e.message || 'Could not update.'); });
            }
          });
        });
      }
      var deletePostBtn = card.querySelector('.btn-delete-post');
      if (deletePostBtn) {
        deletePostBtn.addEventListener('click', function () {
          openActionModal({ title: 'Delete Post', message: 'Are you sure?', confirmText: 'Delete', danger: true,
            onConfirm: function (ctx) {
              api('/api/posts/' + p.id, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id }) })
                .then(function () { ctx.close(); closePostModal(); loadPosts(); })
                .catch(function (e) { ctx.setError(e.message || 'Could not delete.'); });
            }
          });
        });
      }

      // Wire comment toggle and show comments by default
      var block = card.querySelector('.comments-block');
      var toggle = card.querySelector('.btn-comment-toggle');
      block.classList.remove('hidden'); // Show comments by default in modal
      loadCommentsForModalCard(card, postId);
      
      toggle.addEventListener('click', function () {
        block.classList.toggle('hidden');
        if (!block.classList.contains('hidden')) loadCommentsForModalCard(card, postId);
      });

      // Wire add comment
      var addBtn = block.querySelector('.add-comment');
      var ta = block.querySelector('textarea');
      var attachBtn = block.querySelector('.btn-attach-image');
      var commentFile = block.querySelector('.comment-image-file');
      var commentLabel = block.querySelector('.comment-image-label');
      var imagePreview = block.querySelector('.comment-image-preview');
      var previewImg = block.querySelector('.comment-preview-img');
      var previewRemove = block.querySelector('.comment-preview-remove');
      
      if (attachBtn && commentFile) {
        attachBtn.addEventListener('click', function () { commentFile.click(); });
        commentFile.addEventListener('change', function () {
          var file = commentFile.files[0];
          if (file) {
            // Show preview
            var reader = new FileReader();
            reader.onload = function(e) {
              previewImg.src = e.target.result;
              imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
            if (commentLabel) commentLabel.textContent = file.name;
          } else {
            // Hide preview
            imagePreview.classList.add('hidden');
            previewImg.src = '';
            if (commentLabel) commentLabel.textContent = '';
          }
        });
      }
      
      if (previewRemove) {
        previewRemove.addEventListener('click', function() {
          commentFile.value = '';
          imagePreview.classList.add('hidden');
          previewImg.src = '';
          if (commentLabel) commentLabel.textContent = '';
        });
      }
      
      bindEnterToSubmit(ta, function () { addBtn.click(); });
      addBtn.addEventListener('click', function () {
        var text = (ta.value || '').trim();
        if (!text) return;
        var errorEl = block.querySelector('.comment-form-error');
        if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
        var fd = new FormData();
        fd.append('user_id', String(currentUser.user_id));
        fd.append('content', text);
        fd.append('parent_id', '');
        if (commentFile && commentFile.files[0]) fd.append('image', commentFile.files[0]);
        fetch('/api/posts/' + postId + '/comments', { method: 'POST', body: fd })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.statusText); return j; }); })
          .then(function () {
            ta.value = '';
            if (commentFile) commentFile.value = '';
            if (commentLabel) commentLabel.textContent = '';
            if (imagePreview) imagePreview.classList.add('hidden');
            if (previewImg) previewImg.src = '';
            loadCommentsForModalCard(card, postId);
            var ccount = card.querySelector('.btn-comment-toggle .ccount');
            if (ccount) ccount.textContent = String((parseInt(ccount.textContent, 10) || 0) + 1);
          })
          .catch(function (e) { if (errorEl) { errorEl.textContent = e.message || 'Could not add comment.'; errorEl.classList.remove('hidden'); } });
      });

    }).catch(function () {
      postModalContent.innerHTML = '<p class="hint" style="text-align:center;padding:2rem;">Could not load post.</p>';
    });
  }

  function loadCommentsForModalCard(card, postId) {
    var tree = card.querySelector('.comments-tree');
    api('/api/posts/' + postId + '/comments').then(function (rows) {
      tree.innerHTML = '';
      var byParent = {};
      rows.forEach(function (c) { var k = c.parent_id == null ? 'root' : String(c.parent_id); if (!byParent[k]) byParent[k] = []; byParent[k].push(c); });
      (byParent.root || []).forEach(function (c) {
        var commentDiv = renderComment(c, postId, false);
        tree.appendChild(commentDiv);
        var commentWrap = commentDiv.querySelector('.reaction-wrap');
        if (commentWrap) {
          fetch('/api/reactions?target_type=comment&target_id=' + c.id + '&token=' + encodeURIComponent(getLikeToken()))
            .then(function (r) { return r.json(); }).then(function (data) { applyReactionVisual(commentWrap, data); }).catch(function () {});
          bindReactionWidget(commentWrap, 'comment', c.id);
        }
        (byParent[String(c.id)] || []).forEach(function (reply) {
          var replyDiv = renderComment(reply, postId, true);
          tree.appendChild(replyDiv);
          var replyWrap = replyDiv.querySelector('.reaction-wrap');
          if (replyWrap) {
            fetch('/api/reactions?target_type=comment&target_id=' + reply.id + '&token=' + encodeURIComponent(getLikeToken()))
              .then(function (r) { return r.json(); }).then(function (data) { applyReactionVisual(replyWrap, data); }).catch(function () {});
            bindReactionWidget(replyWrap, 'comment', reply.id);
          }
        });
      });
    }).catch(function () { tree.textContent = 'Could not load comments.'; });
  }

  // --- Handle post anchors from notifications ---
  function handlePostAnchor() {
    var hash = window.location.hash;
    if (hash && hash.startsWith('#post-')) {
      var postId = parseInt(hash.substring(6), 10);
      if (postId && !isNaN(postId)) {
        // Clear the hash to prevent issues
        history.replaceState(null, null, window.location.pathname + window.location.search);
        // Open the post modal
        setTimeout(function() {
          openPostModal(postId);
        }, 500); // Small delay to ensure posts are loaded
      }
    }
  }

  // Handle hash on page load
  handlePostAnchor();

  // Handle hash changes (back/forward navigation)
  window.addEventListener('hashchange', handlePostAnchor);

  // --- Notifications (delegated to shared notif.js) ---
  if (typeof initNotifications === 'function') {
    initNotifications(currentUser.user_id, openPostModal);
  }

  // --- Lightbox ---
  function openLightbox(src) {
    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close image');
    closeBtn.innerHTML = '✕';

    var img = document.createElement('img');
    img.className = 'lightbox-img';
    img.src = src;
    img.alt = 'Full size image';

    overlay.appendChild(closeBtn);
    overlay.appendChild(img);
    document.body.appendChild(overlay);

    function close() {
      overlay.style.animation = 'lightbox-fade-in 0.15s ease reverse';
      setTimeout(function () {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
      }, 140);
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });

    img.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  // Delegate lightbox clicks on all post/comment images
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (target.classList.contains('post-media') || target.classList.contains('comment-media')) {
      openLightbox(target.src);
    }
  });

  // Add scroll-to-top functionality for navigation links
  document.addEventListener('DOMContentLoaded', function() {
    var navLinks = document.querySelectorAll('.masthead-nav a[href="/wall"], .masthead-nav a[href="/freedom-wall"], .masthead-nav a[href="/writers"]');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        // Scroll to top immediately when clicking navigation
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
    });
  });
})();

