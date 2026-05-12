  // Init AOS
  AOS.init({ once: true, duration: 600, easing: 'ease-out' });

  // Utility: make sure AOS recalculates after dynamic content changes
  const refreshAOS = () => {
    if (window.AOS) {
      if (typeof AOS.refreshHard === 'function') {
        AOS.refreshHard();
      } else {
        AOS.refresh();
      }
    }
  };

  // GSAP: gentle entrance for the hero area
  gsap.from('.post-title', { y: 20, opacity: 0, duration: .6 });
  gsap.from('#article-shell .lead-intro', { y: 14, opacity: 0, duration: .6, delay: .05 });

  // Subtle parallax for the right rail on scroll (desktop only)
  if (window.matchMedia('(min-width: 1200px)').matches) {
    gsap.to('#right-rail', {
      y: 0,
      scrollTrigger: {
        trigger: '#article-shell',
        start: 'top top+=96',
        end: 'bottom 80%',
        scrub: 0.2
      }
    });
  }
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (scrollTopBtn) {
    const toggleScrollTop = () => {
      if (window.scrollY > 240) {
        scrollTopBtn.classList.add('show');
      } else {
        scrollTopBtn.classList.remove('show');
      }
    };

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', toggleScrollTop);
    window.addEventListener('load', toggleScrollTop);
  }

  const initToggleButtons = () => {
    const buttons = document.querySelectorAll('.toggle-btn');
    if (!buttons.length) {
      return;
    }

    const bootstrapAvailable = typeof bootstrap !== 'undefined' && bootstrap.Collapse;

    buttons.forEach((btn) => {
      const selector = btn.dataset.target || btn.dataset.bsTarget;
      if (!selector) {
        return;
      }

      const panel = document.querySelector(selector);
      if (!panel) {
        return;
      }

      const panelId = panel.id || selector.replace('#', '');
      if (panelId) {
        btn.setAttribute('aria-controls', panelId);
      }
      btn.setAttribute('aria-expanded', panel.classList.contains('show') ? 'true' : 'false');

      const setExpanded = (expanded) => {
        btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        refreshAOS();
      };

      if (bootstrapAvailable) {
        panel.classList.add('collapse');
        const instance = bootstrap.Collapse.getOrCreateInstance(panel, { toggle: false });

        btn.addEventListener('click', (event) => {
          event.preventDefault();
          instance.toggle();
        });

        panel.addEventListener('shown.bs.collapse', () => setExpanded(true));
        panel.addEventListener('hidden.bs.collapse', () => setExpanded(false));
      } else {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const isOpen = panel.classList.contains('show');
          panel.classList.toggle('show', !isOpen);
          panel.style.display = isOpen ? 'none' : 'block';
          setExpanded(!isOpen);
        });
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToggleButtons);
  } else {
    initToggleButtons();
  }
  document.addEventListener('DOMContentLoaded', function () {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl =>
      new bootstrap.Tooltip(tooltipTriggerEl, { placement: 'top' })
      );
  });
