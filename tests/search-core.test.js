const assert = require("node:assert/strict");
const test = require("node:test");

global.window = {};
require("../static/js/search-core.js");

const core = global.window.SiteSearchCore;
const docs = core.prepare([
  { url: "https://example.test/base/cpp/", title: "Modern C++", description: "", body: "Templates and memory safety." },
  { url: "https://example.test/base/csharp/", title: "C# Notes", description: "", body: ".NET runtime internals." },
  { url: "https://example.test/base/resume/", title: "Résumé", description: "Career notes", body: "A concise résumé." },
  { url: "https://example.test/base/pages/worktrees/", title: "Git worktrees", description: "", body: "Working with branches." },
  { url: "https://example.test/base/pages/worktrees/", title: "Duplicate alias", description: "", body: "Should be discarded." },
], "https://example.test/base");

test("normalizes symbolic programming-language names", () => {
  assert.deepEqual(core.search(docs, "C++").map((hit) => hit.doc.path), ["/cpp"]);
  assert.deepEqual(core.search(docs, "C#").map((hit) => hit.doc.path), ["/csharp"]);
  assert.equal(core.search(docs, ".NET")[0].doc.path, "/csharp");
});

test("folds accents without generating one-character fragments", () => {
  assert.equal(core.search(docs, "résumé")[0].doc.path, "/resume");
  assert.equal(core.search(docs, "resume")[0].doc.path, "/resume");
  assert.deepEqual(core.search(docs, "+"), []);
});

test("normalizes deployment base paths and removes duplicate URLs", () => {
  assert.equal(docs.filter((doc) => doc.path === "/pages/worktrees").length, 1);
  assert.equal(docs.find((doc) => doc.path === "/pages/worktrees").title, "Git worktrees");
  assert.equal(docs.find((doc) => doc.path === "/pages/worktrees").ref, "/base/pages/worktrees");
});

test("uses local paths instead of indexed production origins", () => {
  const localDocs = core.prepare([
    { url: "https://production.example/blog/local-preview/", title: "Local preview", body: "" },
  ], "http://127.0.0.1:1111");
  assert.equal(localDocs[0].ref, "/blog/local-preview");
});

test("supports path predicates for scoped search", () => {
  const hits = core.search(docs, "git", (doc) => doc.path.indexOf("/pages/") === 0);
  assert.deepEqual(hits.map((hit) => hit.doc.path), ["/pages/worktrees"]);
});
