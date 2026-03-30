// Sidebar toggle for pages section
document.addEventListener('click', e => {
  const toggle = e.target.closest('[data-sidebar-toggle]');
  if (toggle) {
    toggle.closest('[data-sidebar-layout]')?.toggleAttribute('data-sidebar-open');
    return;
  }
  if (!e.target.closest('[data-sidebar]')) {
    const layout = document.querySelector('[data-sidebar-layout][data-sidebar-open]');
    if (layout && window.matchMedia('(max-width: 640px)').matches) {
      layout.removeAttribute('data-sidebar-open');
    }
  }
});
