(function () {
  if (!window.Response || !window.Response.prototype || window.Response.prototype.__safeJsonPatched) {
    return;
  }

  var nativeJson = window.Response.prototype.json;

  window.Response.prototype.json = function () {
    var response = this;
    return response.text().then(function (text) {
      if (!text) {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch (parseError) {
        var snippet = text.replace(/\s+/g, " ").trim().slice(0, 160);
        var error = new Error(
          "Expected JSON but the server returned " +
            (snippet ? '"' + snippet + '"' : "an empty or invalid response") +
            ". Check the Network tab for the failing request."
        );
        error.name = "NonJsonResponseError";
        error.status = response.status;
        error.statusText = response.statusText;
        error.url = response.url;
        error.contentType = response.headers && response.headers.get
          ? response.headers.get("content-type")
          : "";
        error.cause = parseError;
        throw error;
      }
    });
  };

  window.Response.prototype.__safeJsonPatched = true;
  window.Response.prototype.__nativeJson = nativeJson;
})();
