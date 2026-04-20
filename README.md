# doordarshan

Doordarshan is a Zola theme for a retro Indian terminal/notebook aesthetic.

This repository currently uses the theme in-place while extracting site-specific behavior out of the root site. The goal is for the theme to own reusable presentation defaults while the site root stays a thin layer of content, config, and brand assets.

## Theme contract

The preferred config surface is namespaced under `extra.doordarshan`.

```toml
[extra.doordarshan.sections]
blog = "blog/_index.md"
pages = "pages/_index.md"

[extra.doordarshan.features]
pages_search = true

[extra.doordarshan.assets]
social_image = "/images/social-card.png"

[extra.doordarshan.identity]
nav_brand = "~/site"
avatar = "/images/avatar.jpg"
homepage_title = "Your Name"
homepage_tagline = "Short homepage tagline"
handwritten_font = "https://fonts.googleapis.com/css2?family=Shrikhand&display=swap"
favicon = "/images/favicon.ico"
github_url = "https://github.com/example/"
twitter_handle = "@example"

# Optional: when this block is present it is authoritative and does not fall
# back to legacy `extra.umami` keys.
[extra.doordarshan.analytics]
enabled = false
script_url = ""
website_id = ""

[[extra.doordarshan.nav.menu]]
name = "Home"
url = "/"
weight = 1
```

## Current compatibility policy

During extraction, the theme accepts both:
- namespaced keys under `extra.doordarshan.*`
- legacy flat site keys such as `extra.nav_brand`, `extra.menu_main`, `extra.github`, `extra.twitter_handle`, `extra.favicon`, `extra.handwritten_font`, and `extra.umami`

Preference order is:
1. non-empty namespaced values under `extra.doordarshan.*`
2. legacy flat keys
3. theme fallback/default

The flat keys are transitional. New work should target `extra.doordarshan.*`.

Analytics is a special case: if `extra.doordarshan.analytics` is present at the
site level, it is treated as authoritative, including `enabled = false`. Legacy
`extra.umami` is only consulted when the namespaced analytics block is absent.

## Identity split

### Theme-owned concerns
- layout templates
- design system styles
- reusable navigation/footer/head behavior
- optional theme features behind config flags
- fallback assets where practical

### Site-owned concerns
- content markdown
- brand assets and identity text
- site-specific scripts that are not reusable theme behavior
- analytics credentials

## Section model

The theme prefers a small number of source section paths, such as:
- `extra.doordarshan.sections.blog`
- `extra.doordarshan.sections.pages`

Templates should derive URLs from the section objects (`get_section(...).permalink`, `section.path`) rather than duplicating a separate path config.

## Known in-progress extraction items

The following are still being normalized toward a cleaner theme/site split:
- homepage defaults
- 404 defaults
- root template overrides
- site-specific easter eggs script
- pages search topology assumptions
- fallback social asset ownership
