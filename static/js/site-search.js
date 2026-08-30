(function () {
  var input = document.getElementById("site-search-input");
  if (!input) return;

  var shell = input.closest(".site-search-shell");
  var status = document.getElementById("site-search-status");
  var results = document.getElementById("site-search-results");
  var searchCore = window.SiteSearchCore;
  var docs = null;
  var activeIndex = -1;
  var scopes = {
    "": "All",
    "/blog": "Blog",
    "/pages": "Pages",
    "/pages/projects": "Projects",
  };
  var initialParams = new URLSearchParams(window.location.search);
  var requestedScope = searchCore ? searchCore.normalizePath(initialParams.get("scope") || "") : "";
  var currentScope = Object.prototype.hasOwnProperty.call(scopes, requestedScope) ? requestedScope : "";
  var currentScopeLabel = scopes[currentScope];

  function initSearch() {
    if (docs) return true;
    if (!Array.isArray(window.searchIndex) || !searchCore) {
      status.textContent = "Search index is unavailable.";
      return false;
    }

    docs = searchCore.prepare(window.searchIndex, shell ? shell.dataset.searchBasePath : "");
    return true;
  }

  function runSearch() {
    var term = input.value.trim();
    updateQueryString(term);
    activeIndex = -1;
    input.removeAttribute("aria-activedescendant");

    if (term.length < 2) {
      results.innerHTML = "";
      status.textContent = "Type at least 2 characters to search.";
      return;
    }

    if (!initSearch()) return;

    var hits = searchCore.search(docs, term, matchesScope);

    renderResults(hits, term);
  }

  input.addEventListener("input", runSearch);

  function renderResults(hits, term) {
    if (!hits.length) {
      results.innerHTML = "";
      var emptyScope = currentScope ? currentScopeLabel.toLowerCase() + " " : "";
      status.textContent = 'No ' + emptyScope + 'results for "' + term + '".';
      return;
    }

    var html = "";
    var max = Math.min(hits.length, 20);
    var scopeText = currentScope ? " in " + currentScopeLabel : "";
    status.textContent = hits.length + (hits.length === 1 ? " result" : " results") + scopeText +
      ' for "' + term + '". Showing the first ' + max + ".";
    for (var i = 0; i < max; i++) {
      var ref = hits[i].ref;
      var doc = hits[i].doc;
      var path = doc.path || "/";
      var title = doc.title || path.split("/").filter(Boolean).pop() || path;
      var excerpt = searchCore.summarize(doc, term, 180);
      html +=
        '<article class="site-search-result" id="site-search-result-' + i + '" role="option">' +
        '<h2 class="site-search-result-title"><a href="' + escapeHtml(ref) + '">' + escapeHtml(title) + '</a></h2>' +
        '<p class="site-search-result-url">' + escapeHtml(path) + '</p>' +
        '<p class="site-search-result-excerpt">' + escapeHtml(excerpt) + '</p>' +
        '</article>';
    }

    results.innerHTML = html;
  }

  function moveSelection(direction) {
    var items = results.querySelectorAll(".site-search-result-title a");
    if (!items.length) return;

    if (activeIndex >= 0) items[activeIndex].classList.remove("active");
    activeIndex += direction;
    if (activeIndex < 0) activeIndex = items.length - 1;
    if (activeIndex >= items.length) activeIndex = 0;

    items[activeIndex].classList.add("active");
    input.setAttribute("aria-activedescendant", "site-search-result-" + activeIndex);
    items[activeIndex].scrollIntoView({ block: "nearest" });
  }

  function updateQueryString(term) {
    if (!window.history || !window.URL) return;
    var url = new URL(window.location.href);
    if (term) url.searchParams.set("q", term);
    else url.searchParams.delete("q");
    if (currentScope) url.searchParams.set("scope", currentScope);
    else url.searchParams.delete("scope");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }

  function matchesScope(doc) {
    if (!currentScope) return true;
    return doc.path === currentScope || doc.path.indexOf(currentScope + "/") === 0;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  input.addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      var active = results.querySelector(".site-search-result-title a.active");
      if (active) {
        event.preventDefault();
        window.location.href = active.href;
      }
    } else if (event.key === "Escape") {
      input.value = "";
      runSearch();
      input.blur();
    }
  });

  document.addEventListener("keydown", function (event) {
    var target = event.target;
    var isEditing = target && typeof target.matches === "function" &&
      (target.matches("input, textarea, select") || target.isContentEditable);
    if (event.key === "/" && !isEditing) {
      event.preventDefault();
      input.focus();
    }
  });

  var initialQuery = initialParams.get("q");
  if (initialQuery) {
    input.value = initialQuery;
    runSearch();
  } else {
    input.focus();
  }
})();
