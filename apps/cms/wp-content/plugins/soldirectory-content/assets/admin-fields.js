/**
 * Vanilla JS for the custom meta boxes in custom-fields-engine.php.
 * Deliberately has ZERO dependency on ACF/SCF's own admin bundle —
 * that bundle failing to load on this site (window.acf undefined) is
 * exactly the bug this whole system exists to route around. The only
 * WordPress-provided piece used here is wp.media, which is WordPress
 * core itself, not ACF, and has never been implicated in the bug.
 */
(function () {
  'use strict';

  function closestScoped(el, selector) {
    return el.closest(selector);
  }

  // ---- Repeaters: Add row / Remove row -------------------------------
  //
  // Each repeater's own <template> holds one new-row's HTML, with its
  // index placeholder token (data-index-token, e.g. "__SDIDX0__") baked
  // in server-side at a depth unique enough that an outer repeater's
  // own template can safely contain a brand-new, not-yet-used INNER
  // repeater with a DIFFERENT token, so substituting the outer token
  // can never corrupt the inner one.
  document.addEventListener('click', function (e) {
    var addBtn = e.target.closest('.sdmb-add-row');
    if (addBtn) {
      e.preventDefault();
      var repeater = closestScoped(addBtn, '.sdmb-repeater');
      if (!repeater) return;
      // The <template> is always a direct child in both layouts, so it
      // must be scoped (an unscoped search could otherwise find a
      // NESTED repeater's own template first, if an existing row
      // contains one). The rows container is a direct child for a
      // "block" repeater but sits inside a <table> for a "table" one —
      // either way it's the shallowest match in this subtree, before
      // any nested repeater buried inside one of its own rows, so an
      // unscoped search for it is safe.
      var template = repeater.querySelector(':scope > .sdmb-repeater-template');
      var rowsEl = repeater.querySelector('.sdmb-repeater-rows');
      if (!template || !rowsEl || closestScoped(rowsEl, '.sdmb-repeater') !== repeater) return;

      var token = repeater.getAttribute('data-index-token') || '__SDIDX0__';
      var nextIndex = parseInt(repeater.getAttribute('data-next-index') || '0', 10);
      var html = template.innerHTML.split(token).join(String(nextIndex));

      var isTable = rowsEl.tagName === 'TBODY';
      var holder = document.createElement(isTable ? 'table' : 'div');
      holder.innerHTML = isTable ? '<tbody>' + html + '</tbody>' : html;
      var newRow = isTable ? holder.querySelector('tbody').firstElementChild : holder.firstElementChild;
      if (newRow) rowsEl.appendChild(newRow);

      repeater.setAttribute('data-next-index', String(nextIndex + 1));
      return;
    }

    var removeBtn = e.target.closest('.sdmb-remove-row');
    if (removeBtn) {
      e.preventDefault();
      var row = removeBtn.closest('.sdmb-repeater-row');
      if (row) row.remove();
      return;
    }
  });

  // ---- Image picker (wp.media — WordPress core) -----------------------
  document.addEventListener('click', function (e) {
    var chooseBtn = e.target.closest('.sdmb-image-choose');
    var removeBtn = e.target.closest('.sdmb-image-remove');
    if (!chooseBtn && !removeBtn) return;
    e.preventDefault();

    var field = e.target.closest('.sdmb-image-field');
    if (!field) return;
    var input = document.getElementById(field.getAttribute('data-input'));
    var preview = field.querySelector('.sdmb-image-preview');
    var img = preview ? preview.querySelector('img') : null;

    if (removeBtn) {
      if (input) input.value = '';
      if (preview) preview.style.display = 'none';
      removeBtn.style.display = 'none';
      if (chooseBtn) chooseBtn.textContent = 'Choose image';
      return;
    }

    if (typeof wp === 'undefined' || !wp.media) {
      console.error('[SolDirectory] wp.media is unavailable — the WordPress core media library script did not load on this page.');
      return;
    }

    var frame = wp.media({ title: 'Select an image', button: { text: 'Use this image' }, multiple: false });
    frame.on('select', function () {
      var attachment = frame.state().get('selection').first().toJSON();
      var url = attachment.url;
      if (input) input.value = url;
      if (img) img.src = url;
      if (preview) preview.style.display = '';
      chooseBtn.textContent = 'Change image';
      var removeLink = field.querySelector('.sdmb-image-remove');
      if (removeLink) removeLink.style.display = '';
    });
    frame.open();
  });

  // ---- Collapsed repeater "block" rows: show the first text field's
  // value in the row's own header so a long list of rows (a 40-item
  // FAQ) scans instead of forcing every field open at once. Purely a
  // display convenience — storage/order is untouched either way.
  document.addEventListener('input', function (e) {
    var row = e.target.closest('.sdmb-repeater-row');
    if (!row) return;
    var firstInput = row.querySelector('.sdmb-repeater-row-fields input[type="text"], .sdmb-repeater-row-fields textarea');
    if (firstInput && firstInput === e.target) {
      row.setAttribute('data-row-label', e.target.value.slice(0, 60));
    }
  });
})();
