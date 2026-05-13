(function () {
  'use strict';
  var STORAGE_KEY = 'ub_session';
  var currentUser = null;
  try {
    var raw = (window.AuthSession ? window.AuthSession.getRaw() : sessionStorage.getItem(STORAGE_KEY));
    if (!raw) { window.location.href = '/'; return; }
    currentUser = JSON.parse(raw);
    if (!currentUser || !currentUser.user_id) { window.location.href = '/'; return; }
  } catch (e) { window.location.href = '/'; return; }

  if (currentUser.role !== 'main_admin' && currentUser.role !== 'co_admin') {
    document.body.innerHTML = '<p class="error-msg" style="padding:2rem;text-align:center;">Access denied.</p>';
    return;
  }

  if (currentUser.role === 'co_admin') {
    var usersNav = document.getElementById('sidenav-users');
    var usersSection = document.getElementById('section-users');
    var mobileUsersNav = document.getElementById('mobile-nav-users');
    if (usersNav) usersNav.style.display = 'none';
    if (usersSection) usersSection.style.display = 'none';
    if (mobileUsersNav) mobileUsersNav.style.display = 'none';
  }

  var roleLabel = document.getElementById('admin-role-label');
  if (roleLabel) roleLabel.textContent = currentUser.role === 'main_admin' ? 'Admin' : 'Moderator';

  var headerAvatarLink = document.getElementById('header-avatar-link');
  var headerAvatar = document.getElementById('header-avatar');
  if (headerAvatarLink) headerAvatarLink.href = '/profile/' + currentUser.user_id;
  if (headerAvatar) { if (currentUser.photo_url) headerAvatar.src = currentUser.photo_url; else headerAvatar.classList.add('no-image'); }

  // Theme
  function applyTheme(theme) {
    var l = document.getElementById('theme-light-btn'), d = document.getElementById('theme-dark-btn');
    if (theme === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); if (d) { d.classList.add('active'); d.setAttribute('aria-pressed', 'true'); } if (l) { l.classList.remove('active'); l.setAttribute('aria-pressed', 'false'); } }
    else { document.documentElement.removeAttribute('data-theme'); if (l) { l.classList.add('active'); l.setAttribute('aria-pressed', 'true'); } if (d) { d.classList.remove('active'); d.setAttribute('aria-pressed', 'false'); } }
    try { localStorage.setItem('ub_theme', theme); } catch (e) {}
  }
  try { applyTheme(localStorage.getItem('ub_theme') || 'light'); } catch (e) { applyTheme('light'); }
  var tlb = document.getElementById('theme-light-btn'), tdb = document.getElementById('theme-dark-btn');
  if (tlb) tlb.addEventListener('click', function () { applyTheme('light'); });
  if (tdb) tdb.addEventListener('click', function () { applyTheme('dark'); });

  // Hamburger
  var hBtn = document.getElementById('hamburger-btn'), hMenu = document.getElementById('hamburger-menu');
  function closeHamburger() { if (hMenu) hMenu.classList.add('hidden'); if (hBtn) hBtn.setAttribute('aria-expanded', 'false'); }
  if (hBtn) hBtn.addEventListener('click', function (e) { e.stopPropagation(); var o = !hMenu.classList.contains('hidden'); if (o) closeHamburger(); else { hMenu.classList.remove('hidden'); hBtn.setAttribute('aria-expanded', 'true'); } });
  document.addEventListener('click', closeHamburger);
  if (hMenu) hMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  var adminPanelItem = document.getElementById('admin-panel-item');

  // Mobile admin drawer
  var mobileMenuBtn = document.getElementById('admin-sidebar-toggle-btn');
  var mobileDrawer = document.getElementById('admin-mobile-drawer');
  var mobileDrawerOverlay = document.getElementById('admin-mobile-drawer-overlay');
  var mobileDrawerClose = document.getElementById('admin-mobile-drawer-close');
  var mobileLogoutBtn = document.getElementById('admin-mobile-logout');
  var mobileCurrentTitle = document.getElementById('admin-mobile-current-title');
  var mobileTopbarActions = document.getElementById('admin-mobile-topbar-actions');

  function closeMobileDrawer() {
    if (mobileDrawer) {
      mobileDrawer.classList.add('hidden');
      mobileDrawer.setAttribute('aria-hidden', 'true');
    }
    if (mobileDrawerOverlay) mobileDrawerOverlay.classList.add('hidden');
    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (mobileDrawer.classList.contains('hidden')) {
        // Drawer is closed - open it
        mobileDrawer.classList.remove('hidden');
        mobileDrawer.setAttribute('aria-hidden', 'false');
        mobileDrawerOverlay.classList.remove('hidden');
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      } else {
        // Drawer is open - close it
        mobileDrawer.classList.add('hidden');
        mobileDrawer.setAttribute('aria-hidden', 'true');
        mobileDrawerOverlay.classList.add('hidden');
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  if (mobileDrawerClose) {
    mobileDrawerClose.addEventListener('click', function() {
      mobileDrawer.classList.add('hidden');
      mobileDrawer.setAttribute('aria-hidden', 'true');
      mobileDrawerOverlay.classList.add('hidden');
      if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  }

  if (mobileDrawerOverlay) {
    mobileDrawerOverlay.addEventListener('click', closeMobileDrawer);
  }

  // ESC key closes mobile drawer
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && mobileDrawer && !mobileDrawer.classList.contains('hidden')) {
      closeMobileDrawer();
    }
  });

  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', function() {
      try { (window.AuthSession ? window.AuthSession.clear() : sessionStorage.removeItem(STORAGE_KEY)); } catch (e) {}
      window.location.href = '/';
    });
  }

  // Mobile drawer nav items
  var mobileNavItems = document.querySelectorAll('.admin-mobile-nav-item');
  var mobileContent = document.getElementById('admin-mobile-content');
  var mobileContentBody = document.getElementById('admin-mobile-content-body');
  var mobileBackBtn = document.getElementById('admin-mobile-back');
  var mobileSectionNav = document.getElementById('admin-mobile-section-nav');
  var mobileHero = document.querySelector('.admin-mobile-hero');
  var mobileHeroTitle = document.getElementById('admin-mobile-hero-title');
  var mobileHeroTagline = document.querySelector('.admin-mobile-hero-tagline');
  var currentMobileSection = 'submissions';
  var currentMobileSubTab = 'pending';

  function showMobileContent(section) {
    if (!mobileContent || !mobileContentBody) return;
    var sectionKey = section.replace('tab-', '');
    currentMobileSection = sectionKey;
    closeMobileDrawer();
    mobileContent.classList.remove('hidden');
    mobileContent.setAttribute('aria-hidden', 'false');

    var taglines = {
      'submissions': 'Review pending and approved work',
      'reports': 'Handle flagged content',
      'users': 'Manage user restrictions',
      'admins': 'Manage admin accounts'
    };

    // Update hero title and tagline
    if (mobileHeroTitle) mobileHeroTitle.textContent = 'Admin Panel';
    if (mobileHeroTagline) mobileHeroTagline.textContent = taglines[sectionKey] || '';

    // Load content with current sub-tab
    loadMobileContent(sectionKey, currentMobileSubTab);
  }

  function closeMobileContent() {
    if (!mobileContent) return;
    mobileContent.classList.add('hidden');
    mobileContent.setAttribute('aria-hidden', 'true');
  }

  function loadMobileContent(section, subtab) {
    currentMobileSubTab = subtab;
    if (!mobileContentBody) {
      if (section === 'submissions') {
        currentSubmissionTab = subtab || currentSubmissionTab || 'pending';
        loadSubmissions();
      } else if (section === 'reports') {
        loadReports();
      } else if (section === 'users') {
        loadRestrictions();
      } else if (section === 'admins') {
        loadUsers();
      }
      return;
    }
    mobileContentBody.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-muted);">Loading...</p>';

    var xhr = new XMLHttpRequest();
    if (section === 'submissions') {
      var url = '/api/writers/submissions?status=' + encodeURIComponent(subtab);
      xhr.open('GET', url, true);
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            renderMobileSubmissions(data, subtab);
          } catch(e) {
            mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Error loading data.</p>';
          }
        } else {
          mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Failed to load.</p>';
        }
      };
      xhr.onerror = function() {
        mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Network error.</p>';
      };
      xhr.send();
    } else if (section === 'reports') {
      xhr.open('GET', '/api/admin/reports?user_id=' + currentUser.user_id, true);
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            renderMobileReports(data);
          } catch(e) {
            mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Error loading data.</p>';
          }
        } else {
          mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Failed to load.</p>';
        }
      };
      xhr.onerror = function() {
        mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Network error.</p>';
      };
      xhr.send();
    } else if (section === 'users') {
      xhr.open('GET', '/api/admin/restrictions?user_id=' + currentUser.user_id, true);
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            renderMobileUsers(data);
          } catch(e) {
            mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Error loading data.</p>';
          }
        } else {
          mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Failed to load.</p>';
        }
      };
      xhr.onerror = function() {
        mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Network error.</p>';
      };
      xhr.send();
    } else if (section === 'admins') {
      xhr.open('GET', '/api/admin/users?user_id=' + currentUser.user_id, true);
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            renderMobileAdmins(data);
          } catch(e) {
            mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Error loading data.</p>';
          }
        } else {
          mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Failed to load.</p>';
        }
      };
      xhr.onerror = function() {
        mobileContentBody.innerHTML = '<p class="error-msg" style="padding:2rem;">Network error.</p>';
      };
      xhr.send();
    }
  }

  function renderMobileSubmissions(data, status) {
    if (!data || data.length === 0) {
      mobileContentBody.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-muted);">' + (status === 'pending' ? 'No pending submissions.' : 'No approved submissions.') + '</p>';
      return;
    }
    var html = '<div class="admin-mobile-list">';
    data.forEach(function(item) {
      var catColors = {'Poetry':'#e8d5b7','Essay':'#d5e8d4','Short Story':'#dae8fc','Article':'#f8cecc','Opinion':'#fff2cc'};
      var catColor = catColors[item.category] || '#e1d5e7';
      html += '<div class="admin-mobile-item" data-id="' + item.id + '">' +
        '<div class="admin-mobile-item-header">' +
        '<span class="admin-mobile-item-cat" style="background:' + catColor + '">' + escapeHtml(item.category) + '</span>' +
        '<span class="admin-mobile-item-date">' + formatDate(item.submitted_at || item.created_at) + '</span>' +
        '</div>' +
        '<h3 class="admin-mobile-item-title">' + escapeHtml(item.title) + '</h3>' +
        '<p class="admin-mobile-item-author">by ' + escapeHtml(item.author_name || 'Anonymous') + '</p>' +
        '<p class="admin-mobile-item-preview">' + escapeHtml((item.content || '').substring(0, 120)) + '...</p>' +
        '<div class="admin-mobile-item-actions">';
      if (status === 'pending') {
        html += '<button type="button" class="admin-mobile-action-btn admin-mobile-approve" data-id="' + item.id + '">✅ Approve</button>' +
                '<button type="button" class="admin-mobile-action-btn admin-mobile-view" data-id="' + item.id + '">👁 View</button>';
      } else {
        html += '<button type="button" class="admin-mobile-action-btn admin-mobile-view" data-id="' + item.id + '">👁 View</button>';
      }
      html += '</div></div>';
    });
    html += '</div>';
    mobileContentBody.innerHTML = html;

    // Wire up buttons
    mobileContentBody.querySelectorAll('.admin-mobile-approve').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.id;
        var fd = new FormData();
        fd.append('user_id', currentUser.user_id);
        fd.append('action', 'approve');
        fetch('/api/writers/submissions/' + id, {method:'POST', body: fd})
          .then(function(r){ return r.json(); })
          .then(function() {
            loadMobileContent('submissions', 'pending');
          })
          .catch(function() {});
      });
    });

    mobileContentBody.querySelectorAll('.admin-mobile-view').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.id;
        showSubmissionModal(id);
      });
    });
  }

  function renderMobileReports(data) {
    if (!data || data.length === 0) {
      mobileContentBody.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-muted);">No reports found.</p>';
      return;
    }
    var html = '<div class="admin-mobile-list">';
    data.forEach(function(group) {
      var reasonLabels = {'spam':'🚫 Spam','bullying':'👊 Bullying','inappropriate':'🔞 Inappropriate','harassment':'😡 Harassment','other':'📋 Other'};
      var reasonDisplay = reasonLabels[group.primary_reason] || group.primary_reason || 'Unknown';
      html += '<div class="admin-mobile-item admin-mobile-report-item">' +
        '<div class="admin-mobile-item-header">' +
        '<span class="admin-mobile-item-cat">' + reasonDisplay + '</span>' +
        '<span class="admin-mobile-item-count">' + group.report_count + ' report' + (group.report_count > 1 ? 's' : '') + '</span>' +
        '</div>' +
        '<p class="admin-mobile-item-preview">' + escapeHtml((group.content_preview || '').substring(0, 100)) + '...</p>' +
        '<div class="admin-mobile-item-actions">' +
        '<button type="button" class="admin-mobile-action-btn admin-mobile-view-report" data-id="' + group.target_id + '" data-type="' + group.target_type + '">👁 View</button>' +
        '<button type="button" class="admin-mobile-action-btn admin-mobile-dismiss" data-id="' + group.target_id + '" data-type="' + group.target_type + '">✓ Dismiss</button>' +
        '</div></div>';
    });
    html += '</div>';
    mobileContentBody.innerHTML = html;

    // Wire up buttons
    mobileContentBody.querySelectorAll('.admin-mobile-view-report').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.id;
        var type = this.dataset.type;
        viewReport(id, type);
      });
    });

    mobileContentBody.querySelectorAll('.admin-mobile-dismiss').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.id;
        var type = this.dataset.type;
        dismissReports(id, type);
      });
    });
  }

  function renderMobileUsers(data) {
    if (!data || data.length === 0) {
      mobileContentBody.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-muted);">No restrictions found.</p>';
      return;
    }
    var html = '<div class="admin-mobile-list">';
    data.forEach(function(item) {
      var isActive = item.is_active !== false;
      html += '<div class="admin-mobile-item">' +
        '<div class="admin-mobile-item-header">' +
        '<span class="admin-mobile-item-cat" style="background:' + (isActive ? '#fce7f3' : '#f3f4f6') + '">' + (isActive ? '⏳ Active' : '✓ Expired') + '</span>' +
        '</div>' +
        '<p class="admin-mobile-item-author">' + escapeHtml(item.user_name || 'User #' + item.user_id) + '</p>' +
        '<p class="admin-mobile-item-preview">' + escapeHtml((item.reason || '').substring(0, 100)) + '</p>' +
        '<p class="admin-mobile-item-date">Expires: ' + formatDate(item.ends_at) + '</p>' +
        '<div class="admin-mobile-item-actions">' +
        '<button type="button" class="admin-mobile-action-btn admin-mobile-lift" data-id="' + item.id + '">✓ Lift Restriction</button>' +
        '</div></div>';
    });
    html += '</div>';
    mobileContentBody.innerHTML = html;

    mobileContentBody.querySelectorAll('.admin-mobile-lift').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.id;
        liftRestriction(id);
      });
    });
  }

  function renderMobileAdmins(data) {
    if (!data || data.length === 0) {
      mobileContentBody.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-muted);">No admin team members found.</p>';
      return;
    }
    var html = '<div class="admin-mobile-list">';
    data.forEach(function(item) {
      var roleColors = {'main_admin':'#fce7f3','co_admin':'#e0f2fe'};
      var roleLabels = {'main_admin':'👑 Admin','co_admin':'👤 Moderator'};
      html += '<div class="admin-mobile-item">' +
        '<div class="admin-mobile-item-header">' +
        '<span class="admin-mobile-item-cat" style="background:' + (roleColors[item.role] || '#f3f4f6') + '">' + (roleLabels[item.role] || item.role) + '</span>' +
        '</div>' +
        '<p class="admin-mobile-item-author">' + escapeHtml(item.name || 'User #' + item.user_id) + '</p>' +
        '<div class="admin-mobile-item-actions">';
      if (currentUser.role === 'main_admin' && item.role !== 'main_admin') {
        html += '<button type="button" class="admin-mobile-action-btn admin-mobile-remove-admin" data-id="' + item.user_id + '">✕ Remove Moderator</button>';
      }
      html += '</div></div>';
    });
    html += '</div>';
    mobileContentBody.innerHTML = html;

    mobileContentBody.querySelectorAll('.admin-mobile-remove-admin').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.id;
        removeAdmin(id);
      });
    });
  }

  function showSubmissionModal(id) {
    fetch('/api/writers/submissions/' + id)
      .then(function(r){ return r.json(); })
      .then(function(data) {
        var modal = document.getElementById('admin-post-modal');
        var content = document.getElementById('admin-post-modal-content');
        var catColors = {'Poetry':'#e8d5b7','Essay':'#d5e8d4','Short Story':'#dae8fc','Article':'#f8cecc','Opinion':'#fff2cc'};
        content.innerHTML = '<div class="admin-submission-view">' +
          '<span class="admin-submission-cat" style="background:' + (catColors[data.category] || '#e1d5e7') + '">' + escapeHtml(data.category) + '</span>' +
          '<h2 style="margin:0.5rem 0;">' + escapeHtml(data.title) + '</h2>' +
          '<p style="color:var(--text-muted);font-size:0.85rem;margin:0 0 1rem;">by ' + escapeHtml(data.author_name || 'Anonymous') + ' · ' + formatDate(data.submitted_at || data.created_at) + '</p>' +
          '<div style="white-space:pre-wrap;line-height:1.6;">' + escapeHtml(data.content || '') + '</div>' +
          '<div style="margin-top:1.5rem;display:flex;gap:0.5rem;flex-wrap:wrap;">' +
          '<button type="button" class="btn-sm" id="modal-approve-btn" ' + (data.status === 'approved' ? 'disabled style="opacity:0.5;"' : '') + '>✅ Approve</button>' +
          '<button type="button" class="btn-sm" id="modal-reject-btn" style="background:#dc2626;color:white;">❌ Reject</button>' +
          '</div></div>';
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');

        var approveBtn = document.getElementById('modal-approve-btn');
        var rejectBtn = document.getElementById('modal-reject-btn');
        if (approveBtn && data.status !== 'approved') {
          approveBtn.addEventListener('click', function() {
            var fd = new FormData();
            fd.append('user_id', currentUser.user_id);
            fd.append('action', 'approve');
            fetch('/api/writers/submissions/' + id, {method:'POST', body:fd})
              .then(function(){ modal.classList.add('hidden'); loadMobileContent('submissions', currentMobileSubTab); });
          });
        }
        if (rejectBtn) {
          rejectBtn.addEventListener('click', function() {
            var fd = new FormData();
            fd.append('user_id', currentUser.user_id);
            fd.append('action', 'reject');
            fetch('/api/writers/submissions/' + id, {method:'POST', body:fd})
              .then(function(){ modal.classList.add('hidden'); loadMobileContent('submissions', 'pending'); });
          });
        }
      });
  }

  function viewReport(id, type) {
    if (type === 'post') {
      fetch('/api/posts/' + id)
        .then(function(r){ return r.json(); })
        .then(function(data) {
          var modal = document.getElementById('admin-post-modal');
          var content = document.getElementById('admin-post-modal-content');
          content.innerHTML = '<div style="white-space:pre-wrap;line-height:1.6;">' + escapeHtml(data.content || '') + '</div>' +
            '<div style="margin-top:1.5rem;display:flex;gap:0.5rem;"><button type="button" class="btn-sm admin-mobile-delete-content" data-id="' + id + '" data-type="post" style="background:#dc2626;color:white;">🗑 Delete</button></div>';
          modal.classList.remove('hidden');
          modal.setAttribute('aria-hidden', 'false');
          var deleteBtn = content.querySelector('.admin-mobile-delete-content');
          if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
              deleteContent(id, 'post');
            });
          }
        });
    }
  }

  function dismissReports(id, type) {
    if (confirm('Dismiss all reports for this content?')) {
      fetch('/api/admin/reports/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.user_id, target_id: id, target_type: type })
      }).then(function(){ loadMobileContent('reports', currentMobileSubTab); });
    }
  }

  function deleteContent(id, type) {
    if (confirm('Delete this content?')) {
      var fd = new FormData();
      fd.append('user_id', currentUser.user_id);
      fetch('/api/posts/' + id, {method:'DELETE', body:fd})
        .then(function(){ document.getElementById('admin-post-modal').classList.add('hidden'); loadMobileContent('reports', currentMobileSubTab); });
    }
  }

  function liftRestriction(id) {
    if (confirm('Lift this restriction?')) {
      var fd = new FormData();
      fd.append('user_id', currentUser.user_id);
      fetch('/api/admin/restrictions/' + id + '/lift', {method:'POST', body:fd})
        .then(function(){ loadMobileContent('users', currentMobileSubTab); });
    }
  }

  function removeAdmin(id) {
    if (confirm('Remove this admin?')) {
      var fd = new FormData();
      fd.append('user_id', currentUser.user_id);
      fetch('/api/admin/users/' + id, {method:'DELETE', body:fd})
        .then(function(){ loadMobileContent('admins', currentMobileSubTab); });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Wire up mobile nav buttons
  mobileNavItems.forEach(function(btn) {
    btn.addEventListener('click', function() {
      activateSection(this.dataset.tab);
      closeMobileDrawer();
    });
  });

  // Back button
  if (mobileBackBtn) {
    mobileBackBtn.addEventListener('click', function() {
      closeMobileContent();
      // Reset nav active state
      mobileNavItems.forEach(function(b) { b.classList.remove('active'); });
    });
  }

  // Wire up section nav (Pending/Approved tabs)
  document.querySelectorAll('.admin-mobile-section-nav-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      var subtab = this.dataset.subtab;
      currentMobileSubTab = subtab;

      // Update active state on nav
      if (mobileSectionNav) {
        mobileSectionNav.dataset.active = subtab;
        mobileSectionNav.querySelectorAll('.admin-mobile-section-nav-item').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
      }

      // Load submissions content
      loadMobileContent('submissions', subtab);
    });
  });

  // Close modal
  var adminPostModal = document.getElementById('admin-post-modal');
  var adminPostModalContent = document.getElementById('admin-post-modal-content');
  var adminPostModalClose = document.getElementById('admin-post-modal-close');
  if (adminPostModalClose) {
    adminPostModalClose.addEventListener('click', function() {
      adminPostModal.classList.add('hidden');
    });
  }
  if (adminPanelItem) adminPanelItem.classList.add('hidden');
  var logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', function () { try { (window.AuthSession ? window.AuthSession.clear() : sessionStorage.removeItem(STORAGE_KEY)); } catch (e) {} window.location.href = '/'; });

  // Action modal
  var actionModal = document.getElementById('action-modal');
  var actionModalTitle = document.getElementById('action-modal-title');
  var actionModalMessage = document.getElementById('action-modal-message');
  var actionModalInput = document.getElementById('action-modal-input');
  var actionModalError = document.getElementById('action-modal-error');
  var actionModalCancel = document.getElementById('action-modal-cancel');
  var actionModalConfirm = document.getElementById('action-modal-confirm');
  var modalConfirmHandler = null;

  function closeActionModal() {
    actionModal.classList.add('hidden'); actionModal.setAttribute('aria-hidden', 'true');
    actionModalError.textContent = ''; actionModalError.classList.add('hidden');
    modalConfirmHandler = null;
  }
  function openActionModal(config) {
    actionModalTitle.textContent = config.title || 'Confirm';
    actionModalMessage.textContent = config.message || '';
    actionModalInput.classList.toggle('hidden', !config.showInput);
    actionModalInput.value = config.initialValue || '';
    actionModalError.textContent = ''; actionModalError.classList.add('hidden');
    actionModalConfirm.textContent = config.confirmText || 'Confirm';
    actionModalConfirm.classList.toggle('btn-danger', !!config.danger);
    actionModal.classList.remove('hidden'); actionModal.setAttribute('aria-hidden', 'false');
    modalConfirmHandler = config.onConfirm || null;
    if (config.showInput) actionModalInput.focus();
  }
  if (actionModalCancel) actionModalCancel.addEventListener('click', closeActionModal);
  if (actionModal) {
    actionModal.addEventListener('click', function (e) { if (e.target === actionModal) closeActionModal(); });
    var amc = actionModal.querySelector('.action-modal-card');
    if (amc) amc.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  if (actionModalConfirm) actionModalConfirm.addEventListener('click', function () {
    if (!modalConfirmHandler) { closeActionModal(); return; }
    modalConfirmHandler({ value: (actionModalInput.value || '').trim(), setError: function (m) { actionModalError.textContent = m || ''; actionModalError.classList.toggle('hidden', !m); }, close: closeActionModal });
  });

  // Post viewer modal (for reported posts)
  function closeAdminPostModal() {
    if (adminPostModal) { adminPostModal.classList.add('hidden'); adminPostModal.setAttribute('aria-hidden', 'true'); }
    if (adminPostModalContent) adminPostModalContent.innerHTML = '';
  }
  if (adminPostModalClose) adminPostModalClose.addEventListener('click', closeAdminPostModal);
  if (adminPostModal) adminPostModal.addEventListener('click', function (e) { if (e.target === adminPostModal) closeAdminPostModal(); });

  function openAdminPostModal(targetType, targetId) {
    if (!adminPostModal || !adminPostModalContent) return;
    adminPostModalContent.innerHTML = '<p class="hint" style="text-align:center;padding:2rem;">Loading...</p>';
    adminPostModal.classList.remove('hidden'); adminPostModal.setAttribute('aria-hidden', 'false');
    if (targetType !== 'post') {
      adminPostModalContent.innerHTML = '<p class="hint" style="text-align:center;padding:2rem;">Comments cannot be previewed here.</p>';
      return;
    }
    
    // Fetch full post details with comments and reactions
    fetch('/api/posts/' + targetId).then(function (r) { 
      if (!r.ok) throw new Error('Post not found');
      return r.json(); 
    }).then(function (data) {
      var p = data.post;
      var comments = data.comments || [];
      var reactions = data.reactions || {};
      var totalReactions = data.total_reactions || 0;
      
      adminPostModalContent.innerHTML = '';
      
      // Create post card
      var card = document.createElement('article');
      card.className = 'post-card';
      
      // Build reaction display
      var reactionHtml = '';
      var reactionEmojis = { heart: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😠' };
      var reactionList = [
        '<span class="reaction-item">&#9829; ' + (reactions.heart || 0) + ' like' + ((reactions.heart || 0) === 1 ? '' : 's') + '</span>',
        '<span class="reaction-item">&#128172; ' + comments.length + ' comment' + (comments.length === 1 ? '' : 's') + '</span>'
      ];
      for (var rt in reactions) {
        if (rt !== 'heart' && reactions[rt] > 0) {
          reactionList.push('<span class="reaction-item">' + reactionEmojis[rt] + ' ' + reactions[rt] + '</span>');
        }
      }
      reactionHtml = '<div class="post-reactions-summary" style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap;">' + reactionList.join('') + '</div>';
      
      card.innerHTML =
        '<div class="post-card-top"><div class="post-author-row">' +
        '<div><span class="post-anon-name">' + escapeHtml(p.author_name || 'Anonymous') + '</span>' +
        '<span class="post-time"> &middot; ' + formatDate(p.created_at) + '</span></div></div></div>' +
        '<div class="post-cat-pill">' + escapeHtml(p.category) + '</div>' +
        '<div class="post-body" style="white-space:pre-wrap;">' + escapeHtml(p.content) + '</div>';
      
      if (p.image_url) {
        var img = document.createElement('img'); 
        img.className = 'post-media'; 
        img.src = p.image_url; 
        img.alt = 'Attached image';
        card.querySelector('.post-body').insertAdjacentElement('afterend', img);
      }
      
      if (reactionHtml) {
        card.insertAdjacentHTML('beforeend', reactionHtml);
      }
      
      adminPostModalContent.appendChild(card);
      
      // Add comments section
      if (comments.length > 0) {
        var commentsSection = document.createElement('div');
        commentsSection.className = 'comments-section';
        commentsSection.style.marginTop = '1.5rem';
        commentsSection.innerHTML = '<h4 style="margin-bottom:1rem;font-size:1rem;font-weight:600;">Comments (' + comments.length + ')</h4>';
        
        comments.forEach(function (c) {
          var commentCard = document.createElement('div');
          commentCard.className = 'comment';
          commentCard.style.marginBottom = '1rem';
          commentCard.style.padding = '0.75rem';
          commentCard.style.border = '1px solid var(--border-color)';
          commentCard.style.borderRadius = '8px';
          
          var authorPhoto = c.author_photo ? '<img src="' + escapeHtml(c.author_photo) + '" alt="" class="comment-avatar" style="width:32px;height:32px;border-radius:50%;margin-right:0.5rem;">' : '';
          
          commentCard.innerHTML =
            '<div style="display:flex;align-items:start;margin-bottom:0.5rem;">' +
            authorPhoto +
            '<div><strong>' + escapeHtml(c.author_name || 'Anonymous') + '</strong>' +
            '<span style="color:var(--text-muted);font-size:0.875rem;margin-left:0.5rem;">' + formatDate(c.created_at) + '</span></div></div>' +
            '<div style="white-space:pre-wrap;margin-left:' + (c.author_photo ? '40px' : '0') + ';">' + escapeHtml(c.content) + '</div>';
          
          if (c.image_url) {
            var cImg = document.createElement('img');
            cImg.src = c.image_url;
            cImg.alt = 'Comment image';
            cImg.style.maxWidth = '100%';
            cImg.style.marginTop = '0.5rem';
            cImg.style.borderRadius = '4px';
            commentCard.appendChild(cImg);
          }
          
          commentsSection.appendChild(commentCard);
        });
        
        adminPostModalContent.appendChild(commentsSection);
      }
    }).catch(function () { 
      adminPostModalContent.innerHTML = '<p class="hint" style="text-align:center;padding:2rem;">Could not load post.</p>'; 
    });
  }

  // Warning modal
  function openWarningModal(targetType, targetId, reason, onSuccess) {
    var overlay = document.createElement('div');
    overlay.className = 'action-modal';
    overlay.setAttribute('aria-hidden', 'false');
    
    var reasonDisplayMap = {
      'spam': 'Spam',
      'harassment': 'Harassment', 
      'inappropriate': 'Inappropriate Content',
      'bullying': 'Bullying',
      'other': 'Policy Violation'
    };
    var reasonDisplay = reasonDisplayMap[reason] || reason;
    
    // System-generated warning messages
    var warningMessages = {
      'spam': 'Your recent post has been flagged as spam. Please ensure your content is relevant and not repetitive. Continued spam posting may result in account restrictions.',
      'harassment': 'Your content has been reported for harassment. Please maintain respectful communication with other users. Harassment violates our community guidelines and may lead to account suspension.',
      'inappropriate': 'Your post contains inappropriate content that violates our community standards. Please review our guidelines and ensure future posts are appropriate for all users.',
      'bullying': 'Your content has been flagged for bullying behavior. We do not tolerate bullying or intimidation. Please treat all community members with respect.',
      'other': 'Your content has been reported for violating our community guidelines. Please review our terms of service and ensure your posts comply with our standards.'
    };
    
    var systemMessage = warningMessages[reason] || warningMessages['other'];
    
    overlay.innerHTML =
      '<div class="warning-modal-card">' +
      '<div class="warning-modal-header">' +
      '<h3 class="warning-modal-title">⚠️ Official Warning</h3>' +
      '<button type="button" class="ep-close-btn" id="warning-modal-close">✕</button>' +
      '</div>' +
      '<div class="warning-modal-body">' +
      '<div class="warning-system-notice">' +
      '<div class="warning-notice-header">' +
      '<span class="warning-notice-icon">🛡️</span>' +
      '<span class="warning-notice-title">System Generated Warning</span>' +
      '</div>' +
      '<div class="warning-notice-reason">Violation Type: <strong>' + escapeHtml(reasonDisplay) + '</strong></div>' +
      '</div>' +
      '<div class="warning-message-preview">' +
      '<h4 class="warning-preview-title">Warning Message:</h4>' +
      '<div class="warning-preview-content">' + escapeHtml(systemMessage) + '</div>' +
      '</div>' +
      '<div class="warning-modal-field">' +
      '<label class="warning-modal-label" for="warning-additional">Additional Notes (Optional):</label>' +
      '<textarea id="warning-additional" class="warning-modal-textarea" rows="3" placeholder="Add any specific notes for this user (optional)..."></textarea>' +
      '</div>' +
      '<div class="warning-restriction-options">' +
      '<div class="warning-restriction-header">' +
      '<input type="checkbox" id="warning-create-restriction" class="warning-restriction-checkbox">' +
      '<label for="warning-create-restriction" class="warning-restriction-label">Also create manual restriction</label>' +
      '</div>' +
      '<div id="warning-restriction-details" class="warning-restriction-details hidden">' +
      '<div class="warning-restriction-field">' +
      '<label for="warning-restriction-duration" class="warning-restriction-sublabel">Duration:</label>' +
      '<select id="warning-restriction-duration" class="warning-restriction-select">' +
      '<option value="1">1 Day</option>' +
      '<option value="7">1 Week</option>' +
      '<option value="14">2 Weeks</option>' +
      '<option value="30">1 Month</option>' +
      '<option value="90">3 Months</option>' +
      '</select>' +
      '</div>' +
      '<div class="warning-restriction-field">' +
      '<label for="warning-restriction-reason" class="warning-restriction-sublabel">Restriction Reason:</label>' +
      '<input type="text" id="warning-restriction-reason" class="warning-restriction-input" placeholder="Reason for restriction..." value="Manual restriction following warning for ' + escapeHtml(reasonDisplay) + '">' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="warning-modal-footer">' +
      '<p id="warning-modal-error" class="error-msg hidden"></p>' +
      '<div class="warning-modal-actions">' +
      '<button type="button" id="warning-modal-cancel" class="btn-sm">Cancel</button>' +
      '<button type="button" id="warning-modal-send" class="btn-sm" style="background:#dc2626;color:white;border-color:#dc2626;">Issue Warning</button>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    document.body.appendChild(overlay);
    
    // Handle restriction checkbox toggle
    var restrictionCheckbox = overlay.querySelector('#warning-create-restriction');
    var restrictionDetails = overlay.querySelector('#warning-restriction-details');
    
    if (restrictionCheckbox && restrictionDetails) {
      restrictionCheckbox.addEventListener('change', function() {
        if (restrictionCheckbox.checked) {
          restrictionDetails.classList.remove('hidden');
        } else {
          restrictionDetails.classList.add('hidden');
        }
      });
    }
    
    function closeWarningModal() {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }
    
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeWarningModal();
    });
    
    overlay.querySelector('#warning-modal-close').addEventListener('click', closeWarningModal);
    overlay.querySelector('#warning-modal-cancel').addEventListener('click', closeWarningModal);
    
    overlay.querySelector('#warning-modal-send').addEventListener('click', function () {
      var additionalNotes = overlay.querySelector('#warning-additional').value.trim();
      var finalMessage = systemMessage;
      if (additionalNotes) {
        finalMessage += '\n\nAdditional Notes: ' + additionalNotes;
      }
      
      var createRestriction = restrictionCheckbox && restrictionCheckbox.checked;
      var restrictionDuration = createRestriction ? overlay.querySelector('#warning-restriction-duration').value : null;
      var restrictionReason = createRestriction ? overlay.querySelector('#warning-restriction-reason').value.trim() : null;
      
      var errorEl = overlay.querySelector('#warning-modal-error');
      errorEl.classList.add('hidden');
      
      // Validate restriction fields if creating restriction
      if (createRestriction) {
        if (!restrictionReason) {
          errorEl.textContent = 'Please provide a reason for the restriction.';
          errorEl.classList.remove('hidden');
          return;
        }
      }
      
      // First, get the target user ID from the content
      var getUserPromise;
      if (targetType === 'post') {
        getUserPromise = api('/api/posts/' + targetId).then(function(data) {
          return data.post.user_id;
        });
      } else if (targetType === 'comment') {
        getUserPromise = api('/api/comments/' + targetId).then(function(data) {
          return data.comment.user_id;
        });
      } else {
        errorEl.textContent = 'Cannot determine user for this content type.';
        errorEl.classList.remove('hidden');
        return;
      }
      
      getUserPromise.then(function(targetUserId) {
        if (!targetUserId) {
          errorEl.textContent = 'Cannot determine target user.';
          errorEl.classList.remove('hidden');
          return;
        }
        
        // Issue the warning
        return api('/api/admin/warnings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.user_id,
            target_type: targetType,
            target_id: targetId,
            reason: reason,
            message: finalMessage
          })
        }).then(function() {
          // If creating restriction, do that next
          if (createRestriction) {
            return api('/api/admin/restrictions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                admin_user_id: currentUser.user_id,
                user_id: targetUserId,
                duration_days: parseInt(restrictionDuration),
                reason: restrictionReason
              })
            });
          }
        });
      }).then(function() {
        closeWarningModal();
        if (onSuccess) onSuccess();
      }).catch(function (e) {
        errorEl.textContent = e.message || 'Could not process warning/restriction.';
        errorEl.classList.remove('hidden');
      });
    });
  }
  function openContentModal(title, authorName, category, date, htmlContent, documentUrl, documentName) {
    var overlay = document.createElement('div');
    overlay.className = 'action-modal'; overlay.setAttribute('aria-hidden', 'false');
    var tmp = document.createElement('div'); tmp.innerHTML = htmlContent || '';
    var plainText = (tmp.textContent || tmp.innerText || '').trim();
    overlay.innerHTML =
      '<div class="content-modal-card">' +
      '<div class="content-modal-header"><div>' +
      '<h3 class="content-modal-title">' + escapeHtml(title) + '</h3>' +
      '<p class="content-modal-meta">&#9998; ' + escapeHtml(authorName) + ' &middot; ' + escapeHtml(category) + ' &middot; ' + escapeHtml(date) + '</p>' +
      '</div><button type="button" class="ep-close-btn" id="content-modal-close">&#x2715;</button></div>' +
      '<div class="content-modal-body">' + (plainText || htmlContent) + '</div>' +
      (documentUrl ? '<p style="margin-top:1rem;padding:0 1.5rem;"><a href="' + escapeHtml(documentUrl) + '" target="_blank" rel="noopener">📄 ' + escapeHtml(documentName || 'Attached document') + '</a></p>' : '') +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) document.body.removeChild(overlay); });
    overlay.querySelector('#content-modal-close').addEventListener('click', function () { document.body.removeChild(overlay); });
  }

  // Utilities
  function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function stripHtml(html) { var d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim(); }
  function formatDate(iso) { if (!iso) return ''; try { var s = String(iso).trim(); if (!/[Zz+\-]\d*$/.test(s)) s += 'Z'; return new Date(s).toLocaleString(); } catch (e) { return iso; } }
  function api(path, opts) { return fetch(path, opts).then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error(b.error || r.statusText); return b; }); }); }

  // Sidebar navigation
  var sidenavItems = document.querySelectorAll('.admin-sidenav-item');
  var sections = document.querySelectorAll('.admin-section');
  var tabLoaded = {};
  var reportsControls = document.querySelector('#section-reports .admin-controls');
  var adminsSearch = document.querySelector('#section-admins .admin-search-compact');
  var mobileMovedControls = [
    reportsControls ? { el: reportsControls, parent: reportsControls.parentNode, next: reportsControls.nextSibling } : null,
    adminsSearch ? { el: adminsSearch, parent: adminsSearch.parentNode, next: adminsSearch.nextSibling } : null
  ].filter(Boolean);

  function restoreMobileMovedControls() {
    mobileMovedControls.forEach(function(record) {
      if (record.el.parentNode !== record.parent) {
        record.parent.insertBefore(record.el, record.next);
      }
    });
  }

  function syncMobileTopbarActions(tabId) {
    if (!mobileTopbarActions) return;
    restoreMobileMovedControls();
    mobileTopbarActions.innerHTML = '';
    if (window.innerWidth > 900) return;
    var activeControls = null;
    if (tabId === 'tab-reports') activeControls = reportsControls;
    else if (tabId === 'tab-admins') activeControls = adminsSearch;
    if (activeControls) mobileTopbarActions.appendChild(activeControls);
  }

  window.addEventListener('resize', function() {
    var active = document.querySelector('.admin-section.active');
    syncMobileTopbarActions(active ? active.id.replace('section-', 'tab-') : 'tab-submissions');
  });

  function activateSection(tabId) {
    sidenavItems.forEach(function (item) { item.classList.toggle('active', item.dataset.tab === tabId); });
    var mobileNavItems = document.querySelectorAll('.admin-mobile-nav-item');
    mobileNavItems.forEach(function (item) { item.classList.toggle('active', item.dataset.tab === tabId); });
    var activeNav = document.querySelector('.admin-mobile-nav-item[data-tab="' + tabId + '"], .admin-sidenav-item[data-tab="' + tabId + '"]');
    if (mobileCurrentTitle && activeNav) {
      var labelEl = activeNav.querySelector('span:last-child');
      mobileCurrentTitle.textContent = (labelEl ? labelEl.textContent : activeNav.textContent).replace(/\s+/g, ' ').trim();
    }
    syncMobileTopbarActions(tabId);
    sections.forEach(function (s) { var sid = tabId.replace('tab-', 'section-'); s.classList.toggle('active', s.id === sid); });
    if (!tabLoaded[tabId]) {
      tabLoaded[tabId] = true;
      if (tabId === 'tab-submissions') loadSubmissions();
      else if (tabId === 'tab-approved') loadApprovedSubmissions();
      else if (tabId === 'tab-reports') loadReports();
      else if (tabId === 'tab-users') loadRestrictions();
      else if (tabId === 'tab-admins') loadUsers();
    }
  }
  sidenavItems.forEach(function (item) { item.addEventListener('click', function () { activateSection(item.dataset.tab); }); });

  // Restrictions
  var restrictionsFilter = 'all';
  var restrictionsSort = 'newest';
  var allRestrictions = [];
  var restrictionSearchQuery = '';

  function loadRestrictions() {
    var statusEl = document.getElementById('restrictions-status');
    var listEl = document.getElementById('restrictions-list');
    statusEl.textContent = 'Loading...'; 
    listEl.innerHTML = '';
    
    var url = '/api/admin/restrictions?user_id=' + currentUser.user_id;
    if (restrictionsFilter && restrictionsFilter !== 'all') {
      url += '&status=' + encodeURIComponent(restrictionsFilter);
    }
    if (restrictionsSort) {
      url += '&sort=' + encodeURIComponent(restrictionsSort);
    }
    
    api(url)
      .then(function (data) { 
        allRestrictions = data.restrictions || [];
        statusEl.textContent = allRestrictions.length ? '' : 'No restrictions found.'; 
        renderRestrictions(); 
      })
      .catch(function (e) { statusEl.textContent = 'Error: ' + e.message; });
  }

  function renderRestrictions() {
    var listEl = document.getElementById('restrictions-list');
    listEl.innerHTML = '';
    
    var filtered = allRestrictions;
    if (restrictionSearchQuery) {
      var query = restrictionSearchQuery.toLowerCase();
      filtered = allRestrictions.filter(function (r) {
        return (r.user_display_name && r.user_display_name.toLowerCase().indexOf(query) !== -1) ||
               (r.user_identifier && r.user_identifier.toLowerCase().indexOf(query) !== -1) ||
               (r.user_email && r.user_email.toLowerCase().indexOf(query) !== -1);
      });
    }
    
    if (!filtered.length) {
      listEl.innerHTML = '<p class="admin-section-status">' + 
        (restrictionSearchQuery ? 'No restrictions match your search.' : 'No restrictions found.') + 
        '</p>';
      return;
    }
    
    filtered.forEach(function (r) {
      listEl.appendChild(renderRestrictionCard(r));
    });
  }

  function renderRestrictionCard(r) {
    var card = document.createElement('div');
    card.className = 'restriction-card' + (r.is_active ? ' restriction-card-active' : '');
    card.dataset.id = String(r.id);
    
    var statusClass = r.is_active ? 'restriction-status-active' : 'restriction-status-inactive';
    var statusText = r.is_active ? 'Active' : 'Inactive';
    var statusIcon = r.is_active ? '🔒' : '🔓';
    
    var remainingTime = '';
    if (r.is_active && r.remaining_time_human) {
      remainingTime = '<div class="restriction-remaining">' + escapeHtml(r.remaining_time_human) + ' remaining</div>';
    }
    
    var userDisplay = r.user_display_name || 'Unknown User';
    var userIdentifier = r.user_identifier ? ' (' + r.user_identifier + ')' : '';
    var detailSummary = r.is_active && r.remaining_time_human
      ? '<div class="restriction-card-summary">' + escapeHtml(r.remaining_time_human) + ' remaining</div>'
      : '<div class="restriction-card-summary">Ended ' + formatDate(r.restriction_end) + '</div>';
    
    card.innerHTML =
      '<div class="restriction-card-header">' +
      '<div class="restriction-card-user">' +
      '<h3 class="restriction-card-username">' + escapeHtml(userDisplay) + escapeHtml(userIdentifier) + '</h3>' +
      '<span class="restriction-status ' + statusClass + '">' + statusIcon + ' ' + statusText + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="restriction-card-body">' +
      detailSummary +
      '</div>' +
      '<div class="restriction-card-actions">' +
      (r.is_active ? '<button type="button" class="btn-sm btn-modify-restriction">Modify</button>' : '') +
      (r.is_active ? '<button type="button" class="btn-sm btn-remove-restriction btn-danger">Remove</button>' : '') +
      '<button type="button" class="btn-sm btn-view-restriction">View Details</button>' +
      '</div>' +
      '<p class="restriction-card-error hidden error-msg"></p>';
    
    // Add event listeners
    var modifyBtn = card.querySelector('.btn-modify-restriction');
    if (modifyBtn) {
      modifyBtn.addEventListener('click', function () {
        openModifyRestrictionModal(r);
      });
    }
    
    var removeBtn = card.querySelector('.btn-remove-restriction');
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        openRemoveRestrictionModal(r);
      });
    }
    
    var viewBtn = card.querySelector('.btn-view-restriction');
    if (viewBtn) {
      viewBtn.addEventListener('click', function () {
        openRestrictionDetailsModal(r);
      });
    }
    
    return card;
  }

  // Add event listeners for restrictions filter and sort
  var restrictionsFilterEl = document.getElementById('restrictions-filter');
  var restrictionsSortEl = document.getElementById('restrictions-sort');
  var restrictionsSearchEl = document.getElementById('restrictions-search');
  setupIconSelect('restrictions-filter-toggle', 'restrictions-filter');
  setupIconSelect('restrictions-sort-toggle', 'restrictions-sort');
  
  if (restrictionsFilterEl) {
    restrictionsFilterEl.addEventListener('change', function() {
      restrictionsFilter = restrictionsFilterEl.value;
      if (tabLoaded['tab-users']) {
        loadRestrictions();
      }
    });
  }
  
  if (restrictionsSortEl) {
    restrictionsSortEl.addEventListener('change', function() {
      restrictionsSort = restrictionsSortEl.value;
      if (tabLoaded['tab-users']) {
        loadRestrictions();
      }
    });
  }
  
  if (restrictionsSearchEl) {
    restrictionsSearchEl.addEventListener('input', function() {
      restrictionSearchQuery = restrictionsSearchEl.value.trim();
      renderRestrictions();
    });
  }

  // Submissions with tabs
  var submissionsSort = 'newest';
  var currentSubmissionTab = 'pending';
  var pendingSubmissions = [];
  var approvedSubmissions = [];
  var submissionsTabs = document.querySelector('#section-submissions .admin-section-tabs');

  function loadSubmissions() {
    var statusEl = document.getElementById('submissions-status');
    var listEl = document.getElementById('submissions-list');
    statusEl.textContent = 'Loading...'; listEl.innerHTML = '';
    
    // Load both pending and approved
    Promise.all([
      api('/api/admin/submissions?user_id=' + currentUser.user_id + '&status=Pending Review'),
      api('/api/admin/submissions?user_id=' + currentUser.user_id + '&status=Approved')
    ]).then(function(results) {
      pendingSubmissions = results[0] || [];
      approvedSubmissions = results[1] || [];
      statusEl.textContent = '';
      renderSubmissionTab(currentSubmissionTab);
    }).catch(function (e) { statusEl.textContent = 'Error: ' + e.message; });
  }

  function loadApprovedSubmissions() {
    loadSubmissions();
  }

  function setupIconSelect(toggleId, selectId, onChange) {
    var toggle = document.getElementById(toggleId);
    var select = document.getElementById(selectId);
    var wrap = select ? select.closest('.admin-sort-wrap') : null;
    if (!toggle || !select || !wrap) return;
    var menu = document.createElement('div');
    menu.className = 'admin-select-menu hidden';
    Array.prototype.forEach.call(select.options, function(option) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'admin-select-menu-item';
      item.dataset.value = option.value;
      item.textContent = option.textContent;
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        select.value = option.value;
        Array.prototype.forEach.call(menu.querySelectorAll('.admin-select-menu-item'), function(btn) {
          btn.classList.toggle('active', btn.dataset.value === select.value);
        });
        wrap.classList.remove('is-open');
        menu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
        if (typeof onChange === 'function') onChange(select.value);
        select.dispatchEvent(new Event('change'));
      });
      menu.appendChild(item);
    });
    wrap.appendChild(menu);
    function closeMenu() {
      wrap.classList.remove('is-open');
      menu.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = !wrap.classList.contains('is-open');
      document.querySelectorAll('.admin-sort-wrap.is-open').forEach(function(openWrap) {
        openWrap.classList.remove('is-open');
        var openMenu = openWrap.querySelector('.admin-select-menu');
        var openToggle = openWrap.querySelector('.admin-sort-toggle');
        if (openMenu) openMenu.classList.add('hidden');
        if (openToggle) openToggle.setAttribute('aria-expanded', 'false');
      });
      wrap.classList.toggle('is-open', isOpen);
      menu.classList.toggle('hidden', !isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      Array.prototype.forEach.call(menu.querySelectorAll('.admin-select-menu-item'), function(btn) {
        btn.classList.toggle('active', btn.dataset.value === select.value);
      });
    });
    document.addEventListener('click', function(e) {
      if (!wrap.contains(e.target)) closeMenu();
    });
  }

  var sortSelect = document.getElementById('submissions-sort');
  setupIconSelect('submissions-sort-toggle', 'submissions-sort', function(value) {
    submissionsSort = value;
    renderSubmissionTab(currentSubmissionTab);
  });

  // Tab switching
  document.querySelectorAll('.admin-section-tab[data-status]').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.admin-section-tab[data-status]').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentSubmissionTab = tab.dataset.status;
      if (submissionsTabs) submissionsTabs.dataset.active = currentSubmissionTab;
      renderSubmissionTab(currentSubmissionTab);
    });
  });

  function renderSubmissionTab(tab) {
    var listEl = document.getElementById('submissions-list');
    listEl.innerHTML = '';
    var rows = (tab === 'pending' ? pendingSubmissions : approvedSubmissions).slice();
    if (submissionsSort === 'oldest') rows.sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    else rows.sort(function (a, b) { return a.created_at > b.created_at ? -1 : 1; });
    if (rows.length === 0) {
      listEl.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-muted);">' + (tab === 'pending' ? 'No pending submissions.' : 'No approved submissions.') + '</p>';
    } else {
      rows.forEach(function (s) { listEl.appendChild(renderSubmissionCard(s, tab === 'approved')); });
    }
  }

  function renderSubmissions() {
    renderSubmissionTab(currentSubmissionTab);
  }

  function renderApprovedSubmissions() {
    renderSubmissionTab(currentSubmissionTab);
  }

  function statusBadgeClass(status) { if (status === 'Approved') return 'badge-approved'; if (status === 'Rejected') return 'badge-rejected'; return 'badge-pending'; }

  function renderSubmissionCard(s, isApproved) {
    var card = document.createElement('div'); card.className = 'submission-card'; card.dataset.id = String(s.id);
    var previewText = stripHtml(s.content_preview || '');
    var isDocumentOnly = s.document_url && !previewText;
    var displayPreview = isDocumentOnly ? 'Content submitted via document' : previewText;
    
    var actionsHtml = '';
    if (!isApproved) {
      actionsHtml = '<div class="submission-card-actions">' +
        '<button type="button" class="btn-sm btn-approve"' + (s.status === 'Approved' ? ' disabled' : '') + '>Approve</button>' +
        '<button type="button" class="btn-sm btn-reject btn-danger"' + (s.status === 'Rejected' ? ' disabled' : '') + '>Reject</button>' +
        '<button type="button" class="btn-sm btn-pending"' + (s.status === 'Pending Review' ? ' disabled' : '') + '>Set Pending</button>' +
        '</div>';
    }
    
    card.innerHTML =
      '<div class="submission-card-header"><div class="submission-card-meta">' +
      '<h3 class="submission-card-title">' + escapeHtml(s.title) + '</h3>' +
      '<span class="submission-badge ' + statusBadgeClass(s.status) + '">' + escapeHtml(s.status) + '</span></div>' +
      '<div class="submission-card-info"><span>&#9998; ' + escapeHtml(s.author_name) + '</span><span class="submission-card-sep">&middot;</span><span>' + escapeHtml(s.category) + '</span><span class="submission-card-sep">&middot;</span><span>' + escapeHtml(formatDate(s.created_at)) + '</span></div></div>' +
      '<p class="submission-card-preview' + (isDocumentOnly ? ' hint' : '') + '">' + escapeHtml(displayPreview) + (!isDocumentOnly && previewText.length >= 200 ? '...' : '') + '</p>' +
      (s.document_url ? '<p class="submission-card-doc"><a href="' + escapeHtml(s.document_url) + '" target="_blank" rel="noopener">📄 ' + escapeHtml(s.document_name || 'Attached document') + '</a></p>' : '') +
      actionsHtml +
      '<p class="submission-card-error hidden error-msg"></p>';

    // Whole card opens modal; action buttons stop propagation
    card.addEventListener('click', function (e) {
      if (e.target.closest('.submission-card-actions')) return;
      var contentToShow = isDocumentOnly ? '<p style="text-align:center;color:#888;font-style:italic;padding:2rem;">Content submitted via document</p>' : (s.content_full || s.content_preview || '');
      openContentModal(s.title, s.author_name, s.category, formatDate(s.created_at), contentToShow, s.document_url, s.document_name);
    });

    // Only add action button event listeners if not approved
    if (!isApproved) {
      function updateStatus(newStatus) {
        var errorEl = card.querySelector('.submission-card-error'); errorEl.classList.add('hidden');
        api('/api/admin/submissions/' + s.id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id, status: newStatus }) })
          .then(function (updated) {
            s.status = updated.status;
            var badge = card.querySelector('.submission-badge'); badge.textContent = updated.status; badge.className = 'submission-badge ' + statusBadgeClass(updated.status);
            card.querySelector('.btn-approve').disabled = updated.status === 'Approved';
            card.querySelector('.btn-reject').disabled = updated.status === 'Rejected';
            card.querySelector('.btn-pending').disabled = updated.status === 'Pending Review';
            
            // If approved, reload both sections to move the item
            if (updated.status === 'Approved') {
              loadSubmissions();
              if (tabLoaded['tab-approved']) {
                loadApprovedSubmissions();
              }
            }
          })
          .catch(function (e) { errorEl.textContent = e.message || 'Could not update.'; errorEl.classList.remove('hidden'); });
      }
      card.querySelector('.btn-approve').addEventListener('click', function () { updateStatus('Approved'); });
      card.querySelector('.btn-reject').addEventListener('click', function () { updateStatus('Rejected'); });
      card.querySelector('.btn-pending').addEventListener('click', function () { updateStatus('Pending Review'); });
    }
    return card;
  }

  // Reports
  function loadReports() {
    var statusEl = document.getElementById('reports-status'), listEl = document.getElementById('reports-list');
    var filterSelect = document.getElementById('reports-filter');
    var sortSelect = document.getElementById('reports-sort');
    var reasonFilter = filterSelect ? filterSelect.value : 'all';
    var sortOrder = sortSelect ? sortSelect.value : 'count_desc';
    
    statusEl.textContent = 'Loading...'; listEl.innerHTML = '';
    var url = '/api/admin/reports?user_id=' + currentUser.user_id;
    if (reasonFilter && reasonFilter !== 'all') {
      url += '&reason=' + encodeURIComponent(reasonFilter);
    }
    if (sortOrder) {
      url += '&sort=' + encodeURIComponent(sortOrder);
    }
    
    api(url)
      .then(function (groups) { statusEl.textContent = groups.length ? '' : 'No reports found.'; groups.forEach(function (g) { listEl.appendChild(renderReportGroup(g)); }); })
      .catch(function (e) { statusEl.textContent = 'Error: ' + e.message; });
  }

  // Add event listeners for reports filter and sort
  var reportsFilter = document.getElementById('reports-filter');
  var reportsSort = document.getElementById('reports-sort');
  setupIconSelect('reports-filter-toggle', 'reports-filter');
  setupIconSelect('reports-sort-toggle', 'reports-sort');
  if (reportsFilter) {
    reportsFilter.addEventListener('change', function() {
      if (tabLoaded['tab-reports']) {
        loadReports();
      }
    });
  }
  if (reportsSort) {
    reportsSort.addEventListener('change', function() {
      if (tabLoaded['tab-reports']) {
        loadReports();
      }
    });
  }

  function renderReportGroup(g) {
    var group = document.createElement('div'); group.className = 'report-group';
    var previewText = g.target_deleted ? 'Content already removed' : (g.target_content_preview || '(no preview)');
    
    // Get user info from the target
    var userInfo = '';
    if (g.target_user_id && g.target_user_name) {
      userInfo = '<div class="report-user-info">User: <strong>' + escapeHtml(g.target_user_name) + '</strong> (ID: ' + escapeHtml(g.target_user_id) + ')</div>';
    }
    
    // Use primary reason for display instead of user
    var primaryReason = g.primary_reason || g.reports[0]?.reason || 'Unknown';
    var reasonDisplayMap = {
      'spam': '🚫 Spam',
      'harassment': '😠 Harassment', 
      'inappropriate': '⚠️ Inappropriate',
      'bullying': '👊 Bullying',
      'other': '❓ Other'
    };
    var reasonDisplay = reasonDisplayMap[primaryReason] || '❓ ' + primaryReason;
    var reasonClass = 'report-type-' + primaryReason;
    
    group.innerHTML =
      '<div class="report-group-header">' +
      '<div class="report-group-info">' +
      '<div class="report-group-main">' +
      '<span class="report-target-type ' + reasonClass + '">' + reasonDisplay + '</span>' +
      '<span class="report-count-badge">' + g.report_count + ' report' + (g.report_count !== 1 ? 's' : '') + '</span>' +
      '</div>' +
      userInfo +
      '<div class="report-content-preview' + (g.target_deleted ? ' report-content-deleted' : '') + '"' + (!g.target_deleted ? ' role="button" tabindex="0" title="View reported post"' : '') + '>' + escapeHtml(previewText) + '</div>' +
      '</div>' +
      '<div class="report-group-actions">' +
      '<button type="button" class="btn-sm btn-dismiss-reports">Dismiss</button>' +
      (!g.target_deleted ? '<button type="button" class="btn-sm btn-give-warning">Warn</button>' : '') +
      (!g.target_deleted ? '<button type="button" class="btn-sm btn-delete-content">Delete</button>' : '') +
      '</div>' +
      '</div>' +
      '<p class="report-group-error hidden error-msg"></p>';

    var errorEl = group.querySelector('.report-group-error');
    
    // Click on content preview to view post details
    var contentPreview = group.querySelector('.report-content-preview');
    if (contentPreview && !g.target_deleted) {
      var openReportedContent = function() {
        openAdminPostModal('post', g.target_post_id || g.target_id);
      };
      contentPreview.addEventListener('click', openReportedContent);
      contentPreview.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openReportedContent();
        }
      });
    }
    
    // Dismiss reports
    group.querySelector('.btn-dismiss-reports').addEventListener('click', function (e) {
      e.stopPropagation();
      errorEl.classList.add('hidden');
      Promise.all(g.reports.map(function (r) { return api('/api/admin/reports/' + r.id, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id }) }); }))
        .then(function () { group.remove(); })
        .catch(function (e) { errorEl.textContent = e.message || 'Could not dismiss.'; errorEl.classList.remove('hidden'); });
    });
    
    // Give warning
    var warningBtn = group.querySelector('.btn-give-warning');
    if (warningBtn) {
      warningBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openWarningModal(g.target_type, g.target_id, primaryReason, function() {
          group.remove();
        });
      });
    }
    
    // Delete content
    var deleteBtn = group.querySelector('.btn-delete-content');
    if (deleteBtn) deleteBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openActionModal({
        title: 'Delete Content', message: 'Permanently delete this ' + g.target_type + ' and all its reports?', confirmText: 'Delete', danger: true,
        onConfirm: function (ctx) {
          api('/api/admin/content', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id, target_type: g.target_type, target_id: g.target_id }) })
            .then(function () { ctx.close(); group.remove(); })
            .catch(function (e) { ctx.setError(e.message || 'Could not delete.'); });
        }
      });
    });
    return group;
  }

  // Manage Admins
  var allUsers = [];
  function loadUsers() {
    var statusEl = document.getElementById('users-status'), listEl = document.getElementById('users-list');
    statusEl.textContent = 'Loading...'; listEl.innerHTML = '';
    api('/api/admin/users?user_id=' + currentUser.user_id)
      .then(function (users) { 
        // Fetch restriction status for each user
        var userPromises = users.map(function(user) {
          if (user.role === 'user') {
            return api('/api/restrictions/status/' + user.id + '?user_id=' + currentUser.user_id)
              .then(function(restrictionData) {
                user.restriction_status = restrictionData;
                return user;
              })
              .catch(function() {
                user.restriction_status = { is_restricted: false };
                return user;
              });
          } else {
            user.restriction_status = { is_restricted: false };
            return Promise.resolve(user);
          }
        });
        
        return Promise.all(userPromises);
      })
      .then(function(usersWithRestrictions) {
        allUsers = usersWithRestrictions; 
        statusEl.textContent = ''; 
        renderUsersView(usersWithRestrictions, ''); 
      })
      .catch(function (e) { statusEl.textContent = 'Error: ' + e.message; });
  }
  var usersSearchEl = document.getElementById('users-search');
  if (usersSearchEl) usersSearchEl.addEventListener('input', function () { renderUsersView(allUsers, usersSearchEl.value.trim().toLowerCase()); });
  function renderUsersView(users, query) {
    var listEl = document.getElementById('users-list'); listEl.innerHTML = '';
    var filtered = query ? users.filter(function (u) { return u.display_name.toLowerCase().indexOf(query) !== -1 || (u.user_id && u.user_id.toLowerCase().indexOf(query) !== -1); }) : users;
    if (!filtered.length) { listEl.innerHTML = '<p class="admin-section-status">' + (query ? 'No users match your search.' : 'No users found.') + '</p>'; return; }
    var admins = filtered.filter(function (u) { return u.role === 'main_admin' || u.role === 'co_admin'; });
    var regulars = filtered.filter(function (u) { return u.role === 'user'; });
    if (admins.length) { var ah = document.createElement('p'); ah.className = 'users-section-label'; ah.textContent = 'Current Admins & Moderators'; listEl.appendChild(ah); admins.forEach(function (u) { listEl.appendChild(buildUserRow(u)); }); }
    if (regulars.length) { var rh = document.createElement('p'); rh.className = 'users-section-label'; rh.textContent = query ? 'Other Users' : 'Regular Users'; listEl.appendChild(rh); regulars.forEach(function (u) { listEl.appendChild(buildUserRow(u)); }); }
  }

  function roleBadgeClass(r) { return r === 'main_admin' ? 'role-badge--main-admin' : r === 'co_admin' ? 'role-badge--co-admin' : 'role-badge--user'; }
  function roleBadgeLabel(r) { return r === 'main_admin' ? '&#128081; Admin' : r === 'co_admin' ? '&#128309; Moderator' : '&#9898; User'; }

  function buildUserRow(u) {
    var row = document.createElement('div'); row.className = 'user-row'; row.dataset.userId = String(u.id);
    var actionHtml = '';
    if (u.id !== currentUser.user_id) {
      // Only the top-level admin can see transfer options
      if (currentUser.role === 'main_admin') {
        if (u.role === 'user') {
          actionHtml = '<button type="button" class="btn-sm btn-role-action" data-action="make-co-admin">Make Moderator</button>' +
                      '<button type="button" class="btn-sm btn-role-action btn-danger" data-action="transfer" style="margin-left:0.5rem;">Hand Over Ownership</button>';
        } else if (u.role === 'co_admin') {
          actionHtml = '<button type="button" class="btn-sm btn-role-action" data-action="remove-co-admin">Remove Moderator</button>' +
                      '<button type="button" class="btn-sm btn-role-action btn-danger" data-action="transfer" style="margin-left:0.5rem;">Hand Over Ownership</button>';
        }
      } else {
        // Moderators can only manage regular users
        if (u.role === 'user') actionHtml = '<button type="button" class="btn-sm btn-role-action" data-action="make-co-admin">Make Moderator</button>';
        else if (u.role === 'co_admin') actionHtml = '<button type="button" class="btn-sm btn-role-action" data-action="remove-co-admin">Remove Moderator</button>';
      }
      
    }
    
    // Check if user has active restriction
    var restrictionStatus = '';
    if (u.restriction_status && u.restriction_status.is_restricted) {
      var remainingTime = u.restriction_status.remaining_time_human || 'Unknown';
      restrictionStatus = '<div class="user-restriction-status">🔒 Restricted (' + escapeHtml(remainingTime) + ' remaining)</div>';
    }
    
    row.innerHTML =
      '<div class="user-row-info">' +
      '<span class="user-row-name">' + escapeHtml(u.display_name) + '</span>' +
      '<span class="user-row-email">' + escapeHtml(u.user_id || 'No ID') + '</span>' +
      restrictionStatus +
      '</div>' +
      '<div class="user-row-badges"><span class="role-badge ' + roleBadgeClass(u.role) + '">' + roleBadgeLabel(u.role) + '</span>' +
      (u.id === currentUser.user_id ? '<span class="user-row-you">(you)</span>' : '') + '</div>' +
      '<div class="user-row-action">' + actionHtml + '</div>';
    
    var btns = row.querySelectorAll('.btn-role-action');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function () {
        var a = btn.dataset.action;
        if (a === 'make-co-admin') doRoleChange(u, 'co_admin', row);
        else if (a === 'remove-co-admin') doRoleChange(u, 'user', row);
        else if (a === 'transfer') doTransferOwnership(u);
      });
    });
    
    return row;
  }

  function doRoleChange(u, newRole, row) {
    api('/api/admin/users/' + u.id + '/role', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id, role: newRole }) })
      .then(function (updated) { u.role = updated.role; var q = usersSearchEl ? usersSearchEl.value.trim().toLowerCase() : ''; renderUsersView(allUsers, q); })
      .catch(function (e) { alert('Error: ' + (e.message || 'Could not update role.')); });
  }

  function openUserRestrictionsModal(user) {
    if (!restrictionDetailsModal) return;
    
    var contentEl = document.getElementById('restriction-details-content');
    var actionsEl = document.getElementById('restriction-details-actions');
    var errorEl = document.getElementById('restriction-details-modal-error');
    
    errorEl.classList.add('hidden');
    contentEl.innerHTML = '<p style="text-align:center;padding:2rem;">Loading user restrictions...</p>';
    
    // Set up modal header
    var modalTitle = document.querySelector('#restriction-details-modal .restriction-modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'User Restrictions - ' + (user.display_name || 'Unknown User');
    }
    
    restrictionDetailsModal.classList.remove('hidden');
    restrictionDetailsModal.setAttribute('aria-hidden', 'false');
    
    // Load user's restrictions
    api('/api/admin/restrictions?user_id=' + currentUser.user_id + '&target_user_id=' + user.id)
      .then(function(data) {
        var restrictions = data.restrictions || [];
        var activeRestrictions = restrictions.filter(function(r) { return r.is_active; });
        var inactiveRestrictions = restrictions.filter(function(r) { return !r.is_active; });
        
        var userDisplay = user.display_name || 'Unknown User';
        var userIdentifier = user.user_id ? ' (' + user.user_id + ')' : '';
        
        var html = '<div class="user-restrictions-overview">' +
                  '<h4>' + escapeHtml(userDisplay) + escapeHtml(userIdentifier) + '</h4>' +
                  '<div class="user-restrictions-summary">' +
                  '<div class="restriction-summary-item">' +
                  '<strong>Total Restrictions:</strong> ' + restrictions.length +
                  '</div>' +
                  '<div class="restriction-summary-item">' +
                  '<strong>Active Restrictions:</strong> ' + activeRestrictions.length +
                  '</div>' +
                  '</div>' +
                  '</div>';
        
        if (activeRestrictions.length > 0) {
          html += '<div class="user-restrictions-section">' +
                 '<h5>Active Restrictions</h5>';
          
          activeRestrictions.forEach(function(r) {
            var remainingTime = r.remaining_time_human || 'Unknown';
            var adminName = r.admin_display_name || 'System';
            
            html += '<div class="user-restriction-item active">' +
                   '<div class="restriction-item-header">' +
                   '<span class="restriction-item-status">🔒 Active</span>' +
                   '<span class="restriction-item-count">#' + r.restriction_count + '</span>' +
                   '</div>' +
                   '<div class="restriction-item-details">' +
                   '<div><strong>Remaining:</strong> ' + escapeHtml(remainingTime) + '</div>' +
                   '<div><strong>End Time:</strong> ' + formatDate(r.restriction_end) + '</div>' +
                   '<div><strong>Created By:</strong> ' + escapeHtml(adminName) + '</div>' +
                   '</div>' +
                   '<div class="restriction-item-actions">' +
                   '<button type="button" class="btn-sm btn-modify-user-restriction" data-restriction-id="' + r.id + '">Modify</button>' +
                   '<button type="button" class="btn-sm btn-remove-user-restriction btn-danger" data-restriction-id="' + r.id + '">Remove</button>' +
                   '</div>' +
                   '</div>';
          });
          
          html += '</div>';
        }
        
        if (inactiveRestrictions.length > 0) {
          html += '<div class="user-restrictions-section">' +
                 '<h5>Restriction History</h5>';
          
          inactiveRestrictions.slice(0, 5).forEach(function(r) {
            var adminName = r.admin_display_name || 'System';
            var deactivatedText = r.deactivated_at ? 'Removed ' + formatDate(r.deactivated_at) : 'Expired ' + formatDate(r.restriction_end);
            
            html += '<div class="user-restriction-item inactive">' +
                   '<div class="restriction-item-header">' +
                   '<span class="restriction-item-status">🔓 ' + deactivatedText + '</span>' +
                   '<span class="restriction-item-count">#' + r.restriction_count + '</span>' +
                   '</div>' +
                   '<div class="restriction-item-details">' +
                   '<div><strong>Duration:</strong> ' + formatDate(r.restriction_start) + ' to ' + formatDate(r.restriction_end) + '</div>' +
                   '<div><strong>Created By:</strong> ' + escapeHtml(adminName) + '</div>' +
                   '</div>' +
                   '</div>';
          });
          
          if (inactiveRestrictions.length > 5) {
            html += '<p class="restriction-history-note">Showing 5 most recent. Total: ' + inactiveRestrictions.length + '</p>';
          }
          
          html += '</div>';
        }
        
        if (restrictions.length === 0) {
          html += '<div class="user-restrictions-empty">' +
                 '<p>This user has no restriction history.</p>' +
                 '</div>';
        }
        
        contentEl.innerHTML = html;
        
        // Set up actions
        var actionsHtml = '<button type="button" class="btn-sm" style="background:#dc2626;color:white;border-color:#dc2626;" id="user-restrictions-create">Create Restriction</button>' +
                         '<button type="button" id="user-restrictions-close" class="btn-sm">Close</button>';
        
        actionsEl.innerHTML = actionsHtml;
        
        // Add event listeners
        var closeBtn = document.getElementById('user-restrictions-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', function() {
            restrictionDetailsModal.classList.add('hidden');
            restrictionDetailsModal.setAttribute('aria-hidden', 'true');
          });
        }
        
        var createBtn = document.getElementById('user-restrictions-create');
        if (createBtn) {
          createBtn.addEventListener('click', function() {
            restrictionDetailsModal.classList.add('hidden');
            restrictionDetailsModal.setAttribute('aria-hidden', 'true');
            
            // Pre-fill the create restriction modal with this user
            openCreateRestrictionModal();
            setTimeout(function() {
              var userSearchEl = document.getElementById('restriction-user-search');
              var selectedUserIdEl = document.getElementById('restriction-selected-user-id');
              if (userSearchEl && selectedUserIdEl) {
                userSearchEl.value = user.display_name || 'Unknown User';
                selectedUserIdEl.value = user.id;
                document.getElementById('restriction-user-results').classList.add('hidden');
              }
            }, 100);
          });
        }
        
        // Add handlers for modify/remove buttons
        contentEl.querySelectorAll('.btn-modify-user-restriction').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var restrictionId = btn.dataset.restrictionId;
            var restriction = restrictions.find(function(r) { return r.id == restrictionId; });
            if (restriction) {
              restrictionDetailsModal.classList.add('hidden');
              restrictionDetailsModal.setAttribute('aria-hidden', 'true');
              openModifyRestrictionModal(restriction);
            }
          });
        });
        
        contentEl.querySelectorAll('.btn-remove-user-restriction').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var restrictionId = btn.dataset.restrictionId;
            var restriction = restrictions.find(function(r) { return r.id == restrictionId; });
            if (restriction) {
              restrictionDetailsModal.classList.add('hidden');
              restrictionDetailsModal.setAttribute('aria-hidden', 'true');
              openRemoveRestrictionModal(restriction);
            }
          });
        });
        
      })
      .catch(function(e) {
        contentEl.innerHTML = '<p style="text-align:center;padding:2rem;color:#dc2626;">Error loading restrictions: ' + 
                             escapeHtml(e.message || 'Unknown error') + '</p>';
        
        actionsEl.innerHTML = '<button type="button" id="user-restrictions-close-error" class="btn-sm">Close</button>';
        
        var closeBtn = document.getElementById('user-restrictions-close-error');
        if (closeBtn) {
          closeBtn.addEventListener('click', function() {
            restrictionDetailsModal.classList.add('hidden');
            restrictionDetailsModal.setAttribute('aria-hidden', 'true');
          });
        }
      });
  }

  function doTransferOwnership(u) {
    // First check cooldown status
    api('/api/admin/transfer-cooldown?user_id=' + currentUser.user_id)
      .then(function (cooldownData) {
        if (!cooldownData.can_transfer) {
          openActionModal({
            title: 'Transfer Cooldown Active',
            message: 'You must wait ' + cooldownData.cooldown_remaining_hours + ' more hours before transferring ownership again.',
            confirmText: 'OK',
            onConfirm: function (ctx) { ctx.close(); }
          });
          return;
        }
        
        // Proceed with transfer
        openActionModal({
          title: 'Hand Over Ownership',
          message: 'Transfer Admin ownership to ' + u.display_name + '? You will become a regular user and lose all admin access. There is a 24-hour cooldown before ownership can be transferred again.',
          confirmText: 'Hand Over', danger: true,
          onConfirm: function (ctx) {
            api('/api/admin/transfer-ownership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.user_id, target_user_id: u.id }) })
              .then(function () {
                ctx.close();
                currentUser.role = 'user';
                try { var s = JSON.parse((window.AuthSession ? window.AuthSession.getRaw() : sessionStorage.getItem(STORAGE_KEY)) || '{}'); s.role = 'user'; (window.AuthSession ? window.AuthSession.set(s) : sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s))); } catch (e) {}
                window.location.href = '/wall';
              })
              .catch(function (e) { ctx.setError(e.message || 'Could not transfer.'); });
          }
        });
      })
      .catch(function (e) {
        openActionModal({
          title: 'Error',
          message: 'Could not check transfer status: ' + (e.message || 'Unknown error'),
          confirmText: 'OK',
          onConfirm: function (ctx) { ctx.close(); }
        });
      });
  }

  activateSection('tab-submissions');

  // Restriction Management Modals
  var restrictionModal = document.getElementById('restriction-modal');
  var restrictionDetailsModal = document.getElementById('restriction-details-modal');
  
  // Create Restriction Modal
  function openCreateRestrictionModal() {
    if (!restrictionModal) return;
    
    // Reset form
    document.getElementById('restriction-user-search').value = '';
    document.getElementById('restriction-selected-user-id').value = '';
    document.getElementById('restriction-duration').value = '1';
    document.getElementById('restriction-custom-days').value = '';
    document.getElementById('restriction-reason').value = '';
    document.getElementById('restriction-modal-error').textContent = '';
    document.getElementById('restriction-modal-error').classList.add('hidden');
    document.getElementById('restriction-custom-duration-field').classList.add('hidden');
    document.getElementById('restriction-user-results').classList.add('hidden');
    
    restrictionModal.classList.remove('hidden');
    restrictionModal.setAttribute('aria-hidden', 'false');
    document.getElementById('restriction-user-search').focus();
  }
  
  function closeCreateRestrictionModal() {
    if (restrictionModal) {
      restrictionModal.classList.add('hidden');
      restrictionModal.setAttribute('aria-hidden', 'true');
    }
  }
  
  // User search functionality
  var userSearchTimeout;
  var userSearchEl = document.getElementById('restriction-user-search');
  var userResultsEl = document.getElementById('restriction-user-results');
  var selectedUserIdEl = document.getElementById('restriction-selected-user-id');
  
  if (userSearchEl) {
    userSearchEl.addEventListener('input', function() {
      var query = userSearchEl.value.trim();
      clearTimeout(userSearchTimeout);
      
      if (query.length < 2) {
        userResultsEl.classList.add('hidden');
        selectedUserIdEl.value = '';
        return;
      }
      
      userSearchTimeout = setTimeout(function() {
        searchUsers(query);
      }, 300);
    });
  }
  
  function searchUsers(query) {
    api('/api/admin/users?user_id=' + currentUser.user_id)
      .then(function(users) {
        var filtered = users.filter(function(u) {
          return (u.display_name && u.display_name.toLowerCase().indexOf(query.toLowerCase()) !== -1) ||
                 (u.user_id && u.user_id.toLowerCase().indexOf(query.toLowerCase()) !== -1) ||
                 (u.email && u.email.toLowerCase().indexOf(query.toLowerCase()) !== -1);
        });
        
        displayUserResults(filtered.slice(0, 10)); // Limit to 10 results
      })
      .catch(function(e) {
        console.error('User search failed:', e);
      });
  }
  
  function displayUserResults(users) {
    if (!userResultsEl) return;
    
    if (users.length === 0) {
      userResultsEl.innerHTML = '<div class="restriction-user-result">No users found</div>';
      userResultsEl.classList.remove('hidden');
      return;
    }
    
    var html = users.map(function(u) {
      var displayName = u.display_name || 'Unknown';
      var identifier = u.user_id ? ' (' + u.user_id + ')' : '';
      var email = u.email ? ' - ' + u.email : '';
      
      return '<div class="restriction-user-result" data-user-id="' + u.id + '" data-display-name="' + 
             escapeHtml(displayName) + '">' + escapeHtml(displayName) + escapeHtml(identifier) + 
             '<span class="restriction-user-email">' + escapeHtml(email) + '</span></div>';
    }).join('');
    
    userResultsEl.innerHTML = html;
    userResultsEl.classList.remove('hidden');
    
    // Add click handlers
    userResultsEl.querySelectorAll('.restriction-user-result').forEach(function(result) {
      result.addEventListener('click', function() {
        var userId = result.dataset.userId;
        var displayName = result.dataset.displayName;
        
        if (userId && displayName) {
          userSearchEl.value = displayName;
          selectedUserIdEl.value = userId;
          userResultsEl.classList.add('hidden');
        }
      });
    });
  }
  
  // Duration selection
  var durationSelect = document.getElementById('restriction-duration');
  var customDurationField = document.getElementById('restriction-custom-duration-field');
  
  if (durationSelect) {
    durationSelect.addEventListener('change', function() {
      if (durationSelect.value === 'custom') {
        customDurationField.classList.remove('hidden');
      } else {
        customDurationField.classList.add('hidden');
      }
    });
  }
  
  // Modal event listeners
  var createRestrictionBtn = document.getElementById('btn-create-restriction');
  var restrictionModalClose = document.getElementById('restriction-modal-close');
  var restrictionModalCancel = document.getElementById('restriction-modal-cancel');
  var restrictionModalCreate = document.getElementById('restriction-modal-create');
  
  if (createRestrictionBtn) {
    createRestrictionBtn.addEventListener('click', openCreateRestrictionModal);
  }
  
  if (restrictionModalClose) {
    restrictionModalClose.addEventListener('click', closeCreateRestrictionModal);
  }
  
  if (restrictionModalCancel) {
    restrictionModalCancel.addEventListener('click', closeCreateRestrictionModal);
  }
  
  if (restrictionModal) {
    restrictionModal.addEventListener('click', function(e) {
      if (e.target === restrictionModal) {
        closeCreateRestrictionModal();
      }
    });
  }
  
  if (restrictionModalCreate) {
    restrictionModalCreate.addEventListener('click', function() {
      createRestriction();
    });
  }
  
  function createRestriction() {
    var errorEl = document.getElementById('restriction-modal-error');
    var userId = selectedUserIdEl.value;
    var duration = durationSelect.value;
    var customDays = document.getElementById('restriction-custom-days').value;
    var reason = document.getElementById('restriction-reason').value.trim();
    
    errorEl.classList.add('hidden');
    
    // Validation
    if (!userId) {
      errorEl.textContent = 'Please select a user.';
      errorEl.classList.remove('hidden');
      return;
    }
    
    var durationDays;
    if (duration === 'custom') {
      durationDays = parseInt(customDays);
      if (!durationDays || durationDays < 1 || durationDays > 365) {
        errorEl.textContent = 'Custom duration must be between 1 and 365 days.';
        errorEl.classList.remove('hidden');
        return;
      }
    } else {
      durationDays = parseInt(duration);
    }
    
    if (!reason) {
      errorEl.textContent = 'Please provide a reason for the restriction.';
      errorEl.classList.remove('hidden');
      return;
    }
    
    // Create restriction
    api('/api/admin/restrictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_user_id: currentUser.user_id,
        user_id: parseInt(userId),
        duration_days: durationDays,
        reason: reason
      })
    })
    .then(function() {
      closeCreateRestrictionModal();
      if (tabLoaded['tab-users']) {
        loadRestrictions();
      }
    })
    .catch(function(e) {
      errorEl.textContent = e.message || 'Could not create restriction.';
      errorEl.classList.remove('hidden');
    });
  }
  
  // Restriction Details Modal
  function openRestrictionDetailsModal(restriction) {
    if (!restrictionDetailsModal) return;
    
    var contentEl = document.getElementById('restriction-details-content');
    var actionsEl = document.getElementById('restriction-details-actions');
    var errorEl = document.getElementById('restriction-details-modal-error');
    
    errorEl.classList.add('hidden');
    
    var userDisplay = restriction.user_display_name || 'Unknown User';
    var userIdentifier = restriction.user_identifier ? ' (' + restriction.user_identifier + ')' : '';
    var adminDisplay = restriction.admin_display_name || 'System';
    
    var statusIcon = restriction.is_active ? '🔒' : '🔓';
    var statusText = restriction.is_active ? 'Active' : 'Inactive';
    var statusClass = restriction.is_active ? 'restriction-status-active' : 'restriction-status-inactive';
    
    var remainingInfo = '';
    if (restriction.is_active && restriction.remaining_time_human) {
      remainingInfo = '<div class="restriction-detail-row"><strong>Remaining Time:</strong> ' + 
                     escapeHtml(restriction.remaining_time_human) + '</div>';
    }
    
    var deactivatedInfo = '';
    if (restriction.deactivated_at) {
      deactivatedInfo = '<div class="restriction-detail-row"><strong>Deactivated:</strong> ' + 
                       formatDate(restriction.deactivated_at) + '</div>';
    }
    
    contentEl.innerHTML =
      '<div class="restriction-details-header">' +
      '<h4>' + escapeHtml(userDisplay) + escapeHtml(userIdentifier) + '</h4>' +
      '<span class="restriction-status ' + statusClass + '">' + statusIcon + ' ' + statusText + '</span>' +
      '</div>' +
      '<div class="restriction-details-body">' +
      '<div class="restriction-detail-row"><strong>Restriction ID:</strong> #' + restriction.id + '</div>' +
      '<div class="restriction-detail-row"><strong>Restriction Count:</strong> #' + restriction.restriction_count + '</div>' +
      '<div class="restriction-detail-row"><strong>Start Time:</strong> ' + formatDate(restriction.restriction_start) + '</div>' +
      '<div class="restriction-detail-row"><strong>End Time:</strong> ' + formatDate(restriction.restriction_end) + '</div>' +
      remainingInfo +
      '<div class="restriction-detail-row"><strong>Created By:</strong> ' + escapeHtml(adminDisplay) + '</div>' +
      '<div class="restriction-detail-row"><strong>Created At:</strong> ' + formatDate(restriction.created_at) + '</div>' +
      deactivatedInfo +
      '</div>';
    
    // Set up actions
    var actionsHtml = '<button type="button" id="restriction-details-close" class="btn-sm">Close</button>';
    if (restriction.is_active) {
      actionsHtml = '<button type="button" id="restriction-details-modify" class="btn-sm">Modify</button>' +
                   '<button type="button" id="restriction-details-remove" class="btn-sm btn-danger">Remove</button>' +
                   '<button type="button" id="restriction-details-close" class="btn-sm">Close</button>';
    }
    
    actionsEl.innerHTML = actionsHtml;
    
    // Add event listeners
    var closeBtn = document.getElementById('restriction-details-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        restrictionDetailsModal.classList.add('hidden');
        restrictionDetailsModal.setAttribute('aria-hidden', 'true');
      });
    }
    
    var modifyBtn = document.getElementById('restriction-details-modify');
    if (modifyBtn) {
      modifyBtn.addEventListener('click', function() {
        restrictionDetailsModal.classList.add('hidden');
        restrictionDetailsModal.setAttribute('aria-hidden', 'true');
        openModifyRestrictionModal(restriction);
      });
    }
    
    var removeBtn = document.getElementById('restriction-details-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', function() {
        restrictionDetailsModal.classList.add('hidden');
        restrictionDetailsModal.setAttribute('aria-hidden', 'true');
        openRemoveRestrictionModal(restriction);
      });
    }
    
    restrictionDetailsModal.classList.remove('hidden');
    restrictionDetailsModal.setAttribute('aria-hidden', 'false');
  }
  
  // Close details modal when clicking outside
  if (restrictionDetailsModal) {
    restrictionDetailsModal.addEventListener('click', function(e) {
      if (e.target === restrictionDetailsModal) {
        restrictionDetailsModal.classList.add('hidden');
        restrictionDetailsModal.setAttribute('aria-hidden', 'true');
      }
    });
  }
  
  var restrictionDetailsClose = document.getElementById('restriction-details-modal-close');
  if (restrictionDetailsClose) {
    restrictionDetailsClose.addEventListener('click', function() {
      restrictionDetailsModal.classList.add('hidden');
      restrictionDetailsModal.setAttribute('aria-hidden', 'true');
    });
  }
  
  // Modify Restriction Modal
  function openModifyRestrictionModal(restriction) {
    var currentEndTime = new Date(restriction.restriction_end);
    var now = new Date();
    
    // Calculate minimum date (current time + 1 hour)
    var minDate = new Date(now.getTime() + 60 * 60 * 1000);
    var minDateStr = minDate.toISOString().slice(0, 16);
    
    // Format current end time for datetime-local input
    var currentEndStr = currentEndTime.toISOString().slice(0, 16);
    
    openActionModal({
      title: 'Modify Restriction',
      message: 'Modify the end time for ' + (restriction.user_display_name || 'this user') + '\'s restriction:',
      showInput: true,
      initialValue: currentEndStr,
      confirmText: 'Update',
      onConfirm: function(ctx) {
        var newEndTime = ctx.value.trim();
        if (!newEndTime) {
          ctx.setError('Please select a new end time.');
          return;
        }
        
        var newEndDate = new Date(newEndTime);
        if (newEndDate <= now) {
          ctx.setError('End time must be in the future.');
          return;
        }
        
        api('/api/admin/restrictions/' + restriction.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_user_id: currentUser.user_id,
            new_end_time: newEndDate.toISOString(),
            reason: 'Modified via admin panel'
          })
        })
        .then(function() {
          ctx.close();
          if (tabLoaded['tab-users']) {
            loadRestrictions();
          }
        })
        .catch(function(e) {
          ctx.setError(e.message || 'Could not modify restriction.');
        });
      }
    });
    
    // Convert input to datetime-local after modal opens
    setTimeout(function() {
      var input = document.getElementById('action-modal-input');
      if (input) {
        input.type = 'datetime-local';
        input.min = minDateStr;
        input.value = currentEndStr;
      }
    }, 100);
  }
  
  // Remove Restriction Modal
  function openRemoveRestrictionModal(restriction) {
    openActionModal({
      title: 'Remove Restriction',
      message: 'Are you sure you want to remove the restriction for ' + 
               (restriction.user_display_name || 'this user') + '? This will immediately restore their interaction capabilities.',
      confirmText: 'Remove',
      danger: true,
      onConfirm: function(ctx) {
        api('/api/admin/restrictions/' + restriction.id, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_user_id: currentUser.user_id,
            reason: 'Removed via admin panel'
          })
        })
        .then(function() {
          ctx.close();
          if (tabLoaded['tab-users']) {
            loadRestrictions();
          }
        })
        .catch(function(e) {
          ctx.setError(e.message || 'Could not remove restriction.');
        });
      }
    });
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

    var backToTopBtn = document.getElementById('admin-back-to-top');
    if (backToTopBtn) {
      function syncBackToTop() {
        backToTopBtn.classList.toggle('visible', window.scrollY > 320);
      }
      window.addEventListener('scroll', syncBackToTop, { passive: true });
      backToTopBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      syncBackToTop();
    }
  });
})();



