  window.addEventListener('DOMContentLoaded', () => {
    AOS.init({ once: false, duration: 450, easing: 'ease-out' });
    // Smooth-scroll for sidebar links
    document.querySelectorAll('.category-link').forEach(a => {
      a.addEventListener('click', () => {
        const hash = a.getAttribute('href');
        if (hash && hash.startsWith('#')) {
          const el = document.querySelector(hash);
          if (el) {
            setTimeout(() => {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150); // allow offcanvas to close first
          }
        }
      });
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl =>
      new bootstrap.Tooltip(tooltipTriggerEl, { placement: 'top' })
      );
  });
