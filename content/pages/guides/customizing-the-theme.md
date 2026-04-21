+++
title = "Customizing the theme"
description = "The three main ways to adapt Doordarshan for your own site."
date = 2026-04-20
weight = 10
+++

There are three common ways to adapt the theme:

## 1. Update `extra.doordarshan.*`

Start with config. The theme exposes identity, navigation, homepage links, contact details, analytics, and feature flags through namespaced keys.

## 2. Override templates selectively

Zola lets you shadow individual files in your site root.

- `templates/base.html`
- `templates/page.html`
- `static/js/site.js`

## 3. Keep site-only behavior outside the theme

If something is clearly brand-specific, load it from `extra.doordarshan.scripts.additional` instead of baking it into the theme.
