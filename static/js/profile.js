(function () {
  var STORAGE_KEY = "ub_session";
  var REACTION_TYPES = ['heart', 'haha', 'wow', 'sad', 'angry'];
  var REACTION_EMOJI = { heart: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };

  var pathParts = window.location.pathname.split("/").filter(Boolean);
  var viewedUserId = Number(pathParts[pathParts.length - 1] || 0);
  var currentUser = null;

  function ensureSession() {
    try {
      var raw = (window.AuthSession ? window.AuthSession.getRaw() : sessionStorage.getItem(STORAGE_KEY));
      if (!raw) { window.location.href = "/"; return false; }
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.user_id) { window.location.href = "/"; return false; }
      currentUser = parsed;
      return true;
    } catch (e) { window.location.href = "/"; return false; }
  }

  if (!ensureSession()) return;

  function getReactionToken() { return 'user_' + String(currentUser.user_id); }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function initials(name) {
    var clean = (name || "").trim();
    if (!clean) return "U";
    return clean.split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join("");
  }

  function parseUtcDate(iso) {
    if (!iso) return new Date(NaN);
    var s = String(iso).trim();
    if (!/[Zz+\-]\d*$/.test(s)) s += "Z";
    return new Date(s);
  }

  function formatJoinDate(iso) {
    try {
      var d = parseUtcDate(iso);
      return "Joined on " + d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return ""; }
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
      return d.toLocaleDateString();
    } catch (e) { return iso; }
  }

  function profileHref(uid) { return "/profile/" + encodeURIComponent(String(uid || "")); }

  function api(path, opts) {
    return fetch(path, opts).then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) throw new Error(body.error || "Request failed.");
        return body;
      });
    });
  }

  // --- Dark mode ---
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
  var themeLightBtn = document.getElementById("theme-light-btn");
  var themeDarkBtn = document.getElementById("theme-dark-btn");

  function closeHamburger() {
    if (hamburgerMenu) hamburgerMenu.classList.add("hidden");
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "false");
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = !hamburgerMenu.classList.contains("hidden");
      if (isOpen) { closeHamburger(); } else {
        hamburgerMenu.classList.remove("hidden");
        hamburgerBtn.setAttribute("aria-expanded", "true");
      }
    });
  }
  document.addEventListener("click", function () { closeHamburger(); });
  if (hamburgerMenu) hamburgerMenu.addEventListener("click", function (e) { e.stopPropagation(); });

  // Show Admin Panel link for admins
  var adminPanelItem = document.getElementById("admin-panel-item");
  if (adminPanelItem && currentUser && (currentUser.role === 'main_admin' || currentUser.role === 'co_admin')) {
    adminPanelItem.classList.remove('hidden');
  }

  if (themeLightBtn) themeLightBtn.addEventListener("click", function () { applyTheme("light"); });
  if (themeDarkBtn) themeDarkBtn.addEventListener("click", function () { applyTheme("dark"); });

  // --- Logout ---
  var logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      try { (window.AuthSession ? window.AuthSession.clear() : sessionStorage.removeItem(STORAGE_KEY)); } catch (e) {}
      window.location.href = "/";
    });
  }

  // --- Header avatar link ---
  var headerAvatarLink = document.getElementById("header-avatar-link");
  var headerAvatar = document.getElementById("header-avatar");
  if (headerAvatarLink) headerAvatarLink.href = profileHref(currentUser.user_id);
  if (headerAvatar) {
    if (currentUser.photo_url) {
      headerAvatar.src = currentUser.photo_url;
    } else {
      headerAvatar.classList.add("no-image");
    }
  }

  // --- Action modal ---
  var actionModal = document.getElementById("action-modal");
  var actionModalTitle = document.getElementById("action-modal-title");
  var actionModalMessage = document.getElementById("action-modal-message");
  var actionModalInput = document.getElementById("action-modal-input");
  var actionModalError = document.getElementById("action-modal-error");
  var actionModalCancel = document.getElementById("action-modal-cancel");
  var actionModalConfirm = document.getElementById("action-modal-confirm");
  var modalConfirmHandler = null;

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
    actionModalError.textContent = "";
    actionModalError.classList.add("hidden");
    actionModalConfirm.textContent = config.confirmText || "Confirm";
    actionModalConfirm.classList.toggle("btn-danger", !!config.danger);
    actionModal.classList.remove("hidden");
    actionModal.setAttribute("aria-hidden", "false");
    modalConfirmHandler = config.onConfirm || null;
    if (config.showInput) actionModalInput.focus();
  }

  if (actionModalCancel) actionModalCancel.addEventListener("click", closeActionModal);
  if (actionModal) actionModal.addEventListener("click", function (e) { if (e.target === actionModal) closeActionModal(); });
  var actionModalCard = document.querySelector(".action-modal-card");
  if (actionModalCard) actionModalCard.addEventListener("click", function (e) { e.stopPropagation(); });
  if (actionModalConfirm) actionModalConfirm.addEventListener("click", function () {
    if (!modalConfirmHandler) { closeActionModal(); return; }
    modalConfirmHandler({
      value: (actionModalInput.value || "").trim(),
      setError: function (msg) { actionModalError.textContent = msg || ""; actionModalError.classList.toggle("hidden", !msg); },
      close: closeActionModal
    });
  });

  // --- Reaction widget ---
  function applyReactionVisual(wrap, data) {
    var trigger = wrap.querySelector('.btn-reaction-trigger');
    var emojiEl = wrap.querySelector('.reaction-emoji');
    var countEl = wrap.querySelector('.reaction-count');
    if (!trigger || !emojiEl || !countEl) return;
    var userReaction = data.user_reaction || null;
    var counts = data.counts || {};
    var total = data.total || 0;
    var topEmojis = REACTION_TYPES.filter(function (t) { return counts[t] && counts[t] > 0; }).slice(0, 3);
    if (total === 0) {
      emojiEl.innerHTML = '<span class="heart-outline" aria-hidden="true">♡</span>';
      countEl.textContent = '';
    } else {
      emojiEl.innerHTML = topEmojis.map(function (t) { return '<span class="reaction-bubble">' + REACTION_EMOJI[t] + '</span>'; }).join('');
      countEl.textContent = String(total);
    }
    if (userReaction) { trigger.classList.add('reacted'); } else { trigger.classList.remove('reacted'); }
    trigger.setAttribute('aria-label', userReaction ? userReaction + ', ' + total + ' total' : 'React');
    wrap.dataset.userReaction = userReaction || '';
    wrap.querySelectorAll('.btn-pick-reaction').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.reaction === userReaction);
    });
  }

  function toggleReaction(wrap, targetType, targetId, reactionType) {
    var active = wrap.dataset.userReaction || null;
    var typeToSend = reactionType !== null ? reactionType : (active ? active : 'heart');
    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: targetType, target_id: targetId, user_token: getReactionToken(), reaction_type: typeToSend })
    }).then(function (r) { return r.json(); }).then(function (data) { applyReactionVisual(wrap, data); }).catch(function () {});
  }

  function bindReactionWidget(wrap, targetType, targetId) {
    var trigger = wrap.querySelector('.btn-reaction-trigger');
    var picker = wrap.querySelector('.reaction-picker');
    if (!trigger || !picker) return;
    var showT = null, hideT = null;
    trigger.addEventListener('mouseenter', function () { clearTimeout(hideT); showT = setTimeout(function () { picker.classList.remove('hidden'); }, 300); });
    trigger.addEventListener('mouseleave', function () { clearTimeout(showT); hideT = setTimeout(function () { picker.classList.add('hidden'); }, 200); });
    picker.addEventListener('mouseenter', function () { clearTimeout(hideT); });
    picker.addEventListener('mouseleave', function () { hideT = setTimeout(function () { picker.classList.add('hidden'); }, 200); });
    trigger.addEventListener('click', function () { toggleReaction(wrap, targetType, targetId, null); });
    picker.querySelectorAll('.btn-pick-reaction').forEach(function (btn) {
      btn.addEventListener('click', function () { toggleReaction(wrap, targetType, targetId, btn.dataset.reaction); picker.classList.add('hidden'); });
    });
  }

  function makeReactionWrap(targetType, targetId) {
    var wrap = document.createElement('div');
    wrap.className = 'reaction-wrap';
    wrap.dataset.targetType = targetType;
    wrap.dataset.targetId = String(targetId);
    wrap.innerHTML = '<button type="button" class="btn-reaction-trigger" aria-label="React"><span class="reaction-emoji"><span class="heart-outline">♡</span></span><span class="reaction-count"></span></button><div class="reaction-picker hidden" role="toolbar" aria-label="Pick a reaction"></div>';
    var picker = wrap.querySelector('.reaction-picker');
    REACTION_TYPES.forEach(function (type) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn-pick-reaction'; btn.dataset.reaction = type;
      btn.setAttribute('aria-label', type.charAt(0).toUpperCase() + type.slice(1));
      btn.textContent = REACTION_EMOJI[type];
      picker.appendChild(btn);
    });
    return wrap;
  }

  function loadReactions(wrap, targetType, targetId) {
    fetch('/api/reactions?target_type=' + targetType + '&target_id=' + targetId + '&token=' + encodeURIComponent(getReactionToken()))
      .then(function (r) { return r.json(); })
      .then(function (data) { applyReactionVisual(wrap, data); })
      .catch(function () {});
    bindReactionWidget(wrap, targetType, targetId);
  }

  // --- Comments ---
  function bindEnterToSubmit(ta, fn) {
    if (!ta) return;
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fn(); } });
  }

  function renderComment(c, postId, isReply, feedEl) {
    var div = document.createElement('div');
    div.className = 'comment' + (isReply ? ' reply' : '');
    var isOwn = currentUser && c.user_id === currentUser.user_id;
    div.innerHTML =
      '<div class="comment-head">' +
      '<a class="profile-link-avatar comment-avatar-wrap" href="' + profileHref(c.user_id) + '">' +
      (c.author_photo ? '<img class="comment-avatar" src="' + escapeHtml(c.author_photo) + '" alt="' + escapeHtml(c.author_name) + '" />' : '<div class="comment-avatar no-image">' + escapeHtml(initials(c.author_name)) + '</div>') +
      '</a>' +
      '<div class="comment-meta"><a class="comment-author-link" href="' + profileHref(c.user_id) + '">' + escapeHtml(c.author_name || 'User') + '</a> · ' + escapeHtml(formatRelativeTime(c.created_at)) +
      (c.updated_at ? ' <span class="edited-label">(edited)</span>' : '') +
      (!isReply ? ' · <button type="button" class="btn-reply" style="background:none;border:none;color:var(--varsity-red);cursor:pointer;font-weight:600;padding:0;">Reply</button>' : '') +
      '</div>' +
      (isOwn ? '<div class="comment-owner-actions"><div class="owner-menu"><button type="button" class="owner-menu-trigger" aria-label="Comment options">...</button><div class="owner-menu-list hidden"><button type="button" class="owner-menu-item btn-comment-edit">Edit</button><button type="button" class="owner-menu-item btn-comment-delete">Delete</button></div></div></div>' : '') +
      '</div>' +
      '<div class="comment-body"></div>' +
      '<div class="reply-form hidden"></div>';
    div.querySelector('.comment-body').textContent = c.content;
    if (c.image_url) {
      var img = document.createElement('img'); img.className = 'comment-media'; img.src = c.image_url; img.alt = 'Attached image';
      div.querySelector('.comment-body').insertAdjacentElement('afterend', img);
    }
    var reactionWrap = makeReactionWrap('comment', c.id);
    div.querySelector('.reply-form').insertAdjacentElement('beforebegin', reactionWrap);
    loadReactions(reactionWrap, 'comment', c.id);

    // Owner menu
    var trigger = div.querySelector('.owner-menu-trigger');
    var menu = div.querySelector('.owner-menu-list');
    if (trigger && menu) {
      trigger.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('hidden'); });
      document.addEventListener('click', function () { menu.classList.add('hidden'); });
    }

    // Reply
    var replyBtn = div.querySelector('.btn-reply');
    var replyForm = div.querySelector('.reply-form');
    if (replyBtn) {
      replyBtn.addEventListener('click', function () {
        replyForm.classList.toggle('hidden');
        if (!replyForm.classList.contains('hidden') && !replyForm.dataset.ready) {
          replyForm.dataset.ready = '1';
          replyForm.innerHTML = '<textarea placeholder="Reply…" rows="2"></textarea><div class="comment-form-actions"><input type="file" class="reply-image-file hidden" accept="image/png,image/jpeg,image/gif,image/webp" /><button type="button" class="btn-sm btn-attach-reply-image">📎</button><span class="reply-image-label"></span><button type="button" class="btn-sm send-reply">Send reply</button></div>';
          var attachBtn = replyForm.querySelector('.btn-attach-reply-image');
          var replyFile = replyForm.querySelector('.reply-image-file');
          var replyLabel = replyForm.querySelector('.reply-image-label');
          if (attachBtn) attachBtn.addEventListener('click', function () { replyFile.click(); });
          if (replyFile) replyFile.addEventListener('change', function () { if (replyLabel) replyLabel.textContent = replyFile.files[0] ? replyFile.files[0].name : ''; });
          var sendBtn = replyForm.querySelector('.send-reply');
          var ta = replyForm.querySelector('textarea');
          bindEnterToSubmit(ta, function () { sendBtn.click(); });
          sendBtn.addEventListener('click', function () {
            var text = (ta.value || '').trim();
            if (!text) return;
            var fd = new FormData();
            fd.append('user_id', String(currentUser.user_id));
            fd.append('content', text);
            fd.append('parent_id', String(c.id));
            if (replyFile && replyFile.files[0]) fd.append('image', replyFile.files[0]);
            fetch('/api/posts/' + postId + '/comments', { method: 'POST', body: fd })
              .then(function (r) { return r.json(); })
              .then(function () {
                ta.value = ''; if (replyFile) replyFile.value = ''; if (replyLabel) replyLabel.textContent = '';
                replyForm.classList.add('hidden');
                var card = feedEl.querySelector('[data-post-id="' + postId + '"]');
                if (card) loadCommentsForCard(card, feedEl);
              }).catch(function () {});
          });
        }
      });
    }

    // Edit comment
    var editBtn = div.querySelector('.btn-comment-edit');
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        openActionModal({ title: 'Edit Comment', message: 'Update your comment below.', showInput: true, initialValue: c.content || '', confirmText: 'Save',
          onConfirm: function (ctx) {
            if (!ctx.value) { ctx.setError('Comment cannot be empty.'); return; }
            api('/api/comments/' + c.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id, content: ctx.value }) })
              .then(function () { ctx.close(); var card = feedEl.querySelector('[data-post-id="' + postId + '"]'); if (card) loadCommentsForCard(card, feedEl); })
              .catch(function (e) { ctx.setError(e.message || 'Could not update.'); });
          }
        });
      });
    }

    // Delete comment
    var deleteBtn = div.querySelector('.btn-comment-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        openActionModal({ title: 'Delete Comment', message: 'Are you sure?', confirmText: 'Delete', danger: true,
          onConfirm: function (ctx) {
            api('/api/comments/' + c.id, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id }) })
              .then(function () { ctx.close(); var card = feedEl.querySelector('[data-post-id="' + postId + '"]'); if (card) loadCommentsForCard(card, feedEl); })
              .catch(function (e) { ctx.setError(e.message || 'Could not delete.'); });
          }
        });
      });
    }
    return div;
  }

  function loadCommentsForCard(card, feedEl) {
    var pid = card.dataset.postId;
    var tree = card.querySelector('.comments-tree');
    fetch('/api/posts/' + pid + '/comments').then(function (r) { return r.json(); }).then(function (rows) {
      tree.innerHTML = '';
      var byParent = {};
      rows.forEach(function (c) { var k = c.parent_id == null ? 'root' : String(c.parent_id); if (!byParent[k]) byParent[k] = []; byParent[k].push(c); });
      (byParent.root || []).forEach(function (c) {
        var cd = renderComment(c, pid, false, feedEl); tree.appendChild(cd);
        (byParent[String(c.id)] || []).forEach(function (r) { tree.appendChild(renderComment(r, pid, true, feedEl)); });
      });
    }).catch(function () { tree.textContent = 'Could not load comments.'; });
  }

  // --- Post rendering (wall-style) ---
  function renderPostShell(p, feedEl, isOwn) {
    var wrap = document.createElement('article');
    wrap.className = 'post-card';
    wrap.dataset.postId = String(p.id);
    var authorPhoto = p.author_photo ? '<img class="post-avatar-sm" src="' + escapeHtml(p.author_photo) + '" alt="' + escapeHtml(p.author_name) + '" />' : '<div class="post-avatar-sm no-image">' + escapeHtml(initials(p.author_name)) + '</div>';
    wrap.innerHTML =
      '<div class="post-card-top">' +
      '<div class="post-author-row">' +
      '<a class="profile-link-avatar" href="' + profileHref(p.user_id) + '">' + authorPhoto + '</a>' +
      '<div><a class="post-anon-name profile-link-name" href="' + profileHref(p.user_id) + '">' + escapeHtml(p.author_name || 'Anonymous') + '</a>' +
      '<span class="post-time">' + escapeHtml(formatRelativeTime(p.created_at)) + (p.updated_at ? ' <span class="edited-label">(edited)</span>' : '') + '</span></div>' +
      '</div>' +
      '<div class="post-owner-actions"></div></div>' +
      '<div class="post-cat-pill">' + escapeHtml(p.category) + '</div>' +
      '<div class="post-body"></div>' +
      '<div class="post-actions">' +
      '<div class="reaction-wrap" data-target-type="post" data-target-id="' + p.id + '"><button type="button" class="btn-reaction-trigger" aria-label="React"><span class="reaction-emoji"><span class="heart-outline">♡</span></span><span class="reaction-count"></span></button><div class="reaction-picker hidden" role="toolbar" aria-label="Pick a reaction"></div></div>' +
      '<button type="button" class="btn-comment-toggle"><span aria-hidden="true">💬</span> <span class="ccount">' + (p.comment_count || 0) + '</span></button>' +
      '</div>' +
      '<div class="comments-block hidden" data-for-post="' + p.id + '"><h4>Comments</h4><div class="comments-tree"></div>' +
      '<div class="comment-form"><textarea placeholder="Write a comment…" aria-label="New comment"></textarea><p class="comment-form-error hidden" aria-live="polite"></p>' +
      '<div class="comment-image-preview hidden"><img class="comment-preview-img" alt="Preview" /><button type="button" class="comment-preview-remove" aria-label="Remove image">✕</button></div>' +
      '<div class="comment-form-actions"><input type="file" class="comment-image-file hidden" accept="image/png,image/jpeg,image/gif,image/webp" /><button type="button" class="btn-sm btn-attach-image">📎</button><span class="comment-image-label"></span><button type="button" class="btn-sm add-comment">Comment</button></div></div></div>';

    wrap.querySelector('.post-body').textContent = p.content;
    if (p.image_url) {
      var img = document.createElement('img'); img.className = 'post-media'; img.src = p.image_url; img.alt = 'Attached image';
      wrap.querySelector('.post-body').insertAdjacentElement('afterend', img);
    }

    // Build reaction picker buttons
    var picker = wrap.querySelector('.reaction-picker');
    REACTION_TYPES.forEach(function (type) {
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn-pick-reaction'; btn.dataset.reaction = type;
      btn.setAttribute('aria-label', type.charAt(0).toUpperCase() + type.slice(1)); btn.textContent = REACTION_EMOJI[type];
      picker.appendChild(btn);
    });

    // Owner actions (only on own profile viewing own posts)
    if (isOwn) {
      var ownerActions = wrap.querySelector('.post-owner-actions');
      ownerActions.innerHTML = '<div class="owner-menu"><button type="button" class="owner-menu-trigger" aria-label="Post options">...</button><div class="owner-menu-list hidden"><button type="button" class="owner-menu-item btn-edit-post">Edit</button><button type="button" class="owner-menu-item btn-delete-post">Delete</button></div></div>';
      var oTrigger = ownerActions.querySelector('.owner-menu-trigger');
      var oMenu = ownerActions.querySelector('.owner-menu-list');
      oTrigger.addEventListener('click', function (e) { e.stopPropagation(); oMenu.classList.toggle('hidden'); });
      document.addEventListener('click', function () { oMenu.classList.add('hidden'); });
    }
    return wrap;
  }

  function hydratePost(p, card, feedEl, isOwn) {
    // Reactions
    var reactionWrap = card.querySelector('.reaction-wrap');
    if (reactionWrap) loadReactions(reactionWrap, 'post', p.id);

    // Comments toggle
    var block = card.querySelector('.comments-block');
    var toggle = card.querySelector('.btn-comment-toggle');
    toggle.addEventListener('click', function () {
      block.classList.toggle('hidden');
      if (!block.classList.contains('hidden')) loadCommentsForCard(card, feedEl);
    });

    // Add comment
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
            if (previewImg) previewImg.src = e.target.result;
            if (imagePreview) imagePreview.classList.remove('hidden');
          };
          reader.readAsDataURL(file);
          if (commentLabel) commentLabel.textContent = file.name;
        } else {
          // Hide preview
          if (imagePreview) imagePreview.classList.add('hidden');
          if (previewImg) previewImg.src = '';
          if (commentLabel) commentLabel.textContent = '';
        }
      });
    }
    
    if (previewRemove) {
      previewRemove.addEventListener('click', function() {
        if (commentFile) commentFile.value = '';
        if (imagePreview) imagePreview.classList.add('hidden');
        if (previewImg) previewImg.src = '';
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
      fetch('/api/posts/' + p.id + '/comments', { method: 'POST', body: fd })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.statusText); return j; }); })
        .then(function () {
          ta.value = ''; 
          if (commentFile) commentFile.value = ''; 
          if (commentLabel) commentLabel.textContent = '';
          if (imagePreview) imagePreview.classList.add('hidden');
          if (previewImg) previewImg.src = '';
          loadCommentsForCard(card, feedEl);
          var ccount = card.querySelector('.btn-comment-toggle .ccount');
          if (ccount) ccount.textContent = String((parseInt(ccount.textContent, 10) || 0) + 1);
        })
        .catch(function (e) { if (errorEl) { errorEl.textContent = e.message || 'Could not add comment.'; errorEl.classList.remove('hidden'); } });
    });

    // Edit post (own only)
    if (isOwn) {
      var editBtn = card.querySelector('.btn-edit-post');
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          openActionModal({ title: 'Edit Post', message: 'Update your post below.', showInput: true, initialValue: p.content || '', confirmText: 'Save',
            onConfirm: function (ctx) {
              if (!ctx.value) { ctx.setError('Post content is required.'); return; }
              api('/api/posts/' + p.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id, content: ctx.value, category: p.category || 'Other' }) })
                .then(function () { ctx.close(); loadProfile(); })
                .catch(function (e) { ctx.setError(e.message || 'Could not update.'); });
            }
          });
        });
      }
      var deleteBtn = card.querySelector('.btn-delete-post');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
          openActionModal({ title: 'Delete Post', message: 'Are you sure?', confirmText: 'Delete', danger: true,
            onConfirm: function (ctx) {
              api('/api/posts/' + p.id, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id }) })
                .then(function () { ctx.close(); loadProfile(); })
                .catch(function (e) { ctx.setError(e.message || 'Could not delete.'); });
            }
          });
        });
      }
    }
  }

  // --- Trending ---
  function loadTrending() {
    var el = document.getElementById('trending-list');
    if (!el) return;
    fetch('/api/posts?sort=likes').then(function (r) { return r.json(); }).then(function (posts) {
      el.innerHTML = '';
      var top = posts.slice(0, 3);
      if (!top.length) { el.innerHTML = '<p class="hint" style="margin:0">No posts yet.</p>'; return; }
      top.forEach(function (p) {
        var snippet = (p.content || '').replace(/\s+/g, ' ').trim().slice(0, 72);
        if (snippet.length < (p.content || '').length) snippet += '…';
        var row = document.createElement('div'); row.className = 'trending-item';
        row.innerHTML = (p.author_photo ? '<img class="trending-av" src="' + escapeHtml(p.author_photo) + '" alt="" />' : '<div class="trending-av no-image">' + escapeHtml(initials(p.author_name)) + '</div>') +
          '<div class="trending-text"><strong>' + escapeHtml(p.author_name || 'Anonymous') + '</strong> · ' + escapeHtml(snippet) +
          '<div class="trending-meta"><span class="trending-heart">♥</span> ' + escapeHtml(String(p.like_count || 0)) + ' likes</div></div>';
        el.appendChild(row);
      });
    }).catch(function () { el.innerHTML = '<p class="hint" style="margin:0">Could not load trending.</p>'; });
  }

  // --- Profile render ---
  // Photo lightbox
  function openPhotoLightbox(src, alt) {
    var lb = document.createElement('div');
    lb.className = 'photo-lightbox';
    lb.innerHTML = '<div class="photo-lightbox-inner"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt || '') + '" /><button type="button" class="photo-lightbox-close" aria-label="Close">✕</button></div>';
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('photo-lightbox-close')) { document.body.removeChild(lb); } });
    document.body.appendChild(lb);
  }

  // Image lightbox for post/comment images (same as wall.js)
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

    function close() {
      overlay.style.animation = 'lightbox-fade-in 0.15s ease reverse';
      setTimeout(function () {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
      }, 150);
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    document.body.appendChild(overlay);
  }

  // Delegate lightbox clicks on all post/comment images in profile page
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (target.classList.contains('post-media') || target.classList.contains('comment-media')) {
      openLightbox(target.src);
    }
  });

  // Edit profile modal
  function openEditProfileModal(user) {
    var overlay = document.createElement('div');
    overlay.className = 'action-modal';
    overlay.setAttribute('aria-hidden', 'false');

    var canChangeName = !user.display_name_changed;

    var nameHint = canChangeName
      ? '<p class="ep-hint">You can change your display name one time.</p>'
      : '<p class="ep-hint ep-hint--locked">Display name change already used.</p>';

    overlay.innerHTML =
      '<div class="ep-modal-card">' +
      '<div class="ep-modal-header">' +
      '<h4 class="ep-modal-title">Edit Profile</h4>' +
      '<button type="button" id="ep-close" class="ep-close-btn" aria-label="Close">✕</button>' +
      '</div>' +

      '<div class="ep-avatar-preview-wrap">' +
      (user.photo_url
        ? '<img id="ep-avatar-preview" class="ep-avatar-preview" src="' + escapeHtml(user.photo_url) + '" alt="Current photo" />'
        : '<div id="ep-avatar-preview" class="ep-avatar-preview ep-avatar-initials">' + escapeHtml(initials(user.display_name)) + '</div>') +
      '<label for="ep-photo" class="ep-avatar-change-btn" title="Upload photo">📷</label>' +
      '<input id="ep-photo" type="file" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden" />' +
      '</div>' +
      '<div style="text-align:center;margin-bottom:1rem;">' +
      '<button type="button" id="ep-remove-photo" class="ep-remove-btn">🗑 Remove photo</button>' +
      '</div>' +

      '<div class="ep-field">' +
      '<label class="ep-label" for="ep-name">Display Name</label>' +
      '<input id="ep-name" type="text" class="ep-input" maxlength="120" value="' + escapeHtml(user.display_name || '') + '" ' + (canChangeName ? '' : 'disabled') + ' placeholder="Your display name" />' +
      nameHint +
      '</div>' +

      '<p id="ep-error" class="ep-error hidden"></p>' +

      '<div class="ep-modal-actions">' +
      '<button type="button" id="ep-cancel" class="ep-btn ep-btn--ghost">Cancel</button>' +
      '<button type="button" id="ep-save" class="ep-btn ep-btn--primary">Save changes</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) document.body.removeChild(overlay); });
    overlay.querySelector('.ep-modal-card').addEventListener('click', function (e) { e.stopPropagation(); });
    document.getElementById('ep-close').addEventListener('click', function () { document.body.removeChild(overlay); });
    document.getElementById('ep-cancel').addEventListener('click', function () { document.body.removeChild(overlay); });

    // Track selected default photo (null = use uploaded file or keep current, '' = remove/random)
    var selectedDefaultUrl = null;

    function updatePreview(src, isInitials) {
      var old = document.getElementById('ep-avatar-preview');
      if (isInitials) {
        var div = document.createElement('div');
        div.id = 'ep-avatar-preview'; div.className = 'ep-avatar-preview ep-avatar-initials';
        div.textContent = initials(user.display_name);
        old.parentNode.replaceChild(div, old);
      } else {
        var img = document.createElement('img');
        img.id = 'ep-avatar-preview'; img.className = 'ep-avatar-preview';
        img.src = src; img.alt = 'Preview';
        old.parentNode.replaceChild(img, old);
      }
    }

    // Remove photo → show initials instead
    document.getElementById('ep-remove-photo').addEventListener('click', function () {
      selectedDefaultUrl = '';
      document.getElementById('ep-photo').value = '';
      updatePreview('', true);
    });

    // Live photo preview from file upload
    document.getElementById('ep-photo').addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      selectedDefaultUrl = null;
      var reader = new FileReader();
      reader.onload = function (e) { updatePreview(e.target.result, false); };
      reader.readAsDataURL(file);
    });

    document.getElementById('ep-save').addEventListener('click', function () {
      var epError = document.getElementById('ep-error');
      epError.classList.add('hidden');
      var newName = canChangeName ? (document.getElementById('ep-name').value || '').trim() : user.display_name;
      var photoFile = document.getElementById('ep-photo').files[0];

      if (canChangeName && !newName) { epError.textContent = 'Display name is required.'; epError.classList.remove('hidden'); return; }

      var nameChanged = canChangeName && newName !== user.display_name;

      var namePromise = nameChanged
        ? api('/api/users/' + user.id + '/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: newName }) })
        : Promise.resolve(null);

      namePromise.then(function (res) {
        if (res && res.user) {
          currentUser.display_name = res.user.display_name;
          currentUser.display_name_changed = !!res.user.display_name_changed;
          try {
            var sess = JSON.parse((window.AuthSession ? window.AuthSession.getRaw() : sessionStorage.getItem(STORAGE_KEY)) || '{}');
            sess.display_name = res.user.display_name;
            sess.display_name_changed = !!res.user.display_name_changed;
            (window.AuthSession ? window.AuthSession.set(sess) : sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sess)));
          } catch (e) {}
        }

        // If a default was selected or photo removed, use profile PUT
        if (selectedDefaultUrl !== null && !photoFile) {
          return api('/api/users/' + user.id + '/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photo_url: selectedDefaultUrl })
          });
        }

        if (!photoFile) return Promise.resolve(null);
        var fd = new FormData();
        fd.append('photo', photoFile);
        return fetch('/api/users/' + user.id + '/profile-photo', { method: 'POST', body: fd })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.statusText); return j; }); });
      }).then(function (photoRes) {
        if (photoRes && photoRes.user) {
          currentUser.photo_url = photoRes.user.photo_url;
          try {
            var sess = JSON.parse((window.AuthSession ? window.AuthSession.getRaw() : sessionStorage.getItem(STORAGE_KEY)) || '{}');
            sess.photo_url = photoRes.user.photo_url;
            (window.AuthSession ? window.AuthSession.set(sess) : sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sess)));
          } catch (e) {}
        }
        document.body.removeChild(overlay);
        loadProfile();
      }).catch(function (e) {
        epError.textContent = e.message || 'Could not save changes.';
        epError.classList.remove('hidden');
      });
    });
  }

  function renderProfile(user, postCount) {
    var nameEl = document.getElementById('profile-name-title');
    var createdEl = document.getElementById('profile-created-at');
    var avatarEl = document.getElementById('profile-avatar');
    var name = user.display_name || 'User';
    if (nameEl) nameEl.textContent = name;
    if (createdEl) {
      createdEl.innerHTML = formatJoinDate(user.created_at) +
        ' &nbsp;·&nbsp; <strong>' + (postCount || 0) + '</strong> post' + (postCount === 1 ? '' : 's');
    }
    if (avatarEl) {
      if (user.photo_url) {
        avatarEl.classList.remove('no-image');
        avatarEl.innerHTML = '<img src="' + escapeHtml(user.photo_url) + '" alt="' + escapeHtml(name) + '" style="cursor:pointer;" />';
        avatarEl.querySelector('img').addEventListener('click', function () { openPhotoLightbox(user.photo_url, name); });
      } else {
        avatarEl.classList.add('no-image');
        avatarEl.textContent = initials(name);
      }
    }
    // Show edit button only on own profile
    var ownActions = document.getElementById('profile-own-actions');
    if (ownActions && currentUser && currentUser.user_id === user.id) {
      ownActions.classList.remove('hidden');
      ownActions.innerHTML =
        '<button type="button" id="btn-edit-profile" class="btn-sm" style="margin-top:0.5rem;">✏️ Edit Profile</button>';
      document.getElementById('btn-edit-profile').addEventListener('click', function () { openEditProfileModal(user); });
    }
  }

  function renderPosts(posts, isOwn) {
    var statusEl = document.getElementById('profile-post-status');
    var feedEl = document.getElementById('profile-posts');
    feedEl.innerHTML = '';
    if (!posts.length) { if (statusEl) statusEl.textContent = 'No posts yet.'; return; }
    if (statusEl) statusEl.textContent = '';
    posts.forEach(function (p) {
      var card = renderPostShell(p, feedEl, isOwn);
      feedEl.appendChild(card);
      hydratePost(p, card, feedEl, isOwn);
    });
  }

  function loadProfile() {
    var categoryFilter = document.getElementById('profile-category-filter');
    var sortFilter = document.getElementById('profile-sort-filter');
    var category = categoryFilter ? categoryFilter.value : '';
    var sort = sortFilter ? sortFilter.value : 'latest';
    
    var url = '/api/users/' + viewedUserId + '/public-profile';
    var params = [];
    if (category) params.push('category=' + encodeURIComponent(category));
    if (sort && sort !== 'latest') params.push('sort=' + encodeURIComponent(sort));
    if (params.length > 0) url += '?' + params.join('&');
    
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var user = res.user || {};
        var posts = res.posts || [];
        var isOwn = currentUser && currentUser.user_id === user.id;
        renderProfile(user, posts.length);
        renderPosts(posts, isOwn);
        loadTrending();
        if (typeof applyAvatarColors === 'function') applyAvatarColors();
      })
      .catch(function (e) {
        var statusEl = document.getElementById('profile-post-status');
        if (statusEl) statusEl.textContent = e.message || 'Could not load profile.';
      });
  }

  loadProfile();

  // Add filter event listeners
  var categoryFilter = document.getElementById('profile-category-filter');
  var sortFilter = document.getElementById('profile-sort-filter');
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', function() {
      loadProfile();
    });
  }
  
  if (sortFilter) {
    sortFilter.addEventListener('change', function() {
      loadProfile();
    });
  }

  // --- Notifications (delegated to shared notif.js) ---
  if (typeof initNotifications === 'function') {
    initNotifications(currentUser.user_id);
  }

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

