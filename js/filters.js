/* Орбита — умные фильтры: вакансии (catalog.html) и прайс-лист (price.html).
   Умное в них:
   • поиск по нескольким словам, с учётом окончаний, ё/е и мелких опечаток;
   • синонимы («программист» найдёт «разработчик», «питер» — «Санкт-Петербург»);
   • счётчики у категорий и городов пересчитываются под остальные фильтры;
   • выбранные фильтры попадают в адрес страницы — ссылкой можно поделиться. */
(function () {
  'use strict';

  /* ---------- Поиск: нормализация, синонимы, опечатки ---------- */

  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е'); }
  function words(s) { return norm(s).split(/[^a-zа-я0-9+#]+/).filter(Boolean); }

  var SYNONYMS = [
    ['программист', 'разработчик', 'developer', 'dev', 'девелопер'],
    ['бухгалтер', 'бухгалтерия', 'финансист', 'учет'],
    ['продажи', 'продавец', 'sales', 'сейлз'],
    ['hr', 'эйчар', 'рекрутер', 'кадровик'],
    ['логист', 'логистика', 'перевозки'],
    ['спб', 'питер', 'санкт-петербург', 'петербург'],
    ['мск', 'москва'],
    ['удаленно', 'удаленка', 'удаленный', 'удаленная', 'remote', 'дистанционно'],
    ['руководитель', 'директор', 'начальник', 'head'],
    ['фронтенд', 'frontend'],
    ['бэкенд', 'бекенд', 'backend']
  ].map(function (g) { return g.map(norm); });

  var ALIAS = {};
  SYNONYMS.forEach(function (g) { g.forEach(function (w) { ALIAS[w] = g; }); });

  function stem(w) { return w.length > 5 ? w.slice(0, -2) : w; }

  // расстояние Дамерау — Левенштейна: учитывает замену, вставку, удаление и перестановку соседних букв
  function lev(a, b) {
    var m = a.length, n = b.length;
    if (Math.abs(m - n) > 1) return 2;
    var pp = [], prev = [], cur, i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          cur[j] = Math.min(cur[j], pp[j - 2] + 1);
        }
      }
      pp = prev;
      prev = cur;
    }
    return prev[n];
  }

  function tokenMatches(tok, list) {
    var variants = ALIAS[tok] || [tok];
    return variants.some(function (v) {
      var st = stem(v);
      return list.some(function (w) { return w.indexOf(st) === 0; }) ||
        (v.length >= 5 && list.some(function (w) {
          // сравниваем с началом слова: допускаем на одну букву больше или меньше (пропуск/лишняя буква)
          return [v.length - 1, v.length, v.length + 1].some(function (k) { return lev(v, w.slice(0, k)) <= 1; });
        }));
    });
  }

  function searchOk(tokens, list) {
    return tokens.every(function (t) { return tokenMatches(t, list); });
  }

  /* ---------- Вспомогательное ---------- */

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function fmtMoney(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0₽'; }

  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  function readQuery() {
    var out = {};
    try {
      new URLSearchParams(location.search).forEach(function (v, k) { out[k] = v; });
    } catch (e) { /* старый браузер */ }
    return out;
  }

  function writeQuery(params) {
    try {
      var sp = new URLSearchParams();
      Object.keys(params).forEach(function (k) { if (params[k]) sp.set(k, params[k]); });
      var qs = sp.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    } catch (e) { /* file:// и т.п. */ }
  }

  /* ==========================================================
     ВАКАНСИИ
     ========================================================== */

  function initVacancies() {
    var host = document.getElementById('vacancy-filters');
    var list = document.getElementById('vacancy-list');
    if (!host || !list) return;

    var CATS = { sales: 'Продажи', it: 'IT', finance: 'Бухгалтерия', hr: 'HR', logistics: 'Логистика' };

    var cards = Array.prototype.map.call(list.querySelectorAll('.vacancy-card'), function (node, i) {
      var title = (node.querySelector('h3') || {}).textContent || '';
      var info = (node.querySelector('p') || {}).textContent || '';
      var cat = node.dataset.category || '';
      return {
        node: node,
        order: i,
        title: title,
        cat: cat,
        city: node.dataset.city || '',
        remote: node.dataset.remote === '1',
        salary: parseInt(node.dataset.salary || '0', 10),
        words: words(title + ' ' + info + ' ' + (CATS[cat] || ''))
      };
    });
    if (!cards.length) return;

    var maxSalary = Math.ceil(Math.max.apply(null, cards.map(function (c) { return c.salary; })) / 10000) * 10000;
    var cities = [];
    cards.forEach(function (c) { if (c.city && cities.indexOf(c.city) < 0) cities.push(c.city); });
    cities.sort();
    var catKeys = Object.keys(CATS).filter(function (k) {
      return cards.some(function (c) { return c.cat === k; });
    });

    /* --- разметка --- */
    host.innerHTML =
      '<div class="filters-row">' +
        '<div class="f-field f-wide"><label class="f-label" for="vf-q">Поиск</label>' +
          '<input type="search" id="vf-q" placeholder="Например: программист, бухгалтер, Казань" autocomplete="off"></div>' +
        '<div class="f-field"><label class="f-label" for="vf-sort">Сортировка</label>' +
          '<select id="vf-sort"><option value="">Как в списке</option>' +
          '<option value="sal-desc">Зарплата: сначала высокая</option>' +
          '<option value="sal-asc">Зарплата: сначала низкая</option>' +
          '<option value="name">По названию</option></select></div>' +
      '</div>' +
      '<div><span class="f-label" id="vf-cat-l">Направление</span>' +
        '<div class="chips" id="vf-cats" role="group" aria-labelledby="vf-cat-l"></div></div>' +
      '<div class="filters-row">' +
        '<div class="f-field"><label class="f-label" for="vf-city">Город</label><select id="vf-city"></select></div>' +
        '<div class="f-field"><label class="f-label" for="vf-fmt">Формат работы</label>' +
          '<select id="vf-fmt"><option value="">Любой</option><option value="office">В офисе</option>' +
          '<option value="remote">Удалённо</option></select></div>' +
        '<div class="f-field"><label class="f-label" for="vf-min">Зарплата: <span id="vf-min-v">любая</span></label>' +
          '<input type="range" id="vf-min" min="0" max="' + maxSalary + '" step="10000" value="0"></div>' +
      '</div>' +
      '<div class="filters-bar"><span class="filters-count" id="vf-count" aria-live="polite"></span>' +
        '<button type="button" class="f-reset" id="vf-reset">Сбросить фильтры</button></div>';

    var $ = function (id) { return document.getElementById(id); };
    var q = $('vf-q'), sort = $('vf-sort'), citySel = $('vf-city'), fmt = $('vf-fmt'),
        min = $('vf-min'), minV = $('vf-min-v'), count = $('vf-count'), reset = $('vf-reset'),
        catsBox = $('vf-cats');

    var chipAll = el('button', 'chip', 'Все');
    chipAll.type = 'button';
    catsBox.appendChild(chipAll);
    var chips = {};
    catKeys.forEach(function (k) {
      var b = el('button', 'chip', CATS[k] + '<span class="count"></span>');
      b.type = 'button';
      b.dataset.cat = k;
      b.setAttribute('aria-pressed', 'false');
      catsBox.appendChild(b);
      chips[k] = b;
    });

    citySel.appendChild(new Option('Любой город', ''));
    var cityOpts = {};
    cities.forEach(function (c) {
      var o = new Option(c, c);
      citySel.appendChild(o);
      cityOpts[c] = o;
    });

    var empty = el('p', 'f-empty', 'По вашему запросу вакансий не найдено.' +
      '<button type="button" class="f-reset">Сбросить фильтры</button>');
    empty.hidden = true;
    list.parentNode.insertBefore(empty, list.nextSibling);

    var selected = [];

    /* --- состояние --- */
    function state() {
      return {
        tokens: words(q.value),
        cats: selected.slice(),
        city: citySel.value,
        fmt: fmt.value,
        min: parseInt(min.value, 10) || 0,
        sort: sort.value
      };
    }

    function matches(c, f, skip) {
      if (skip !== 'q' && f.tokens.length && !searchOk(f.tokens, c.words)) return false;
      if (skip !== 'cat' && f.cats.length && f.cats.indexOf(c.cat) < 0) return false;
      if (skip !== 'city' && f.city && c.city !== f.city) return false;
      if (skip !== 'fmt' && f.fmt === 'remote' && !c.remote) return false;
      if (skip !== 'fmt' && f.fmt === 'office' && c.remote) return false;
      if (skip !== 'min' && c.salary < f.min) return false;
      return true;
    }

    function isDefault(f) {
      return !f.tokens.length && !f.cats.length && !f.city && !f.fmt && !f.min && !f.sort;
    }

    function update() {
      var f = state();

      // показать / скрыть и отсортировать
      var shown = cards.filter(function (c) {
        var ok = matches(c, f);
        c.node.hidden = !ok;
        return ok;
      });
      var ordered = cards.slice().sort(function (a, b) {
        if (f.sort === 'sal-desc') return b.salary - a.salary || a.order - b.order;
        if (f.sort === 'sal-asc') return a.salary - b.salary || a.order - b.order;
        if (f.sort === 'name') return a.title.localeCompare(b.title, 'ru') || a.order - b.order;
        return a.order - b.order;
      });
      ordered.forEach(function (c) { list.appendChild(c.node); });

      // счётчики категорий (с учётом остальных фильтров)
      catKeys.forEach(function (k) {
        var n = cards.filter(function (c) { return c.cat === k && matches(c, f, 'cat'); }).length;
        chips[k].querySelector('.count').textContent = '(' + n + ')';
        chips[k].disabled = n === 0 && selected.indexOf(k) < 0;
      });
      // счётчики городов
      cities.forEach(function (city) {
        var n = cards.filter(function (c) { return c.city === city && matches(c, f, 'city'); }).length;
        cityOpts[city].textContent = city + ' (' + n + ')';
      });

      chipAll.setAttribute('aria-pressed', String(!selected.length));
      minV.textContent = f.min ? 'от ' + fmtMoney(f.min) : 'любая';

      var n = shown.length;
      count.innerHTML = 'Найдено: <strong>' + n + '</strong> из ' + cards.length + ' ' +
        plural(cards.length, 'вакансии', 'вакансий', 'вакансий');
      empty.hidden = n !== 0;
      reset.disabled = isDefault(f);

      writeQuery({
        q: q.value.trim(),
        cat: f.cats.join(','),
        city: f.city,
        fmt: f.fmt,
        min: f.min ? String(f.min) : '',
        sort: f.sort
      });
    }

    function resetAll() {
      q.value = ''; sort.value = ''; citySel.value = ''; fmt.value = ''; min.value = 0;
      selected = [];
      Object.keys(chips).forEach(function (k) { chips[k].setAttribute('aria-pressed', 'false'); });
      update();
      q.focus();
    }

    /* --- события --- */
    q.addEventListener('input', update);
    [sort, citySel, fmt, min].forEach(function (n) { n.addEventListener('input', update); });
    reset.addEventListener('click', resetAll);
    empty.querySelector('.f-reset').addEventListener('click', resetAll);

    chipAll.addEventListener('click', function () {
      selected = [];
      Object.keys(chips).forEach(function (k) { chips[k].setAttribute('aria-pressed', 'false'); });
      update();
    });
    catsBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      var k = b.dataset.cat, i = selected.indexOf(k);
      if (i < 0) selected.push(k); else selected.splice(i, 1);
      b.setAttribute('aria-pressed', String(selected.indexOf(k) >= 0));
      update();
    });

    /* --- начальное состояние из адреса страницы --- */
    var p = readQuery();
    if (p.q) q.value = p.q;
    if (p.cat) selected = p.cat.split(',').filter(function (k) { return chips[k]; });
    selected.forEach(function (k) { chips[k].setAttribute('aria-pressed', 'true'); });
    if (p.city && cityOpts[p.city]) citySel.value = p.city;
    if (p.fmt === 'office' || p.fmt === 'remote') fmt.value = p.fmt;
    if (p.min) min.value = Math.min(parseInt(p.min, 10) || 0, maxSalary);
    if (p.sort) sort.value = p.sort;
    update();
  }

  /* ==========================================================
     ПРАЙС-ЛИСТ
     ========================================================== */

  function initPrice() {
    var host = document.getElementById('price-filters');
    var table = document.querySelector('table.price');
    if (!host || !table) return;

    var LEVELS = { low: 'До 15 000 ₽', mid: 'Средние', high: 'Премиум' };

    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    var items = [];
    var group = null;
    rows.forEach(function (tr) {
      if (tr.classList.contains('group')) {
        group = { row: tr, items: [] };
        return;
      }
      var cells = tr.querySelectorAll('td');
      var priceCell = cells[cells.length - 1];
      var level = priceCell.classList.contains('p-low') ? 'low' :
                  priceCell.classList.contains('p-high') ? 'high' : 'mid';
      var guarantee = cells.length > 3 && cells[3].textContent.trim() !== '—';
      var item = { row: tr, level: level, guarantee: guarantee, words: words(tr.textContent) };
      items.push(item);
      if (group) group.items.push(item);
    });

    var groups = [];
    var g2 = null;
    rows.forEach(function (tr) {
      if (tr.classList.contains('group')) { g2 = { row: tr, items: [] }; groups.push(g2); }
      else if (g2) {
        g2.items.push(items.filter(function (i) { return i.row === tr; })[0]);
      }
    });

    host.innerHTML =
      '<div class="filters-row">' +
        '<div class="f-field f-wide"><label class="f-label" for="pf-q">Поиск по услугам</label>' +
          '<input type="search" id="pf-q" placeholder="Например: рекрутер, проверка, руководители" autocomplete="off"></div>' +
        '<label class="check"><input type="checkbox" id="pf-g"> Только с гарантией замены</label>' +
      '</div>' +
      '<div><span class="f-label" id="pf-l">Уровень стоимости</span>' +
        '<div class="chips" id="pf-levels" role="group" aria-labelledby="pf-l"></div></div>' +
      '<div class="filters-bar"><span class="filters-count" id="pf-count" aria-live="polite"></span>' +
        '<button type="button" class="f-reset" id="pf-reset">Сбросить фильтры</button></div>';

    var $ = function (id) { return document.getElementById(id); };
    var q = $('pf-q'), gBox = $('pf-g'), box = $('pf-levels'), count = $('pf-count'), reset = $('pf-reset');

    var level = '';
    var all = el('button', 'chip', 'Все');
    all.type = 'button';
    box.appendChild(all);
    var chips = {};
    Object.keys(LEVELS).forEach(function (k) {
      var b = el('button', 'chip', LEVELS[k] + '<span class="count"></span>');
      b.type = 'button';
      b.dataset.level = k;
      b.setAttribute('aria-pressed', 'false');
      box.appendChild(b);
      chips[k] = b;
    });

    var empty = el('p', 'f-empty', 'Ничего не найдено. Попробуйте изменить запрос.' +
      '<button type="button" class="f-reset">Сбросить фильтры</button>');
    empty.hidden = true;
    var wrap = table.closest('.price-wrap') || table;
    wrap.parentNode.insertBefore(empty, wrap.nextSibling);

    function ok(it, tokens, skip) {
      if (tokens.length && !searchOk(tokens, it.words)) return false;
      if (gBox.checked && !it.guarantee) return false;
      if (skip !== 'level' && level && it.level !== level) return false;
      return true;
    }

    function update() {
      var tokens = words(q.value);
      var shown = 0;
      items.forEach(function (it) {
        var v = ok(it, tokens);
        it.row.hidden = !v;
        if (v) shown++;
      });
      groups.forEach(function (g) {
        g.row.hidden = !g.items.some(function (i) { return !i.row.hidden; });
      });
      Object.keys(chips).forEach(function (k) {
        var n = items.filter(function (it) { return it.level === k && ok(it, tokens, 'level'); }).length;
        chips[k].querySelector('.count').textContent = '(' + n + ')';
        chips[k].disabled = n === 0 && level !== k;
      });
      all.setAttribute('aria-pressed', String(!level));
      count.innerHTML = 'Показано: <strong>' + shown + '</strong> из ' + items.length + ' ' +
        plural(items.length, 'услуги', 'услуг', 'услуг');
      empty.hidden = shown !== 0;
      wrap.hidden = shown === 0;
      reset.disabled = !q.value.trim() && !gBox.checked && !level;
      writeQuery({ q: q.value.trim(), lvl: level, g: gBox.checked ? '1' : '' });
    }

    function setLevel(k) {
      level = k;
      Object.keys(chips).forEach(function (x) { chips[x].setAttribute('aria-pressed', String(x === k)); });
      update();
    }

    function resetAll() { q.value = ''; gBox.checked = false; setLevel(''); q.focus(); }

    q.addEventListener('input', update);
    gBox.addEventListener('change', update);
    all.addEventListener('click', function () { setLevel(''); });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-level]');
      if (b) setLevel(level === b.dataset.level ? '' : b.dataset.level);
    });
    reset.addEventListener('click', resetAll);
    empty.querySelector('.f-reset').addEventListener('click', resetAll);

    var p = readQuery();
    if (p.q) q.value = p.q;
    if (p.g === '1') gBox.checked = true;
    if (p.lvl && chips[p.lvl]) level = p.lvl;
    Object.keys(chips).forEach(function (x) { chips[x].setAttribute('aria-pressed', String(x === level)); });
    update();
  }

  initVacancies();
  initPrice();
})();
