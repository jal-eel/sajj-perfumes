// cart.js — reads localStorage cart:items and renders an editable cart page
(function(){
  const listEl = document.getElementById('cart-items-list');
  const subEl = document.getElementById('summary-sub');
  const shipEl = document.getElementById('summary-ship');
  const bottleEl = document.getElementById('summary-bottle');
  const totalEl = document.getElementById('summary-total');
  const shipSel = document.getElementById('ship-method');
  const promoEl = document.getElementById('shipping-promo');
  const promoBar = document.getElementById('promo-progress');
  const orderMsg = document.getElementById('order-msg');
  const discountInput = document.getElementById('discount-code');
  const applyDiscountBtn = document.getElementById('apply-discount');
  const discountMsg = document.getElementById('discount-msg');

  const DISCOUNT_THRESHOLD = 30000; // Delivery drops to 1000 if subtotal is above this amount
  const DISCOUNTED_DELIVERY = 1000;
  const FREE_DELIVERY_THRESHOLD = 50000; // Delivery becomes free if subtotal is above this amount

  const BOTTLE_PRICES = {
    'Small classic': 0,
    'Small but Fancy': 1000,
    'Big bottle': 3000
  };

  const PRODUCTS = [
    {id: 'p1', name: 'SAJJ Amber', price: 3000, image: '2.png'},
    {id: 'p2', name: 'SAJJ Dayyan', price: 3500, image: '1.png'},
    {id: 'p3', name: 'SAJJ Intense', price: 4000, image: '4.png'},
    {id: 'p4', name: 'Oud al SAJJ', price: 5000, image: '5.png'},
    {id: 'p5', name: 'SAJJ Addictive', price: 4000, image: '3.png'},
    {id: 'p6', name: 'Sample kit', price: 5000, image: 'logo-removebg-preview.png'}
  ];

  let activeDiscount = null;

  function loadCart(){ return JSON.parse(localStorage.getItem('cart:items') || '[]'); }
  function saveCart(cart){ localStorage.setItem('cart:items', JSON.stringify(cart)); window.dispatchEvent(new Event('storage')); }

  function formatPrice(v){ return Number(v).toFixed(2); }

  function render(){
    const cart = loadCart();
    listEl.innerHTML = '';
    if (cart.length === 0){ listEl.innerHTML = '<div style="padding:16px;color:#666">Your cart is empty.</div>'; updateSummary(); return; }

    cart.forEach(item => {
      const row = document.createElement('div'); row.className = 'cart-item-row';
      
      // Use image if available, else placeholder
      const productInfo = PRODUCTS.find(p => p.id === item.id);
      const ph = document.createElement('div'); ph.className = 'img-placeholder';
      if (productInfo && productInfo.image) {
        ph.innerHTML = `<img src="${productInfo.image}" style="width:100%;height:100%;object-fit:contain">`;
      } else { ph.textContent = 'SAJJ'; }
      
      const meta = document.createElement('div'); meta.className = 'cart-item-meta';
      const name = document.createElement('div'); name.className = 'name'; name.textContent = item.name;
      const price = document.createElement('div'); price.textContent = '₦' + formatPrice(item.price);
      const qtyWrap = document.createElement('div'); qtyWrap.className = 'qty-controls';
      const dec = document.createElement('button'); dec.type='button'; dec.textContent='-';
      const qty = document.createElement('span'); qty.textContent = item.qty; qty.style.minWidth='22px'; qty.style.display='inline-block'; qty.style.textAlign='center';
      const inc = document.createElement('button'); inc.type='button'; inc.textContent='+';
      const rem = document.createElement('button'); rem.type='button'; rem.className='btn btn-ghost'; rem.textContent='Remove';

      dec.addEventListener('click', () => { updateQty(item.id, -1); });
      inc.addEventListener('click', () => { updateQty(item.id, 1); });
      rem.addEventListener('click', () => { removeItem(item.id); });

      qtyWrap.appendChild(dec); qtyWrap.appendChild(qty); qtyWrap.appendChild(inc);
      meta.appendChild(name); meta.appendChild(price); meta.appendChild(qtyWrap); meta.appendChild(rem);

      row.appendChild(ph); row.appendChild(meta);
      listEl.appendChild(row);
    });

    updateSummary();
  }

  function updateQty(id, delta){
    const cart = loadCart();
    const it = cart.find(i=>i.id===id); if (!it) return;
    it.qty = Math.max(1, it.qty + delta);
    saveCart(cart); render();
  }

  function removeItem(id){
    let cart = loadCart(); cart = cart.filter(i=>i.id !== id); saveCart(cart); render(); renderQuickShop();
  }

  function updateSummary(){
    const cart = loadCart();
    const sub = cart.reduce((s,i) => s + i.price * i.qty, 0);
    let ship = Number(shipSel.value || 0);
    let discountAmt = 0;

    if (activeDiscount === 'SAMPLE10') {
      const sampleKit = cart.find(i => i.id === 'p6');
      if (sampleKit) {
        discountAmt = (sampleKit.price * sampleKit.qty) * 0.10;
      }
    } else if (activeDiscount === 'SAJJ10') {
      discountAmt = sub * 0.10;
    }
    
    const bottleRadio = document.querySelector('input[name="bottle-type"]:checked');
    const bottleCost = bottleRadio ? (BOTTLE_PRICES[bottleRadio.value] || 0) : 0;

    // Apply discounted delivery logic
    if (ship > 0) {
      if (sub >= FREE_DELIVERY_THRESHOLD) ship = 0;
      else if (sub >= DISCOUNT_THRESHOLD) ship = DISCOUNTED_DELIVERY;
    }

    if (promoEl) {
      if (sub > 0 && sub < DISCOUNT_THRESHOLD) {
        promoEl.textContent = `Add ₦${formatPrice(DISCOUNT_THRESHOLD - sub)} more for discounted delivery!`;
        promoEl.style.color = '#ff6b00';
      } else if (sub >= DISCOUNT_THRESHOLD && sub < FREE_DELIVERY_THRESHOLD) {
        promoEl.textContent = `Discount unlocked! Add ₦${formatPrice(FREE_DELIVERY_THRESHOLD - sub)} for FREE delivery!`;
        promoEl.style.color = '#ff9a3c';
      } else if (sub >= FREE_DELIVERY_THRESHOLD) {
        promoEl.textContent = 'Free delivery unlocked! 🎉';
        promoEl.style.color = '#00c853';
      } else {
        promoEl.textContent = '';
      }
    }

    if (promoBar) {
      // Progress bar now tracks towards the ultimate goal (Free Delivery)
      const pct = Math.min(100, (sub / FREE_DELIVERY_THRESHOLD) * 100);
      promoBar.style.width = pct + '%';
      
      if (pct >= 100) {
        promoBar.style.backgroundColor = '#00c853';
        if (!promoBar.dataset.fired && typeof confetti === 'function') {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          promoBar.dataset.fired = "true";
        }
      } else {
        // Orange if they hit the first discount, standard orange-red if not
        promoBar.style.backgroundColor = sub >= DISCOUNT_THRESHOLD ? '#ff9a3c' : '#ff6b00';
        delete promoBar.dataset.fired;
      }
    }

    subEl.textContent = '₦' + formatPrice(sub);
    shipEl.textContent = (ship === 0 && Number(shipSel.value) > 0) ? '₦0.00 (Free)' : '₦' + formatPrice(ship);
    if(bottleEl) bottleEl.textContent = '₦' + formatPrice(bottleCost);
    
    let total = sub + ship + bottleCost - discountAmt;
    if (discountAmt > 0) {
       if(discountMsg) { discountMsg.textContent = `Discount applied: -₦${formatPrice(discountAmt)}`; discountMsg.style.color = 'green'; }
    } else if (activeDiscount && discountMsg) {
       discountMsg.textContent = 'Discount code active but no applicable items.';
       discountMsg.style.color = '#666';
    } else if (discountMsg) {
       discountMsg.textContent = '';
    }
    totalEl.textContent = '₦' + formatPrice(total);

    const navCount = document.getElementById('nav-cart-count'); if (navCount) navCount.textContent = cart.reduce((s,i)=>s+i.qty,0);
    localStorage.setItem('cart:items', JSON.stringify(cart));
  }

  const form = document.getElementById('checkout-form');
  const bankBtn = document.getElementById('pay-bank');
  const codBtn = document.getElementById('place-order-cod');
  const bankPanel = document.getElementById('bank-panel');
  const submitBank = document.getElementById('submit-bank');
  const cancelBank = document.getElementById('cancel-bank');
  const bankRefEl = document.getElementById('bank-ref');
  const bankProofEl = document.getElementById('bank-proof');
  const copyBankBtn = document.getElementById('copy-bank-btn');

  let selectedPayment = null;
  function selectPayment(method){
    selectedPayment = method;
    if (bankBtn){ bankBtn.classList.toggle('selected', method === 'bank'); bankBtn.setAttribute('aria-pressed', String(method === 'bank')); }
    if (codBtn){ codBtn.classList.toggle('selected', method === 'cod'); codBtn.setAttribute('aria-pressed', String(method === 'cod')); }
    if (bankPanel){ bankPanel.style.display = method === 'bank' ? 'block' : 'none'; if (method === 'bank') bankRefEl && bankRefEl.focus(); }
  }

  function gatherForm(){
    const name = document.getElementById('cust-name').value.trim();
    const email = document.getElementById('cust-email').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const notes = document.getElementById('cust-notes').value.trim();
    
    const bottleRadio = document.querySelector('input[name="bottle-type"]:checked');
    const bottleType = bottleRadio ? bottleRadio.value : 'Small classic';
    const bottleCost = BOTTLE_PRICES[bottleType] || 0;

    let ship = Number(document.getElementById('ship-method').value || 0);

    // Ensure the order data reflects the discounted delivery
    const cart = loadCart();
    const sub = cart.reduce((s,i) => s + i.price * i.qty, 0);
    
    let discountAmt = 0;
    if (activeDiscount === 'SAMPLE10') {
      const sampleKit = cart.find(i => i.id === 'p6');
      if (sampleKit) {
        discountAmt = (sampleKit.price * sampleKit.qty) * 0.10;
      }
    } else if (activeDiscount === 'SAJJ10') {
      discountAmt = sub * 0.10;
    }

    if (ship > 0) {
      if (sub >= FREE_DELIVERY_THRESHOLD) ship = 0;
      else if (sub >= DISCOUNT_THRESHOLD) ship = DISCOUNTED_DELIVERY;
    }

    if (!name || !email || !phone || !address) return { error: 'Please fill in all fields.' };
    return { name, email, phone, address, ship, bottleType, bottleCost, notes, discountAmt };
  }

  async function sendOrderToServer(order){
    try{
      const res = await fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(order) });
      if (res.ok) return await res.json();
    }catch(e){ }
    return null;
  }

  // --- GOOGLE SHEETS INTEGRATION ---
  // TODO: Replace the URL below with your actual Google Apps Script Web App URL
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx0YTvBBmLbX9zksJZkHcprPPFAEuWAX3A_LCb8d2GgLa1FhwDdCQK7zF4hzzs-i-DF8g/exec'; 

  function sendToGoogleSheet(order){
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_YOUR')) return Promise.resolve();
    
    const data = {
      id: order.id, date: new Date().toLocaleString(),
      name: order.customer.name, email: order.customer.email, phone: order.customer.phone, address: order.customer.address,
      items: order.items.map(i => `${i.qty}x ${i.name}`).join(', '),
      total: order.total, payment: order.payment.method, status: order.payment.paid ? 'Paid' : 'Pending'
      , notes: order.notes
    };

    // mode: 'no-cors' is required for sending data to Google Scripts from a browser
    return fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    })
    .then(() => console.log('✅ Sent to Google Sheet'))
    .catch(e => console.log('❌ Sheet Error', e));
  }

  // --- NEW: DIRECT EMAIL VIA FORMSUBMIT (Client Side) ---
  async function sendToEmail(order) {
    const adminEmail = 'sajjplace@gmail.com';
    const data = {
      _subject: `New Order ${order.id} - ₦${Number(order.total).toFixed(2)}`,
      _template: 'table',
      Order_ID: order.id,
      Date: new Date(order.date).toLocaleString(),
      Customer_Name: order.customer.name,
      Customer_Email: order.customer.email,
      Customer_Phone: order.customer.phone,
      Address: order.customer.address,
      Items: (order.items || []).map(i => `${i.qty}x ${i.name}`).join(', '),
      Total: `₦${Number(order.total).toFixed(2)}`,
      Payment_Method: order.payment ? order.payment.method : 'N/A',
      Notes: order.notes || ''
    };
    try {
      await fetch(`https://formsubmit.co/ajax/${adminEmail}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch(e) { console.log('Email send failed', e); }
  }

  // --- UPDATED PLACE ORDER WITH EXCEL SYNC ---
  async function placeOrder(data, payment){
    const cart = loadCart();
    if (cart.length === 0){ orderMsg.textContent = 'Your cart is empty.'; return; }
    const orderId = 'o_' + Date.now();
    const subtotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
    const totalAmount = subtotal + data.ship + (data.bottleCost || 0) - (data.discountAmt || 0);

    const order = { id: orderId, date: new Date().toISOString(), customer: {name: data.name, email: data.email, phone: data.phone, address: data.address}, items: cart, shipping: data.ship, total: totalAmount, payment, bottleType: data.bottleType, bottleCost: data.bottleCost, notes: data.notes, discount: data.discountAmt };
    
    // Internal Log
    const orders = JSON.parse(localStorage.getItem('sajj:orders') || '[]'); 
    orders.push(order); 
    localStorage.setItem('sajj:orders', JSON.stringify(orders));

    // EXCEL LOGGING (sajj_orders)
    const excelOrder = {
      id: orderId,
      date: new Date().toLocaleDateString(),
      name: data.name,
      scent: cart.map(i => i.name).join(' | '),
      qty: cart.reduce((s, i) => s + i.qty, 0),
      price: totalAmount,
      paymentMethod: payment.method,
      status: payment.paid ? "Paid" : "Pending"
    };
    const excelOrders = JSON.parse(localStorage.getItem('sajj_orders') || '[]');
    excelOrders.push(excelOrder);
    localStorage.setItem('sajj_orders', JSON.stringify(excelOrders));

    if (activeDiscount === 'SAJJ10') {
      localStorage.setItem('sajj_discount_used_SAJJ10', 'true');
    }

    // Also flag the sample kit code as used
    if (activeDiscount === 'SAMPLE10') {
      localStorage.setItem('sajj_discount_used_SAMPLE10', 'true');
    }

    sendOrderToServer(order).catch(()=>{});
    await sendToGoogleSheet(order);
    await sendToEmail(order); // Send email directly from browser
    localStorage.setItem('cart:items', JSON.stringify([]));
    try{ window.dispatchEvent(new Event('storage')); }catch(e){}
    window.location.href = 'thankyou.html?order=' + encodeURIComponent(orderId);
  }

  if (codBtn){ codBtn.addEventListener('click', () => {
    selectPayment('cod');
    orderMsg.textContent = '';
    const data = gatherForm(); if (data.error){ orderMsg.textContent = data.error; orderMsg.style.color = '#f99'; return; }
    placeOrder(data, { method: 'cod', paid: false });
  }); }

  if (bankBtn){ bankBtn.addEventListener('click', () => { selectPayment('bank'); }); }
  if (cancelBank){ cancelBank.addEventListener('click', () => { if (bankPanel){ bankPanel.style.display = 'none'; } }); }

  if (submitBank){ submitBank.addEventListener('click', () => {
    orderMsg.textContent = '';
    const data = gatherForm(); if (data.error){ orderMsg.textContent = data.error; orderMsg.style.color = '#f99'; return; }
    const ref = (bankRefEl && bankRefEl.value || '').trim();
    placeOrder(data, { method: 'bank', paid: false, reference: ref || null });
  }); }

  if (copyBankBtn) {
    copyBankBtn.addEventListener('click', () => {
      const num = document.getElementById('bank-acc-num').textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(num).then(() => { copyBankBtn.textContent = 'Copied!'; setTimeout(() => copyBankBtn.textContent = 'Copy', 2000); });
      } else { alert('Copy: ' + num); }
    });
  }

  if (applyDiscountBtn) {
    applyDiscountBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const code = discountInput.value.trim().toUpperCase();
      if (code === 'SAMPLE10') {
        if (localStorage.getItem('sajj_discount_used_SAMPLE10')) {
          activeDiscount = null;
          if(discountMsg) { discountMsg.textContent = 'This code has already been used.'; discountMsg.style.color = 'red'; }
          updateSummary();
        } else {
          activeDiscount = code;
          updateSummary();
        }
      } else if (code === 'SAJJ10') {
        if (localStorage.getItem('sajj_discount_used_SAJJ10')) {
          activeDiscount = null;
          if(discountMsg) { discountMsg.textContent = 'This code has already been used.'; discountMsg.style.color = 'red'; }
          updateSummary();
        } else {
          activeDiscount = code;
          updateSummary();
        }
      } else {
        activeDiscount = null;
        if(discountMsg) { discountMsg.textContent = 'Invalid code'; discountMsg.style.color = 'red'; }
        updateSummary();
      }
    });
  }

  // --- GLOBAL EXCEL EXPORT FUNCTION ---
  window.exportSajjSales = function() {
      const orders = JSON.parse(localStorage.getItem('sajj_orders') || '[]');
      if (orders.length === 0) { alert("No orders found!"); return; }

      let csvContent = "Order_ID,Date,Customer_Name,Scent,Qty,Total_Price,Payment_Method,Status\n";
      orders.forEach(o => {
          const row = `${o.id},${o.date},"${o.name}","${o.scent}",${o.qty},${o.price},${o.paymentMethod},${o.status}`;
          csvContent += row + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SAJJ_Sales_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- QUICK SHOP RENDERER ---
  function renderQuickShop(){
    const container = document.getElementById('quick-shop-grid');
    if (!container) return;
    container.innerHTML = '';
    
    const cart = loadCart();
    const cartIds = new Set(cart.map(i => i.id));
    const available = PRODUCTS.filter(p => !cartIds.has(p.id));

    if (available.length === 0) { container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888">All available items are in your cart.</div>'; return; }

    // Show 4 random products from available
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);
    
    selected.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.style.border = '2px solid #000'; // slightly smaller border for mini cards
      
      const imgWrap = document.createElement('div');
      imgWrap.className = 'product-img';
      imgWrap.style.height = '140px';
      
      const ph = document.createElement('div'); ph.className = 'img-placeholder';
      if (p.image) {
         ph.innerHTML = `<img src="${p.image}" style="width:100%;height:100%;object-fit:contain">`;
      } else { ph.textContent = 'SAJJ'; }
      imgWrap.appendChild(ph);
      
      const title = document.createElement('div'); title.className = 'product-title'; title.style.fontSize='1rem'; title.textContent = p.name;
      const price = document.createElement('div'); price.className = 'product-price'; price.style.fontSize='1.1rem'; price.innerHTML = '<span class="currency">₦</span>' + formatPrice(p.price);
      
      const btn = document.createElement('button'); btn.className = 'btn btn-primary'; btn.textContent = 'Add'; btn.style.width='100%';
      btn.addEventListener('click', () => addToCart(p.id));
      
      card.appendChild(imgWrap); card.appendChild(title); card.appendChild(price); card.appendChild(btn);
      container.appendChild(card);
    });
  }

  function addToCart(id){
    const cart = loadCart();
    const item = cart.find(i => i.id === id);
    if (item) item.qty += 1;
    else { const p = PRODUCTS.find(x => x.id === id); if(p) cart.push({id: p.id, name: p.name, price: p.price, qty:1}); }
    saveCart(cart); render(); renderQuickShop();
  }

  shipSel && shipSel.addEventListener('change', () => { updateSummary(); });
  document.querySelectorAll('input[name="bottle-type"]').forEach(r => r.addEventListener('change', updateSummary));
  window.addEventListener('storage', (e) => { if (e.key === 'cart:items') render(); });
  render();
  renderQuickShop();
})();