# Website maintenance

## Decision for issue #6

Trim the existing theme into a project-specific site instead of merging the entire Academic Pages v0.9 template. The inherited npm version 0.8.1.1 identified the template's 2024 origin, not a deployed theme dependency. The project now has its own package identity. Do not infer that it is upgraded to upstream v0.9.

Keep the home page, maintainer h-cards, publications and their existing URLs, resource/citation guidance, privacy page, and sitemaps. Remove demo posts, CVs, talks, teaching, portfolio, template documentation, fake PDFs, demo images, and comment fixtures. Organization metadata links the project's GitHub identity; person metadata links each maintainer's ORCID. Do not invent a Twitter account or Wikidata identifier to fill empty fields.

The sidebar and footer use text links, eliminating the need to ship full Font Awesome and Academicons fonts. Preserve the upstream attribution and license. The responsive navigation and locally hosted JavaScript remain. Public Sans v2.001 is self-hosted as WOFF2 files in `assets/fonts/public-sans`, with the upstream license. Keep font requests local. Keyboard accessibility, HTTPS links, metadata fallbacks, and a small light/dark preference control are maintained locally.

Analytics and comments are disabled. MathJax is loaded only when a page explicitly sets `math: true`, at a fixed version; no current page needs it. There is no global polyfill. No tracking ID or service is introduced as part of this cleanup.

The former adoption list is removed because the repository did not provide evidence for those deployment claims. The home page now describes the published standard and links maintained repositories. Verified adoption examples can be added with a supporting source.

## Dependencies and checks

`github-pages` is pinned to 232, matching the [published GitHub Pages dependency set](https://pages.github.com/versions/). `Gemfile.lock` pins its resolved dependencies. Ruby 3.3.4 matches the verified Pages image. `package-lock.json` pins the JavaScript build tools; the production bundle uses jQuery 3.7.1. Dependabot proposes updates for Ruby, npm, and Actions. Actions are pinned to immutable commits. CI checks do not alter the existing branch-based Pages publishing configuration.

Builds are verified with the committed lockfiles. Before accepting dependency updates, run the site checks and inspect desktop/mobile rendering and keyboard behavior. Further theme changes should have a concrete benefit to this small project site; avoid reintroducing unused template features.

## Review corrections

The template tag dates from February 2024: in October 2026 this is about 2½ years, rather than the issue title's “~4 years.” The original SEO include already assigned a description fallback, but failed to emit a standard description tag and gated its Open Graph description on page excerpts. Both outputs now use the fallback. A `.nojekyll` file would disable this site's required Jekyll processing and must not be added. The existing `github.io` hostname needs no `CNAME`.

## Acceptance checks

- Demo and utility URLs are absent from the XML sitemap, with no duplicate entries.
- Local links, fragments, and assets pass checks on every PR; external links are checked weekly or on demand.
- Every content page has description and social image metadata; home identities include both maintainer ORCIDs.
- Current pages load no MathJax, polyfill, icon fonts, or analytics. Opted-in math pages emit an explicit marker and must load exactly the pinned MathJax script.
- CI builds with lockfiles; generated JavaScript is reproducible.
