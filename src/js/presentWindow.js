document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('presentOverlay');
  const body = document.getElementById('presentBody');

  const clearVariants = () => {
    overlay.classList.remove(
      'present-lyrics',
      'present-notices',
      'present-bank',
      'present-creed',
      'present-bible',
      'present-countdown',
      'present-slides',
      'present-media',
      'present-bible-quotes'
    );
  };

  window.presentApi.onRender((data) => {
    clearVariants();
    if (data && data.variant) overlay.classList.add('present-' + data.variant);
    body.innerHTML = data && data.html ? data.html : '';
  });

  window.presentApi.onClear();
  window.presentApi.onClose();
});
