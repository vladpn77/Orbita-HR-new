/* Орбита — общие скрипты: мобильное меню и печать */
(function () {
  'use strict';

  /* ---------- Меню на телефоне ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.main-nav');

  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      toggle.innerHTML = open ? '&#10005;' : '&#9776;';
    };

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!nav.classList.contains('open'));
    });

    // клик в любом другом месте закрывает меню
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });

    // Escape закрывает меню и возвращает фокус на кнопку
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // переход по пункту меню закрывает его (важно для якорей вида about.html#contacts)
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // при расширении окна до десктопа сбрасываем состояние
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 901px)');
      var onChange = function (e) { if (e.matches) setOpen(false); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ---------- Версия для печати ---------- */
  var meta = document.createElement('p');
  meta.className = 'print-meta';
  var footer = document.querySelector('footer');
  if (footer) footer.parentNode.insertBefore(meta, footer);

  function fillMeta() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    meta.textContent = 'Распечатано с сайта: ' + location.href.split('#')[0] +
      ' · ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  fillMeta();
  window.addEventListener('beforeprint', fillMeta);

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-print]')) {
      e.preventDefault();
      fillMeta();
      window.print();
    }
  });
})();
