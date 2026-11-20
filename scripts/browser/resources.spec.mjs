import { test, expect } from '@playwright/test';
import { prepareClipboard, copiedText } from './engine-helpers.mjs';

test('resources distinguish publication, development and retired tooling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/resources/');
  const publication = page.getByRole('link', { name: 'FAIR BioHeaders Specification', exact: true });
  await expect(publication).toHaveAttribute('href', 'https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification');
  await expect(publication.locator('xpath=ancestor::tr')).toContainText('Published (v0.6.0)');
  const toolkit = page.getByRole('link', { name: 'FAIR BioHeaders Tools', exact: true });
  await expect(toolkit).toHaveAttribute('href', 'https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools');
  await expect(toolkit.locator('xpath=ancestor::tr')).toContainText('Published (v0.12.0)');
  // Each version DOI link must name the release it points at: both records below
  // were re-checked as registered and `findable` in DataCite (specification on
  // 2026-11-14, toolkit v0.12.0 on 2026-11-18).
  for (const [key, release, doi] of [
    ['FHR_Specification', 'v0.6.0', '10.5281/zenodo.24223950'],
    ['FHR_File_Converter', 'v0.12.0', '10.5281/zenodo.24292408'],
  ]) {
    const versionLink = page.locator(`#${key} .reference__version`);
    await expect(versionLink).toHaveText(`${release} version DOI`);
    await expect(versionLink).toHaveAttribute('href', `https://doi.org/${doi}`);
  }
  // FHP is Draft (not yet a verified release); the rest remain Development.
  for (const name of ['FHR', 'FHGFF3']) {
    const link = page.getByRole('link', { name: `${name} development`, exact: true });
    await expect(link.locator('xpath=ancestor::tr')).toContainText('Development');
  }
  await expect(page.getByRole('link', { name: 'FHP development', exact: true })
    .locator('xpath=ancestor::tr')).toContainText('Draft');
  await expect(page.getByRole('link', { name: 'FHT development', exact: true })
    .locator('xpath=ancestor::tr')).toContainText('Development');
  await expect(page.locator('a[href*="/FHT-File-Converter"], a[href*="/FHR-File-Converter"]')).toHaveCount(0);
  await expect(page.locator('#FHT_Specification')).toBeVisible();
  await expect(page.locator('#FHT_File_Converter')).toHaveCount(1);
});

for (const [key, title, doi, repository] of [
  ['FHR_Specification', 'FHR Specification', '10.5281/zenodo.6762549', 'FAIR-bioHeaders-Specification'],
  ['FHR_File_Converter', 'FHR File Converter', '10.5281/zenodo.6762547', 'FAIR-bioHeaders-Tools']
]) {
  test(`${key}: Cite and Copy retain registered identity after rename`, async ({ page, context, browserName }) => {
    await prepareClipboard(page, context, browserName);
    await page.goto('/resources/');
    const reference = page.locator(`#${key}`);
    await reference.locator('.cite-button').click();
    const source = await reference.locator('.cite-output').innerText();
    expect(source).toContain(`title = {${title}}`);
    expect(source).toContain(`doi = {${doi}}`);
    expect(source).toContain(`url = {https://github.com/FAIR-bioHeaders/${repository}}`);
    expect(source).toContain('author = {Molik, David and Wright, Adam}');
    expect(source).toContain('year = {2026}');
    await expect(reference.locator('.reference__version')).toBeVisible();
    await reference.locator('.cite-copy').click();
    await expect(reference.locator('.cite-copy')).toHaveText('Copied');
    expect(await copiedText(page, browserName)).toBe(source);
  });
}
