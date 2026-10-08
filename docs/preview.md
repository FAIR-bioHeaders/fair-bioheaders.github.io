# Local preview and validation

## Ruby and Node

Use Ruby from `.ruby-version` and Node from `.nvmrc`. Install Bundler 2.5.11, then run:

```sh
bundle install
npm ci --ignore-scripts
npm run build:js
JEKYLL_ENV=production bundle exec jekyll build --strict_front_matter
python3 scripts/check_site.py _site
bundle exec jekyll serve --host 127.0.0.1 --url http://127.0.0.1:4000
```

Open `http://127.0.0.1:4000`. Check desktop and narrow widths, keyboard focus, overflow navigation, theme switching, and the affected publication pages. Both dependency lockfiles are committed. Regenerate the JavaScript bundle after editing its source.

## Docker fallback

The verified image uses Ruby 3.3.4 and the GitHub Pages 232 gems. Pin the digest below instead of a moving tag. Dependencies and caches inside this disposable container do not change your host Ruby installation:

```sh
docker run --rm --entrypoint sh \
  -e BUNDLE_APP_CONFIG=/tmp/bundle-config \
  -v "$PWD":/srv/jekyll -w /srv/jekyll \
  jekyll/jekyll:pages@sha256:84c438252aacc4f0af02ff7598954be82480d49928dff3f99384301f803515d7 \
  -c 'bundle install && JEKYLL_ENV=production bundle exec jekyll build --strict_front_matter'
python3 scripts/check_site.py _site
```

Serve the rendered files with `python3 scripts/preview.py`. Node is still needed on the host to rebuild JavaScript. The container build is a preview; Ruby CI installs the committed dependency set from scratch.

## Browser and accessibility checks

After building `_site`, run the Playwright suite. It serves the site the same
way GitHub Pages resolves extensionless URLs, then checks desktop and 320px
layouts in both themes for horizontal overflow and masthead clearance, the skip
link, the overflow menu (including Escape), theme persistence, console errors,
the Cite/Copy interaction, and axe accessibility scans:

```sh
npx playwright install --with-deps chromium
npm run test:browser
```

## Deployed-site smoke check

A green source build does not prove the live endpoints are current. After a
deployment, check the public homepage, sitemap, robots policy, and feeds, and
parse the live XML sitemap (production origin, unique URLs, intended pages,
reachable targets). It retries for propagation:

```sh
npm run test:deploy
```

## CI

Every PR and push to `main` rebuilds JavaScript, verifies that the committed bundle matches, builds Jekyll, runs the Python and Node regression tests, the Playwright browser/accessibility suite, and checks local links, CSS assets, fragments, sitemap URLs, metadata, and project identities. The workflow uploads `_site` as a preview artifact. Weekly and manual runs also check external links with Lychee; third-party rate limits may require a retry. A separate workflow runs the deployed-site smoke check after the Pages deployment completes.
