/* Орбита — версия для слабовидящих.
   Настройки хранятся в localStorage и применяются классами на <html>.
   Ранняя установка классов (без «мигания») — в маленьком скрипте в <head>. */
(function () {
  'use strict';

  var KEY = 'orbita-a11y';
  var DEFAULTS = { fs: 0, color: '', sp: 0, font: 0, img: 1 };

  var st = (function () {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.assign({}, DEFAULTS, s);
    } catch (e) { return Object.assign({}, DEFAULTS); }
  })();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* приватный режим */ }
  }

  var GROUPS = [
    { key: 'fs', label: 'Размер текста', opts: [
      ['0', 'A', 'Обычный размер'], ['1', 'A+', 'Увеличенный размер'], ['2', 'A++', 'Крупный размер']] },
    { key: 'color', label: 'Цветовая схема', opts: [
      ['', 'Обычная', ''], ['bw', 'Ч/Б', 'Чёрный текст на белом', 'bw'],
      ['wb', 'Б/Ч', 'Белый текст на чёрном', 'wb'], ['blue', 'Синий', 'Тёмно-синий текст на голубом', 'blue']] },
    { key: 'sp', label: 'Интервалы', opts: [['0', 'Обычные'], ['1', 'Увеличенные']] },
    { key: 'font', label: 'Шрифт', opts: [['0', 'Как на сайте'], ['1', 'Arial']] },
    { key: 'img', label: 'Изображения', opts: [['1', 'Показывать'], ['0', 'Скрыть']] }
  ];

  var html = document.documentElement;
  var header = document.querySelector('header');
  if (!header) return;

  /* ---------- Панель ---------- */
  var panel = document.createElement('section');
  panel.className = 'a11y-panel';
  panel.id = 'a11y-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Настройки версии для слабовидящих');

  var inner = '<div class="container a11y-inner">';
  GROUPS.forEach(function (g) {
    inner += '<div class="a11y-group" role="group" aria-label="' + g.label + '">' +
      '<span class="a11y-label">' + g.label + '</span><div class="a11y-row">';
    g.opts.forEach(function (o) {
      var sw = o[3] ? ' a11y-sw a11y-sw-' + o[3] : '';
      var title = o[2] ? ' title="' + o[2] + '" aria-label="' + o[2] + '"' : '';
      inner += '<button type="button" class="a11y-btn' + sw + '" data-key="' + g.key +
        '" data-val="' + o[0] + '" aria-pressed="false"' + title + '>' + o[1] + '</button>';
    });
    inner += '</div></div>';
  });
  inner += '<div class="a11y-actions">' +
    '<button type="button" class="a11y-btn" data-act="print">Версия для печати</button>' +
    '<button type="button" class="a11y-btn" data-act="reset">Сбросить</button>' +
    '<button type="button" class="a11y-btn" data-act="close">Закрыть панель</button>' +
    '</div></div>';
  panel.innerHTML = inner;
  header.insertAdjacentElement('afterend', panel);

  /* ---------- Кнопка в шапке ---------- */
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'a11y-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'a11y-panel');
  btn.setAttribute('aria-label', 'Версия для слабовидящих');
  btn.title = 'Версия для слабовидящих';
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>' +
    '<span class="label">Для слабовидящих</span>';
  var actions = header.querySelector('.header-actions');
  if (actions) actions.insertBefore(btn, actions.firstChild);
  else header.appendChild(btn);

  function setPanel(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }

  btn.addEventListener('click', function () { setPanel(panel.hidden); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setPanel(false); btn.focus(); }
  });

  /* ---------- Применение настроек ---------- */
  function applyImages() {
    var off = Number(st.img) === 0;
    document.querySelectorAll('img').forEach(function (img) {
      var prev = img.previousElementSibling;
      var has = prev && prev.classList.contains('a11y-alt');
      if (off && !has) {
        var s = document.createElement('span');
        s.className = 'a11y-alt';
        s.textContent = '[Изображение: ' + (img.alt || 'без описания') + ']';
        img.parentNode.insertBefore(s, img);
      } else if (!off && has) {
        prev.remove();
      }
    });
  }

  function apply() {
    html.className = html.className.split(/\s+/).filter(function (c) {
      return c && c.indexOf('a11y-') !== 0;
    }).join(' ');
    var add = [];
    if (Number(st.fs)) add.push('a11y-fs-' + st.fs);
    if (st.color) add.push('a11y-c-' + st.color);
    if (Number(st.sp)) add.push('a11y-sp');
    if (Number(st.font)) add.push('a11y-font');
    if (Number(st.img) === 0) add.push('a11y-noimg');
    add.forEach(function (c) { html.classList.add(c); });

    panel.querySelectorAll('[data-key]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(String(st[b.dataset.key]) === b.dataset.val));
    });
    btn.classList.toggle('is-active', add.length > 0);
    applyImages();
  }

  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.key) {
      var k = b.dataset.key;
      st[k] = (k === 'color') ? b.dataset.val : Number(b.dataset.val);
      save();
      apply();
    } else if (b.dataset.act === 'reset') {
      st = Object.assign({}, DEFAULTS);
      save();
      apply();
    } else if (b.dataset.act === 'close') {
      setPanel(false);
      btn.focus();
    } else if (b.dataset.act === 'print') {
      window.print();
    }
  });

  apply();
})();
