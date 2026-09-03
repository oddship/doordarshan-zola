(() => {
  const post = window.__LOCAL_EDITOR_POST;

  const addStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      .local-editor-dock, .local-editor-toolbar { z-index: 9999; }
      .local-editor-dock { position: fixed; right: 22px; bottom: 22px; padding: var(--space-2); box-shadow: var(--shadow-large); }
      .local-editor-toolbar { position: fixed; left: 50%; top: 12px; transform: translateX(-50%); max-width: calc(100vw - 24px); box-shadow: var(--shadow-large); }
      .local-editor-toolbar .local-editor-status { color: var(--muted-foreground); white-space: nowrap; margin-inline: var(--space-2); }
      .local-editor-active { outline: 2px dashed var(--primary); outline-offset: var(--space-2); }
      @media (max-width: 700px) { .local-editor-toolbar { left: 12px; right: 12px; transform: none; flex-wrap: wrap; } .local-editor-toolbar .local-editor-status { width: 100%; } }
    `;
    document.head.appendChild(style);
  };

  const button = (label, className, onClick) => {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    if (className) element.className = className;
    element.addEventListener("click", onClick);
    return element;
  };

  const convertInline = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/\s+/g, " ");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toLowerCase();
    if (tag === "img") return `![${node.getAttribute("alt") || ""}](${node.getAttribute("src") || ""})`;
    if (tag === "br") return "\n";
    if (tag === "code" && node.parentElement?.tagName.toLowerCase() !== "pre") return `\`${node.textContent.replace(/`/g, "\\`")}\``;
    if (tag === "strong" || tag === "b") return `**${convertChildren(node).trim()}**`;
    if (tag === "em" || tag === "i") return `*${convertChildren(node).trim()}*`;
    if (tag === "a") {
      const href = node.getAttribute("href") || "";
      return `[${convertChildren(node).trim()}](${href})`;
    }
    if (tag === "sup" && node.classList.contains("footnote-reference")) {
      const href = node.querySelector("a")?.getAttribute("href") || "";
      return href.startsWith("#") ? `[^${href.slice(1)}]` : convertChildren(node);
    }
    if (tag === "sup" && node.classList.contains("footnote-definition-label")) return "";
    return convertChildren(node);
  };

  const convertChildren = (node) => Array.from(node.childNodes).map(convertNode).join("");

  const listItem = (node) => Array.from(node.childNodes)
    .filter((child) => !(child.nodeType === Node.ELEMENT_NODE && ["ul", "ol"].includes(child.tagName.toLowerCase())))
    .map(convertNode).join("").replace(/\s+/g, " ").trim();

  function convertNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/\s+/g, " ");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toLowerCase();
    if (["p", "div"].includes(tag) && node.classList.contains("footnote-definition")) {
      const content = Array.from(node.children).filter((child) => !child.classList.contains("footnote-definition-label")).map(convertNode).join("").trim();
      return `[^${node.id}]: ${content}\n\n`;
    }
    if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${convertChildren(node).trim()}\n\n`;
    if (tag === "p") return `${convertChildren(node).trim()}\n\n`;
    if (tag === "blockquote") return `${convertChildren(node).trim().split("\n").map((line) => `> ${line}`).join("\n")}\n\n`;
    if (tag === "pre") {
      const code = node.querySelector("code");
      const language = code?.className.match(/language-([a-zA-Z0-9_-]+)/)?.[1] || "";
      const fence = String.fromCharCode(96).repeat(3);
      return `${fence}${language}\n${(code || node).textContent.trim()}\n${fence}\n\n`;
    }
    if (tag === "ul" || tag === "ol") {
      const marker = tag === "ol" ? (index) => `${index + 1}. ` : () => "- ";
      return Array.from(node.children).filter((child) => child.tagName.toLowerCase() === "li").map((item, index) => `${marker(index)}${listItem(item)}`).join("\n") + "\n\n";
    }
    if (tag === "hr") return "---\n\n";
    return convertInline(node);
  }

  const markdownFrom = (element) => convertChildren(element).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";

  function startEditor() {
    const body = document.querySelector("[data-local-editor-content]");
    if (!post || !body || document.querySelector(".local-editor-toolbar")) return;
    const original = body.innerHTML;
    body.contentEditable = "true";
    body.classList.add("local-editor-active");
    dock.remove();

    const toolbar = document.createElement("ot-toolbar");
    toolbar.className = "local-editor-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Inline editor");
    toolbar.setAttribute("data-floating", "");
    const status = document.createElement("span");
    status.className = "local-editor-status";
    status.textContent = "Editing locally";
    toolbar.append(status);
    toolbar.append(button("B", "outline small", () => document.execCommand("bold")));
    toolbar.append(button("I", "outline small", () => document.execCommand("italic")));
    toolbar.append(button("H2", "outline small", () => document.execCommand("formatBlock", false, "H2")));
    toolbar.append(button("Link", "outline small", () => { const href = window.prompt("Link URL"); if (href) document.execCommand("createLink", false, href); }));
    toolbar.append(button("Cancel", "ghost small", () => { body.innerHTML = original; body.contentEditable = "false"; body.classList.remove("local-editor-active"); toolbar.remove(); document.body.append(dock); }));
    if (post.draft) toolbar.append(button("Publish", "outline small", () => save(false)));
    toolbar.append(button("Save", "local-editor-save small", () => save(post.draft)));
    document.body.append(toolbar);
    body.focus();

    async function save(draft) {
      status.textContent = "Saving…";
      try {
        const response = await fetch(`/api/content/${encodeURIComponent(post.id)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: post.title, date: post.date, draft, body: markdownFrom(body) }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not save");
        status.textContent = draft ? "Saved locally" : "Published locally";
        window.setTimeout(() => window.location.reload(), 350);
      } catch (error) {
        status.textContent = error.message;
      }
    }
  }

  function init() {
    addStyles();
    window.launchLocalEditor = startEditor;
    dock = document.createElement("div");
    dock.className = "local-editor-dock card hstack";
    dock.append(button("New draft", "outline", () => { window.location.href = `/admin/?new=1&kind=${post?.kind || "blog"}`; }));
    if (post) dock.append(button(post.kind === "page" ? "Edit this page" : "Edit this post", "", startEditor));
    document.body.append(dock);
  }

  let dock;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
