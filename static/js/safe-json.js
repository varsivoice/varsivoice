(function () {
  function makeNonJsonError(response, text, parseError) {
    var snippet = text.replace(/\s+/g, " ").trim().slice(0, 160);
    var error = new Error(
      "Expected JSON but the server returned " +
        (snippet ? '"' + snippet + '"' : "an empty or invalid response") +
        ". Failing request: " +
        (response.url || "unknown URL")
    );
    error.name = "NonJsonResponseError";
    error.status = response.status;
    error.statusText = response.statusText;
    error.url = response.url;
    error.contentType = response.headers && response.headers.get
      ? response.headers.get("content-type")
      : "";
    error.cause = parseError;
    return error;
  }

  function safeJson(response) {
    return response.text().then(function (text) {
      if (!text) {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch (parseError) {
        throw makeNonJsonError(response, text, parseError);
      }
    });
  }

  if (window.Response && window.Response.prototype && !window.Response.prototype.__safeJsonPatched) {
    window.Response.prototype.__nativeJson = window.Response.prototype.json;
    window.Response.prototype.json = function () {
      return safeJson(this);
    };
    window.Response.prototype.__safeJsonPatched = true;
  }

  if (window.fetch && !window.fetch.__safeJsonPatched) {
    var nativeFetch = window.fetch;
    var safeFetch = function () {
      return nativeFetch.apply(this, arguments).then(function (response) {
        response.json = function () {
          return safeJson(response.clone());
        };
        return response;
      });
    };
    safeFetch.__safeJsonPatched = true;
    safeFetch.__nativeFetch = nativeFetch;
    window.fetch = safeFetch;
  }
})();
