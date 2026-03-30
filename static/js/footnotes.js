/**
 * Collapsible footnotes with inline preview.
 * Works in both main site (base.html) and pages section (pages-base.html).
 */
(function() {
  var defs = document.querySelectorAll('.footnote-definition');
  if (!defs.length) return;

  defs.forEach(function(def) {
    var label = def.querySelector('.footnote-definition-label');
    if (!label) return;

    // Wrap content after label in collapsible body
    var body = document.createElement('div');
    body.className = 'footnote-body';
    while (label.nextSibling) {
      body.appendChild(label.nextSibling);
    }
    def.appendChild(body);

    // Toggle indicator
    var toggle = document.createElement('span');
    toggle.className = 'footnote-toggle';
    toggle.textContent = '▸';
    label.after(toggle);

    // Preview: first ~100 chars of footnote text
    var fullText = body.textContent.trim();
    if (fullText) {
      var preview = document.createElement('span');
      preview.className = 'footnote-preview';
      var truncated = fullText.substring(0, 100);
      if (fullText.length > 100) truncated += '…';
      preview.textContent = truncated;
      toggle.after(preview);
    }

    // Click to expand/collapse
    def.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') return;
      def.classList.toggle('is-expanded');
    });

    // Widescreen: reposition next to reference paragraph
    if (window.innerWidth >= 1100) {
      var id = def.id;
      var ref = document.querySelector('.footnote-reference a[href="#' + id + '"]');
      if (!ref) return;

      var refParagraph = ref.closest('p') || ref.parentElement;
      if (refParagraph && refParagraph.parentNode) {
        refParagraph.parentNode.insertBefore(def, refParagraph.nextSibling);
      }
    }
  });

  // Clicking superscript reference toggles its footnote
  document.querySelectorAll('.footnote-reference a').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      var targetId = a.getAttribute('href').replace('#', '');
      var targetDef = document.getElementById(targetId);
      if (targetDef) {
        targetDef.classList.toggle('is-expanded');
        targetDef.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
})();
