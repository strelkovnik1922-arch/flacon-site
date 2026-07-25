// Flacon.kz v2 — корзина (общая для языков), фильтры каталога, галерея товара, заявка.
(function () {
  const FLX = window.FLX || { lang: 'ru', rate: 69, t: {} };
  const t = FLX.t;
  const $ = (s) => document.querySelector(s);
  const fmtN = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const kzt = (cny) => Math.ceil(cny * FLX.rate);
  const iv = (p) => '/' + p + (FLX.imgv ? '?v=' + FLX.imgv : '');

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
        <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn mini" id="go-continue">${t.contShop}</button>
        <button class="btn mini" id="go-clear">${t.clear}</button></div></div>`;
    }
    drawer.innerHTML = html;
    drawer.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => step(b.dataset.m, -1));
    drawer.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => step(b.dataset.p, +1));
    drawer.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { delete cart[b.dataset.r]; save(); updateBadge(); drawCart(); });
    const go = $('#go-checkout'); if (go) go.onclick = checkout;
    const cl = $('#go-clear'); if (cl) cl.onclick = () => { cart = {}; save(); updateBadge(); drawCart(); };
    const co = $('#go-continue'); if (co) co.onclick = window.closeCart; // продолжить выбор = закрыть корзину
  }
  function step(k, dir) {
    const it = cart[k]; if (!it) return;
    // шаг = коробка (заказ целыми коробками); без коробки — как раньше
    const stp = it.box || (it.unit === 'г' ? 100 : Math.max(10, Math.round((it.moq || 10) / 10)));
    it.qty = Math.max(it.moq || 1, it.qty + dir * stp);
    if (it.box) it.qty = Math.ceil(it.qty / it.box) * it.box;
    save(); drawCart(); updateBadge();
  }

  // ---------- фильтры ввода: телефон только цифрами, текстовые поля только буквами ----------
  const filterInput = (el, re) => { if (!el) return; el.addEventListener('input', () => { const v = el.value.replace(re, ''); if (v !== el.value) el.value = v; }); };
  const phoneOnly = (el) => { if (el) { el.setAttribute('inputmode', 'tel'); filterInput(el, /[^\d+\s()-]/g); } };          // цифры и + ( ) -
  const lettersOnly = (el) => filterInput(el, /[^\p{L}\s\-'.]/gu);                                                          // буквы (ru/kz/en), пробел, дефис
  const lettersDigits = (el) => filterInput(el, /[^\p{L}\p{N}\s\-'.@+_]/gu);                                                // компания/мессенджер: + цифры и @

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
    phoneOnly($('#c-phone')); lettersOnly($('#c-name')); lettersOnly($('#c-city')); lettersDigits($('#c-company')); lettersDigits($('#c-msngr'));
    $('#c-send').onclick = submitOrder;
  }
  async function submitOrder() {
    const err = $('#c-err');
    const name = $('#c-name').value.trim();
    if (name.length < 2) { err.textContent = t.nameReq; err.style.display = 'block'; $('#c-name').focus(); return; }
    const phone = $('#c-phone').value.trim();
    if (!/[\d+][\d\s()-]{6,}/.test(phone)) { err.textContent = t.phoneReq; err.style.display = 'block'; $('#c-phone').focus(); return; }
    if ($('#c-web').value) return; // honeypot: бот заполнил скрытое поле
    const btn = $('#c-send'); btn.disabled = true; btn.textContent = '…';
    const orderNo = 'FLX-' + Date.now().toString(36).toUpperCase();
    const items = Object.values(cart).map((it) => ({ code: it.code, price: it.priceCny, qty: it.qty }));
    const note = [`Заявка ${orderNo}`, $('#c-company').value.trim() && ('Компания: ' + $('#c-company').value.trim()),
      $('#c-msngr').value.trim() && ('Мессенджер: ' + $('#c-msngr').value.trim()),
      $('#c-city').value.trim() && ('Город: ' + $('#c-city').value.trim()),
      $('#c-note').value.trim()].filter(Boolean).join(' | ');
    try {
      const r = await fetch('/order2.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    // «Назад в каталог»: если пришли со страницы каталога — вернуться с сохранением места и фильтров
    const back = $('#backcat');
    if (back) back.addEventListener('click', (e) => {
      try {
        if (document.referrer && new URL(document.referrer).origin === location.origin && document.referrer.includes('/catalog/')) {
          e.preventDefault(); history.back();
        }
      } catch { /* обычный переход по href */ }
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
      save(); updateBadge(); setBtn();
      toast(t.addedToast); // корзину не открываем — только тост (правка 24.07)
    };
    // кнопки ± у количества (просьба: на мобильном нельзя было менять кнопками)
    const qm = $('#qminus'), qp = $('#qplus');
    const moq0 = parseInt(d.moq, 10) || 1, box0 = parseInt(d.box, 10) || 0;
    if (qm) qm.onclick = () => stepQty(qty, -1, moq0, box0, d.unit);
    if (qp) qp.onclick = () => stepQty(qty, +1, moq0, box0, d.unit);

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

  // ---------- заявка на поиск товара под клиента ----------
  window.openSourcing = () => {
    drawer.innerHTML = `${drawerHead(t.srcBtn)}<div class="items form" style="padding:16px 18px">
      <textarea id="s-what" rows="4" placeholder="${t.srcWhat}"></textarea>
      <input id="s-qty" placeholder="${t.srcQty}" inputmode="numeric">
      <input id="s-name" placeholder="${t.formName}" autocomplete="name">
      <input id="s-phone" placeholder="${t.formPhone}" inputmode="tel" autocomplete="tel">
      <label class="filelbl" for="s-photo">📷 ${t.srcPhoto}</label>
      <input id="s-photo" type="file" accept="image/jpeg,image/png,image/webp">
      <div class="filehint">${t.srcPhotoHint}</div>
      <div class="err" id="s-err">${t.srcErr}</div>
      <input class="hp" id="s-web" tabindex="-1" autocomplete="off" placeholder="website">
      <button class="btn red big" id="s-send">${t.srcSend}</button>
      <p class="agree">${t.formAgree}</p></div>`;
    overlay.classList.add('open'); drawer.classList.add('open');
    phoneOnly($('#s-phone')); lettersOnly($('#s-name'));
    phoneOnly($('#s-phone')); lettersOnly($('#s-name'));
    // читаем фото в base64 с проверкой формата и размера (JPG/PNG/WebP, до 5 МБ)
    let photoData = '';
    const photoEl = $('#s-photo'), err = $('#s-err');
    photoEl.onchange = () => {
      photoData = '';
      const f = photoEl.files && photoEl.files[0];
      if (!f) return;
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { err.textContent = t.srcPhotoBad; err.style.display = 'block'; photoEl.value = ''; return; }
      if (f.size > 5 * 1024 * 1024) { err.textContent = t.srcPhotoBig; err.style.display = 'block'; photoEl.value = ''; return; }
      err.style.display = 'none';
      const fr = new FileReader();
      fr.onload = () => { photoData = fr.result; };
      fr.readAsDataURL(f);
    };
    $('#s-send').onclick = async () => {
      const what = $('#s-what').value.trim(), phone = $('#s-phone').value.trim(), name = $('#s-name').value.trim();
      if (what.length < 3 || name.length < 2 || !/[\d+][\d\s()-]{6,}/.test(phone)) { err.textContent = t.srcErr; err.style.display = 'block'; return; }
      if ($('#s-web').value) return; // honeypot
      const btn2 = $('#s-send'); btn2.disabled = true; btn2.textContent = '…';
      const orderNo = 'FLX-S-' + Date.now().toString(36).toUpperCase();
      const note = ['ПОИСК ТОВАРА ПОД КЛИЕНТА ' + orderNo, what,
        $('#s-qty').value.trim() && ('Количество: ~' + $('#s-qty').value.trim())].filter(Boolean).join(' | ');
      try {
        const r = await fetch('/order2.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, note, items: [], photo: photoData }) });
        if (!r.ok) throw new Error('http');
        drawer.innerHTML = `${drawerHead(t.formSent)}<div class="empty" style="padding:30px">
          ${t.formSentP}: <b>${orderNo}</b><br><br>${t.formSentP2}<br><br>
          <button class="btn red" onclick="closeCart()" style="max-width:220px;margin:0 auto">OK</button></div>`;
      } catch (e) {
        btn2.disabled = false; btn2.textContent = t.srcSend;
        const er = $('#s-err'); er.textContent = t.formErr; er.style.display = 'block';
      }
    };
  };

  // ---------- тост (3 сек) ----------
  let toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
  }

  // ---------- количество: общий помощник (кратно коробке) ----------
  function stepQty(input, dir, moq, box, unit) {
    const stp = box || (unit === 'г' ? 100 : 10);
    let q = (parseInt(input.value, 10) || moq) + dir * stp;
    q = Math.max(moq, q);
    if (box) q = Math.ceil(q / box) * box;
    input.value = q;
  }

  // ---------- поп-ап товара (клик по карточке в каталоге/на главной) ----------
  let PDATA = null;
  async function pdata() {
    if (!PDATA) { try { PDATA = await (await fetch('/data/products2.json')).json(); } catch { PDATA = []; } }
    return PDATA;
  }
  // цвет → кружок (для поп-апа; полная палитра — на странице товара)
  function cHex(name) {
    const n = String(name).toLowerCase();
    const M = { 'черн': '#1a1a1a', 'бел': '#ffffff', 'золот': '#C9A24B', 'серебр': '#c0c0c0', 'красн': '#C8102E', 'розов': '#e79cc0', 'син': '#2456a5', 'голуб': '#7db4e0', 'зелен': '#2f7d3b', 'бирюз': '#30b3a9', 'желт': '#e8c331', 'оранж': '#e07820', 'фиолет': '#7b4397', 'пурпур': '#9b2d78', 'коричн': '#6b4423', 'кофейн': '#6f5540', 'сер': '#8a8a8a', 'беж': '#d9c4a3', 'малинов': '#c2185b', 'прозрачн': '#eef3f5', 'матов': '#dddddd' };
    for (const k in M) if (n.includes(k)) return M[k];
    return '#cccccc';
  }
  function productModal(p) {
    const box = p.box || 0;
    const moq = box || p.moq || (p.unit === 'г' ? 100 : 1); // граммовые — от 100 г
    const unit = p.unit === 'г' ? t.perGram : t.apiece;
    const priceK = fmtN(kzt(p.priceCny));
    const lang = FLX.lang;
    const specs = [[t.sku, p.code], [t.vol, p.vol], [t.glass, p.glass], [t.shape, p.shape], [t.roller, p.roller],
      [t.moq, moq ? fmtN(moq) : ''], [t.box, box ? fmtN(box) : '']].filter(([, v]) => v);
    const wrap = document.createElement('div');
    wrap.className = 'pmodal';
    // крестик и панель «количество + в корзину» зафиксированы; прокручивается только контент (просьба CEO 25.07)
    wrap.innerHTML = `<div class="pmbox" role="dialog" aria-modal="true">
      <button class="pmx" aria-label="Закрыть">×</button>
      <div class="pmgrid">
        <div class="pmgal"><img class="pmimg" src="${iv(p.imgs[0])}" alt="">
          ${p.imgs.length > 1 ? `<div class="pmthumbs">${p.imgs.map((im, i) => `<button class="th${i === 0 ? ' on' : ''}" data-src="${iv(im)}"><img src="${iv(im)}" alt=""></button>`).join('')}</div>` : ''}
        </div>
        <div class="pminfo">
          <h3>${p.name}</h3>
          <p class="skuline">${t.sku}: <b>${p.code}</b> · <span class="st">🏭 ${t.statusOrder}</span></p>
          ${p.motif ? `<p class="motif">${p.motif}</p>` : ''}
          <p class="bigpr">${p.multi ? t.priceFrom + ' ' : ''}<b>${priceK} ₸</b> <span>/ ${unit}</span></p>
          ${(p.colors || []).length ? `<div class="variants"><span class="vlabel">${t.color}: <b class="pm-vname vreq">${t.chooseColor}</b></span>
            <div class="swatches">${p.colors.map((c) => { const hx = cHex(c.color); return `<button class="sw${/^#(f|e[ef])/i.test(hx) ? ' lt' : ''}" data-sku="${c.sku}" data-color="${c.color}" data-img="${c.img || ''}" style="--c:${hx}" title="${c.color}"></button>`; }).join('')}</div></div>` : ''}
          <table class="specs pmspecs"><tbody>${specs.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>
          <a class="pmfull" href="/${lang}/product/${p.slug}/">${t.openFull}</a>
        </div>
      </div>
      <div class="pmbar">
        <div class="qtybox"><button type="button" class="qbtn pm-minus">−</button><input class="pm-qty" type="number" inputmode="numeric" min="${moq}" step="${box || 10}" value="${moq}"><button type="button" class="qbtn pm-plus">+</button></div>
        <button class="btn red pm-add">${t.addCart}</button>
      </div></div>`;
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    const close = () => { wrap.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onEsc); };
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onEsc);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('.pmx').onclick = close;
    // галерея
    wrap.querySelectorAll('.pmthumbs .th').forEach((th) => th.onclick = () => {
      wrap.querySelector('.pmimg').src = th.dataset.src;
      wrap.querySelectorAll('.pmthumbs .th').forEach((x) => x.classList.toggle('on', x === th));
    });
    // цвет (обязателен, если есть)
    let vsku = '', vcolor = '';
    const vname = wrap.querySelector('.pm-vname');
    wrap.querySelectorAll('.sw').forEach((sw) => sw.onclick = () => {
      wrap.querySelectorAll('.sw').forEach((x) => x.classList.remove('on'));
      sw.classList.add('on');
      vsku = sw.dataset.sku; vcolor = sw.dataset.color;
      if (vname) { vname.textContent = vcolor; vname.classList.remove('vreq'); }
      if (sw.dataset.img) wrap.querySelector('.pmimg').src = '/' + sw.dataset.img;
    });
    // количество
    const qi = wrap.querySelector('.pm-qty');
    wrap.querySelector('.pm-minus').onclick = () => stepQty(qi, -1, moq, box, p.unit);
    wrap.querySelector('.pm-plus').onclick = () => stepQty(qi, +1, moq, box, p.unit);
    // в корзину
    wrap.querySelector('.pm-add').onclick = () => {
      if ((p.colors || []).length && !vsku) { toast(t.colorReq); return; }
      let q = parseInt(qi.value, 10) || moq;
      if (q < moq) q = moq;
      if (box) q = Math.ceil(q / box) * box;
      qi.value = q;
      const key2 = vsku || p.code;
      cart[key2] = { code: key2, nm: p.name + (vcolor ? ' (' + vcolor + ')' : ''), priceCny: p.priceCny, moq, box, unit: p.unit, img: '/' + p.imgs[0], qty: q };
      save(); updateBadge(); toast(t.addedToast);
    };
  }
  // перехват клика по карточкам (обычный клик — поп-ап; ctrl/средняя кнопка — обычная ссылка)
  document.addEventListener('click', async (e) => {
    const card2 = e.target.closest('.card[data-slug]');
    if (!card2 || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const p = (await pdata()).find((x) => x.slug === card2.dataset.slug);
    if (!p) { location.href = card2.href; return; }
    productModal(p);
  });

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
      // ничего не нашлось — предлагаем поиск товара под клиента
      const nores = document.getElementById('noresults');
      if (nores) nores.hidden = shown > 0;
    }
    search.addEventListener('input', apply);
    sels.forEach((s) => s.addEventListener('change', apply));
    if (vminEl) { vminEl.addEventListener('input', apply); vmaxEl.addEventListener('input', apply); }
    reset.onclick = () => {
      search.value = ''; sels.forEach((s) => s.value = '');
      if (vminEl) { vminEl.value = vminEl.min; vmaxEl.value = vmaxEl.max; }
      apply();
    };
    // deep-link: ?q= (поиск), ?vmin=&vmax= (диапазон объёма — бот шлёт клиента с готовым фильтром), ?sub= (подгруппа)
    const usp = new URLSearchParams(location.search);
    if (usp.get('q')) search.value = usp.get('q');
    if (vminEl && usp.get('vmin')) vminEl.value = usp.get('vmin');
    if (vmaxEl && usp.get('vmax')) vmaxEl.value = usp.get('vmax');
    if (usp.get('sub')) {
      const want = usp.get('sub');
      const st = stabs.find((b) => b.dataset.sub === want);
      if (st) { activeSub = want; stabs.forEach((x) => x.classList.toggle('on', x === st)); }
    }
    apply();
  }

  updateBadge();
})();
