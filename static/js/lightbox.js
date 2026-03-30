/**
 * Image lightbox for article/post content.
 * Click any image to view enlarged; click backdrop or press Escape to close.
 */
(function() {
  // Create overlay element
  var overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  document.body.appendChild(overlay);

  function openLightbox(imgSrc, originalHref) {
    overlay.innerHTML = '';
    var img = document.createElement('img');
    img.src = imgSrc;
    img.alt = 'Enlarged image';
    img.addEventListener('click', function(e) { e.stopPropagation(); });
    overlay.appendChild(img);

    if (originalHref) {
      var link = document.createElement('a');
      link.className = 'lightbox-original-link';
      link.href = originalHref;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Open original ' + String.fromCharCode(8599);
      link.addEventListener('click', function(e) { e.stopPropagation(); });
      overlay.appendChild(link);
    }

    // Force reflow then show
    overlay.offsetHeight;
    overlay.classList.add('is-visible');
  }

  function closeLightbox() {
    overlay.classList.remove('is-visible');
  }

  // Close on backdrop click
  overlay.addEventListener('click', closeLightbox);

  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
  });

  // Attach to all images in article/post content
  var containers = document.querySelectorAll('.post-content, .content, article, .pages-article');
  containers.forEach(function(container) {
    container.querySelectorAll('img').forEach(function(img) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var parentLink = img.closest('a');
        var originalHref = null;
        if (parentLink) {
          var href = parentLink.getAttribute('href');
          if (href && !href.startsWith('#')) {
            originalHref = href;
          }
        }
        openLightbox(img.src, originalHref);
      });

      // Prevent parent <a> from navigating when image is clicked
      var parentLink = img.closest('a');
      if (parentLink) {
        parentLink.addEventListener('click', function(e) {
          if (e.target === img || img.contains(e.target)) {
            e.preventDefault();
          }
        });
      }
    });
  });
})();
