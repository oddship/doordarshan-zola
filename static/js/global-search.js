(function () {
  var trigger = document.getElementById("global-search-toggle");
  var triggers = document.querySelectorAll("[data-global-search-trigger]");
  var dialog = document.getElementById("global-search-dialog");
  var input = document.getElementById("global-search-input");
  var status = document.getElementById("global-search-status");
  var results = document.getElementById("global-search-results");
  var fullResults = document.getElementById("global-search-all-results");
  var scopeLabel = document.getElementById("global-search-scope-label");
  var scopeButtons = dialog ? dialog.querySelectorAll("[data-search-scope-value]") : [];

  if (!trigger || !dialog || !input || !status || !results) return;

  var searchCore = null;
  var docs = null;
  var indexPromise = null;
  var activeIndex = -1;
  var currentScope = "";
  var currentScopeLabel = "All";
  var returnFocusTo = trigger;

  function loadScript(src, isReady) {
    if (isReady()) return Promise.resolve();

    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = function () {
        if (isReady()) resolve();
        else reject(new Error("Search asset loaded without exposing its expected global."));
      };
      script.onerror = function () {
        reject(new Error("Unable to load " + src));
      };
      document.head.appendChild(script);
    });
  }

  function ensureIndex() {
    if (docs) return Promise.resolve(docs);
    if (indexPromise) return indexPromise;

    status.textContent = "Loading search index…";
    indexPromise = loadScript(dialog.dataset.searchCoreUrl, function () {
      return typeof window.SiteSearchCore !== "undefined";
    })
      .then(function () {
        return loadScript(dialog.dataset.searchIndexUrl, function () {
          return Array.isArray(window.searchIndex);
        });
      })
      .then(function () {
        searchCore = window.SiteSearchCore;
        docs = searchCore.prepare(window.searchIndex, dialog.dataset.searchBasePath);
        return docs;
      })
      .catch(function (error) {
        indexPromise = null;
        status.textContent = "Search is temporarily unavailable.";
        throw error;
      });

    return indexPromise;
  }

  function openSearch(scope, label, opener) {
    setScope(scope || "", label || "All");
    returnFocusTo = opener || trigger;
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    document.body.classList.add("global-search-open");
    window.requestAnimationFrame(function () {
      input.focus();
      input.select();
    });
    ensureIndex().then(function () {
      if (input.value.trim().length >= 2) search(input.value.trim());
      else status.textContent = emptySearchMessage();
    }).catch(function () {});
  }

  function closeSearch() {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function search(term) {
    updateFullResultsLink(term);
    activeIndex = -1;
    input.removeAttribute("aria-activedescendant");

    if (term.length < 2) {
      results.replaceChildren();
      status.textContent = emptySearchMessage();
      return;
    }

    if (!docs) {
      ensureIndex().then(function () {
        if (input.value.trim() === term) search(term);
      }).catch(function () {});
      return;
    }

    var hits = searchCore.search(docs, term, function (doc) {
      return matchesScope(doc.path);
    });

    renderResults(hits, term);
  }

  function renderResults(hits, term) {
    results.replaceChildren();

    if (!hits.length) {
      var emptyScope = currentScope ? currentScopeLabel.toLowerCase() + " " : "";
      status.textContent = 'No ' + emptyScope + 'results for "' + term + '".';
      return;
    }

    var max = Math.min(hits.length, 8);
    var scopeText = currentScope ? " in " + currentScopeLabel : "";
    status.textContent = hits.length + (hits.length === 1 ? " result" : " results") + scopeText + ' for "' + term + '". Showing the first ' + max + ".";

    for (var i = 0; i < max; i++) {
      var ref = hits[i].ref;
      var doc = hits[i].doc;
      var path = doc.path || "/";
      var title = doc.title || titleFromPath(path);
      var item = document.createElement("a");
      var meta = document.createElement("span");
      var heading = document.createElement("span");
      var excerpt = document.createElement("span");

      item.className = "global-search-result item";
      item.href = ref;
      item.id = "global-search-result-" + i;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");

      meta.className = "global-search-result-meta";
      meta.textContent = contentType(path) + " · " + path;
      heading.className = "global-search-result-title";
      heading.textContent = title;
      excerpt.className = "global-search-result-excerpt";
      excerpt.textContent = searchCore.summarize(doc, term, 150);

      item.appendChild(meta);
      item.appendChild(heading);
      item.appendChild(excerpt);
      results.appendChild(item);
    }
  }

  function moveSelection(direction) {
    var items = results.querySelectorAll(".global-search-result");
    if (!items.length) return;

    if (activeIndex >= 0) {
      items[activeIndex].classList.remove("active");
      items[activeIndex].setAttribute("aria-selected", "false");
    }

    activeIndex += direction;
    if (activeIndex < 0) activeIndex = items.length - 1;
    if (activeIndex >= items.length) activeIndex = 0;

    items[activeIndex].classList.add("active");
    items[activeIndex].setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", items[activeIndex].id);
    items[activeIndex].scrollIntoView({ block: "nearest" });
  }

  function updateFullResultsLink(term) {
    if (!fullResults) return;
    var base = dialog.dataset.fullSearchUrl || "/search/";
    var url = new URL(base, window.location.href);
    if (url.pathname.charAt(url.pathname.length - 1) !== "/") url.pathname += "/";
    if (term) url.searchParams.set("q", term);
    else url.searchParams.delete("q");
    if (currentScope) url.searchParams.set("scope", currentScope);
    else url.searchParams.delete("scope");
    fullResults.href = url.pathname + url.search + url.hash;
  }

  function setScope(scope, label) {
    currentScope = normalizePath(scope);
    currentScopeLabel = label || "All";
    if (scopeLabel) scopeLabel.textContent = currentScope ? " · " + currentScopeLabel : "";
    input.placeholder = currentScope ? "Search " + currentScopeLabel.toLowerCase() + "…" : "Search posts, pages, and projects…";

    Array.prototype.forEach.call(scopeButtons, function (control) {
      var selected = normalizePath(control.dataset.searchScopeValue) === currentScope;
      control.checked = selected;
    });

    updateFullResultsLink(input.value.trim());
    if (input.value.trim().length >= 2) search(input.value.trim());
    else status.textContent = emptySearchMessage();
  }

  function matchesScope(path) {
    if (!currentScope) return true;
    return path === currentScope || path.indexOf(currentScope + "/") === 0;
  }

  function emptySearchMessage() {
    return currentScope ? "Type at least 2 characters to search " + currentScopeLabel.toLowerCase() + "." : "Type at least 2 characters to search.";
  }

  function contentType(path) {
    if (path.indexOf("/pages/projects/") === 0) return "Project";
    if (path.indexOf("/blog/") === 0) return "Blog";
    if (path.indexOf("/pages/") === 0) return "Page";
    if (path.indexOf("/writing/") === 0) return "Writing";
    return "Site";
  }

  function titleFromPath(path) {
    var part = path.split("/").filter(Boolean).pop() || path;
    return decodeURIComponent(part).replace(/[-_]+/g, " ").replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function normalizePath(value) {
    if (!value) return "";
    var path = value.replace(/^https?:\/\/[^\/]+/, "").replace(/\/$/, "");
    if (!path) return "";
    return path.charAt(0) === "/" ? path : "/" + path;
  }

  Array.prototype.forEach.call(triggers, function (button) {
    button.addEventListener("click", function () {
      openSearch(button.dataset.globalSearchScope || "", button.dataset.globalSearchScopeLabel || "All", button);
    });
  });

  Array.prototype.forEach.call(scopeButtons, function (control) {
    control.addEventListener("change", function () {
      if (!control.checked) return;
      setScope(control.dataset.searchScopeValue || "", control.dataset.searchScopeLabel || "All");
      input.focus();
    });
  });

  dialog.querySelectorAll("[data-global-search-close]").forEach(function (button) {
    button.addEventListener("click", closeSearch);
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeSearch();
  });

  dialog.addEventListener("close", function () {
    document.body.classList.remove("global-search-open");
    if (returnFocusTo) returnFocusTo.focus();
  });

  input.addEventListener("input", function () {
    search(input.value.trim());
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      var active = results.querySelector(".global-search-result.active");
      if (active) {
        event.preventDefault();
        window.location.href = active.href;
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    }
  });

  document.addEventListener("keydown", function (event) {
    var target = event.target;
    var isEditing = target && typeof target.matches === "function" &&
      (target.matches("input, textarea, select") || target.isContentEditable);
    var commandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
    var slashShortcut = event.key === "/" && !isEditing && !event.defaultPrevented;

    if (commandShortcut || slashShortcut) {
      event.preventDefault();
      openSearch("", "All", trigger);
    }
  });
})();
