(function () {
  var root = document.documentElement;
  var theme;
  try { theme = localStorage.getItem('fhr-theme'); } catch (error) {}
  var preference = window.matchMedia('(prefers-color-scheme: dark)');
  function apply(value) {
    root.setAttribute('data-theme', value);
    var button = document.getElementById('theme-toggle');
    if (button) {
      var dark = value === 'dark';
      button.hidden = false;
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Use light theme' : 'Use dark theme');
      button.textContent = dark ? 'Light' : 'Dark';
    }
  }
  apply(theme === 'dark' || theme === 'light' ? theme : (preference.matches ? 'dark' : 'light'));
  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-theme'));
    document.getElementById('theme-toggle').addEventListener('click', function () {
      theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(theme);
      try { localStorage.setItem('fhr-theme', theme); } catch (error) {}
    });
  });
  preference.addEventListener('change', function (event) {
    if (theme !== 'dark' && theme !== 'light') apply(event.matches ? 'dark' : 'light');
  });
}());
