/**
 * avatar-color.js
 * Generates a consistent background color for avatar initials based on the user's name.
 * The same name always produces the same color.
 */
(function (global) {
  var PALETTE = [
    '#c0392b', '#e74c3c', '#8e44ad', '#9b59b6',
    '#2980b9', '#3498db', '#16a085', '#1abc9c',
    '#27ae60', '#2ecc71', '#d35400', '#e67e22',
    '#c0392b', '#7f8c8d', '#2c3e50', '#6d4c41',
    '#00838f', '#558b2f', '#6a1b9a', '#1565c0'
  ];

  function nameToColor(name) {
    var str = (name || 'U').trim();
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // convert to 32-bit int
    }
    var index = Math.abs(hash) % PALETTE.length;
    return PALETTE[index];
  }

  /**
   * Apply background color to all .no-image avatar elements that contain initials.
   * Call this after rendering avatars.
   */
  function applyAvatarColors() {
    var els = document.querySelectorAll('.no-image');
    els.forEach(function (el) {
      var text = (el.textContent || el.innerText || '').trim();
      if (text && !el.dataset.colorized) {
        el.style.backgroundColor = nameToColor(text);
        el.dataset.colorized = '1';
      }
    });
  }

  global.nameToColor = nameToColor;
  global.applyAvatarColors = applyAvatarColors;
})(window);
