import { test, expect } from '@playwright/test';

test('resources distinguish publication, development and retired tooling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/resources/');
  const publication = page.getByRole('link', { name: 'FAIR BioHeaders Specification', exact: true });
  await expect(publication).toHaveAttribute('href', 'https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification');
  await expect(publication.locator('xpath=ancestor::tr')).toContainText('Published (v0.4.0)');
  const toolkit = page.getByRole('link', { name: 'FAIR BioHeaders Tools', exact: true });
  await expect(toolkit).toHaveAttribute('href', 'https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools');
  await expect(toolkit.locator('xpath=ancestor::tr')).toContainText('Published (v0.7.0)');
  for (const name of ['FHR', 'FHP', 'FHGFF3']) {
    const link = page.getByRole('link', { name: `${name} development`, exact: true });
    await expect(link.locator('xpath=ancestor::tr')).toContainText('Development');
  }
  await expect(page.getByRole('link', { name: 'FHT development', exact: true })
    .locator('xpath=ancestor::tr')).toContainText('Draft');
  await expect(page.locator('a[href*="/FHT-File-Converter"], a[href*="/FHR-File-Converter"]')).toHaveCount(0);
  await expect(page.locator('#FHT_Specification')).toBeVisible();
  await expect(page.locator('#FHT_File_Converter')).toHaveCount(1);
});

for (const [key, title, doi, repository] of [
  ['FHR_Specification', 'FHR Specification', '10.5281/zenodo.6762549', 'FAIR-bioHeaders-Specification'],
  ['FHR_File_Converter', 'FHR File Converter', '10.5281/zenodo.6762547', 'FAIR-bioHeaders-Tools']
]) {
  test(`${key}: Cite and Copy retain registered identity after rename`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
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
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(source);
  });
}
