'use strict';
const menuToggle = document.querySelector('.menu-toggle');
const siteLinks = document.getElementById('site-links');
function closeMenu() {
    menuToggle.setAttribute('aria-expanded', 'false');
    siteLinks.classList.remove('is-open');
}
menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    siteLinks.classList.toggle('is-open', !expanded);
});
siteLinks.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menuToggle.focus();
    }
});

