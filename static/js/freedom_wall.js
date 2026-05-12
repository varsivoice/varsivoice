(function () {
  var STORAGE_KEY = "ub_session";
  var currentUser = null;

  function ensureSession() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) { window.location.href = "/"; return false; }
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.user_id) { window.location.href = "/"; return false; }
      currentUser = parsed;
      return true;
    } catch (e) { window.location.href = "/"; return false; }
  }

  if (!ensureSession()) return;

  // --- Theme ---
  function applyTheme(theme) {
    var lightBtn = document.getElementById("theme-light-btn");
    var darkBtn = document.getElementById("theme-dark-btn");
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      if (darkBtn) { darkBtn.classList.add("active"); darkBtn.setAttribute("aria-pressed", "true"); }
      if (lightBtn) { lightBtn.classList.remove("active"); lightBtn.setAttribute("aria-pressed", "false"); }
    } else {
      document.documentElement.removeAttribute("data-theme");
      if (lightBtn) { lightBtn.classList.add("active"); lightBtn.setAttribute("aria-pressed", "true"); }
      if (darkBtn) { darkBtn.classList.remove("active"); darkBtn.setAttribute("aria-pressed", "false"); }
    }
    try { localStorage.setItem("ub_theme", theme); } catch (e) {}
  }
  try { applyTheme(localStorage.getItem("ub_theme") || "light"); } catch (e) { applyTheme("light"); }

  // --- Hamburger ---
  var hamburgerBtn = document.getElementById("hamburger-btn");
  var hamburgerMenu = document.getElementById("hamburger-menu");

  function closeHamburger() {
    hamburgerMenu.classList.add("hidden");
    hamburgerBtn.setAttribute("aria-expanded", "false");
  }
  hamburgerBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    var isOpen = !hamburgerMenu.classList.contains("hidden");
    if (isOpen) { closeHamburger(); } else {
      hamburgerMenu.classList.remove("hidden");
      hamburgerBtn.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("click", function () { closeHamburger(); });
  hamburgerMenu.addEventListener("click", function (e) { e.stopPropagation(); });

  // Show Admin Panel link for admins
  var adminPanelItem = document.getElementById("admin-panel-item");
  if (adminPanelItem && currentUser && (currentUser.role === 'main_admin' || currentUser.role === 'co_admin')) {
    adminPanelItem.classList.remove('hidden');
  }

  document.getElementById("theme-light-btn").addEventListener("click", function () { applyTheme("light"); loadPosts(searchEl.value.trim()); });
  document.getElementById("theme-dark-btn").addEventListener("click", function () { applyTheme("dark"); loadPosts(searchEl.value.trim()); });
  document.getElementById("btn-logout").addEventListener("click", function () {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    window.location.href = "/";
  });

  // --- Card colors ---
  // Dark mode: dark maroon/red shades
  var CARD_COLORS_DARK = [
    "#3d0a0a", // deep maroon
    "#4a0f0f", // dark red
    "#521515", // warm maroon
    "#3a0808", // dark wine
    "#2d0505"  // near black maroon
  ];
  // Light mode: consistent maroon palette
  var CARD_COLORS_LIGHT = [
    "#7a1a1a", // classic maroon
    "#6b1530", // deep burgundy
    "#8a2828", // warm maroon
    "#5c1020", // dark wine
    "#9e3030"  // brick red
  ];

  function isDarkMode() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function getCardColors() {
    return isDarkMode() ? CARD_COLORS_DARK : CARD_COLORS_LIGHT;
  }

  // Per-post color choices stored in localStorage
  var COLOR_STORE_KEY = "fw_card_colors_v8";

  function getColorStore() {
    try { return JSON.parse(localStorage.getItem(COLOR_STORE_KEY) || "{}"); } catch (e) { return {}; }
  }

  function savePostColor(postId, color) {
    var store = getColorStore();
    store[String(postId)] = color;
    try { localStorage.setItem(COLOR_STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }

  function cardColor(id) {
    var store = getColorStore();
    return store[String(id)] || getCardColors()[id % getCardColors().length];
  }

  var selectedComposeColor = getCardColors()[0];

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function formatRelativeTime(iso) {
    try {
      var s = String(iso).trim();
      if (!/[Zz+\-]\d*$/.test(s)) s += "Z";
      var d = new Date(s);
      var sec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (sec < 10) return "just now";
      if (sec < 60) return sec + "s ago";
      if (sec < 3600) return Math.floor(sec / 60) + "m ago";
      if (sec < 86400) return Math.floor(sec / 3600) + "h ago";
      return Math.floor(sec / 86400) + "d ago";
    } catch (e) { return iso; }
  }

  var gridEl = document.getElementById("fw-grid");
  var statusEl = document.getElementById("fw-status");
  var searchEl = document.getElementById("fw-search");
  var overlay = document.getElementById("fw-overlay");
  var overlayContent = document.getElementById("fw-overlay-content");
  var overlayClose = document.getElementById("fw-overlay-close");

  // Filter dropdown toggle
  var fwFilterBtn = document.getElementById("fw-filter-btn");
  var fwFilterMenu = document.getElementById("fw-filter-menu");
  var fwCurrentSort = "latest";
  var currentCategory = "All";

  if (fwFilterBtn && fwFilterMenu) {
    fwFilterBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = !fwFilterMenu.classList.contains("hidden");
      fwFilterMenu.classList.toggle("hidden", isOpen);
      fwFilterBtn.setAttribute("aria-expanded", String(!isOpen));
    });
    document.addEventListener("click", function () {
      if (fwFilterMenu) fwFilterMenu.classList.add("hidden");
      if (fwFilterBtn) fwFilterBtn.setAttribute("aria-expanded", "false");
    });
    fwFilterMenu.addEventListener("click", function (e) { e.stopPropagation(); });

    // Sort options
    fwFilterMenu.querySelectorAll(".filter-option[data-sort]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        fwCurrentSort = btn.dataset.sort;
        fwFilterMenu.querySelectorAll(".filter-option[data-sort]").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        updateFwFilterLabel();
        loadPosts(searchEl.value.trim());
      });
    });

    // Category pills
    fwFilterMenu.querySelectorAll(".filter-cat-pill[data-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentCategory = btn.dataset.cat;
        fwFilterMenu.querySelectorAll(".filter-cat-pill").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        updateFwFilterLabel();
        loadPosts(searchEl.value.trim());
      });
    });
  }

  function updateFwFilterLabel() {
    if (!fwFilterBtn) return;
    var parts = [];
    if (fwCurrentSort !== "latest") parts.push(fwCurrentSort);
    if (currentCategory !== "All") parts.push(currentCategory);
    var label = parts.length ? parts.join(" · ") : "Filter";
    fwFilterBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z"/></svg>' +
      label +
      '<svg class="filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
  }

  // Category filter
  var catFilter = document.getElementById("fw-cat-filter");
  if (catFilter) {
    catFilter.addEventListener("click", function (e) {
      var btn = e.target.closest(".fw-cat-btn");
      if (!btn) return;
      currentCategory = btn.dataset.cat;
      catFilter.querySelectorAll(".fw-cat-btn").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      // Update filter button label
      if (fwFilterBtn) fwFilterBtn.textContent = currentCategory === "All" ? "⚙ Filter" : "⚙ " + currentCategory;
      loadPosts(searchEl.value.trim());
    });
  }

  // --- Compose modal ---
  var composeModal = document.getElementById("fw-compose-modal");
  var composeText = document.getElementById("fw-compose-text");
  var composeChars = document.getElementById("fw-compose-chars");
  var composeError = document.getElementById("fw-compose-error");
  var composeCategory = document.getElementById("fw-compose-category");

  function openCompose() {
    composeModal.classList.remove("hidden");
    composeModal.setAttribute("aria-hidden", "false");
    selectedComposeColor = getCardColors()[Math.floor(Math.random() * getCardColors().length)];
    renderSwatches();
    applyComposeColor();
    composeText.focus();
  }

  function closeCompose() {
    composeModal.classList.add("hidden");
    composeModal.setAttribute("aria-hidden", "true");
    composeError.classList.add("hidden");
  }

  document.getElementById("fw-fab").addEventListener("click", openCompose);
  document.getElementById("fw-compose-btn").addEventListener("click", openCompose);
  document.getElementById("fw-compose-close").addEventListener("click", closeCompose);
  document.getElementById("fw-compose-cancel").addEventListener("click", closeCompose);
  composeModal.addEventListener("click", function (e) { if (e.target === composeModal) closeCompose(); });

  // --- Color swatches ---
  function renderSwatches() {
    var container = document.getElementById("fw-color-swatches");
    if (!container) return;
    container.innerHTML = "";
    getCardColors().forEach(function (color) {
      var swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "fw-color-swatch" + (color === selectedComposeColor ? " selected" : "");
      swatch.style.backgroundColor = color;
      swatch.setAttribute("aria-label", "Pick color " + color);
      swatch.addEventListener("click", function () {
        selectedComposeColor = color;
        applyComposeColor();
        renderSwatches();
      });
      container.appendChild(swatch);
    });
  }

  function applyComposeColor() {
    composeText.style.backgroundColor = selectedComposeColor;
    // Light cards get dark text, dark cards get light text
    var hex = selectedComposeColor.replace('#','');
    var r = parseInt(hex.substr(0,2),16);
    var g = parseInt(hex.substr(2,2),16);
    var b = parseInt(hex.substr(4,2),16);
    var luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
    var textColor = luminance > 0.5 ? '#2a1010' : 'rgba(255,255,255,0.92)';
    composeText.style.color = textColor;
    composeText.style.caretColor = textColor;
  }

  renderSwatches();
  applyComposeColor();

  composeText.addEventListener("input", function () {
    composeChars.textContent = String(1000 - composeText.value.length);
  });

  document.getElementById("fw-compose-submit").addEventListener("click", function () {
    var content = composeText.value.trim();
    var category = composeCategory.value;
    composeError.classList.add("hidden");

    if (!content) {
      composeError.textContent = "Please write something first.";
      composeError.classList.remove("hidden");
      return;
    }

    var formData = new FormData();
    formData.append("user_id", currentUser.user_id);
    formData.append("content", content);
    formData.append("category", category);

    fetch("/api/fw-posts", { method: "POST", body: formData })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.statusText); return j; }); })
      .then(function (newPost) {
        // Save the chosen color for this post
        savePostColor(newPost.id, selectedComposeColor);
        composeText.value = "";
        composeChars.textContent = "1000";
        closeCompose();
        loadPosts(searchEl.value.trim());
      })
      .catch(function (e) {
        composeError.textContent = e.message || "Could not post.";
        composeError.classList.remove("hidden");
      });
  });

  var REACTION_TYPES = ['heart', 'haha', 'wow', 'sad', 'angry'];
  var REACTION_EMOJI = { heart: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };

  function getReactionToken() { return 'user_' + String(currentUser.user_id); }

  function fetchReactions(postId, callback) {
    fetch('/api/reactions?target_type=post&target_id=' + postId + '&token=' + encodeURIComponent(getReactionToken()))
      .then(function (r) { return r.json(); })
      .then(callback)
      .catch(function () {});
  }

  function toggleReaction(postId, reactionType, callback) {
    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_type: 'post',
        target_id: postId,
        user_token: getReactionToken(),
        reaction_type: reactionType
      })
    }).then(function (r) { return r.json(); }).then(callback).catch(function () {});
  }

  function buildReactionBar(postId, data, onUpdate, textColor, mutedColor, borderColor) {
    textColor = textColor || 'rgba(245,230,230,0.9)';
    mutedColor = mutedColor || 'rgba(245,230,230,0.55)';
    borderColor = borderColor || 'rgba(255,255,255,0.15)';

    var userReaction = data.user_reaction || null;
    var total = data.total || 0;
    var counts = data.counts || {};

    var bar = document.createElement('div');
    bar.className = 'fw-reaction-bar';
    bar.style.borderTopColor = borderColor;

    var summary = document.createElement('span');
    summary.className = 'fw-reaction-summary';
    summary.style.color = mutedColor;
    if (total > 0) {
      var topEmojis = REACTION_TYPES.filter(function (t) { return counts[t] > 0; }).slice(0, 3);
      summary.innerHTML = topEmojis.map(function (t) { return REACTION_EMOJI[t]; }).join('') + ' ' + total;
    } else {
      summary.innerHTML = '<span>♡ React</span>';
    }

    var picker = document.createElement('div');
    picker.className = 'fw-reaction-picker';
    REACTION_TYPES.forEach(function (type) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fw-reaction-btn' + (userReaction === type ? ' active' : '');
      btn.style.color = textColor;
      btn.style.borderColor = borderColor;
      btn.style.background = userReaction === type
        ? (parseFloat(borderColor) > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)')
        : 'rgba(128,128,128,0.15)';
      btn.setAttribute('aria-label', type);
      var count = counts[type] || 0;
      btn.innerHTML = REACTION_EMOJI[type] + (count > 0 ? ' <span class="fw-reaction-count">' + count + '</span>' : '');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleReaction(postId, type, onUpdate);
      });
      picker.appendChild(btn);
    });

    bar.appendChild(summary);
    bar.appendChild(picker);
    return bar;
  }

  var allPosts = [];

  function loadPosts(q, randomize) {
    statusEl.textContent = "Loading…";
    var url = "/api/fw-posts";
    var params = ["viewer_user_id=" + encodeURIComponent(currentUser.user_id)];
    if (fwCurrentSort && fwCurrentSort !== "latest") params.push("sort=" + encodeURIComponent(fwCurrentSort));
    if (q) params.push("q=" + encodeURIComponent(q));
    if (currentCategory && currentCategory !== "All") params.push("category=" + encodeURIComponent(currentCategory));
    if (params.length) url += "?" + params.join("&");
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (posts) {
        // Randomize posts if requested (for refresh behavior)
        if (randomize && posts.length > 0) {
          // Fisher-Yates shuffle algorithm
          for (var i = posts.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = posts[i];
            posts[i] = posts[j];
            posts[j] = temp;
          }
        }
        allPosts = posts;
        statusEl.textContent = posts.length ? "" : "No posts yet.";
        renderGrid(posts, q);
        // Add end-of-content indicator
        if (posts.length > 0) {
          var endMsg = document.createElement('p');
          endMsg.className = 'fw-status-msg';
          endMsg.textContent = "";
          gridEl.appendChild(endMsg);
        }
      })
      .catch(function () { statusEl.textContent = "Could not load posts."; });
  }

  function renderGrid(posts, keyword) {
    gridEl.innerHTML = "";
    posts.forEach(function (p) {
      gridEl.appendChild(makeCard(p, keyword));
    });
    if (typeof applyAvatarColors === 'function') applyAvatarColors();
  }

  function highlight(text, keyword) {
    if (!keyword || !keyword.trim()) return escapeHtml(text);
    var escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return escapeHtml(text).replace(new RegExp("(" + escaped + ")", "gi"), '<mark class="search-highlight">$1</mark>');
  }

  function deleteFreedomPost(postId) {
    return fetch('/api/posts/' + postId, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.user_id })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || r.statusText);
        return j;
      });
    });
  }

  function showDeleteFreedomPostDialog() {
    return new Promise(function (resolve) {
      var modal = document.createElement('div');
      modal.className = 'fw-delete-modal';
      modal.innerHTML =
        '<div class="fw-delete-modal-card" role="dialog" aria-modal="true" aria-labelledby="fw-delete-modal-title">' +
        '<div class="fw-delete-modal-icon" aria-hidden="true">&#128465;</div>' +
        '<h3 id="fw-delete-modal-title">Delete post?</h3>' +
        '<p>This will permanently remove the Freedom Wall post.</p>' +
        '<div class="fw-delete-modal-actions">' +
        '<button type="button" class="fw-delete-modal-cancel">Cancel</button>' +
        '<button type="button" class="fw-delete-modal-confirm">Delete</button>' +
        '</div>' +
        '</div>';

      function close(result) {
        if (document.body.contains(modal)) document.body.removeChild(modal);
        resolve(result);
      }

      modal.addEventListener('click', function (e) {
        if (e.target === modal) close(false);
      });
      modal.querySelector('.fw-delete-modal-cancel').addEventListener('click', function () { close(false); });
      modal.querySelector('.fw-delete-modal-confirm').addEventListener('click', function () { close(true); });
      document.body.appendChild(modal);
      modal.querySelector('.fw-delete-modal-cancel').focus();
    });
  }

  function confirmDeleteFreedomPost(p) {
    if (!p.is_owner) return;
    showDeleteFreedomPostDialog().then(function (confirmed) {
      if (!confirmed) return;
      deleteFreedomPost(p.id)
        .then(function () {
          closeOverlay();
          loadPosts(searchEl.value.trim());
        })
        .catch(function (e) {
          window.alert(e.message || 'Could not delete post.');
        });
    });
  }

  function getCardReactionSummary(counts, userReaction, total) {
    counts = counts || {};
    var activeTypes = REACTION_TYPES.filter(function (t) { return counts[t] > 0; });
    if (userReaction && activeTypes.indexOf(userReaction) !== -1) {
      activeTypes = [userReaction].concat(activeTypes.filter(function (t) { return t !== userReaction; }));
    }
    activeTypes = activeTypes.slice(0, 3);
    var emojiStr = activeTypes.length
      ? activeTypes.map(function (t) { return REACTION_EMOJI[t]; }).join('')
      : '♡';
    if (total > 0) {
      emojiStr += ' ' + total;
    }
    return emojiStr;
  }

  function makeCard(p, keyword) {
    var card = document.createElement("div");
    card.className = "fw-card";
    card.dataset.postId = String(p.id);
    card.style.backgroundColor = cardColor(p.id);

    var snippet = (p.content || "").trim();
    var isTruncated = snippet.length > 200;
    var display = isTruncated ? snippet.slice(0, 200) + "…" : snippet;

    card.innerHTML =
      (p.is_owner ? '<button type="button" class="fw-card-delete" aria-label="Delete post" title="Delete post">&#128465;</button>' : '') +
      '<div class="fw-card-body">' +
      '<p class="fw-card-text">' + highlight(display, keyword) + '</p>' +
      '</div>' +
      '<div class="fw-card-footer">' +
      '<span class="fw-card-cat">' + escapeHtml(p.category) + '</span>' +
      '</div>' +
      '<div class="fw-card-meta">' +
      '<span class="fw-card-time">' + escapeHtml(formatRelativeTime(p.created_at)) + '</span>' +
      '<div class="fw-card-meta-right">' +
      (p.comment_count > 0 ? '<span class="fw-card-comments">💬 ' + p.comment_count + '</span>' : '') +
      '<div class="fw-card-react-wrap">' +
      '<span class="fw-card-reactions-summary fw-card-react-trigger">♡</span>' +
      '<div class="fw-card-react-picker">' +
      REACTION_TYPES.map(function (type) {
        return '<button type="button" class="fw-card-react-btn" data-reaction="' + type + '" title="' + type + '">' + REACTION_EMOJI[type] + '</button>';
      }).join('') +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    // Load and render reaction perimeter badges on card
    function applyReactionData(data) {
      var counts = data.counts || {};
      var userReaction = data.user_reaction || null;

      var summaryEl = card.querySelector('.fw-card-reactions-summary');
      if (summaryEl) {
        summaryEl.textContent = getCardReactionSummary(counts, userReaction);
        summaryEl.classList.toggle('reacted', !!userReaction);
      }

      // Update trigger button (same element)
      var trigger = card.querySelector('.fw-card-react-trigger');
      if (trigger) trigger.classList.toggle('reacted', !!userReaction);

      card.querySelectorAll('.fw-card-reaction-badge').forEach(function (b) { b.remove(); });

      // Highlight active reaction button in picker
      card.querySelectorAll('.fw-card-react-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.reaction === userReaction);
      });
    }

    fetchReactions(p.id, applyReactionData);

    var deleteBtn = card.querySelector('.fw-card-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        confirmDeleteFreedomPost(p);
      });
    }

    // Trigger: clicking the reaction count reacts with heart (or removes)
    var trigger = card.querySelector('.fw-card-react-trigger');
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleReaction(p.id, 'heart', applyReactionData);
    });

    // Reaction picker buttons
    card.querySelectorAll('.fw-card-react-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleReaction(p.id, btn.dataset.reaction, applyReactionData);
      });
    });
    card.addEventListener("click", function () { openOverlay(p); });
    return card;
  }

  var overlayPost = document.getElementById("fw-overlay-post");
  var overlayComments = document.getElementById("fw-overlay-comments");
  var overlayCompose = document.getElementById("fw-overlay-compose");
  var overlayToolbar = document.getElementById("fw-overlay-toolbar");
  var undoBtn = document.getElementById("fw-undo-remove");

  // Per-session removed stack (resets on close)
  var removedStack = [];

  function updateUndoBtn() {
    if (removedStack.length > 0) {
      overlayToolbar.classList.remove('hidden');
    } else {
      overlayToolbar.classList.add('hidden');
    }
  }

  undoBtn.addEventListener('click', function () {
    if (!removedStack.length) return;
    var last = removedStack.pop();
    last.style.display = '';
    last.style.opacity = '1';
    updateUndoBtn();
  });

  // Sticky note colors for comments (warm pastels)
  var NOTE_COLORS = ["#fef3c7","#fce7f3","#d1fae5","#dbeafe","#ede9fe","#fde8d8","#e0f2fe","#fdf2f8"];

  function makeDraggable(el) {
    var startX, startY, startLeft, startTop, dragging = false;

    function onDown(e) {
      // Don't prevent default if clicking a button or interactive element
      var target = e.target;
      if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('.fw-comment-note-delete') || target.closest('.fw-comment-note-remove')) {
        return;
      }
      e.preventDefault();
      dragging = true;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      startLeft = parseInt(el.style.left) || 0;
      startTop = parseInt(el.style.top) || 0;
      el.style.zIndex = '520';
      el.style.transition = 'none';
      el.style.cursor = 'grabbing';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    }

    function onMove(e) {
      if (!dragging) return;
      e.preventDefault();
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      var dx = clientX - startX;
      var dy = clientY - startY;
      var newLeft = startLeft + dx;
      var newTop = startTop + dy;
      // Keep within viewport
      newLeft = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, newLeft));
      newTop = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, newTop));
      el.style.left = newLeft + 'px';
      el.style.top = newTop + 'px';
    }

    function onUp() {
      dragging = false;
      el.style.cursor = 'grab';
      el.style.transition = 'box-shadow 0.15s';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    }

    el.style.cursor = 'grab';
    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: false });
  }

  function openOverlay(p) {
    var bgColor = cardColor(p.id);
    var hex = bgColor.replace('#','');
    var r = parseInt(hex.substr(0,2),16);
    var g = parseInt(hex.substr(2,2),16);
    var b = parseInt(hex.substr(4,2),16);
    var lum = (0.299*r + 0.587*g + 0.114*b) / 255;
    var textColor = lum > 0.5 ? '#1a0505' : 'rgba(255,255,255,0.92)';
    var mutedColor = lum > 0.5 ? 'rgba(26,5,5,0.55)' : 'rgba(255,255,255,0.55)';
    var borderColor = lum > 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)';

    // Build the enlarged post card
    overlayPost.style.background = bgColor;
    overlayPost.style.color = textColor;
    overlayPost.innerHTML =
      '<button type="button" class="fw-detail-close" aria-label="Close">×</button>' +
      (p.is_owner ? '<button type="button" class="fw-detail-delete" aria-label="Delete post" title="Delete post">&#128465;</button>' : '') +
      '<div class="fw-detail-cat" style="background:' + borderColor + ';color:' + textColor + ';border:1px solid ' + borderColor + '">' + escapeHtml(p.category) + '</div>' +
      '<p class="fw-detail-text" style="color:' + textColor + '">' + escapeHtml(p.content) + '</p>' +
      (p.image_url ? '<img src="' + escapeHtml(p.image_url) + '" class="fw-detail-img" alt="Attached image" />' : '') +
      '<div class="fw-detail-footer" style="border-color:' + borderColor + ';color:' + mutedColor + '">' +
      '<span style="color:' + mutedColor + '">Anonymous · ' + escapeHtml(formatRelativeTime(p.created_at)) + '</span>' +
      '<span id="fw-detail-reaction-summary" class="fw-detail-reaction-summary">♡</span>' +
      '</div>' +
      '<div id="fw-detail-reactions"></div>';

    var detailCloseBtn = overlayPost.querySelector('.fw-detail-close');
    if (detailCloseBtn) {
      detailCloseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeOverlay();
      });
    }

    var detailDeleteBtn = overlayPost.querySelector('.fw-detail-delete');
    if (detailDeleteBtn) {
      detailDeleteBtn.style.color = '#fff';
      detailDeleteBtn.style.borderColor = 'rgba(255,255,255,0.34)';
      detailDeleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        confirmDeleteFreedomPost(p);
      });
    }

    // Reactions + "Leave a note" button
    var reactionsEl = overlayPost.querySelector('#fw-detail-reactions');
    fetchReactions(p.id, function (data) {
      if (!reactionsEl) return;
      reactionsEl.style.borderTopColor = borderColor;
      function renderBar(newData) {
        reactionsEl.innerHTML = '';
        var detailSummary = overlayPost.querySelector('#fw-detail-reaction-summary');
        if (detailSummary) {
          detailSummary.textContent = getCardReactionSummary(newData.counts || {}, newData.user_reaction || null, newData.total || 0);
        }
        var bar = buildReactionBar(p.id, newData, renderBar, textColor, mutedColor, borderColor);

        // Add "Leave a note" toggle button
        var noteBtn = document.createElement('button');
        noteBtn.type = 'button';
        noteBtn.className = 'fw-leave-note-btn';
        noteBtn.style.color = textColor;
        noteBtn.style.borderColor = borderColor;
        noteBtn.style.background = 'rgba(128,128,128,0.15)';
        noteBtn.innerHTML = '📌 Leave a note';
        noteBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var isHidden = overlayCompose.classList.contains('hidden');
          overlayCompose.classList.toggle('hidden', !isHidden);
          if (isHidden) {
            var inp = document.getElementById('fw-overlay-comment-input');
            if (inp) inp.focus();
          }
        });
        bar.appendChild(noteBtn);

        if (p.is_owner) {
          var actionDeleteBtn = document.createElement('button');
          actionDeleteBtn.type = 'button';
          actionDeleteBtn.className = 'fw-detail-delete-action';
          actionDeleteBtn.setAttribute('aria-label', 'Delete post');
          actionDeleteBtn.title = 'Delete post';
          actionDeleteBtn.innerHTML = '&#128465;';
          actionDeleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            confirmDeleteFreedomPost(p);
          });
          bar.appendChild(actionDeleteBtn);
        }

        reactionsEl.appendChild(bar);

        var cardEl = gridEl.querySelector('[data-post-id="' + p.id + '"]');
        if (cardEl) {
          cardEl.querySelectorAll('.fw-card-reaction-badge').forEach(function (b) { b.remove(); });
          var counts = newData.counts || {};
          var userReaction = newData.user_reaction || null;
          var summaryEl = cardEl.querySelector('.fw-card-reactions-summary');
          if (summaryEl) {
            summaryEl.textContent = getCardReactionSummary(counts, userReaction);
            summaryEl.classList.toggle('reacted', !!userReaction);
          }
          cardEl.querySelectorAll('.fw-card-react-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.reaction === userReaction);
          });
        }
      }
      renderBar(data);
    });

    // Compose note — hidden by default
    overlayCompose.classList.add('hidden');
    var composeNoteColor = NOTE_COLORS[p.id % NOTE_COLORS.length];
    overlayCompose.style.background = composeNoteColor;
    var composeInput = document.getElementById('fw-overlay-comment-input');
    var composeSend = document.getElementById('fw-overlay-comment-send');
    var composeCancel = document.getElementById('fw-overlay-compose-cancel');
    composeInput.value = '';

    // Cancel hides the compose note
    if (composeCancel) {
      var newCancel = composeCancel.cloneNode(true);
      composeCancel.parentNode.replaceChild(newCancel, composeCancel);
      newCancel.addEventListener('click', function (e) {
        e.stopPropagation();
        overlayCompose.classList.add('hidden');
      });
    }

    function loadCommentNotes() {
      fetch('/api/posts/' + p.id + '/comments')
        .then(function (r) { return r.json(); })
        .then(function (comments) {
          overlayComments.innerHTML = '';
          if (!comments.length) return;

          var isMobile = window.innerWidth <= 700;

          // Get actual post bounds after render so notes can scatter around it on every viewport.
          var postRect = overlayPost.getBoundingClientRect();
          var vw = window.innerWidth;
          var vh = window.innerHeight;
          var noteW = isMobile ? 175 : 200;
          var noteH = isMobile ? 110 : 135;
          var margin = isMobile ? 8 : 16;
          var pad = isMobile ? 8 : 24;

          var zones = [];
          if (postRect) {
            if (postRect.left - noteW - pad - margin > margin)
              zones.push({ x: [margin, postRect.left - noteW - pad], y: [margin, vh - noteH - margin] });
            if (postRect.right + pad + noteW + margin < vw)
              zones.push({ x: [postRect.right + pad, vw - noteW - margin], y: [margin, vh - noteH - margin] });
            if (postRect.top - noteH - pad - margin > margin)
              zones.push({ x: [postRect.left, postRect.right - noteW], y: [margin, postRect.top - noteH - pad] });
            var composeTop = vh - 180;
            if (postRect.bottom + pad + noteH < composeTop)
              zones.push({ x: [postRect.left, postRect.right - noteW], y: [postRect.bottom + pad, composeTop - noteH] });
            if (!zones.length) {
              zones.push({ x: [margin, Math.max(margin, postRect.left - noteW - pad)], y: [margin, vh - noteH - margin] });
              zones.push({ x: [Math.min(vw - noteW - margin, postRect.right + pad), vw - noteW - margin], y: [margin, vh - noteH - margin] });
            }
          }

          comments.forEach(function (c, i) {
            var isOwn = c.user_id === currentUser.user_id;
            // Own notes: gold/amber so they stand out; others: regular pastel rotation
            var noteColor = isOwn ? '#fbbf24' : NOTE_COLORS[i % NOTE_COLORS.length];
            var noteTextColor = '#1a0505';
            var noteMutedColor = 'rgba(26,5,5,0.55)';
            var rotation = (i % 2 === 0 ? 1 : -1) * (1 + (i % 3));
            var note = document.createElement('div');
            note.className = 'fw-comment-note' + (isOwn ? ' fw-comment-note--own' : '');
            note.style.background = noteColor;
            note.style.transform = 'rotate(' + rotation + 'deg)';

            if (zones.length) {
              var zone = zones[i % zones.length];
              var xRange = Math.max(0, zone.x[1] - zone.x[0]);
              var yRange = Math.max(0, zone.y[1] - zone.y[0]);
              var xPos = zone.x[0] + (xRange > 0 ? (xRange * ((i * 137 + 31) % 97) / 97) : 0);
              var yPos = zone.y[0] + (yRange > 0 ? (yRange * ((i * 79 + 17) % 89) / 89) : 0);
              note.style.left = Math.max(margin, Math.min(vw - noteW - margin, xPos)) + 'px';
              note.style.top = Math.max(margin, Math.min(vh - noteH - margin, yPos)) + 'px';
            }

            note.innerHTML =
              '<div class="fw-comment-note-header">' +
              (isOwn ? '<span class="fw-comment-note-mine">✦ Yours</span>' : '<span></span>') +
              '<div class="fw-comment-note-actions">' +
              (isOwn ? '<button type="button" class="fw-comment-note-delete" title="Delete your comment">🗑</button>' : '') +
              '<button type="button" class="fw-comment-note-remove" title="Remove from view">✕</button>' +
              '</div>' +
              '</div>' +
              '<p class="fw-comment-note-text" style="color:' + noteTextColor + '">' + escapeHtml(c.content) + '</p>' +
              '<div class="fw-comment-note-meta" style="color:' + noteMutedColor + '">' +
              '<strong>Anonymous</strong>' +
              ' · ' + escapeHtml(formatRelativeTime(c.created_at)) +
              '</div>';

            // Remove from view (local only, resets on reopen)
            var removeBtn = note.querySelector('.fw-comment-note-remove');
            removeBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              note.style.transition = 'opacity 0.15s';
              note.style.opacity = '0';
              setTimeout(function () {
                note.style.display = 'none';
                removedStack.push(note);
                updateUndoBtn();
              }, 150);
            });

            // Delete handler (own comments only — permanent)
            if (isOwn) {
              var delBtn = note.querySelector('.fw-comment-note-delete');
              delBtn.addEventListener('click', function (e) {
                e.stopPropagation();

                // If confirm bubble already showing, ignore
                if (note.querySelector('.fw-delete-confirm')) return;

                // Build inline confirm bubble
                var confirmBubble = document.createElement('div');
                confirmBubble.className = 'fw-delete-confirm';
                confirmBubble.innerHTML =
                  '<span>Delete?</span>' +
                  '<button type="button" class="fw-delete-yes">Yes</button>' +
                  '<button type="button" class="fw-delete-no">No</button>';
                delBtn.parentNode.insertBefore(confirmBubble, delBtn.nextSibling);

                confirmBubble.querySelector('.fw-delete-no').addEventListener('click', function (ev) {
                  ev.stopPropagation();
                  confirmBubble.remove();
                });

                confirmBubble.querySelector('.fw-delete-yes').addEventListener('click', function (ev) {
                  ev.stopPropagation();
                  confirmBubble.remove();
                  fetch('/api/comments/' + c.id, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: currentUser.user_id })
                  }).then(function () {
                    note.style.transition = 'opacity 0.2s, transform 0.2s';
                    note.style.opacity = '0';
                    note.style.transform += ' scale(0.8)';
                    setTimeout(function () {
                      if (note.parentNode) note.parentNode.removeChild(note);
                      removedStack = removedStack.filter(function (n) { return n !== note; });
                      updateUndoBtn();
                      var cardEl = gridEl.querySelector('[data-post-id="' + p.id + '"]');
                      if (cardEl) {
                        var commentsEl = cardEl.querySelector('.fw-card-comments');
                        if (commentsEl) {
                          var cur = parseInt(commentsEl.textContent.replace(/\D/g,'')) || 0;
                          if (cur - 1 <= 0) commentsEl.style.display = 'none';
                          else commentsEl.textContent = '💬 ' + (cur - 1);
                        }
                      }
                    }, 200);
                  }).catch(function () {});
                });
              });
            }

            makeDraggable(note);
            overlayComments.appendChild(note);
          });
        })
        .catch(function () {});
    }

    // Wait a tick for the post to render before measuring
    setTimeout(loadCommentNotes, 50);

    // Remove old listeners by cloning
    var newSend = composeSend.cloneNode(true);
    composeSend.parentNode.replaceChild(newSend, composeSend);
    var newInput = composeInput.cloneNode(true);
    composeInput.parentNode.replaceChild(newInput, composeInput);

    function submitNote() {
      var text = (newInput.value || '').trim();
      if (!text) return;
      var fd = new FormData();
      fd.append('user_id', currentUser.user_id);
      fd.append('content', text);
      fetch('/api/posts/' + p.id + '/comments', { method: 'POST', body: fd })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error); return j; }); })
        .then(function () { newInput.value = ''; loadCommentNotes(); })
        .catch(function () {});
    }

    newSend.addEventListener('click', submitNote);
    newInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNote(); } });

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closeOverlay() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    overlayPost.style.background = '';
    overlayPost.style.color = '';
    overlayComments.innerHTML = '';
    overlayCompose.classList.add('hidden');
    overlayToolbar.classList.add('hidden');
    removedStack = []; // reset on close so comments show fresh next time
  }

  var overlayCloseBtn = document.getElementById("fw-overlay-close");
  overlayCloseBtn.addEventListener("click", closeOverlay);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeOverlay(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeOverlay(); });

  // Search
  var searchTimer;
  searchEl.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      loadPosts(searchEl.value.trim());
    }, 300);
  });

  loadPosts();

  // Add click handler for Freedom Wall link to refresh posts when already on Freedom Wall page
  var fwLink = document.querySelector('a[href="/freedom-wall"]');
  if (fwLink) {
    fwLink.addEventListener('click', function(e) {
      if (window.location.pathname === '/freedom-wall') {
        e.preventDefault();
        loadPosts(searchEl.value.trim(), true); // Pass true to randomize
      }
    });
  }

  // Initialize header profile display
  var headerAvatar = document.getElementById("header-avatar");
  var headerAvatarLink = document.getElementById("header-avatar-link");
  if (headerAvatarLink) {
    headerAvatarLink.href = "/profile/" + currentUser.user_id;
  }
  if (headerAvatar && currentUser.photo_url) {
    headerAvatar.src = currentUser.photo_url;
  } else if (headerAvatar) {
    headerAvatar.classList.add("no-image");
  }

  // Notifications
  if (typeof initNotifications === 'function') {
    initNotifications(currentUser.user_id);
  }

  // --- Lightbox ---
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (target.classList.contains('post-media') || target.classList.contains('comment-media')) {
      var overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      var closeBtn = document.createElement('button');
      closeBtn.className = 'lightbox-close';
      closeBtn.setAttribute('aria-label', 'Close image');
      closeBtn.innerHTML = '✕';
      var img = document.createElement('img');
      img.className = 'lightbox-img';
      img.src = target.src;
      img.alt = 'Full size image';
      overlay.appendChild(closeBtn);
      overlay.appendChild(img);
      document.body.appendChild(overlay);
      function close() {
        overlay.style.animation = 'lightbox-fade-in 0.15s ease reverse';
        setTimeout(function () { if (document.body.contains(overlay)) document.body.removeChild(overlay); }, 140);
      }
      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
      img.addEventListener('click', function (e) { e.stopPropagation(); });
      document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
      });
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
