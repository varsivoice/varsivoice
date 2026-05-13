(function (global) {
  "use strict";

  var STORAGE_KEY = "ub_session";

  function getRaw() {
    var raw = null;
    try { raw = global.localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!raw) {
      try { raw = global.sessionStorage.getItem(STORAGE_KEY); } catch (e2) {}
      if (raw) {
        try { global.localStorage.setItem(STORAGE_KEY, raw); } catch (e3) {}
      }
    }
    return raw;
  }

  function get() {
    var raw = getRaw();
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function set(session) {
    var raw = JSON.stringify(session || {});
    try { global.localStorage.setItem(STORAGE_KEY, raw); } catch (e) {}
    try { global.sessionStorage.setItem(STORAGE_KEY, raw); } catch (e2) {}
    return session;
  }

  function clear() {
    try { global.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    try { global.sessionStorage.removeItem(STORAGE_KEY); } catch (e2) {}
  }

  function isLoginPage() {
    return global.location && global.location.pathname === "/";
  }

  global.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY) return;
    if (!event.newValue) {
      try { global.sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
      if (!isLoginPage()) global.location.href = "/";
      return;
    }
    try { global.sessionStorage.setItem(STORAGE_KEY, event.newValue); } catch (e2) {}
    if (isLoginPage()) {
      global.location.href = "/wall";
      return;
    }
    global.location.reload();
  });

  global.AuthSession = {
    key: STORAGE_KEY,
    getRaw: getRaw,
    get: get,
    set: set,
    clear: clear
  };
})(window);
