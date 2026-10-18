"""Check static entry points for broken local assets, duplicate IDs and anchors."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.ids, self.refs, self.errors = path, set(), [], []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                self.errors.append(f'duplicate id: {attrs["id"]}')
            self.ids.add(attrs['id'])
        for key in ('href', 'src'):
            if key in attrs:
                self.refs.append(attrs[key])
        if tag == 'img' and 'alt' not in attrs:
            self.errors.append('image without alt attribute')

pages = {name: Page(ROOT / name) for name in ('index.html', 'blog.html')}
errors = []
for name, page in pages.items():
    errors.extend(f'{name}: {error}' for error in page.errors)
    for ref in page.refs:
        parsed = urlsplit(ref)
        if parsed.scheme or parsed.netloc:
            continue
        target = (page.path.parent / unquote(parsed.path)).resolve() if parsed.path else page.path
        if target.is_dir():
            target /= 'index.html'
        if not target.is_file():
            errors.append(f'{name}: missing local target {ref}')
        target_page = pages.get(target.name)
        if parsed.fragment and target_page and unquote(parsed.fragment) not in target_page.ids:
            errors.append(f'{name}: missing anchor {ref}')
if errors:
    raise SystemExit('\n'.join(errors))
print('PASS: local assets, anchors, unique IDs, and image alternatives in both entry points')
