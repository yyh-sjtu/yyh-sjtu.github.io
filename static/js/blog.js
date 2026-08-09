const blogContentDir = 'contents/';

const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatBlogDate = value => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
};

const renderBlogTags = tags => (tags || [])
    .map(tag => `<span class="blog-tag">${escapeHtml(tag)}</span>`)
    .join('');

// Protect TeX from Marked so underscores and angle brackets inside formulas
// are not interpreted as Markdown emphasis or HTML before MathJax sees them.
const renderMarkdownWithMath = markdown => {
    const mathFragments = [];
    const preserveMath = (tex, display) => {
        const token = `MATHPLACEHOLDER${mathFragments.length}END`;
        const delimiter = display ? '$$' : '$';
        mathFragments.push({
            token,
            value: `${delimiter}${escapeHtml(tex)}${delimiter}`,
        });
        return token;
    };

    let protectedMarkdown = String(markdown).replace(
        /\$\$([\s\S]*?)\$\$/g,
        (_, tex) => preserveMath(tex, true),
    );
    protectedMarkdown = protectedMarkdown.replace(
        /(^|[^\\])\$([^$\n]+?)\$/gm,
        (_, prefix, tex) => `${prefix}${preserveMath(tex, false)}`,
    );

    let html = marked.parse(protectedMarkdown);
    mathFragments.forEach(({ token, value }) => {
        // A replacer function keeps `$$` literal; replacement strings treat
        // `$$` as the special escape for a single dollar sign.
        html = html.replaceAll(token, () => value);
    });
    return html;
};

const loadBlogConfig = async () => {
    try {
        const response = await fetch(blogContentDir + 'config.yml');
        if (!response.ok) return;
        const config = jsyaml.load(await response.text()) || {};
        if (config['page-top-title']) {
            document.getElementById('page-top-title').textContent = config['page-top-title'];
        }
        if (config['copyright-text']) {
            document.getElementById('copyright-text').innerHTML = config['copyright-text'];
        }
    } catch (error) {
        console.error(error);
    }
};

const renderBlogPage = async () => {
    const listElement = document.getElementById('blog-list');
    const postElement = document.getElementById('blog-post');
    const backLink = document.getElementById('blog-back-link');
    const viewTitle = document.getElementById('blog-view-title');
    const viewDescription = document.getElementById('blog-view-description');

    try {
        const response = await fetch(blogContentDir + 'blogs.yml');
        if (!response.ok) throw new Error(`Unable to load blog index (${response.status})`);

        const data = jsyaml.load(await response.text()) || {};
        const posts = Array.isArray(data.posts) ? data.posts : [];
        posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

        const selectedSlug = new URLSearchParams(window.location.search).get('post');
        if (selectedSlug) {
            const post = posts.find(item => item.slug === selectedSlug);
            if (!post || !/^[a-z0-9-]+$/.test(selectedSlug)) {
                throw new Error('Blog post not found');
            }

            const postResponse = await fetch(`${blogContentDir}blog/${selectedSlug}.md`);
            if (!postResponse.ok) throw new Error(`Unable to load blog post (${postResponse.status})`);

            document.title = `${post.title} · Yunhao Zhou`;
            viewTitle.textContent = 'Blog Post';
            viewDescription.textContent = '';
            listElement.hidden = true;
            backLink.hidden = false;
            postElement.hidden = false;
            postElement.innerHTML = `
                <header class="blog-post-header">
                    <p class="blog-date">${escapeHtml(formatBlogDate(post.date))}</p>
                    <h1>${escapeHtml(post.title)}</h1>
                    <div class="blog-tags">${renderBlogTags(post.tags)}</div>
                </header>
                <div class="main-body blog-post-body">${renderMarkdownWithMath(await postResponse.text())}</div>
            `;
            if (window.MathJax?.typesetPromise) await MathJax.typesetPromise([postElement]);
            return;
        }

        if (posts.length === 0) {
            listElement.innerHTML = '<p class="blog-empty">No posts yet.</p>';
            return;
        }

        listElement.innerHTML = posts.map(post => `
            <article class="blog-card">
                <p class="blog-date">${escapeHtml(formatBlogDate(post.date))}</p>
                <h3><a href="blog.html?post=${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h3>
                <p class="blog-summary">${escapeHtml(post.summary || '')}</p>
                <div class="blog-card-footer">
                    <div class="blog-tags">${renderBlogTags(post.tags)}</div>
                    <a class="blog-read-more" href="blog.html?post=${encodeURIComponent(post.slug)}">
                        Read post&nbsp;<i class="bi bi-arrow-right"></i>
                    </a>
                </div>
            </article>
        `).join('');
    } catch (error) {
        console.error(error);
        viewTitle.textContent = 'Blog unavailable';
        viewDescription.textContent = '';
        listElement.innerHTML = '<p class="blog-empty">Blog posts are temporarily unavailable.</p>';
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const navbarToggler = document.querySelector('.navbar-toggler');
    document.querySelectorAll('#navbarResponsive .nav-link').forEach(navItem => {
        navItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') navbarToggler.click();
        });
    });

    marked.use({ mangle: false, headerIds: false });
    loadBlogConfig();
    renderBlogPage();
});
