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

// Enhance the static bibliography: every paper remains readable without JavaScript.
const paperSearch = document.getElementById('paper-search');
const paperYear = document.getElementById('paper-year');
const papers = [...document.querySelectorAll('.publication-list > li')];
function filterPapers() {
    const query = paperSearch.value.trim().toLocaleLowerCase();
    let visible = 0;
    papers.forEach(paper => {
        const matches = (paperYear.value === 'all' || paper.dataset.year === paperYear.value)
            && paper.textContent.toLocaleLowerCase().includes(query);
        paper.hidden = !matches;
        if (matches) visible++;
    });
    document.getElementById('paper-count').textContent = `${visible} of ${papers.length} papers`;
    document.getElementById('paper-empty').hidden = visible !== 0;
}
document.getElementById('publication-controls').hidden = false;
paperSearch.addEventListener('input', filterPapers);
paperYear.addEventListener('change', filterPapers);
document.getElementById('paper-reset').addEventListener('click', () => {
    paperSearch.value = '';
    paperYear.value = 'all';
    filterPapers();
    paperSearch.focus();
});
filterPapers();
