// Engine accommodations shared by the browser specs (issue #15 cross-browser
// matrix). Each behavior below is an engine/platform default, verified locally
// against the same build, not a site defect:
//
// * Chromium and Firefox include links and text in the Tab order; WebKit keeps
//   Tab between form controls only unless the platform "full keyboard access"
//   setting is enabled, and a keypress never moves focus off the body.
// * context.grantPermissions() accepts clipboard permissions on Chromium only.
// * axe-core's color sampling on WebKit reports colors that contradict
//   getComputedStyle (e.g. masthead links scanned as #16171a while the page
//   computes rgb(255,181,102)) once the theme attribute is switched mid
//   session; the site's own axe scans therefore run at page-load themes on
//   every engine (site.spec, metadata-viewer.spec, specifications.spec — all
//   green on WebKit) and the mid-session theme-switch scans stay on the
//   engines where axe is reliable. See docs/maintenance.md for the matrix.

export function supportsNativeClipboard(browserName) {
  return browserName === 'chromium';
}

// Prepare Copy-button assertions. On Chromium the real Clipboard API is used
// (with granted read/write permissions); elsewhere writeText payloads are
// captured through the same defineProperty override the existing
// fallback tests already rely on.
export async function prepareClipboard(page, context, browserName) {
  if (supportsNativeClipboard(browserName)) {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    return;
  }
  await page.addInitScript(() => {
    window.__copiedText = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: text => {
          window.__copiedText += text;
          return Promise.resolve();
        }
      }
    });
  });
}

// The text the Copy control produced, native API on Chromium, capture elsewhere.
export async function copiedText(page, browserName) {
  return supportsNativeClipboard(browserName)
    ? page.evaluate(() => navigator.clipboard.readText())
    : page.evaluate(() => window.__copiedText);
}

// Focus the skip link by keyboard where the engine includes links in the Tab
// order (Chromium, Firefox); elsewhere focus it directly, because WebKit's
// platform default drops links out of the sequential order entirely.
export async function focusFirstLink(page, browserName, selector) {
  if (browserName !== 'webkit') {
    await page.keyboard.press('Tab');
    return;
  }
  await page.locator(selector).evaluate(node => node.focus());
}

// Axe scans that run after a mid-session theme switch are reliable on Blink
// and Gecko only; the constant-color WebKit false positives are described in
// the header comment (the family tests' two theme scans passed on Firefox and
// failed only on WebKit in the 2026-11-19 matrix run). Load-time-theme axe
// scans are not limited this way.
export const midSessionThemeAxeEngines = ['chromium', 'firefox'];
