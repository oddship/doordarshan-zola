/**
 * Doordarshan layout adapter for Oatbase footnotes.
 *
 * Oatbase owns reference activation, accessible popovers, and focus behavior.
 * This adapter runs after Oatbase has cloned the untouched definition into its
 * popover, then turns the original definition into a collapsible sidenote and
 * aligns it with the paragraph that references it on wide screens.
 */
(function () {
  function enhance() {
    var footnotes = document.querySelector("ot-footnotes");
    var definitions = Array.from(document.querySelectorAll(".footnote-definition[id]"));
    if (!definitions.length) return;

    var homes = new Map();

    definitions.forEach(function (definition) {
      var label = definition.querySelector(":scope > .footnote-definition-label");
      if (!label || definition.dataset.sidenoteEnhanced === "true") return;

      var home = document.createComment("doordarshan-footnote-home");
      definition.parentNode.insertBefore(home, definition);
      homes.set(definition, home);

      var body = document.createElement("div");
      body.className = "footnote-body";
      while (label.nextSibling) body.appendChild(label.nextSibling);
      definition.appendChild(body);

      var toggle = document.createElement("span");
      toggle.className = "footnote-toggle";
      toggle.textContent = "▸";
      toggle.setAttribute("aria-hidden", "true");
      label.after(toggle);

      var fullText = body.textContent.trim();
      if (fullText) {
        var preview = document.createElement("span");
        preview.className = "footnote-preview";
        preview.textContent = fullText.length > 100 ? fullText.slice(0, 100) + "…" : fullText;
        toggle.after(preview);
      }

      definition.dataset.sidenoteEnhanced = "true";
      definition.setAttribute("tabindex", "0");
      definition.setAttribute("role", "note");
      definition.setAttribute("aria-expanded", "false");

      function toggleDefinition() {
        var expanded = definition.classList.toggle("is-expanded");
        definition.setAttribute("aria-expanded", String(expanded));
      }

      definition.addEventListener("click", function (event) {
        if (event.target.closest("a")) return;
        toggleDefinition();
      });
      definition.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleDefinition();
      });
    });

    function placeDefinitions(wide) {
      definitions.forEach(function (definition) {
        var home = homes.get(definition);
        if (!home) return;

        if (!wide) {
          home.parentNode.insertBefore(definition, home.nextSibling);
          return;
        }

        var reference = document.querySelector('.footnote-reference a[href="#' + CSS.escape(definition.id) + '"]');
        var paragraph = reference && (reference.closest("p") || reference.parentElement);
        if (paragraph && paragraph.parentNode) paragraph.parentNode.insertBefore(definition, paragraph.nextSibling);
      });
    }

    // The prose column is centered, so the full 240px note rail only fits
    // without horizontal overflow once the viewport has roughly 1280px.
    var wideLayout = window.matchMedia("(min-width: 1280px)");
    placeDefinitions(wideLayout.matches);
    wideLayout.addEventListener("change", function (event) { placeDefinitions(event.matches); });

    // Browsers without Popover API keep the original expandable definitions as
    // the reference target. Enhanced browsers leave activation to Oatbase.
    if (!footnotes || footnotes.hasAttribute("data-enhanced")) return;
    document.querySelectorAll('.footnote-reference a[href^="#"]').forEach(function (reference) {
      reference.addEventListener("click", function (event) {
        var target = document.getElementById(decodeURIComponent(reference.hash.slice(1)));
        if (!target) return;
        event.preventDefault();
        target.classList.add("is-expanded");
        target.setAttribute("aria-expanded", "true");
        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhance, { once: true });
  else enhance();
})();
