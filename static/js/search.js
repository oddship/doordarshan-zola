// Pages search — lazy-loads elasticlunr index on first keystroke
(function () {
  var input = document.getElementById("pages-search");
  if (!input) return;

  var results = document.getElementById("pages-search-results");
  var index = null;
  var docs = {};
  var searchPrefix = "";

  if (results && results.dataset.searchPrefix) {
    searchPrefix = normalizePath(results.dataset.searchPrefix);
  }

  function initSearch() {
    if (index) return;
    if (!window.searchIndex) return;
    index = elasticlunr.Index.load(window.searchIndex);
    // Build doc lookup from the store
    var store = window.searchIndex.documentStore || {};
    if (store.docs) docs = store.docs;
  }

  input.addEventListener("input", function () {
    var term = input.value.trim();
    if (term.length < 2) {
      results.style.display = "none";
      results.innerHTML = "";
      return;
    }

    initSearch();
    if (!index) return;

    var hits = index.search(term, {
      fields: { title: { boost: 5 }, body: { boost: 1 } },
      bool: "OR",
      expand: true,
    });

    // Filter to the configured section prefix when present
    hits = hits.filter(function (h) {
      var path = normalizePath(h.ref);
      if (!searchPrefix) return true;
      return path === searchPrefix || path.indexOf(searchPrefix + "/") === 0;
    });

    if (hits.length === 0) {
      results.innerHTML = '<div class="search-empty">No results</div>';
      results.style.display = "block";
      return;
    }

    var html = "";
    var max = Math.min(hits.length, 8);
    for (var i = 0; i < max; i++) {
      var ref = hits[i].ref;
      // Strip base URL to get path — works in dev and production
      var path = normalizePath(ref) || "/";
      var doc = hits[i].doc || {};
      var title = doc.title || path.split("/").filter(Boolean).pop();
      html +=
        '<a class="search-result" href="' + path + '">' + escapeHtml(title) + "</a>";
    }
    results.innerHTML = html;
    results.style.display = "block";
  });

  // Close on outside click
  document.addEventListener("click", function (e) {
    if (!results.contains(e.target) && e.target !== input) {
      results.style.display = "none";
    }
  });

  // Close on Escape
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      results.style.display = "none";
      input.blur();
    }
    // Arrow key navigation
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      var items = results.querySelectorAll(".search-result");
      if (!items.length) return;
      var active = results.querySelector(".search-result.active");
      var idx = -1;
      if (active) {
        active.classList.remove("active");
        idx = Array.prototype.indexOf.call(items, active);
      }
      if (e.key === "ArrowDown") idx = Math.min(idx + 1, items.length - 1);
      else idx = Math.max(idx - 1, 0);
      items[idx].classList.add("active");
      items[idx].scrollIntoView({ block: "nearest" });
    }
    // Enter navigates to active result
    if (e.key === "Enter") {
      var active = results.querySelector(".search-result.active");
      if (active) {
        e.preventDefault();
        window.location = active.href;
      }
    }
  });

  // Keyboard shortcut: / to focus search
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== input && 
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
    }
  });

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
