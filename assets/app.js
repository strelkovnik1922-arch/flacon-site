// Flacon KZ — каталог, фильтры, поиск, корзина (localStorage).
let PRODUCTS = [], CATS = [], cat = 'all', cart = {};
// фильтры-характеристики: каждый прячется, если в категории нет выбора
const FILTERS = [
  { key: 'vol', label: 'Любой объём', sort: (a, b) => (volNum(a) || 0) - (volNum(b) || 0) },
  { key: 'glass', label: 'Любое стекло' },
  { key: 'shape', label: 'Любая форма' },
  { key: 'roller', label: 'Ролик: любой' },
];
const fval = { vol: '', glass: '', shape: '', roller: '' };

const fmt = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
const $ = (s) => document.querySelector(s);

// объём товара числом (для точного совпадения)
const volNum = (s) => { const m = /(\d+[.,]?\d*)\s*мл/i.exec(s || ''); return m ? parseFloat(m[1].replace(',', '.')) : null; };
// разбор запроса: точный объём отдельно от слов, чтобы «5 мл» не ловил «125 мл»
function parseQuery(t) {
  let volTarget = null, rest = t;
  const vm = t.match(/(\d+(?:[.,]\d+)?)\s*мл/);
  if (vm) { volTarget = parseFloat(vm[1].replace(',', '.')); rest = t.replace(vm[0], ' '); }
  let terms = rest.split(/[^a-zа-я0-9.\-]+/i).map((s) => s.trim()).filter((w) => w.length >= 2 && w !== 'мл');
  if (volTarget == null) {
    const i = terms.findIndex((w) => /^\d+(?:[.,]\d+)?$/.test(w) && parseFloat(w.replace(',', '.')) <= 500);
    if (i >= 0) { volTarget = parseFloat(terms[i].replace(',', '.')); terms.splice(i, 1); }
  }
  return { volTarget, terms };
}
function matchSearch(p, volTarget, terms) {
  if (volTarget != null && volNum(p.vol || p.name) !== volTarget) return false;
  if (terms.length) { const hay = (p.code + ' ' + p.name).toLowerCase(); if (!terms.every((w) => hay.includes(w))) return false; }
  return true;
}

async function boot() {
  PRODUCTS = await (await fetch('data/products.json')).json();
  CATS = await (await fetch('data/cats.json')).json();
  cart = JSON.parse(localStorage.getItem('cart') || '{}');
  // deep-link ?cat=roller или ?q=атомайзер
  const p = new URLSearchParams(location.search);
  if (p.get('cat')) { cat = p.get('cat'); }
  if (p.get('q')) { $('#search').value = p.get('q'); }
  for (const f of FILTERS) { const sel = document.getElementById('f_' + f.key); if (sel) sel.onchange = (e) => { fval[f.key] = e.target.value; render(); }; }
  buildTabs(); buildFilters(); render(); updateCart();
}

function buildTabs() {
  const el = $('#tabs');
  const all = [{ key: 'all', title: 'Все' }, ...CATS];
  el.innerHTML = all.map((c) =>
    `<div class="tab${c.key === cat ? ' on' : ''}" data-k="${c.key}">${c.title}</div>`).join('');
  el.querySelectorAll('.tab').forEach((t) => t.onclick = () => {
    cat = t.dataset.k;
    for (const f of FILTERS) fval[f.key] = '';
    buildTabs(); buildFilters(); render();
  });
}

// наполняем каждый фильтр значениями, реально встречающимися в текущей категории; прячем, если выбора нет
function buildFilters() {
  const pool = PRODUCTS.filter((p) => cat === 'all' || p.cat === cat);
  for (const f of FILTERS) {
    const sel = document.getElementById('f_' + f.key); if (!sel) continue;
    let vals = [...new Set(pool.map((p) => p[f.key]).filter(Boolean))];
    vals.sort(f.sort || ((a, b) => a.localeCompare(b)));
    if (vals.length < 2) { sel.style.display = 'none'; sel.innerHTML = ''; fval[f.key] = ''; continue; }
    sel.style.display = '';
    sel.innerHTML = `<option value="">${f.label}</option>` + vals.map((v) => `<option value="${v}"${v === fval[f.key] ? ' selected' : ''}>${v}</option>`).join('');
  }
}

function render() {
  const q = $('#search').value.trim().toLowerCase();
  let items = PRODUCTS.filter((p) => cat === 'all' || p.cat === cat);
  for (const f of FILTERS) if (fval[f.key]) items = items.filter((p) => (p[f.key] || '') === fval[f.key]);
  if (q) { const { volTarget, terms } = parseQuery(q); items = items.filter((p) => matchSearch(p, volTarget, terms)); }
  $('#cnt').textContent = items.length + ' товаров';
  const g = $('#grid');
  if (!items.length) { g.innerHTML = '<div class="empty">Ничего не найдено</div>'; return; }
  g.innerHTML = items.map((p) => {
    const inCart = cart[p.code] ? ' in' : '';
    const lbl = cart[p.code] ? '✓ В корзине' : 'В корзину';
    const price = (p.multi ? 'от ' : '') + fmt(p.price) + ' ¥';
    const moq = p.moq ? `от ${p.moq} ${p.unit}` : (p.unit === 'г' ? 'за грамм' : '');
    return `<div class="card">
      <div class="ph"><img loading="lazy" src="${p.img}" alt=""></div>
      <div class="b">
        <span class="code">${p.code}</span>
        <span class="nm">${p.name}${p.vol ? ' · ' + p.vol : ''}</span>
        <span class="pr">${price}<span style="font-size:12px;color:#8a8a8a;font-weight:400"> / ${p.unit === 'г' ? '1 г' : '1 шт'}</span></span>
        <span class="moq">${moq}</span>
        <button class="add${inCart}" data-c="${p.code}">${lbl}</button>
      </div></div>`;
  }).join('');
  g.querySelectorAll('.add').forEach((b) => b.onclick = () => addToCart(b.dataset.c));
}

function addToCart(code) {
  const p = PRODUCTS.find((x) => x.code === code);
  if (!p) return;
  if (!cart[code]) cart[code] = { code, name: p.name, price: p.price, moq: p.moq, unit: p.unit, img: p.img, qty: p.moq || 1 };
  save(); render(); updateCart(); openCart();
}
function setQty(code, d) {
  const it = cart[code]; if (!it) return;
  it.qty = Math.max(it.moq || 1, it.qty + d);
  save(); drawCart(); updateCart();
}
function rm(code) { delete cart[code]; save(); drawCart(); updateCart(); render(); }
function save() { localStorage.setItem('cart', JSON.stringify(cart)); }

function updateCart() {
  const n = Object.keys(cart).length;
  $('#cnt-cart').textContent = n;
  $('#cnt-cart').style.display = n ? 'flex' : 'none';
}
function totals() {
  let sum = 0, n = 0;
  for (const k in cart) { sum += cart[k].price * cart[k].qty; n += cart[k].qty; }
  return { sum: Math.round(sum * 100) / 100, n };
}
function drawCart() {
  const box = $('#cart-items'), keys = Object.keys(cart);
  if (!keys.length) { box.innerHTML = '<div class="empty">Корзина пуста</div>'; $('#cart-foot').style.display = 'none'; return; }
  $('#cart-foot').style.display = 'block';
  box.innerHTML = keys.map((k) => {
    const it = cart[k];
    return `<div class="ci">
      <img src="${it.img}" alt="">
      <div class="info"><b>${it.code}</b>${fmt(it.price)} ¥ × ${it.qty} = ${fmt(it.price * it.qty)} ¥
        <div class="qty"><button data-m="${it.code}">−</button><span>${it.qty}</span><button data-p="${it.code}">+</button></div>
      </div>
      <span class="rm" data-r="${it.code}">×</span></div>`;
  }).join('');
  const t = totals();
  $('#cart-total').textContent = fmt(t.sum) + ' ¥';
  box.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => setQty(b.dataset.m, -(cart[b.dataset.m].moq >= 100 ? 50 : 10)));
  box.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => setQty(b.dataset.p, (cart[b.dataset.p].moq >= 100 ? 50 : 10)));
  box.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => rm(b.dataset.r));
}
function openCart() { $('#overlay').classList.add('open'); $('#drawer').classList.add('open'); drawCart(); }
function closeCart() { $('#overlay').classList.remove('open'); $('#drawer').classList.remove('open'); }

function checkout() {
  const keys = Object.keys(cart);
  if (!keys.length) { alert('Корзина пуста'); return; }
  const t = totals();
  const lines = keys.map((k, i) => `${i + 1}. ${cart[k].code} — ${fmt(cart[k].price)} ¥ × ${cart[k].qty} = ${fmt(cart[k].price * cart[k].qty)} ¥`).join('\n');
  $('#drawer').innerHTML = `
    <h3>Оформление заказа</h3>
    <div class="items form" style="padding:18px">
      <p style="color:#8a8a8a;font-size:13px;margin-bottom:14px">Товар на ${fmt(t.sum)} ¥. Доставку рассчитаем отдельно и пришлём полную сумму.</p>
      <input id="c-name" placeholder="Ваше имя">
      <input id="c-phone" placeholder="Телефон (WhatsApp / Telegram)">
      <textarea id="c-note" rows="2" placeholder="Комментарий (необязательно)"></textarea>
      <button class="go" onclick="submitOrder()">Отправить заявку</button>
      <p style="color:#8a8a8a;font-size:12px;margin-top:10px">Нажимая «Отправить», вы оставляете заявку. Оплата — после согласования.</p>
    </div>`;
}
function submitOrder() {
  const name = $('#c-name').value.trim(), phone = $('#c-phone').value.trim();
  if (!phone) { alert('Укажите телефон'); return; }
  const t = totals();
  const order = { name, phone, note: $('#c-note').value.trim(), items: Object.values(cart), sum: t.sum, ts: new Date().toISOString() };
  // ЗАГОТОВКА: отправка на сервер/бот. Пока сохраняем и показываем подтверждение.
  try { fetch('order.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) }); } catch (e) {}
  $('#drawer').innerHTML = `<h3>Заявка отправлена ✅</h3><div class="empty" style="padding:30px">
    Спасибо, ${name || 'друг'}! Мы получили заявку на ${fmt(t.sum)} ¥, рассчитаем доставку и свяжемся с вами.<br><br>
    <button class="go" style="max-width:200px;margin:0 auto" onclick="location.reload()">Хорошо</button></div>`;
  cart = {}; save();
}

document.addEventListener('DOMContentLoaded', boot);
window.openCart = openCart; window.closeCart = closeCart; window.checkout = checkout; window.submitOrder = submitOrder;
