(function () {
  var input = document.getElementById("site-search-input");
  if (!input) return;

  var status = document.getElementById("site-search-status");
  var results = document.getElementById("site-search-results");
  var index = null;
  var docs = {};

  function initSearch() {
    if (index) return true;
    if (!window.searchIndex || typeof elasticlunr === "undefined") {
      status.textContent = "Search index is unavailable.";
      return false;
    }

    index = elasticlunr.Index.load(window.searchIndex);
    var store = window.searchIndex.documentStore || {};
    docs = store.docs || {};
    return true;
  }

  input.addEventListener("input", function () {
    var term = input.value.trim();
    if (term.length < 2) {
      results.innerHTML = "";
      status.textContent = "Type at least 2 characters to search.";
      return;
    }

    if (!initSearch()) return;

    var hits = index.search(term, {
      fields: { title: { boost: 5 }, body: { boost: 1 } },
      bool: "OR",
      expand: true,
    });

    renderResults(hits, term);
  });

  function renderResults(hits, term) {
    if (!hits.length) {
      results.innerHTML = "";
      status.textContent = 'No results for "' + term + '".';
      return;
    }

    status.textContent = hits.length + (hits.length === 1 ? " result" : " results") + ' for "' + term + '".';

    var html = "";
    var max = Math.min(hits.length, 20);
    for (var i = 0; i < max; i++) {
      var ref = hits[i].ref;
      var path = normalizePath(ref) || "/";
      var doc = docs[ref] || {};
      var title = doc.title || path.split("/").filter(Boolean).pop() || path;
      var excerpt = summarize(doc.body || "", term);
      html +=
        '<article class="site-search-result">' +
        '<h2 class="site-search-result-title"><a href="' + path + '">' + escapeHtml(title) + '</a></h2>' +
        '<p class="site-search-result-url">' + escapeHtml(path) + '</p>' +
        '<p class="site-search-result-excerpt">' + escapeHtml(excerpt) + '</p>' +
        '</article>';
    }

    results.innerHTML = html;
  }

  function summarize(body, term) {
    var text = body.replace(/\s+/g, " ").trim();
    if (!text) return "No preview available.";

    var lower = text.toLowerCase();
    var needle = term.toLowerCase();
    var idx = lower.indexOf(needle);
    if (idx === -1) return truncate(text, 180);

    var start = Math.max(0, idx - 70);
    var end = Math.min(text.length, idx + needle.length + 90);
    var snippet = text.slice(start, end).trim();
    if (start > 0) snippet = "…" + snippet;
    if (end < text.length) snippet = snippet + "…";
    return snippet;
  }

  function truncate(text, max) {
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trimEnd() + "…";
  }

  function normalizePath(value) {
    if (!value) return "";
    var path = value.replace(/^https?:\/\/[^\/]+/, "").replace(/\/$/, "");
    if (!path) return "";
    return path.charAt(0) === "/" ? path : "/" + path;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
})();
