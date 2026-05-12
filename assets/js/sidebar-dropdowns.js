document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.querySelector('.sidebar-navigation .content-nav');
  if (!navContainer) {
    return;
  }

  const dropdowns = Array.from(navContainer.querySelectorAll('li.dropdown'));
  if (!dropdowns.length) {
    return;
  }

  const collapseDropdown = (dropdown) => {
    dropdown.classList.remove('is-open');
    const trigger = dropdown.querySelector('a');
    const submenu = dropdown.querySelector('ul');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
    if (submenu) {
      submenu.style.display = 'none';
      submenu.setAttribute('aria-hidden', 'true');
    }
  };

  dropdowns.forEach((dropdown, index) => {
    const trigger = dropdown.querySelector('a');
    const submenu = dropdown.querySelector('ul');

    if (!trigger || !submenu) {
      return;
    }

    const submenuId = submenu.id || `sidebar-submenu-${index}`;
    submenu.id = submenuId;

    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', submenuId);
    trigger.setAttribute('role', 'button');

    submenu.style.display = 'none';
    submenu.setAttribute('aria-hidden', 'true');

    trigger.addEventListener('click', (event) => {
      event.preventDefault();

      const isOpen = dropdown.classList.contains('is-open');

      dropdowns.forEach((otherDropdown) => {
        if (otherDropdown !== dropdown) {
          collapseDropdown(otherDropdown);
        }
      });

      if (isOpen) {
        collapseDropdown(dropdown);
      } else {
        dropdown.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        submenu.style.display = 'block';
        submenu.setAttribute('aria-hidden', 'false');
      }
    });
  });
});
