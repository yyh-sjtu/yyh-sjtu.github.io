'use strict';
(() => {
    const choices = ['system', 'light', 'dark'];
    const labels = {system: 'System', light: 'Light', dark: 'Dark'};
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    let choice = 'system';
    try {
        const stored = localStorage.getItem('portfolio-theme');
        if (choices.includes(stored)) choice = stored;
    } catch { /* Theme controls also work when storage is unavailable. */ }
    const apply = () => {
        document.documentElement.dataset.theme = choice === 'system'
            ? (preference.matches ? 'dark' : 'light') : choice;
        const button = document.getElementById('theme-toggle');
        if (button) {
            button.hidden = false;
            button.textContent = `Theme: ${labels[choice]}`;
            button.setAttribute('aria-label', `Theme: ${labels[choice]}. Switch to ${labels[choices[(choices.indexOf(choice) + 1) % choices.length]]}`);
        }
    };
    apply();
    preference.addEventListener('change', () => { if (choice === 'system') apply(); });
    window.addEventListener('storage', event => {
        if (event.key !== 'portfolio-theme' && event.key !== null) return;
        choice = choices.includes(event.newValue) ? event.newValue : 'system';
        apply();
    });
    document.addEventListener('DOMContentLoaded', () => {
        apply();
        document.getElementById('theme-toggle').addEventListener('click', () => {
            choice = choices[(choices.indexOf(choice) + 1) % choices.length];
            try { localStorage.setItem('portfolio-theme', choice); } catch { /* Session-only fallback. */ }
            apply();
        });
    });
})();
