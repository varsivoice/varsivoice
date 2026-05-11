/**
 * notif.js — shared notification bell for all pages.
 * Requires: currentUser.user_id to be set before calling initNotifications().
 * On pages without a post-modal (non-wall pages), clicking a notification
 * navigates to /wall#post-<id> instead of opening a modal.
 */
(function (global) {
  'use strict';

  var REACTION_EMOJI_MAP = { heart: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function formatNotifTime(iso) {
    try {
      var s = String(iso).trim();
      if (!/[Zz+\-]\d*$/.test(s)) s += 'Z';
      var d = new Date(s);
      var sec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (sec < 60) return 'just now';
      if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
      if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
      return Math.floor(sec / 86400) + 'd ago';
    } catch (e) { return ''; }
  }

  function initNotifications(userId, openPostModalFn) {
    var notifBtn = document.getElementById('notif-btn');
    var notifPanel = document.getElementById('notif-panel');
    var notifBadge = document.getElementById('notif-badge');
    var notifList = document.getElementById('notif-list');
    var notifMarkAll = document.getElementById('notif-mark-all');

    if (!notifBtn || !notifPanel) return;

    function markNotifRead(notifId) {
      fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, notif_id: notifId })
      }).catch(function () {});
    }

    function renderNotifications(notifs) {
      if (!notifList) return;
      if (!notifs.length) {
        notifList.innerHTML = '<p class="notif-empty">No notifications yet.</p>';
        return;
      }
      notifList.innerHTML = '';
      notifs.forEach(function (n) {
        var item = document.createElement('div');
        item.className = 'notif-item' + (n.is_read ? '' : ' notif-unread');
        item.dataset.id = n.id;

        var avatar = n.actor_photo
          ? '<img class="notif-avatar" src="' + escapeHtml(n.actor_photo) + '" alt="" />'
          : '<div class="notif-avatar notif-avatar-initials">' + escapeHtml((n.actor_name || 'Someone').charAt(0).toUpperCase()) + '</div>';

        var snippet = (n.post_snippet || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        if (snippet.length < (n.post_snippet || '').length) snippet += '…';

        var text = '';
        if (n.notif_type === 'comment') {
          text = '<strong>' + escapeHtml(n.actor_name || 'Someone') + '</strong> commented on your post';
          var cs = (n.comment_content || '').replace(/\s+/g, ' ').trim().slice(0, 50);
          if (cs.length < (n.comment_content || '').length) cs += '…';
          if (cs) snippet = cs;
        } else if (n.notif_type === 'reply') {
          text = '<strong>' + escapeHtml(n.actor_name || 'Someone') + '</strong> replied to your comment';
          var rs = (n.comment_content || '').replace(/\s+/g, ' ').trim().slice(0, 50);
          if (rs.length < (n.comment_content || '').length) rs += '…';
          if (rs) snippet = rs;
        } else if (n.notif_type === 'reaction') {
          var emoji = REACTION_EMOJI_MAP[n.reaction_type] || '❤️';
          text = '<strong>' + escapeHtml(n.actor_name || 'Someone') + '</strong> reacted ' + emoji + ' to your ' + (n.comment_id ? 'comment' : 'post');
          if (n.comment_id && n.comment_content) {
            var rxs = (n.comment_content || '').replace(/\s+/g, ' ').trim().slice(0, 50);
            if (rxs.length < (n.comment_content || '').length) rxs += '…';
            if (rxs) snippet = rxs;
          }
        }

        if (snippet) text += ' <span class="notif-snippet">"' + escapeHtml(snippet) + '"</span>';

        item.innerHTML = avatar +
          '<div class="notif-body">' +
          '<p class="notif-text">' + text + '</p>' +
          '<span class="notif-time">' + formatNotifTime(n.created_at) + '</span>' +
          '</div>' +
          (!n.is_read ? '<span class="notif-dot" aria-hidden="true"></span>' : '');

        if (n.post_id) {
          item.style.cursor = 'pointer';
          item.addEventListener('click', function () {
            markNotifRead(n.id);
            item.classList.remove('notif-unread');
            var dot = item.querySelector('.notif-dot');
            if (dot) dot.remove();
            notifPanel.classList.add('hidden');
            if (typeof openPostModalFn === 'function') {
              openPostModalFn(n.post_id);
            } else {
              // Navigate to wall with post anchor
              window.location.href = '/wall#post-' + n.post_id;
            }
          });
        }
        notifList.appendChild(item);
      });
    }

    function loadNotifications() {
      fetch('/api/notifications?user_id=' + userId)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var notifs = data.notifications || [];
          var unread = data.unread || 0;
          renderNotifications(notifs);
          if (unread > 0) {
            notifBadge.textContent = unread > 99 ? '99+' : String(unread);
            notifBadge.classList.remove('hidden');
          } else {
            notifBadge.classList.add('hidden');
          }
        }).catch(function () {});
    }

    notifBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = !notifPanel.classList.contains('hidden');
      if (isOpen) {
        notifPanel.classList.add('hidden');
      } else {
        notifPanel.classList.remove('hidden');
        loadNotifications();
      }
    });

    if (notifMarkAll) {
      notifMarkAll.addEventListener('click', function () {
        fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        }).then(function () {
          notifBadge.classList.add('hidden');
          notifList.querySelectorAll('.notif-unread').forEach(function (el) {
            el.classList.remove('notif-unread');
            var dot = el.querySelector('.notif-dot');
            if (dot) dot.remove();
          });
        }).catch(function () {});
      });
    }

    document.addEventListener('click', function (e) {
      if (!notifPanel.classList.contains('hidden')) {
        if (!notifPanel.contains(e.target) && e.target !== notifBtn) {
          notifPanel.classList.add('hidden');
        }
      }
    });

    loadNotifications();
    setInterval(loadNotifications, 30000);
  }

  global.initNotifications = initNotifications;
})(window);
