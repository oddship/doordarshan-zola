#!/usr/bin/env node

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = path.resolve(process.env.SITE_ROOT || process.cwd());
const CONTENT_ROOT = path.join(ROOT, "content");
const ADMIN_HTML = path.join(__dirname, "editor", "index.html");
const INLINE_EDITOR_JS = path.join(__dirname, "editor", "in-page-editor.js");
const HOST = "127.0.0.1";
const PORT = Number(process.env.ADMIN_PORT || 1112);
const PREVIEW_BASE_URL = process.env.ADMIN_PREVIEW_URL || "http://127.0.0.1:1111";

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

function text(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolveContent(id) {
  if (typeof id !== "string" || !id.endsWith(".md")) {
    throw new Error("Invalid content path");
  }
  const decoded = decodeURIComponent(id);
  const candidate = path.resolve(CONTENT_ROOT, decoded);
  if (!isInside(CONTENT_ROOT, candidate) || (!decoded.startsWith("blog/") && !decoded.startsWith("pages/"))) {
    throw new Error("Content path must stay inside content/blog or content/pages");
  }
  return { candidate, id: path.relative(CONTENT_ROOT, candidate).split(path.sep).join("/") };
}

function markdownFiles(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...markdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function contentFiles() {
  return ["blog", "pages"]
    .flatMap((scope) => markdownFiles(path.join(CONTENT_ROOT, scope)))
    .filter((filePath) => !["blog/_index.md", "pages/_index.md"].includes(path.relative(CONTENT_ROOT, filePath).split(path.sep).join("/")));
}

function scalar(frontMatter, key) {
  const rootFrontMatter = frontMatter.split(/^\s*\[/m, 1)[0];
  const match = rootFrontMatter.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, "m"));
  if (!match) return "";
  const value = match[1];
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value.replace(/^'(.*)'$/, "$1");
}

function splitDocument(raw) {
  if (!raw.startsWith("+++")) {
    return { frontMatter: "", body: raw };
  }
  const end = raw.indexOf("\n+++", 3);
  if (end === -1) {
    throw new Error("Post front matter is not closed");
  }
  const frontMatter = raw.slice(4, end);
  const body = raw.slice(end + 5).replace(/^\r?\n/, "");
  return { frontMatter, body };
}

function derivedPath(id) {
  const suffix = "/_index.md";
  const withoutExtension = id.endsWith(suffix) ? id.slice(0, -suffix.length) : id.slice(0, -3);
  return `${withoutExtension.replace(/^\/+|\/+$/g, "")}/`;
}

function contentFromFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { frontMatter, body } = splitDocument(raw);
  const id = path.relative(CONTENT_ROOT, filePath).split(path.sep).join("/");
  const contentPath = scalar(frontMatter, "path") || derivedPath(id);
  const date = scalar(frontMatter, "date");
  return {
    id,
    kind: id.startsWith("pages/") ? "page" : "blog",
    title: scalar(frontMatter, "title") || (path.basename(filePath) === "_index.md" ? path.basename(path.dirname(filePath)) : path.basename(filePath, ".md")),
    date,
    draft: scalar(frontMatter, "draft") === "true",
    path: contentPath,
    previewUrl: `/${contentPath.replace(/^\/+/, "")}`,
    previewSourceUrl: new URL(`/${contentPath.replace(/^\/+/, "")}`, PREVIEW_BASE_URL).toString(),
    frontMatter,
    body,
    raw,
  };
}

function contentSummary(filePath) {
  const post = contentFromFile(filePath);
  return {
    id: post.id,
    kind: post.kind,
    title: post.title,
    date: post.date,
    draft: post.draft,
    path: post.path,
    previewUrl: post.previewUrl,
  };
}

function replaceFrontMatterValue(frontMatter, key, value) {
  const lines = frontMatter.split("\n");
  const firstTable = lines.findIndex((line) => /^\s*\[/.test(line));
  const rootEnd = firstTable === -1 ? lines.length : firstTable;
  const index = lines.findIndex((line, lineIndex) => lineIndex < rootEnd && new RegExp(`^\\s*${key}\\s*=`).test(line));
  const rendered = `${key} = ${typeof value === "boolean" ? value : JSON.stringify(value)}`;
  if (index === -1) {
    if (firstTable === -1) lines.push(rendered);
    else lines.splice(firstTable, 0, rendered);
  } else {
    lines[index] = rendered;
  }
  return lines.join("\n");
}

function normalizeFrontMatter(value) {
  const normalized = String(value).replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "");
  if (/^\s*\+\+\+\s*$/m.test(normalized)) {
    throw new Error("Front matter should not include the +++ delimiters");
  }
  return normalized;
}

function updatedDocument(raw, changes) {
  const { frontMatter } = splitDocument(raw);
  let nextFrontMatter = Object.prototype.hasOwnProperty.call(changes, "frontMatter")
    ? normalizeFrontMatter(changes.frontMatter)
    : frontMatter;
  nextFrontMatter = replaceFrontMatterValue(nextFrontMatter, "title", changes.title);
  if (changes.date) nextFrontMatter = replaceFrontMatterValue(nextFrontMatter, "date", changes.date);
  nextFrontMatter = replaceFrontMatterValue(nextFrontMatter, "draft", changes.draft);
  if (changes.path) nextFrontMatter = replaceFrontMatterValue(nextFrontMatter, "path", changes.path);
  return `+++\n${nextFrontMatter}\n+++\n\n${changes.body}`;
}

function requestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function dateParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match.slice(1);
  const now = new Date();
  return [String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"), String(now.getUTCDate()).padStart(2, "0")];
}

function cleanParent(value) {
  return String(value || "").split("/").map(slugify).filter(Boolean).join("/");
}

function createContent(input) {
  const kind = input.kind === "page" ? "page" : "blog";
  const title = String(input.title || "").trim();
  const date = String(input.date || new Date().toISOString()).trim();
  const slug = slugify(input.slug || title);
  if (!title) throw new Error("Title is required");
  if (!slug) throw new Error("A usable slug is required");

  const [year, month, day] = dateParts(date);
  const parent = kind === "page" ? cleanParent(input.parent) : "";
  const directory = kind === "page" ? path.join(CONTENT_ROOT, "pages", parent) : path.join(CONTENT_ROOT, "blog");
  fs.mkdirSync(directory, { recursive: true });
  const contentPath = kind === "page" ? `pages/${parent ? `${parent}/` : ""}${slug}/` : `blog/${year}/${month}/${day}/${slug}/`;
  let filename = kind === "page" ? `${slug}.md` : `${year}-${month}-${day}-${slug}.md`;
  let filePath = path.join(directory, filename);
  let counter = 2;
  while (fs.existsSync(filePath)) {
    filename = kind === "page" ? `${slug}-${counter}.md` : `${year}-${month}-${day}-${slug}-${counter}.md`;
    filePath = path.join(directory, filename);
    counter += 1;
  }

  const body = String(input.body || "");
  const defaultFrontMatter = `title = ${JSON.stringify(title)}\ndate = ${JSON.stringify(date)}\ndraft = true\npath = ${JSON.stringify(contentPath)}`;
  const frontMatter = typeof input.frontMatter === "string" && input.frontMatter.trim()
    ? input.frontMatter
    : defaultFrontMatter;
  const raw = updatedDocument(`+++\n${frontMatter}\n+++\n\n${body}`, {
    title,
    date,
    draft: true,
    path: contentPath,
    body,
    frontMatter,
  });
  fs.writeFileSync(filePath, raw, "utf8");
  return contentFromFile(filePath);
}

function saveContent(id, input) {
  const { candidate } = resolveContent(id);
  if (!fs.existsSync(candidate)) throw new Error("Content not found");
  const current = contentFromFile(candidate);
  const title = String(input.title ?? current.title).trim();
  const date = String(input.date ?? current.date).trim();
  const body = String(input.body ?? current.body);
  const frontMatter = typeof input.frontMatter === "string" ? input.frontMatter : current.frontMatter;
  const draft = Boolean(input.draft);
  if (!title) throw new Error("Title is required");
  if (current.kind === "blog" && !date) throw new Error("Date is required for blog posts");
  fs.writeFileSync(candidate, updatedDocument(current.raw, { title, date, draft, body, frontMatter }), "utf8");
  return contentFromFile(candidate);
}

function proxyToPreview(req, res, requestUrl) {
  const preview = new URL(PREVIEW_BASE_URL);
  const editorOrigin = `http://${HOST}:${PORT}`;
  const proxyRequest = http.request({
    hostname: preview.hostname,
    port: preview.port || (preview.protocol === "https:" ? 443 : 80),
    path: `${requestUrl.pathname}${requestUrl.search}`,
    method: req.method,
    headers: { ...req.headers, host: preview.host },
  }, (proxyResponse) => {
    const contentType = String(proxyResponse.headers["content-type"] || "");
    const post = contentFiles()
      .map(contentFromFile)
      .find((candidate) => candidate.path.replace(/^\/+|\/+$/g, "") === requestUrl.pathname.replace(/^\/+|\/+$/g, ""));
    if (!contentType.includes("text/html")) {
      res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      return proxyResponse.pipe(res);
    }
    const chunks = [];
    proxyResponse.on("data", (chunk) => chunks.push(chunk));
    proxyResponse.on("end", () => {
      const config = JSON.stringify(post ? { id: post.id, kind: post.kind, title: post.title, date: post.date, draft: post.draft } : null).replace(/</g, "\\u003c");
      const injection = `<script>window.__LOCAL_EDITOR_POST=${config};</script><script src="/__local-editor.js"></script>`;
      const source = Buffer.concat(chunks).toString("utf8").split(preview.origin).join(editorOrigin);
      const html = source.includes("</body>")
        ? source.replace("</body>", `${injection}</body>`)
        : source.includes("</html>")
          ? source.replace("</html>", `${injection}</html>`)
          : `${source}${injection}`;
      const headers = { ...proxyResponse.headers };
      delete headers["content-length"];
      delete headers.etag;
      headers["content-length"] = Buffer.byteLength(html);
      res.writeHead(proxyResponse.statusCode || 200, headers);
      res.end(html);
    });
  });
  proxyRequest.on("error", (error) => text(res, 502, `Zola preview is unavailable: ${error.message}\n`));
  req.pipe(proxyRequest);
}

async function route(req, res) {
  const requestUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  try {
    if (req.method === "GET" && (requestUrl.pathname === "/admin" || requestUrl.pathname === "/admin/")) {
      return text(res, 200, fs.readFileSync(ADMIN_HTML, "utf8"), "text/html; charset=utf-8");
    }

    if (req.method === "GET" && requestUrl.pathname === "/__local-editor.js") {
      return text(res, 200, fs.readFileSync(INLINE_EDITOR_JS, "utf8"), "application/javascript; charset=utf-8");
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/content") {
      const query = requestUrl.searchParams.get("q")?.toLowerCase() || "";
      const status = requestUrl.searchParams.get("status") || "all";
      const kind = requestUrl.searchParams.get("kind") || "all";
      const posts = contentFiles()
        .map(contentSummary)
        .filter((post) => status === "all" || (status === "draft" ? post.draft : !post.draft))
        .filter((post) => kind === "all" || post.kind === kind)
        .filter((post) => !query || `${post.title} ${post.id}`.toLowerCase().includes(query))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      return json(res, 200, { posts, previewBaseUrl: PREVIEW_BASE_URL });
    }

    if (req.method === "GET" && requestUrl.pathname.startsWith("/api/content/")) {
      const id = decodeURIComponent(requestUrl.pathname.slice("/api/content/".length));
      const { candidate } = resolveContent(id);
      if (!fs.existsSync(candidate)) return json(res, 404, { error: "Content not found" });
      return json(res, 200, contentFromFile(candidate));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/content") {
      const input = await requestBody(req);
      return json(res, 201, createContent(input));
    }

    if (req.method === "PUT" && requestUrl.pathname.startsWith("/api/content/")) {
      const id = decodeURIComponent(requestUrl.pathname.slice("/api/content/".length));
      const input = await requestBody(req);
      return json(res, 200, saveContent(id, input));
    }

    // Everything outside /admin and /api is the real local Zola website.
    return proxyToPreview(req, res, requestUrl);
  } catch (error) {
    return json(res, 400, { error: error.message });
  }
}

if (!fs.existsSync(CONTENT_ROOT)) {
  console.error(`Missing ${CONTENT_ROOT}`);
  process.exit(1);
}

const server = http.createServer(route);
server.listen(PORT, HOST, () => {
  const actualPort = server.address().port;
  console.log(`Local admin editor: http://${HOST}:${actualPort}/admin/`);
  console.log(`Zola preview: ${PREVIEW_BASE_URL}/`);
  console.log("Writes are limited to Markdown under content/blog and content/pages.");
});
