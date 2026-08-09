const blogContentDir = 'contents/';

const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const blogCopy = {
    en: {
        heroEyebrow: "YUNHAO ZHOU'S BLOG",
        heroTitle: 'Notes & Ideas',
        heroDescription: 'Research notes, engineering practice, and ideas worth remembering.',
        allPosts: 'All Posts',
        allPostsDescription: 'The latest writing, sorted from newest to oldest.',
        blogPost: 'Blog Post',
        backToPosts: 'All posts',
        readPost: 'Read post',
        noPosts: 'No posts yet.',
        unavailable: 'Blog unavailable',
        unavailableDescription: 'Blog posts are temporarily unavailable.',
    },
    zh: {
        heroEyebrow: 'YUNHAO ZHOU 的博客',
        heroTitle: '笔记与思考',
        heroDescription: '记录研究笔记、工程实践和值得保留的想法。',
        allPosts: '全部文章',
        allPostsDescription: '按发布时间从新到旧排列。',
        blogPost: '博客文章',
        backToPosts: '全部文章',
        readPost: '阅读全文',
        noPosts: '暂时还没有文章。',
        unavailable: '博客暂不可用',
        unavailableDescription: '目前无法加载博客文章。',
    },
};

const getCurrentLanguage = () => {
    const language = new URLSearchParams(window.location.search).get('lang');
    return language === 'zh' ? 'zh' : 'en';
};

const getLocalizedValue = (value, language) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value[language] || value.en || value.zh || '';
    }
    return value || '';
};

const buildBlogUrl = (language, slug = '') => {
    const params = new URLSearchParams();
    if (slug) params.set('post', slug);
    if (language !== 'en') params.set('lang', language);
    const query = params.toString();
    return `blog.html${query ? `?${query}` : ''}`;
};

const formatBlogDate = (value, language) => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en', {
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
    const language = getCurrentLanguage();
    const copy = blogCopy[language];

    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.getElementById('blog-hero-eyebrow').textContent = copy.heroEyebrow;
    document.getElementById('blog-hero-title').textContent = copy.heroTitle;
    document.getElementById('blog-hero-description').textContent = copy.heroDescription;
    document.querySelectorAll('[data-blog-language]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.blogLanguage === language));
    });

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

            const postPath = getLocalizedValue(post.content, language) || `blog/${selectedSlug}.md`;
            const postResponse = await fetch(`${blogContentDir}${postPath}`);
            if (!postResponse.ok) throw new Error(`Unable to load blog post (${postResponse.status})`);

            const postTitle = getLocalizedValue(post.title, language);
            document.title = `${postTitle} · Yunhao Zhou`;
            viewTitle.textContent = copy.blogPost;
            viewDescription.textContent = '';
            listElement.hidden = true;
            backLink.hidden = false;
            backLink.href = buildBlogUrl(language);
            backLink.innerHTML = `<i class="bi bi-arrow-left"></i>&nbsp;${escapeHtml(copy.backToPosts)}`;
            postElement.hidden = false;
            postElement.innerHTML = `
                <header class="blog-post-header">
                    <p class="blog-date">${escapeHtml(formatBlogDate(post.date, language))}</p>
                    <h1>${escapeHtml(postTitle)}</h1>
                    <div class="blog-tags">${renderBlogTags(post.tags)}</div>
                </header>
                <div class="main-body blog-post-body">${renderMarkdownWithMath(await postResponse.text())}</div>
            `;
            if (window.MathJax?.typesetPromise) await MathJax.typesetPromise([postElement]);
            return;
        }

        if (posts.length === 0) {
            listElement.innerHTML = `<p class="blog-empty">${escapeHtml(copy.noPosts)}</p>`;
            return;
        }

        viewTitle.textContent = copy.allPosts;
        viewDescription.textContent = copy.allPostsDescription;

        listElement.innerHTML = posts.map(post => `
            <article class="blog-card">
                <p class="blog-date">${escapeHtml(formatBlogDate(post.date, language))}</p>
                <h3><a href="${buildBlogUrl(language, post.slug)}">${escapeHtml(getLocalizedValue(post.title, language))}</a></h3>
                <p class="blog-summary">${escapeHtml(getLocalizedValue(post.summary, language))}</p>
                <div class="blog-card-footer">
                    <div class="blog-tags">${renderBlogTags(post.tags)}</div>
                    <a class="blog-read-more" href="${buildBlogUrl(language, post.slug)}">
                        ${escapeHtml(copy.readPost)}&nbsp;<i class="bi bi-arrow-right"></i>
                    </a>
                </div>
            </article>
        `).join('');
    } catch (error) {
        console.error(error);
        const language = getCurrentLanguage();
        const copy = blogCopy[language];
        viewTitle.textContent = copy.unavailable;
        viewDescription.textContent = '';
        listElement.innerHTML = `<p class="blog-empty">${escapeHtml(copy.unavailableDescription)}</p>`;
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
    document.querySelectorAll('[data-blog-language]').forEach(button => {
        button.addEventListener('click', () => {
            const url = new URL(window.location.href);
            const language = button.dataset.blogLanguage;
            if (language === 'en') url.searchParams.delete('lang');
            else url.searchParams.set('lang', language);
            window.location.assign(url.toString());
        });
    });
    loadBlogConfig();
    renderBlogPage();
});
