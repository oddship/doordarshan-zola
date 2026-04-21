+++
title = "Welcome to Doordarshan"
description = "A quick tour of the visual language and defaults built into the theme."
date = 2026-04-21
[taxonomies]
tags = ["theme", "zola", "demo"]
+++

Doordarshan is built for people who like their sites to feel deliberate: a little terminal, a little notebook, and just enough ornament to stay warm.

## What the theme tries to optimize for

- readable long-form text
- lightweight navigation
- a homepage that works with only a few config values
- room for a small wiki or digital-garden section

```ts
export function navBrand(value: string): string {
  return value.trim() || "~/dd";
}
```

You can keep the defaults, override individual templates, or treat the whole thing as a starting point for a deeply personal site.
