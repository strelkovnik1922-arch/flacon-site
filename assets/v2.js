// Flacon.kz v2 — корзина (общая для языков), фильтры каталога, галерея товара, заявка.
(function () {
  const FLX = window.FLX || { lang: 'ru', rate: 69, t: {} };
  const t = FLX.t;
  const $ = (s) => document.querySelector(s);
  const fmtN = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const kzt = (cny) => Math.ceil(cny * FLX.rate);

  // ---------- корзина: localStorage 'cart2' {code:{code,nm,priceCny,moq,unit,img,qty}} ----------
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem('cart2') || '{}'); } catch { cart = {}; }
  const save = () => localStorage.setItem('cart2', JSON.stringify(cart));
  const count = () => Object.keys(cart).length;
  const totals = () => { let s = 0; for (const k in cart) s += cart[k].priceCny * cart[k].qty; return s; };

  function updateBadge() {
    const el = $('#cnt-cart'); if (!el) return;
    el.textContent = count(); el.style.display = count() ? 'flex' : 'none';
  }

  // ---------- drawer ----------
  const drawer = $('#drawer'), overlay = $('#overlay');
  window.openCart = () => { drawCart(); overlay.classList.add('open'); drawer.classList.add('open'); };
  window.closeCart = () => { overlay.classList.remove('open'); drawer.classList.remove('open'); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { window.closeCart(); lbClose(); } });

  const drawerHead = (title) => `<h3>${title}<button class="drawx" onclick="closeCart()" aria-label="Закрыть">×</button></h3>`;

  function drawCart() {
    const keys = Object.keys(cart);
    let html = `${drawerHead('🛒 ' + t.cartTitle)}<div class="items">`;
    if (!keys.length) html += `<div class="empty">${t.cartEmpty}</div></div>`;
    else {
      for (const k of keys) {
        const it = cart[k];
        html += `<div class="ci"><img src="${it.img}" alt="">
          <div class="inf"><b>${it.code}</b>${fmtN(kzt(it.priceCny))} ₸ × ${fmtN(it.qty)} = ${fmtN(kzt(it.priceCny * it.qty))} ₸
          <div class="qty"><button data-m="${k}" aria-label="−">−</button><span>${fmtN(it.qty)}</span><button data-p="${k}" aria-label="+">+</button></div></div>
          <button class="rm" data-r="${k}" aria-label="Удалить">×</button></div>`;
      }
      html += `</div><div class="foot"><div class="total"><span>${t.cartTotal}:</span><span>${fmtN(kzt(totals()))} ₸</span></div>
        <div class="note">${t.cartNote}</div>
        <button class="btn red big" id="go-checkout">${t.checkout}</button>
        <button class="btn mini" id="go-clear" style="margin-top:8px">${t.clear}</button></div>`;
    }
    drawer.innerHTML = html;
    drawer.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => step(b.dataset.m, -1));
    drawer.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => step(b.dataset.p, +1));
    drawer.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { delete cart[b.dataset.r]; save(); updateBadge(); drawCart(); });
    const go = $('#go-checkout'); if (go) go.onclick = checkout;
    const cl = $('#go-clear'); if (cl) cl.onclick = () => { cart = {}; save(); updateBadge(); drawCart(); };
  }
  function step(k, dir) {
    const it = cart[k]; if (!it) return;
    // шаг = коробка (заказ целыми коробками); без коробки — как раньше
    const stp = it.box || (it.unit === 'г' ? 100 : Math.max(10, Math.round((it.moq || 10) / 10)));
    it.qty = Math.max(it.moq || 1, it.qty + dir * stp);
    if (it.box) it.qty = Math.ceil(it.qty / it.box) * it.box;
    save(); drawCart(); updateBadge();
  }

  // ---------- заявка ----------
  function checkout() {
    const keys = Object.keys(cart); if (!keys.length) return;
    drawer.innerHTML = `${drawerHead(t.cartTitle)}<div class="items form" style="padding:16px 18px">
      <input id="c-name" placeholder="${t.formName}" autocomplete="name">
      <input id="c-company" placeholder="${t.formCompany}" autocomplete="organization">
      <input id="c-phone" placeholder="${t.formPhone}" inputmode="tel" autocomplete="tel">
      <div class="err" id="c-err">${t.phoneReq}</div>
      <input id="c-msngr" placeholder="${t.formMsngr}">
      <input id="c-city" placeholder="${t.formCity}" autocomplete="address-level2">
      <textarea id="c-note" rows="2" placeholder="${t.formComment}"></textarea>
      <input class="hp" id="c-web" tabindex="-1" autocomplete="off" placeholder="website">
      <button class="btn red big" id="c-send">${t.formSend}</button>
      <p class="agree">${t.formAgree}</p></div>`;
    $('#c-send').onclick = submitOrder;
  }
  async function submitOrder() {
    const phone = $('#c-phone').value.trim();
    if (!/[\d+][\d\s()-]{6,}/.test(phone)) { $('#c-err').style.display = 'block'; $('#c-phone').focus(); return; }
    if ($('#c-web').value) return; // honeypot: бот заполнил скрытое поле
    const btn = $('#c-send'); btn.disabled = true; btn.textContent = '…';
    const orderNo = 'FLX-' + Date.now().toString(36).toUpperCase();
    const items = Object.values(cart).map((it) => ({ code: it.code, price: it.priceCny, qty: it.qty }));
    const note = [`Заявка ${orderNo}`, $('#c-company').value.trim() && ('Компания: ' + $('#c-company').value.trim()),
      $('#c-msngr').value.trim() && ('Мессенджер: ' + $('#c-msngr').value.trim()),
      $('#c-city').value.trim() && ('Город: ' + $('#c-city').value.trim()),
      $('#c-note').value.trim()].filter(Boolean).join(' | ');
    try {
      const r = await fetch('/order.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: $('#c-name').value.trim(), phone, note, items }) });
      if (!r.ok) throw new Error('http ' + r.status);
      cart = {}; save(); updateBadge();
      drawer.innerHTML = `${drawerHead(t.formSent)}<div class="empty" style="padding:30px">
        ${t.formSentP}: <b>${orderNo}</b><br><br>${t.formSentP2}<br><br>
        <button class="btn red" onclick="closeCart()" style="max-width:220px;margin:0 auto">OK</button></div>`;
    } catch (e) {
      btn.disabled = false; btn.textContent = t.formSend;
      let err = $('#c-err'); err.textContent = t.formErr; err.style.display = 'block';
    }
  }

  // ---------- страница товара: qty + добавить ----------
  const prod = document.querySelector('main.product');
  if (prod) {
    const d = prod.dataset;
    const btn = $('#addbtn'), qty = $('#qty');
    // выбор цвета (модификации МС): меняет SKU заявки и фото; там где цвета есть — выбор ОБЯЗАТЕЛЕН
    let vsku = '', vcolor = '';
    const vname = $('#vname'), colorwarn = $('#colorwarn'), variantsEl = $('#variants');
    const hasColors = document.querySelectorAll('.sw').length > 0;
    document.querySelectorAll('.sw').forEach((sw) => sw.onclick = () => {
      const was = sw.classList.contains('on');
      document.querySelectorAll('.sw').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
      if (was) { vsku = ''; vcolor = ''; if (vname) { vname.textContent = t.chooseColor; vname.classList.add('vreq'); } setBtn(); return; }
      sw.classList.add('on'); sw.setAttribute('aria-checked', 'true');
      vsku = sw.dataset.sku; vcolor = sw.dataset.color;
      if (vname) { vname.textContent = vcolor; vname.classList.remove('vreq'); }
      if (colorwarn) colorwarn.hidden = true;
      if (variantsEl) variantsEl.classList.remove('shake');
      if (sw.dataset.img) { const g = $('#galimg'); if (g) g.src = '/' + sw.dataset.img; }
      setBtn();
    });
    const key = () => vsku || d.code;
    const setBtn = () => { btn.textContent = cart[key()] ? t.inCart : t.addCart; btn.classList.toggle('in', !!cart[key()]); };
    setBtn();
    btn.onclick = () => {
      // цвет не выбран — не добавляем: предупреждаем и подсвечиваем свотчи
      if (hasColors && !vsku) {
        if (colorwarn) colorwarn.hidden = false;
        if (variantsEl) {
          variantsEl.classList.remove('shake'); void variantsEl.offsetWidth; // перезапуск анимации
          variantsEl.classList.add('shake');
          variantsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      let q = parseInt(qty.value, 10) || 1;
      const moq = parseInt(d.moq, 10) || 1;
      const box = parseInt(d.box, 10) || 0;
      if (q < moq) q = moq;
      if (box) q = Math.ceil(q / box) * box; // заказ целыми коробками
      qty.value = q;
      cart[key()] = { code: key(), nm: d.nm + (vcolor ? ' (' + vcolor + ')' : ''), priceCny: parseFloat(d.price), moq, box, unit: d.unit, img: '/' + d.img, qty: q };
      save(); updateBadge(); setBtn(); window.openCart();
    };

    // галерея
    const gal = window.GAL || [];
    let gi = 0, zoom = 1;
    const galimg = $('#galimg'), lb = $('#lb'), lbimg = $('#lbimg');
    const show = (i) => {
      gi = (i + gal.length) % gal.length;
      galimg.src = gal[gi]; lbimg.src = gal[gi]; zoom = 1; lbimg.style.transform = '';
      document.querySelectorAll('.th').forEach((th, j) => th.classList.toggle('on', j === gi));
    };
    document.querySelectorAll('.th').forEach((th) => th.onclick = () => show(parseInt(th.dataset.i, 10)));
    $('#galmain').onclick = () => { lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lbclose').focus(); };
    window.lbClose = () => { if (lb && !lb.hidden) { lb.hidden = true; document.body.style.overflow = ''; } };
    $('#lbclose').onclick = window.lbClose;
    lb.onclick = (e) => { if (e.target === lb) window.lbClose(); };
    $('#lbprev').onclick = (e) => { e.stopPropagation(); show(gi - 1); };
    $('#lbnext').onclick = (e) => { e.stopPropagation(); show(gi + 1); };
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'ArrowLeft') show(gi - 1);
      if (e.key === 'ArrowRight') show(gi + 1);
    });
    // zoom: колесо и двойной клик; на телефоне — нативный pinch (touch-action)
    lbimg.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.min(4, Math.max(1, zoom + (e.deltaY < 0 ? .3 : -.3))); lbimg.style.transform = `scale(${zoom})`; }, { passive: false });
    lbimg.addEventListener('dblclick', () => { zoom = zoom > 1 ? 1 : 2; lbimg.style.transform = `scale(${zoom})`; });
    // свайп
    let tx = null;
    lb.addEventListener('touchstart', (e) => { if (e.touches.length === 1) tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50 && zoom === 1) show(gi + (dx < 0 ? 1 : -1));
    }, { passive: true });
  } else {
    window.lbClose = () => {};
  }

  // ---------- бургер-меню (мобайл) ----------
  const burger = $('#burger'), mobmenu = $('#mobmenu');
  if (burger && mobmenu) {
    burger.onclick = () => {
      const open = mobmenu.hidden;
      mobmenu.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.textContent = open ? '×' : '☰';
    };
  }

  // ---------- каталог: фильтры/поиск по статичным карточкам ----------
  const grid = $('#grid');
  if (grid) {
    const cards = [...grid.querySelectorAll('.card')];
    const search = $('#search'), cnt = $('#cnt'), reset = $('#freset');
    const sels = ['f_glass', 'f_shape', 'f_roller'].map((id) => document.getElementById(id)).filter(Boolean);
    // тоггл панели фильтров (мобайл)
    const ftoggle = $('#ftoggle'), filtersEl = $('#filters'), fdot = $('#fdot');
    if (ftoggle && filtersEl) ftoggle.onclick = () => {
      const open = filtersEl.classList.toggle('open');
      ftoggle.setAttribute('aria-expanded', String(open));
    };
    // ползунок объёма (от/до)
    const vminEl = $('#vmin'), vmaxEl = $('#vmax'), vollab = $('#vollab');
    const vBounds = vminEl ? [parseFloat(vminEl.min), parseFloat(vminEl.max)] : null;
    function volRange() {
      if (!vminEl) return null;
      let a = parseFloat(vminEl.value), b = parseFloat(vmaxEl.value);
      if (a > b) [a, b] = [b, a];
      return [a, b];
    }
    function volActive() { const r = volRange(); return r && (r[0] > vBounds[0] || r[1] < vBounds[1]); }
    const volNum = (s) => { const m = /(\d+[.,]?\d*)/.exec(s || ''); return m ? parseFloat(m[1].replace(',', '.')) : null; };
    function parseQuery(q) {
      let volTarget = null, rest = q;
      const vm = q.match(/(\d+(?:[.,]\d+)?)\s*(мл|ml)/i);
      if (vm) { volTarget = parseFloat(vm[1].replace(',', '.')); rest = q.replace(vm[0], ' '); }
      const terms = rest.split(/[^a-zа-я0-9.\-]+/i).map((s) => s.trim()).filter((w) => w.length >= 2 && w !== 'мл' && w !== 'ml');
      if (volTarget == null) {
        const i = terms.findIndex((w) => /^\d+(?:[.,]\d+)?$/.test(w) && parseFloat(w.replace(',', '.')) <= 500);
        if (i >= 0) { volTarget = parseFloat(terms[i].replace(',', '.')); terms.splice(i, 1); }
      }
      return { volTarget, terms };
    }
    // подгруппы (упаковка): кнопки «Пакеты / Мешочки / Конверты…»
    let activeSub = '';
    const stabs = [...document.querySelectorAll('.stab')];
    stabs.forEach((b) => b.onclick = () => {
      activeSub = b.dataset.sub;
      stabs.forEach((x) => x.classList.toggle('on', x === b));
      apply();
    });

    function apply() {
      const q = (search.value || '').trim().toLowerCase();
      const { volTarget, terms } = q ? parseQuery(q) : { volTarget: null, terms: [] };
      const fv = {}; sels.forEach((s) => fv[s.id] = s.value);
      const vr = volActive() ? volRange() : null;
      if (vollab) { const r = volRange(); vollab.textContent = r[0] + '–' + r[1] + ' мл'; }
      let shown = 0;
      for (const c of cards) {
        let ok = true;
        if (activeSub && c.dataset.sub !== activeSub) ok = false;
        if (ok && fv.f_glass && c.dataset.glass !== fv.f_glass) ok = false;
        if (ok && fv.f_shape && c.dataset.shape !== fv.f_shape) ok = false;
        if (ok && fv.f_roller && c.dataset.roller !== fv.f_roller) ok = false;
        if (ok && vr) { const v = volNum(c.dataset.vol); ok = v != null && v >= vr[0] && v <= vr[1]; }
        if (ok && volTarget != null && volNum(c.dataset.vol) !== volTarget) ok = false;
        if (ok && terms.length) { const hay = c.dataset.code.toLowerCase() + ' ' + c.dataset.name; ok = terms.every((w) => hay.includes(w)); }
        c.style.display = ok ? '' : 'none';
        if (ok) shown++;
      }
      cnt.textContent = shown + ' ' + t.found;
      const any = q || sels.some((s) => s.value) || volActive();
      reset.hidden = !any;
      if (fdot) fdot.hidden = !(sels.some((s) => s.value) || volActive());
    }
    search.addEventListener('input', apply);
    sels.forEach((s) => s.addEventListener('change', apply));
    if (vminEl) { vminEl.addEventListener('input', apply); vmaxEl.addEventListener('input', apply); }
    reset.onclick = () => {
      search.value = ''; sels.forEach((s) => s.value = '');
      if (vminEl) { vminEl.value = vminEl.min; vmaxEl.value = vmaxEl.max; }
      apply();
    };
    // deep-link ?q= (в т.ч. со старых ссылок бота)
    const usp = new URLSearchParams(location.search);
    if (usp.get('q')) search.value = usp.get('q');
    apply();
  }

  updateBadge();
})();
