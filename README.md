# doordarshan

![Doordarshan screenshot](screenshot.png)

Doordarshan is a Zola theme for a retro Indian terminal/notebook aesthetic: monospace-heavy typography, warm terracotta accents, compact navigation, and a layout that works for blogs, personal sites, and small digital gardens.

- Live demo: https://oddship.github.io/doordarshan-zola/
- Theme repository: https://github.com/oddship/doordarshan-zola

## Features

- homepage hero with optional recent-updates rail
- blog archive and post templates
- wiki/garden-style pages area with sidebar navigation
- project pages with metadata links and optional status badges
- theme-owned contact and search pages
- light/dark mode toggle
- namespaced config contract under `extra.doordarshan.*`
- compatibility fallback for legacy flat keys during migration

## Install

### Git submodule

Prefer HTTPS for widest compatibility:

```bash
git submodule add https://github.com/oddship/doordarshan-zola.git themes/doordarshan
```

If you use SSH keys with GitHub, this works too:

```bash
git submodule add git@github.com:oddship/doordarshan-zola.git themes/doordarshan
```

Then in your site `config.toml`:

```toml
theme = "doordarshan"
compile_sass = true
build_search_index = true
```

### Plain clone

```bash
git clone https://github.com/oddship/doordarshan-zola.git themes/doordarshan
```

## Quick start config

The preferred config surface is namespaced under `extra.doordarshan`.

```toml
[extra.doordarshan.sections]
blog = "blog/_index.md"
pages = "pages/_index.md"

[extra.doordarshan.features]
pages_search = true
site_search = true

[extra.doordarshan.assets]
social_image = "/images/social-card.png"

[extra.doordarshan.homepage]
show_recent = true
recent_limit = 5

[[extra.doordarshan.homepage.links]]
label = "Blog"
url = "/blog/"

[extra.doordarshan.contact]
intro = "Want to get in touch?"
email = "hello@example.com"
response_time = "Usually within a day or two."

[extra.doordarshan.identity]
nav_brand = "~/site"
avatar = "/images/avatar.svg"
homepage_title = "Your Name"
homepage_tagline = "Short homepage tagline"
handwritten_font = "https://fonts.googleapis.com/css2?family=Shrikhand&display=swap"
favicon = "/images/favicon.ico"
github_url = "https://github.com/example/"
twitter_handle = "@example"

[[extra.doordarshan.nav.menu]]
name = "Home"
url = "/"
weight = 1
```

For a complete working example, see the standalone sample site in this repo:
- `config.toml`
- `content/`

## Sample site and local preview

This repository is also a buildable Zola site used for:
- the GitHub Pages demo
- gallery screenshots
- local theme development

Run it locally with Zola:

```bash
zola serve
```

Or build it for production:

```bash
zola build
```

The demo published from `main` is deployed through `.github/workflows/pages.yml`.
That workflow pins the Zola package source and computes `--base-url` dynamically from the repository URL by default. For forks or custom domains, set a repository variable named `PAGES_BASE_URL`.

## Customization model

Zola lets you override any file from the theme by shadowing it in your site root.

Examples:

```text
templates/page.html              -> replace theme page template
static/js/site.js                -> add site-specific behavior
templates/partials/head.html     -> override head markup
```

Use config for the first layer of customization, then override individual templates or static files when you need deeper control.

## Compatibility policy

The theme accepts both:
- namespaced keys under `extra.doordarshan.*`
- legacy flat keys such as `extra.nav_brand`, `extra.menu_main`, `extra.github`, `extra.twitter_handle`, `extra.favicon`, `extra.handwritten_font`, and `extra.umami`

Preference order is:
1. non-empty namespaced values under `extra.doordarshan.*`
2. legacy flat keys
3. theme fallback/default

Analytics is a special case: if `extra.doordarshan.analytics` is present at the site level, it is authoritative, including `enabled = false`. Legacy `extra.umami` is only consulted when the namespaced analytics block is absent.

## Repo layout

```text
config.toml                 sample-site config and Pages demo config
content/                    committed standalone demo content
sass/                       theme styles
static/                     theme assets and JavaScript
templates/                  theme templates
screenshot.png              gallery screenshot for getzola/themes
.github/workflows/pages.yml GitHub Pages deploy for the sample site
```

## License

MIT
