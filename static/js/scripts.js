

const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'publications', 'awards']

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

const renderBlog = async (contentReady) => {
    const listElement = document.getElementById('blog-list');
    const postElement = document.getElementById('blog-post');
    const backLink = document.getElementById('blog-back-link');

    try {
        const response = await fetch(content_dir + 'blogs.yml');
        if (!response.ok) throw new Error(`Unable to load blog index (${response.status})`);

        const data = jsyaml.load(await response.text()) || {};
        const posts = Array.isArray(data.posts) ? data.posts : [];
        posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

        const selectedSlug = new URLSearchParams(window.location.search).get('blog');
        if (selectedSlug) {
            const post = posts.find(item => item.slug === selectedSlug);
            if (!post || !/^[a-z0-9-]+$/.test(selectedSlug)) {
                throw new Error('Blog post not found');
            }

            const postResponse = await fetch(`${content_dir}blog/${selectedSlug}.md`);
            if (!postResponse.ok) throw new Error(`Unable to load blog post (${postResponse.status})`);

            document.title = `${post.title} · ${document.title}`;
            listElement.hidden = true;
            backLink.hidden = false;
            postElement.hidden = false;
            postElement.innerHTML = `
                <header class="blog-post-header">
                    <p class="blog-date">${escapeHtml(formatBlogDate(post.date))}</p>
                    <h1>${escapeHtml(post.title)}</h1>
                    <div class="blog-tags">${renderBlogTags(post.tags)}</div>
                </header>
                <div class="main-body blog-post-body">${marked.parse(await postResponse.text())}</div>
            `;
            await contentReady;
            if (window.MathJax?.typesetPromise) await MathJax.typesetPromise([postElement]);
            document.getElementById('blog').scrollIntoView();
            return;
        }

        if (posts.length === 0) {
            listElement.innerHTML = '<p class="blog-empty">No posts yet.</p>';
            return;
        }

        listElement.innerHTML = posts.map(post => `
            <article class="blog-card">
                <p class="blog-date">${escapeHtml(formatBlogDate(post.date))}</p>
                <h3><a href="?blog=${encodeURIComponent(post.slug)}#blog">${escapeHtml(post.title)}</a></h3>
                <p class="blog-summary">${escapeHtml(post.summary || '')}</p>
                <div class="blog-card-footer">
                    <div class="blog-tags">${renderBlogTags(post.tags)}</div>
                    <a class="blog-read-more" href="?blog=${encodeURIComponent(post.slug)}#blog">
                        Read post&nbsp;<i class="bi bi-arrow-right"></i>
                    </a>
                </div>
            </article>
        `).join('');
    } catch (error) {
        console.error(error);
        listElement.innerHTML = '<p class="blog-empty">Blog posts are temporarily unavailable.</p>';
    }
};


window.addEventListener('DOMContentLoaded', event => {

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });


    // Yaml
    fetch(content_dir + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                try {
                    document.getElementById(key).innerHTML = yml[key];
                } catch {
                    console.log("Unknown id and value: " + key + "," + yml[key].toString())
                }

            })
        })
        .catch(error => console.log(error));


    // Marked
    marked.use({ mangle: false, headerIds: false })
    const contentReady = Promise.all(section_names.map(name =>
        fetch(content_dir + name + '.md')
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                document.getElementById(name + '-md').innerHTML = html;
            })
            .catch(error => console.log(error))
    )).then(() => MathJax.typesetPromise(
        section_names.map(name => document.getElementById(name + '-md'))
    ));

    renderBlog(contentReady);

}); 
