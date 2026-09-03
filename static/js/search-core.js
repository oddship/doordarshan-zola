(function () {
  function normalizeText(value) {
    var text = String(value || "")
      .replace(/\bc\+\+/gi, " cpp ")
      .replace(/\bc#/gi, " csharp ")
      .replace(/\.net\b/gi, " dotnet ");
    if (typeof text.normalize === "function") {
      text = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    }
    return text.toLowerCase();
  }

  function terms(value) {
    var matches = normalizeText(value).match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
    var seen = Object.create(null);
    var unique = [];

    for (var i = 0; i < matches.length; i++) {
      if (matches[i].length < 2) continue;
      if (!seen[matches[i]]) {
        seen[matches[i]] = true;
        unique.push(matches[i]);
      }
    }

    return unique;
  }

  function rawPath(value) {
    if (!value) return "";
    var path = String(value).replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0];
    if (!path) return "/";
    if (path.charAt(0) !== "/") path = "/" + path;
    return path.length > 1 ? path.replace(/\/$/, "") : path;
  }

  function normalizePath(value, basePath) {
    var path = rawPath(value);
    var base = rawPath(basePath);

    if (base && base !== "/" && (path === base || path.indexOf(base + "/") === 0)) {
      path = path.slice(base.length) || "/";
    }

    return path;
  }

  function prepare(rawDocs, basePath) {
    if (!Array.isArray(rawDocs)) return [];

    var prepared = [];
    var seen = Object.create(null);
    for (var i = 0; i < rawDocs.length; i++) {
      var raw = rawDocs[i];
      var title = raw.title || "";
      var description = raw.description || "";
      var body = raw.body || "";
      var indexedRef = raw.url || raw.path || "/";
      var path = normalizePath(indexedRef, basePath);
      var base = rawPath(basePath);
      var ref = base && base !== "/" ? base + (path === "/" ? "" : path) : path;
      if (seen[path]) continue;
      seen[path] = true;

      prepared.push({
        ref: ref,
        path: path,
        title: title,
        description: description,
        body: body,
        titleText: normalizeText(title),
        descriptionText: normalizeText(description),
        bodyText: normalizeText(body),
        titleTerms: terms(title),
        descriptionTerms: terms(description),
        bodyTerms: terms(body),
      });
    }

    return prepared;
  }

  function termScore(values, token, exact, prefix) {
    if (values.indexOf(token) !== -1) return exact;
    for (var i = 0; i < values.length; i++) {
      if (values[i].indexOf(token) === 0) return prefix;
    }
    return 0;
  }

  function score(doc, queryTerms, phrase) {
    var total = 0;
    var matched = 0;

    for (var i = 0; i < queryTerms.length; i++) {
      var token = queryTerms[i];
      var tokenScore = termScore(doc.titleTerms, token, 80, 45) +
        termScore(doc.descriptionTerms, token, 24, 12) +
        termScore(doc.bodyTerms, token, 8, 4);

      if (tokenScore > 0) {
        matched++;
        total += tokenScore;
      }
    }

    if (!matched) return 0;
    if (matched === queryTerms.length) total += 50;
    if (doc.titleText.indexOf(phrase) !== -1) total += 120;
    else if (doc.descriptionText.indexOf(phrase) !== -1) total += 24;
    else if (doc.bodyText.indexOf(phrase) !== -1) total += 10;
    return total;
  }

  function search(docs, query, predicate) {
    var queryTerms = terms(query);
    var phrase = normalizeText(query).trim();
    if (!queryTerms.length) return [];

    var hits = [];
    for (var i = 0; i < docs.length; i++) {
      var doc = docs[i];
      if (predicate && !predicate(doc)) continue;
      var docScore = score(doc, queryTerms, phrase);
      if (docScore > 0) hits.push({ ref: doc.ref, doc: doc, score: docScore });
    }

    hits.sort(function (a, b) {
      return b.score - a.score || a.doc.title.localeCompare(b.doc.title);
    });
    return hits;
  }

  function summarize(doc, query, max) {
    var text = String(doc.body || doc.description || "").replace(/\s+/g, " ").trim();
    if (!text) return "No preview available.";

    var lower = text.toLowerCase();
    var needles = [String(query || "").toLowerCase().trim()].concat(terms(query));
    var match = -1;
    var needle = "";

    for (var i = 0; i < needles.length; i++) {
      if (!needles[i]) continue;
      match = lower.indexOf(needles[i]);
      if (match !== -1) {
        needle = needles[i];
        break;
      }
    }

    if (match === -1) return truncate(text, max);
    var start = Math.max(0, match - Math.floor(max * 0.35));
    var end = Math.min(text.length, start + max);
    return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
  }

  function truncate(text, max) {
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trimEnd() + "…";
  }

  window.SiteSearchCore = {
    normalizePath: normalizePath,
    prepare: prepare,
    search: search,
    summarize: summarize,
  };
})();
