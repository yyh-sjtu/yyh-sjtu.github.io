# Portfolio redesign

This buildless redesign is developed on `codex/website-redesign`. The production branch remains `new_template` until the redesign is explicitly approved for release.

## Preview

Run `python3 -m http.server 8765 --bind 127.0.0.1` from the repository and open http://127.0.0.1:8765/. Use HTTP for the blog because it fetches Markdown and YAML content.

## Content and presentation

- `index.html` contains the homepage biography, experience, bibliography, awards and project links. These are static so core content remains available without JavaScript. Update this file for the redesigned homepage; the old `contents/home.md`, `publications.md`, and `awards.md` are retained as legacy template sources.
- `static/css/portfolio.css` contains the shared design tokens, responsive homepage, themes and controls; `writing.css` styles the blog.
- `static/js/portfolio.js` progressively enhances publications, experience and project details. `navigation.js` shares mobile navigation; `theme.js` applies the saved or system theme before painting.
- `contents/blogs.yml` and its referenced Markdown files remain the source of truth for bilingual posts. Search and topic filters are included in the blog URL.
- Existing photos and logos are reused. The project detail links show public PR history without maintaining a stale contribution count.

## Validation

Run `python3 scripts/check-site.py` and JavaScript syntax checks (`node --check` for the four custom scripts). In the browser check desktop and 390px mobile layouts, menu keyboard dismissal, publication search/year intersection and reset, experience views, English/Chinese article navigation, blog query/topic persistence, theme persistence across pages, and dialog focus/Escape behavior. Also check the empty search state.

Original template license and asset provenance documents are retained in this repository.
