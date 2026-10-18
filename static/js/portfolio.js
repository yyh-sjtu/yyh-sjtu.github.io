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

const projectDialog = document.getElementById('project-dialog');
const projectData = {
    sglang: {name: 'SGLang', repository: 'https://github.com/sgl-project/sglang'},
    openevolve: {name: 'OpenEvolve', repository: 'https://github.com/algorithmicsuperintelligence/openevolve'},
};
if (typeof projectDialog.showModal === 'function') {
    document.querySelectorAll('[data-project]').forEach(button => {
        button.hidden = false;
        button.addEventListener('click', () => {
            const project = projectData[button.dataset.project];
            document.getElementById('project-dialog-title').textContent = project.name;
            document.getElementById('project-repository').href = project.repository;
            document.getElementById('project-contributions').href = `${project.repository}/pulls?q=${encodeURIComponent('is:pr author:yyh-sjtu')}`;
            projectDialog.showModal();
        });
    });
    // Native dialog supplies focus containment, Escape dismissal, and focus return.
    projectDialog.addEventListener('click', event => {
        if (event.target !== projectDialog) return;
        const rect = projectDialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right
            || event.clientY < rect.top || event.clientY > rect.bottom) projectDialog.close();
    });
}
