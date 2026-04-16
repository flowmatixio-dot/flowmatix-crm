// Prevent flash: apply saved theme before first paint.
// Must run synchronously before the React bundle to avoid a white/dark flash.
// R9: Moved from inline script to external file so CSP can drop 'unsafe-inline'.
try {
  var s = JSON.parse(localStorage.getItem('fm-theme') || '{}');
  var t = (s && s.state && s.state.theme) || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  document.addEventListener('DOMContentLoaded', function() {
    document.body.style.background = t === 'light' ? '#f5f7fa' : '#0f1623';
  });
} catch(e) {
  document.documentElement.setAttribute('data-theme', 'dark');
}
