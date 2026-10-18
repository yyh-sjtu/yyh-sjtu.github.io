'use strict';
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

const experienceGrid = document.querySelector('.home-overview');
const experiencePanels = {
    education: document.querySelector('.home-background'),
    work: document.querySelector('.home-career'),
};
document.getElementById('experience-controls').hidden = false;
document.querySelectorAll('[data-experience]').forEach(button => {
    button.addEventListener('click', () => {
        const view = button.dataset.experience;
        document.querySelectorAll('[data-experience]').forEach(item => {
            item.setAttribute('aria-pressed', String(item === button));
        });
        Object.entries(experiencePanels).forEach(([key, panel]) => {
            panel.hidden = view !== 'all' && view !== key;
        });
        experienceGrid.classList.toggle('focused-experience', view !== 'all');
        document.getElementById('experience-status').textContent = view === 'all'
            ? 'Showing education and work experience.'
            : view === 'education' ? 'Showing 3 academic experiences.' : 'Showing 3 industry experiences.';
    });
});
