(function(){
  const list = document.getElementById('orders-list');
  const searchInput = document.getElementById('order-search');
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('admin-logout');
  let allOrders = [];

  // --- AUTH LOGIC ---
  function checkAuth() {
    if (!sessionStorage.getItem('sajj_auth')) {
      if(loginOverlay) loginOverlay.style.display = 'flex';
      return false;
    }
    if(loginOverlay) loginOverlay.style.display = 'none';
    return true;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('admin-user').value.trim();
      const p = document.getElementById('admin-pass').value.trim();
      if (!u || !p) { loginError.textContent = 'Please enter credentials.'; return; }
      const token = btoa(u + ':' + p);
      sessionStorage.setItem('sajj_auth', token);
      checkAuth();
      refresh();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('sajj_auth');
      window.location.reload();
    });
  }

  async function fetchServerOrders(){
    const auth = sessionStorage.getItem('sajj_auth');
    const headers = auth ? { 'Authorization': 'Basic ' + auth } : {};
    try{ 
      const res = await fetch('/api/orders', { headers }); 
      if (res.status === 401) { sessionStorage.removeItem('sajj_auth'); checkAuth(); return null; }
      if (!res.ok) throw new Error('no'); 
      return await res.json(); 
    }catch(e){ return null; }
  }

  function localOrders(){ return JSON.parse(localStorage.getItem('sajj:orders') || '[]'); }

  async function refresh(){
    if (!checkAuth()) return; // Stop if not logged in
    let svr = await fetchServerOrders();
    const local = localOrders();

    if (svr){ 
      svr = svr.map(sOrder => {
        const localMatch = local.find(l => l.id === sOrder.id);
        if (localMatch && localMatch.payment) {
          if (localMatch.payment.paid) sOrder.payment = Object.assign({}, sOrder.payment || {}, { paid: true });
          if (localMatch.payment.delivered) sOrder.payment = Object.assign({}, sOrder.payment || {}, { delivered: true });
        }
        return sOrder;
      });
      allOrders = svr;
    } else {
      allOrders = local;
    }
    applySearch();
  }

  function applySearch(){
    const term = (searchInput ? searchInput.value : '').toLowerCase();
    const filtered = allOrders.filter(o => {
      const text = (o.id + ' ' + o.customer.name + ' ' + o.customer.email).toLowerCase();
      return text.includes(term);
    });
    render(filtered);
  }

  if(searchInput) searchInput.addEventListener('input', applySearch);

  function render(orders){
    if (!orders || orders.length === 0){ list.innerHTML = '<div style="padding:12px;color:#666">No orders found.</div>'; return; }
    list.innerHTML = '';
    orders.slice().reverse().forEach(o => {
      const card = document.createElement('div'); card.className = 'order-card';
      const head = document.createElement('div'); head.innerHTML = `<strong>Order ${o.id}</strong> — ${new Date(o.date).toLocaleString()}`;
      
      // Fix NaN total by recalculating from items and shipping if needed
      let finalTotal = Number(o.total);
      if (isNaN(finalTotal)) {
        const sub = (o.items || []).reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
        finalTotal = sub + (Number(o.shipping) || 0);
      }

      const meta = document.createElement('div'); meta.className = 'order-meta';
      meta.innerHTML = `<div><strong>Name:</strong> ${o.customer.name}</div><div><strong>Bottle:</strong> ${o.bottleType || 'N/A'}</div><div><strong>Total:</strong> ₦${finalTotal.toFixed(2)}</div>`;
      
      const items = document.createElement('div'); items.style.marginTop='8px'; items.innerHTML = '<strong>Items</strong>';
      o.items.forEach(it => { const r = document.createElement('div'); r.textContent = `${it.name} — ${it.qty} × ₦${Number(it.price).toFixed(2)}`; items.appendChild(r); });

      if (o.notes) {
        const notesEl = document.createElement('div'); notesEl.style.marginTop='8px'; notesEl.style.color='#555'; notesEl.innerHTML = `<strong>Notes:</strong> ${o.notes}`; items.appendChild(notesEl);
      }

      card.appendChild(head); card.appendChild(meta); card.appendChild(items);

      if (o.payment && (o.payment.proof || o.payment.proofUrl)){
        const img = document.createElement('img'); img.className='proof-img'; img.src = o.payment.proofUrl || o.payment.proof; card.appendChild(img);
      }

      const actions = document.createElement('div'); actions.className = 'order-actions';
      
      // PAID BUTTON
      const verifyBtn = document.createElement('button'); 
      if (o.payment && o.payment.paid) {
          verifyBtn.className = 'btn';
          verifyBtn.style.background = '#00f5d4'; 
          verifyBtn.textContent = '✓ Paid';
          verifyBtn.disabled = true;
      } else {
          verifyBtn.className = 'btn btn-ghost'; 
          verifyBtn.textContent = 'Mark Paid'; 
          verifyBtn.addEventListener('click', () => markPaid(o.id));
      }
      actions.appendChild(verifyBtn);

      // DELIVERED BUTTON
      const deliverBtn = document.createElement('button');
      if (o.payment && o.payment.delivered) {
          deliverBtn.className = 'btn';
          deliverBtn.style.background = '#be95ff'; 
          deliverBtn.textContent = '📦 Delivered';
          deliverBtn.disabled = true;
      } else {
          deliverBtn.className = 'btn btn-ghost';
          deliverBtn.textContent = 'Delivered';
          deliverBtn.addEventListener('click', () => markDelivered(o.id));
      }
      actions.appendChild(deliverBtn);

      // --- NEW DELETE BUTTON ---
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn';
      deleteBtn.style.background = '#ff4d6d'; // SAJJ Red
      deleteBtn.style.color = '#fff';
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = 'Delete Order';
      deleteBtn.addEventListener('click', () => deleteOrder(o.id));
      actions.appendChild(deleteBtn);

      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  async function markPaid(id){
    const currentOrders = localOrders();
    const svrOrders = await fetchServerOrders() || [];
    let targetOrder = currentOrders.find(o => o.id === id) || svrOrders.find(o => o.id === id);
    
    if (targetOrder) {
        const updatedOrders = currentOrders.filter(o => o.id !== id);
        targetOrder.payment = Object.assign({}, targetOrder.payment || {}, { paid: true });
        updatedOrders.push(targetOrder);
        localStorage.setItem('sajj:orders', JSON.stringify(updatedOrders));
        refresh();
    }
  }

  async function markDelivered(id) {
    const currentOrders = localOrders();
    const svrOrders = await fetchServerOrders() || [];
    let targetOrder = currentOrders.find(o => o.id === id) || svrOrders.find(o => o.id === id);
    
    if (targetOrder) {
        const updatedOrders = currentOrders.filter(o => o.id !== id);
        targetOrder.payment = Object.assign({}, targetOrder.payment || {}, { delivered: true });
        updatedOrders.push(targetOrder);
        localStorage.setItem('sajj:orders', JSON.stringify(updatedOrders));
        refresh();
    }
  }

  // --- NEW DELETE FUNCTION ---
  function deleteOrder(id) {
    if (confirm("Delete this order permanently from your local view?")) {
        const currentOrders = localOrders();
        const updatedOrders = currentOrders.filter(o => o.id !== id);
        localStorage.setItem('sajj:orders', JSON.stringify(updatedOrders));
        refresh();
    }
  }

  window.clearAllOrders = function() {
    if (confirm("Delete ALL local order history?")) {
      localStorage.removeItem('sajj:orders');
      refresh();
    }
  };

  refresh();
})();