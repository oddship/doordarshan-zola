# doordarshan

Doordarshan is a Zola theme for a retro Indian terminal/notebook aesthetic.

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

Then in your `config.toml`:

```toml
theme = "doordarshan"
compile_sass = true
build_search_index = true
```

## Theme contract

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
show_recent = false
recent_limit = 5

[[extra.doordarshan.homepage.links]]
label = "Blog"
url = "/blog/"

[extra.doordarshan.scripts]
additional = ["js/site-only.js"]

[extra.doordarshan.contact]
intro = "Want to get in touch?"
email = "hello@example.com"
response_time = "Usually within a day or two."

[[extra.doordarshan.contact.links]]
label = "GitHub"
url = "https://github.com/example"
description = "code & projects"

[extra.doordarshan.identity]
nav_brand = "~/site"
avatar = "/images/avatar.jpg"
homepage_title = "Your Name"
homepage_tagline = "Short homepage tagline"
handwritten_font = "https://fonts.googleapis.com/css2?family=Shrikhand&display=swap"
favicon = "/images/favicon.ico"
github_url = "https://github.com/example/"
twitter_handle = "@example"

[extra.doordarshan.analytics]
enabled = false
script_url = ""
website_id = ""

[[extra.doordarshan.nav.menu]]
name = "Home"
url = "/"
weight = 1
```

## Compatibility policy

The theme accepts both:
- namespaced keys under `extra.doordarshan.*`
- legacy flat keys such as `extra.nav_brand`, `extra.menu_main`, `extra.github`, `extra.twitter_handle`, `extra.favicon`, `extra.handwritten_font`, and `extra.umami`

Preference order is:
1. non-empty namespaced values under `extra.doordarshan.*`
2. legacy flat keys
3. theme fallback/default

Analytics is a special case: if `extra.doordarshan.analytics` is present at the site level, it is authoritative, including `enabled = false`. Legacy `extra.umami` is only consulted when the namespaced analytics block is absent.

## Ownership model

### Theme-owned
- layout templates
- design system styles
- homepage, 404, contact, and search defaults
- pages navigation/search UI
- blog archive behavior
- optional features behind config flags

### Site-owned
- content markdown
- brand assets and identity text
- contact details and external profile links
- analytics credentials
- site-specific scripts loaded via `extra.doordarshan.scripts.additional`

## Section model

The theme follows configured content roots via:
- `extra.doordarshan.sections.blog`
- `extra.doordarshan.sections.pages`

Pages navigation, pages search, and blog archive links follow those configured roots instead of assuming `/pages/` and `/blog/`.

## Search features

- `extra.doordarshan.features.pages_search` enables scoped sidebar search for the configured pages section.
- `extra.doordarshan.features.site_search` enables the standalone site search page.
- Site search expects `build_search_index = true`.
- The search page resolves `search_index.<lang>.js` from `page.lang` or `config.default_language`.
