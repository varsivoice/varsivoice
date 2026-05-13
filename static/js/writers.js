(function () {
  var STORAGE_KEY = "ub_session";
  var SUBMISSION_IDS_KEY = "ub_submission_ids";
  var currentUser = null;

  function ensureSession() {
    try {
      var raw = (window.AuthSession ? window.AuthSession.getRaw() : sessionStorage.getItem(STORAGE_KEY));
      if (!raw) {
        window.location.href = "/";
        return false;
      }
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.user_id) { window.location.href = "/"; return false; }
      currentUser = parsed;
      return true;
    } catch (e) {
      window.location.href = "/";
      return false;
    }
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

  // --- Hamburger menu ---
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

  document.addEventListener("click", function () {
    closeHamburger();
  });

  hamburgerMenu.addEventListener("click", function (e) { e.stopPropagation(); });

  // Show Admin Panel link for admins
  var adminPanelItem = document.getElementById("admin-panel-item");
  if (adminPanelItem && currentUser && (currentUser.role === 'main_admin' || currentUser.role === 'co_admin')) {
    adminPanelItem.classList.remove('hidden');
  }

  document.getElementById("theme-light-btn").addEventListener("click", function () { applyTheme("light"); });
  document.getElementById("theme-dark-btn").addEventListener("click", function () { applyTheme("dark"); });

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function getSubmissionIds() {
    try {
      var raw = localStorage.getItem(SUBMISSION_IDS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveSubmissionId(id) {
    var ids = getSubmissionIds();
    if (ids.indexOf(id) === -1) {
      ids.push(id);
      try {
        localStorage.setItem(SUBMISSION_IDS_KEY, JSON.stringify(ids));
      } catch (e) {}
    }
  }

  document.getElementById("btn-logout").addEventListener("click", function () {
    try { (window.AuthSession ? window.AuthSession.clear() : sessionStorage.removeItem(STORAGE_KEY)); } catch (e) {}
    window.location.href = "/";
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

  var statusEl = document.getElementById("writers-status");
  var listEl = document.getElementById("submissions-list");
  var errEl = document.getElementById("sub-error");
  var feedStatusEl = document.getElementById("feed-status");
  var feedEl = document.getElementById("writeups-feed");

  // --- Public writeups feed ---
  function loadFeed() {
    feedStatusEl.textContent = "Loading…";
    api("/api/submissions")
      .then(function (rows) {
        rows = rows.filter(function (s) { return s.status === "Approved"; });
        feedStatusEl.textContent = "";
        feedEl.innerHTML = "";
        if (!rows.length) {
          feedStatusEl.textContent = "No writeups yet. Be the first to submit!";
          return;
        }
        rows.forEach(function (s) {
          feedEl.appendChild(renderFeedCard(s));
        });
      })
      .catch(function () {
        feedStatusEl.textContent = "Could not load writeups.";
      });
  }

  function renderFeedCard(s) {
    var card = document.createElement("article");
    card.className = "writeup-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.title = "Click to read";

    var categoryColors = {
      "Feature Article": "#c0392b",
      "Opinion/Editorial": "#8e44ad",
      "News": "#2980b9",
      "Literary/Creative": "#27ae60",
      "Sports": "#e67e22",
      "Campus Life": "#16a085"
    };
    var catColor = categoryColors[s.category] || "#888";

    // Strip HTML tags from content for preview
    var tmp = document.createElement("div");
    tmp.innerHTML = s.content || "";
    var plainText = (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
    var preview = plainText.slice(0, 160) + (plainText.length > 160 ? "…" : "");

    var statusBadge = s.status === "Pending Review"
      ? '<span class="writeup-status writeup-status--pending">Pending Review</span>'
      : '<span class="writeup-status writeup-status--approved">✓ ' + escapeHtml(s.status) + '</span>';

    card.innerHTML =
      '<div class="writeup-cat-pill" style="background:' + catColor + '">' + escapeHtml(s.category) + '</div>' +
      '<h4 class="writeup-title">' + escapeHtml(s.title) + '</h4>' +
      '<p class="writeup-author">✒ ' + escapeHtml(s.author_name) + (s.author_bio ? ' · <em>' + escapeHtml(s.author_bio) + '</em>' : '') + '</p>' +
      '<p class="writeup-preview">' + escapeHtml(preview) + '</p>' +
      (s.document_url ? '<p class="writeup-doc"><a href="' + escapeHtml(s.document_url) + '" target="_blank" rel="noopener" class="doc-link">📄 ' + escapeHtml(s.document_name || 'Attached document') + '</a></p>' : '') +
      '<div class="writeup-footer">' +
      '<span class="writeup-status writeup-status--approved">Read writeup</span>' +
      '<span class="writeup-date">' + escapeHtml(new Date(s.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })) + '</span>' +
      '</div>';

    function openReadModal() { openSubmissionModal(s, { readonly: true }); }
    card.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      openReadModal();
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openReadModal();
      }
    });

    return card;
  }

  function loadMine() {
    statusEl.textContent = "Loading…";
    api("/api/submissions?user_id=" + encodeURIComponent(currentUser.user_id))
      .then(function (rows) {
        statusEl.textContent = "";
        listEl.innerHTML = "";
        rows.forEach(function (s) {
          listEl.appendChild(renderSubmission(s));
        });
        if (!rows.length) {
          statusEl.textContent = "You haven't submitted anything yet.";
        }
      })
      .catch(function (e) {
        statusEl.textContent = "Error: " + e.message;
      });
  }

  function renderSubmission(s) {
    var art = document.createElement("article");
    art.className = "submission-card";
    art.setAttribute("role", "button");
    art.setAttribute("tabindex", "0");
    art.title = "Click to view / edit";

    var tmp = document.createElement("div");
    tmp.innerHTML = s.content || "";
    var plainText = (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
    
    // Check if this is a document-only submission
    var isDocumentOnly = s.document_url && !plainText;
    var preview = isDocumentOnly 
      ? "Content submitted via document" 
      : plainText.slice(0, 180) + (plainText.length > 180 ? "…" : "");

    var editedLine = s.updated_at
      ? '<span class="sub-edited">Last edited: ' + new Date(s.updated_at + 'Z').toLocaleString() + '</span>'
      : '';

    var statusBadge = s.status === "Pending Review"
      ? '<span class="writeup-status writeup-status--pending">Pending Review</span>'
      : '<span class="writeup-status writeup-status--approved">✓ ' + escapeHtml(s.status) + '</span>';

    art.innerHTML =
      '<div class="sub-card-header">' +
      '<h4 class="sub-card-title">' + escapeHtml(s.title) + '</h4>' +
      statusBadge +
      '</div>' +
      '<p class="meta">' + escapeHtml(s.category) + ' · ' + escapeHtml(s.author_name) + ' · ' +
      new Date(s.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
      '</p>' +
      (editedLine ? '<p class="sub-edited-line">' + editedLine + '</p>' : '') +
      '<p class="preview' + (isDocumentOnly ? ' hint' : '') + '">' + escapeHtml(preview) + '</p>' +
      (s.status === 'Pending Review' ? '<p class="sub-edit-hint">✏️ Click to edit</p>' : '');

    function openEditModal() { openSubmissionModal(s); }
    art.addEventListener("click", openEditModal);
    art.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") openEditModal(); });
    return art;
  }

  function openSubmissionModal(s, options) {
    options = options || {};
    var overlay = document.createElement("div");
    overlay.className = "action-modal";
    overlay.setAttribute("aria-hidden", "false");
    var modalCardClass = options.readonly ? "sub-modal-card sub-modal-card--read" : "sub-modal-card";

    var categoryOptions = ["Feature Article","Opinion/Editorial","News","Literary/Creative","Sports","Campus Life"];
    var catSelects = categoryOptions.map(function (c) {
      return '<option' + (c === s.category ? ' selected' : '') + '>' + escapeHtml(c) + '</option>';
    }).join('');

    var isEditable = s.status === "Pending Review" && !options.readonly;
    var readonlyAttr = isEditable ? '' : ' disabled';
    var editedLine = s.updated_at
      ? '<p class="sub-modal-edited">Last edited: ' + new Date(s.updated_at + 'Z').toLocaleString() + '</p>'
      : '';

    // Check if this is a document-only submission
    var tmp = document.createElement("div");
    tmp.innerHTML = s.content || "";
    var plainText = (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
    var isDocumentOnly = s.document_url && !plainText;

    overlay.innerHTML =
      '<div class="' + modalCardClass + '">' +
      // Fixed header
      '<div class="sub-modal-header">' +
      '<div>' +
      '<h4 class="ep-modal-title" style="margin:0;">' + (isEditable ? '✏️ Edit Submission' : 'Read Writeup') + '</h4>' +
      (editedLine ? '<p class="sub-modal-edited" style="margin:0.25rem 0 0;">' + (s.updated_at ? 'Last edited: ' + new Date(s.updated_at + 'Z').toLocaleString() : '') + '</p>' : '') +
      '</div>' +
      '<button type="button" class="ep-close-btn" id="sub-modal-close">✕</button>' +
      '</div>' +
      // Metadata row (compact, horizontal)
      '<div class="sub-modal-meta-row">' +
      '<div class="sub-modal-meta-field">' +
      '<label class="sub-modal-label">Title</label>' +
      '<input id="sub-modal-title" class="sub-modal-input" type="text" maxlength="500" value="' + escapeHtml(s.title) + '"' + readonlyAttr + ' />' +
      '</div>' +
      '<div class="sub-modal-meta-field sub-modal-meta-field--sm">' +
      '<label class="sub-modal-label">Category</label>' +
      '<select id="sub-modal-category" class="sub-modal-input"' + readonlyAttr + '>' + catSelects + '</select>' +
      '</div>' +
      '<div class="sub-modal-meta-field sub-modal-meta-field--sm">' +
      '<label class="sub-modal-label">Author</label>' +
      '<input id="sub-modal-author" class="sub-modal-input" type="text" value="' + escapeHtml(s.author_name) + '"' + readonlyAttr + ' />' +
      '</div>' +
      '<div class="sub-modal-meta-field sub-modal-meta-field--sm">' +
      '<label class="sub-modal-label">Bio <span style="font-weight:400;opacity:0.6">(optional)</span></label>' +
      '<input id="sub-modal-bio" class="sub-modal-input" type="text" value="' + escapeHtml(s.author_bio || '') + '"' + readonlyAttr + ' />' +
      '</div>' +
      '</div>' +
      // Editor fills remaining space
      '<div class="sub-modal-editor-wrap">' +
      (isDocumentOnly && isEditable
        ? '<div class="sub-modal-document-preview">' +
          '<div class="document-preview-header">' +
          '<h4>📄 Current Document</h4>' +
          '<a href="' + escapeHtml(s.document_url) + '" target="_blank" rel="noopener" class="doc-link">' + escapeHtml(s.document_name || 'Attached document') + '</a>' +
          '</div>' +
          '<div class="document-upload-section">' +
          '<label class="sub-modal-label">Replace with new document:</label>' +
          '<div class="file-upload-area">' +
          '<input type="file" id="sub-modal-document-file" accept=".pdf,.doc,.docx,.odt,.txt" class="hidden" />' +
          '<button type="button" id="sub-modal-document-btn" class="btn-sm">Choose File</button>' +
          '<span id="sub-modal-document-label" class="file-label">No file chosen</span>' +
          '<button type="button" id="sub-modal-document-clear" class="btn-clear hidden">✕</button>' +
          '</div>' +
          '</div>' +
          '</div>'
        : (isDocumentOnly
          ? '<div class="sub-modal-editor sub-modal-editor--readonly" style="display:flex;align-items:center;justify-content:center;color:#888;font-style:italic;">Content submitted via document</div>'
          : (isEditable
            ? '<div id="sub-modal-editor" class="sub-modal-editor" contenteditable="true" data-placeholder="Your article or piece…"></div>'
            : '<div class="sub-modal-editor sub-modal-editor--readonly">' + (s.content || '') + '</div>'))) +
      (!isDocumentOnly && s.document_url ? '<p style="margin-top:1rem;"><a href="' + escapeHtml(s.document_url) + '" target="_blank" rel="noopener" class="doc-link">📄 ' + escapeHtml(s.document_name || 'Attached document') + '</a></p>' : '') +
      '</div>' +
      (!isEditable && isDocumentOnly && s.document_url ? '<p style="margin-top:1rem;"><a href="' + escapeHtml(s.document_url) + '" target="_blank" rel="noopener" class="doc-link">' + escapeHtml(s.document_name || 'Attached document') + '</a></p>' : '') +
      // Footer
      '<div class="sub-modal-footer">' +
      '<p id="sub-modal-error" class="ep-error hidden"></p>' +
      (isEditable
        ? '<div style="display:flex;gap:0.5rem;justify-content:flex-end;">' +
          '<button type="button" id="sub-modal-cancel" class="owner-menu-item">Cancel</button>' +
          '<button type="button" id="sub-modal-save" class="btn-sm">Save changes</button>' +
          '</div>'
        : '<div style="text-align:right;"><button type="button" id="sub-modal-cancel" class="btn-sm">Close</button></div>') +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Set rich content into editor (only if not document-only)
    if (isEditable && !isDocumentOnly) {
      var modalEditor = overlay.querySelector("#sub-modal-editor");
      if (modalEditor) modalEditor.innerHTML = s.content || "";
    }

    // Handle document upload functionality for document-only submissions
    if (isEditable && isDocumentOnly) {
      var docBtn = overlay.querySelector("#sub-modal-document-btn");
      var docFile = overlay.querySelector("#sub-modal-document-file");
      var docLabel = overlay.querySelector("#sub-modal-document-label");
      var docClear = overlay.querySelector("#sub-modal-document-clear");

      if (docBtn && docFile) {
        docBtn.addEventListener("click", function () { docFile.click(); });
        docFile.addEventListener("change", function () {
          if (docFile.files && docFile.files.length) {
            docLabel.textContent = docFile.files[0].name;
            if (docClear) docClear.classList.remove("hidden");
          } else {
            docLabel.textContent = "No file chosen";
            if (docClear) docClear.classList.add("hidden");
          }
        });
        if (docClear) {
          docClear.addEventListener("click", function () {
            docFile.value = "";
            docLabel.textContent = "No file chosen";
            docClear.classList.add("hidden");
          });
        }
      }
    }

    function closeModal() { if (document.body.contains(overlay)) document.body.removeChild(overlay); }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
    overlay.querySelector("#sub-modal-close").addEventListener("click", closeModal);
    overlay.querySelector("#sub-modal-cancel").addEventListener("click", closeModal);

    if (isEditable) {
      overlay.querySelector("#sub-modal-save").addEventListener("click", function () {
        var title = overlay.querySelector("#sub-modal-title").value.trim();
        var author = overlay.querySelector("#sub-modal-author").value.trim();
        var category = overlay.querySelector("#sub-modal-category").value;
        var bio = overlay.querySelector("#sub-modal-bio").value.trim();
        var modalEditor = overlay.querySelector("#sub-modal-editor");
        var content = isDocumentOnly ? "" : (modalEditor ? modalEditor.innerHTML || "" : "").trim();
        var contentText = isDocumentOnly ? "" : (modalEditor ? modalEditor.innerText || modalEditor.textContent || "" : "").trim();
        var errorEl = overlay.querySelector("#sub-modal-error");

        if (!title || !author) {
          errorEl.textContent = "Title and author name are required.";
          errorEl.classList.remove("hidden");
          return;
        }
        
        if (!isDocumentOnly && !contentText) {
          errorEl.textContent = "Content is required.";
          errorEl.classList.remove("hidden");
          return;
        }

        // For document-only submissions, check if a new document is being uploaded
        var docFile = overlay.querySelector("#sub-modal-document-file");
        var hasNewDoc = docFile && docFile.files && docFile.files.length > 0;

        if (isDocumentOnly && !hasNewDoc) {
          // No new document uploaded, just update metadata
          api("/api/submissions/" + s.id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title, author_name: author, author_bio: bio || null, category: category, content: content, user_id: currentUser.user_id }),
          })
            .then(function (updated) {
              closeModal();
              // Update local submission data and refresh list
              Object.assign(s, updated);
              loadMine();
              loadFeed();
            })
            .catch(function (e) {
              errorEl.textContent = e.message || "Could not save changes.";
              errorEl.classList.remove("hidden");
            });
        } else if (isDocumentOnly && hasNewDoc) {
          // New document uploaded, use FormData
          var formData = new FormData();
          formData.append("title", title);
          formData.append("author_name", author);
          formData.append("author_bio", bio || "");
          formData.append("category", category);
          formData.append("content", content);
          formData.append("user_id", currentUser.user_id);
          formData.append("document", docFile.files[0]);

          fetch("/api/submissions/" + s.id, {
            method: "PUT",
            body: formData
          })
            .then(function (r) {
              return r.json().then(function (j) {
                if (!r.ok) throw new Error(j.error || r.statusText);
                return j;
              });
            })
            .then(function (updated) {
              closeModal();
              // Update local submission data and refresh list
              Object.assign(s, updated);
              loadMine();
              loadFeed();
            })
            .catch(function (e) {
              errorEl.textContent = e.message || "Could not save changes.";
              errorEl.classList.remove("hidden");
            });
        } else {
          // Regular text-based submission
          api("/api/submissions/" + s.id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title, author_name: author, author_bio: bio || null, category: category, content: content, user_id: currentUser.user_id }),
          })
            .then(function (updated) {
              closeModal();
              // Update local submission data and refresh list
              Object.assign(s, updated);
              loadMine();
              loadFeed();
            })
            .catch(function (e) {
              errorEl.textContent = e.message || "Could not save changes.";
              errorEl.classList.remove("hidden");
            });
        }
      });
    }
  }

  document.getElementById("submission-form").addEventListener("submit", function (e) {
    e.preventDefault();
    errEl.hidden = true;
    var title = document.getElementById("sub-title").value.trim();
    var author = document.getElementById("sub-author").value.trim();
    var category = document.getElementById("sub-category").value;
    var bio = document.getElementById("sub-bio").value.trim();
    var contentEditor = document.getElementById("sub-content-editor");
    var content = (contentEditor.innerHTML || "").trim();
    var contentText = (contentEditor.innerText || contentEditor.textContent || "").trim();
    var docFile = document.getElementById("sub-document-file");
    var hasDoc = docFile && docFile.files && docFile.files.length > 0;
    var isUploadMode = subTypeUpload && subTypeUpload.checked;

    if (!title || !author) {
      errEl.textContent = "Please fill in title and author name.";
      errEl.hidden = false;
      return;
    }
    
    if (isUploadMode) {
      // Upload mode: document is required
      if (!hasDoc) {
        errEl.textContent = "Please upload a document.";
        errEl.hidden = false;
        return;
      }
    } else {
      // Write mode: content is required
      if (!contentText) {
        errEl.textContent = "Please write content or switch to upload mode.";
        errEl.hidden = false;
        return;
      }
    }

    var formData = new FormData();
    formData.append("title", title);
    formData.append("author_name", author);
    formData.append("author_bio", bio || "");
    formData.append("category", category);
    formData.append("content", isUploadMode ? "" : content);
    formData.append("user_id", currentUser.user_id);
    if (hasDoc) {
      formData.append("document", docFile.files[0]);
    }

    fetch("/api/submissions", { method: "POST", body: formData })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j.error || r.statusText);
          return j;
        });
      })
      .then(function (row) {
        document.getElementById("submission-form").reset();
        contentEditor.innerHTML = "";
        if (docFile) docFile.value = "";
        var docLabel = document.getElementById("sub-document-label");
        if (docLabel) docLabel.textContent = "No file chosen";
        var docClear = document.getElementById("sub-doc-clear");
        if (docClear) docClear.classList.add("hidden");
        // Reset to write mode
        if (subTypeWrite) subTypeWrite.checked = true;
        updateSubmissionType();
        loadMine();
        loadFeed();
        statusEl.textContent = "Submitted successfully.";
      })
      .catch(function (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
      });
  });

  // --- Form toggle ---
  var formToggle = document.getElementById("form-toggle");
  var formBody = document.getElementById("submission-form-body");
  var formChevron = formToggle ? formToggle.querySelector(".writers-form-chevron") : null;

  if (formToggle && formBody) {
    formToggle.addEventListener("click", function () {
      var isOpen = !formBody.classList.contains("hidden");
      formBody.classList.toggle("hidden", isOpen);
      formToggle.setAttribute("aria-expanded", String(!isOpen));
      if (formChevron) formChevron.style.transform = isOpen ? "" : "rotate(180deg)";
      var sub = formToggle.querySelector(".writers-form-toggle-sub");
      if (sub) sub.textContent = isOpen ? "Click to expand and start writing" : "Click to collapse";
    });
  }

  // --- Mobile section tabs ---
  var writersMobileNav = document.querySelector(".writers-mobile-nav");
  var writersMobileLinks = writersMobileNav ? Array.prototype.slice.call(writersMobileNav.querySelectorAll("a[href^='#writers-']")) : [];
  var writersMobileSections = {
    "#writers-submit": document.getElementById("writers-submit"),
    "#writers-submissions": document.getElementById("writers-submissions"),
    "#writers-published": document.getElementById("writers-published")
  };
  var writersMobileQuery = window.matchMedia ? window.matchMedia("(max-width: 768px)") : null;

  function setWritersMobileSection(targetHash) {
    if (!writersMobileSections[targetHash]) targetHash = "#writers-submit";
    if (writersMobileNav) {
      writersMobileNav.dataset.active = targetHash.replace("#writers-", "");
    }

    writersMobileLinks.forEach(function (link) {
      var isActive = link.getAttribute("href") === targetHash;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    Object.keys(writersMobileSections).forEach(function (hash) {
      var section = writersMobileSections[hash];
      if (!section) return;
      section.classList.toggle("writers-mobile-section-hidden", hash !== targetHash);
    });
  }

  function resetWritersMobileSections() {
    Object.keys(writersMobileSections).forEach(function (hash) {
      var section = writersMobileSections[hash];
      if (section) section.classList.remove("writers-mobile-section-hidden");
    });
  }

  function syncWritersMobileSections() {
    var isMobile = writersMobileQuery ? writersMobileQuery.matches : window.innerWidth <= 768;
    if (isMobile) {
      setWritersMobileSection(writersMobileSections[window.location.hash] ? window.location.hash : "#writers-submit");
    } else {
      resetWritersMobileSections();
    }
  }

  writersMobileLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var targetHash = link.getAttribute("href");
      var isMobile = writersMobileQuery ? writersMobileQuery.matches : window.innerWidth <= 768;
      if (!isMobile) return;
      e.preventDefault();
      setWritersMobileSection(targetHash);
      if (history && history.replaceState) history.replaceState(null, "", targetHash);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  if (writersMobileQuery) {
    if (writersMobileQuery.addEventListener) {
      writersMobileQuery.addEventListener("change", syncWritersMobileSections);
    } else if (writersMobileQuery.addListener) {
      writersMobileQuery.addListener(syncWritersMobileSections);
    }
  } else {
    window.addEventListener("resize", syncWritersMobileSections);
  }
  syncWritersMobileSections();

  // --- Submission type choice ---
  var subTypeWrite = document.getElementById("sub-type-write");
  var subTypeUpload = document.getElementById("sub-type-upload");
  var editorSection = document.getElementById("editor-section");
  var docUploadSection = document.getElementById("doc-upload-section");

  function updateSubmissionType() {
    var isUploadMode = subTypeUpload && subTypeUpload.checked;
    if (editorSection) {
      editorSection.style.display = isUploadMode ? "none" : "block";
    }
    if (docUploadSection) {
      var label = docUploadSection.querySelector(".sub-doc-label span");
      if (label) {
        label.textContent = isUploadMode ? "(required)" : "(PDF, Word, ODT, TXT — max 20 MB)";
      }
    }
  }

  if (subTypeWrite) subTypeWrite.addEventListener("change", updateSubmissionType);
  if (subTypeUpload) subTypeUpload.addEventListener("change", updateSubmissionType);
  updateSubmissionType();

  // --- Document file picker ---
  var subDocBtn = document.getElementById("sub-doc-btn");
  var subDocFile = document.getElementById("sub-document-file");
  var subDocLabel = document.getElementById("sub-document-label");
  var subDocClear = document.getElementById("sub-doc-clear");

  if (subDocBtn && subDocFile) {
    subDocBtn.addEventListener("click", function () { subDocFile.click(); });
    subDocFile.addEventListener("change", function () {
      if (subDocFile.files && subDocFile.files.length) {
        subDocLabel.textContent = subDocFile.files[0].name;
        if (subDocClear) subDocClear.classList.remove("hidden");
      } else {
        subDocLabel.textContent = "No file chosen";
        if (subDocClear) subDocClear.classList.add("hidden");
      }
    });
    if (subDocClear) {
      subDocClear.addEventListener("click", function () {
        subDocFile.value = "";
        subDocLabel.textContent = "No file chosen";
        subDocClear.classList.add("hidden");
      });
    }
  }

  // --- Rich text editor toolbar ---
  var toolbar = document.getElementById("editor-toolbar");
  var editor = document.getElementById("sub-content-editor");

  if (toolbar && editor) {
    toolbar.addEventListener("mousedown", function (e) {
      var btn = e.target.closest(".editor-btn");
      if (!btn) return;
      e.preventDefault(); // prevent losing selection
      var cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      editor.focus();
      updateToolbarState();
    });

    editor.addEventListener("keyup", updateToolbarState);
    editor.addEventListener("mouseup", updateToolbarState);
    editor.addEventListener("selectionchange", updateToolbarState);
  }

  function updateToolbarState() {
    if (!toolbar) return;
    var cmds = ["bold", "italic", "underline", "justifyLeft", "justifyCenter", "justifyRight", "justifyFull"];
    cmds.forEach(function (cmd) {
      var btn = toolbar.querySelector('[data-cmd="' + cmd + '"]');
      if (!btn) return;
      btn.classList.toggle("active", document.queryCommandState(cmd));
    });
  }

  loadMine();
  loadFeed();

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

