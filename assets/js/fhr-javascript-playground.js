/* Page controls for the FHR JavaScript examples; MPL-2.0. */
(function () {
  'use strict';
  const source = document.getElementById('fhr-json-input');
  if (!source) return;
  const display = document.getElementById('fhr-playground-display');
  const status = document.getElementById('fhr-playground-status');
  const output = document.getElementById('fhr-query-output');
  const template = document.getElementById('fhr-microdata-template');
  const original = FhrExamples.readMicrodata(template.content.querySelector('[itemscope]'));
  source.value = JSON.stringify(original, null, 2);
  function run(action) {
    display.json = ''; output.textContent = '';
    try {
      // Apply the display adapter's bounds/numeric checks before JSON.parse.
      display.json = source.value;
      const record = JSON.parse(source.value);
      if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record.schema !== 'string' ||
          !/^https:\/\/w3id\.org\/fair-bioheaders\/fhr\/v(?:0\.4\.0|0\.3\.1)$/.test(record.schema)) {
        throw new Error('Use an FHR v0.4.0 or v0.3.1 JSON example.');
      }
      if (action === 'edit') {
        const copy = structuredClone(record);
        copy.genome = 'My JavaScript example';
        source.value = JSON.stringify(copy, null, 2);
        display.json = source.value;
      }
      output.textContent = JSON.stringify({ genome: record.genome, taxon: record.taxon?.name,
        authors: (record.metadataAuthor || []).map(author => author.name), N50: record.vitalStats?.N50 }, null, 2);
      if (action === 'edit') output.textContent = 'Changed genome in a copy; the original microdata example is unchanged.';
      status.textContent = 'JavaScript example ran. Parsing is not schema validation or file verification.';
    } catch (error) { display.json = ''; status.textContent = error.message; }
  }
  document.getElementById('fhr-run-json').addEventListener('click', () => run('read'));
  document.getElementById('fhr-edit-json').addEventListener('click', () => run('edit'));
  document.getElementById('fhr-read-microdata').addEventListener('click', () => {
    source.value = JSON.stringify(FhrExamples.readMicrodata(template.content.querySelector('[itemscope]')), null, 2);
    run('read');
  });
  source.addEventListener('input', () => {
    display.json = ''; output.textContent = ''; status.textContent = 'JSON changed. Run the example again.';
  });
  document.querySelectorAll('[data-fhr-example-control]').forEach(node => node.disabled = false);
}());
