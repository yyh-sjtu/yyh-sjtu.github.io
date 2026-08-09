

const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'publications', 'awards']

const getEnglishBlogValue = value => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value.en || value.zh || '';
    }
    return value || '';
}


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
    Promise.all(section_names.map(name =>
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

    // Keep the homepage blog preview in sync with the newest post.
    fetch(content_dir + 'blogs.yml')
        .then(response => response.text())
        .then(text => {
            const posts = jsyaml.load(text)?.posts || [];
            posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
            if (!posts.length) return;
            const latestPost = posts[0];
            document.getElementById('home-blog-title').textContent = getEnglishBlogValue(latestPost.title);
            document.getElementById('home-blog-summary').textContent = getEnglishBlogValue(latestPost.summary);
        })
        .catch(error => console.log(error));

}); 
