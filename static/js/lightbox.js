/**
 * Mark Zola-rendered Markdown images as Oatbase lightbox items.
 * Oatbase owns the dialog, focus management, keyboard navigation, and display.
 */
(function () {
  var lightbox = document.getElementById("site-lightbox");
  if (!lightbox) return;

  lightbox.querySelectorAll("main article img, main [data-prose] img").forEach(function (image) {
    var link = image.closest("a");
    var item = link && lightbox.contains(link) ? link : image;
    item.setAttribute("data-lightbox-item", "");
    item.setAttribute("tabindex", item.matches("a") ? item.getAttribute("tabindex") || "0" : "0");
    item.style.cursor = "zoom-in";
  });
})();
