+++
title = "Content topology"
description = "How the theme expects sections to be shaped."
date = 2026-04-18
weight = 20
+++

Doordarshan keeps its assumptions intentionally small.

- `blog/_index.md` defines the primary post archive.
- `pages/_index.md` defines the long-form or wiki-style area.
- `contact.md` and `search.md` can stay thin because the theme owns their default templates.

The theme prefers **section source paths** over hard-coded URLs, so you can move the blog or pages roots without rewriting every template.
