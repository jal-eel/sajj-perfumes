(function(){
  const list = document.getElementById('tickets-list');
  const searchInput = document.getElementById('ticket-search');
  const filterUnresolved = document.getElementById('filter-unresolved');
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('admin-logout');
  let allTickets = [];
  let currentPage = 1;
  const itemsPerPage = 5;

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

  async function fetchServerTickets(){
    const auth = sessionStorage.getItem('sajj_auth');
    const headers = auth ? { 'Authorization': 'Basic ' + auth } : {};
    try{ 
      const res = await fetch('/api/tickets', { headers }); 
      if (res.status === 401) { sessionStorage.removeItem('sajj_auth'); checkAuth(); return null; }
      if (!res.ok) throw new Error('no'); 
      return await res.json(); 
    }catch(e){ return null; }
  }

  function localTickets(){ return JSON.parse(localStorage.getItem('sajj:tickets') || '[]'); }

  function render(tickets){
    if (!tickets || tickets.length === 0){ list.innerHTML = '<div style="padding:12px;color:#666">No messages found.</div>'; return; }
    list.innerHTML = '';
    tickets.forEach(t => {
      const card = document.createElement('div'); card.className = 'ticket-card';
      const head = document.createElement('div'); head.innerHTML = `<strong>Message ${t.id}</strong> — ${new Date(t.date).toLocaleString()}`;
      const meta = document.createElement('div'); meta.className = 'ticket-meta';
      meta.innerHTML = `<div><strong>Name:</strong> ${t.name}</div><div><strong>Email:</strong> ${t.email}</div><div><strong>Phone:</strong> ${t.phone || 'N/A'}</div><div><strong>Handled:</strong> ${t.handled ? 'Yes' : 'No'}</div>`;
      const msg = document.createElement('div'); msg.className = 'ticket-msg'; msg.innerHTML = `<pre style="white-space:pre-wrap;margin:0">${(t.message||'').replace(/</g,'&lt;')}</pre>`;

      card.appendChild(head); card.appendChild(meta); card.appendChild(msg);

      const actions = document.createElement('div'); actions.className = 'ticket-actions';
      const handledBtn = document.createElement('button'); handledBtn.className='btn'; handledBtn.textContent = t.handled ? 'Mark unresolved' : 'Mark handled'; handledBtn.addEventListener('click', () => toggleHandled(t.id, !t.handled));
      actions.appendChild(handledBtn);
      const copyBtn = document.createElement('button'); copyBtn.className='btn btn-ghost'; copyBtn.textContent='Copy email/phone'; copyBtn.addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText(`${t.email} ${t.phone || ''}`); alert('Copied'); });
      actions.appendChild(copyBtn);

      // Delete Button
      const delBtn = document.createElement('button'); 
      delBtn.className='btn'; delBtn.style.background='#ff4d6d'; delBtn.style.color='#fff'; delBtn.style.marginLeft='auto';
      delBtn.textContent='🗑️'; delBtn.title='Delete Message';
      delBtn.addEventListener('click', () => deleteTicket(t.id));
      actions.appendChild(delBtn);

      card.appendChild(actions);

      list.appendChild(card);
    });
  }

  function updateView(){
    const term = (searchInput ? searchInput.value : '').toLowerCase();
    const onlyUnresolved = filterUnresolved ? filterUnresolved.checked : false;

    const filtered = allTickets.filter(t => {
      if (onlyUnresolved && t.handled) return false;
      const text = (t.id + ' ' + t.name + ' ' + t.email + ' ' + (t.phone||'') + ' ' + (t.message||'')).toLowerCase();
      return text.includes(term);
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = 1;
    
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filtered.slice(start, start + itemsPerPage);
    
    render(pageItems);
    renderPagination(totalPages);
  }

  function renderPagination(totalPages){
    let controls = document.getElementById('pagination-controls');
    if (!controls){
      controls = document.createElement('div'); controls.id = 'pagination-controls';
      controls.style.cssText = 'margin-top:20px;display:flex;gap:10px;justify-content:center;align-items:center';
      list.parentNode.appendChild(controls);
    }
    controls.innerHTML = '';
    const prev = document.createElement('button'); prev.className='btn'; prev.textContent='Previous'; prev.disabled = currentPage === 1; prev.onclick = () => { if(currentPage>1){currentPage--; updateView();} };
    const info = document.createElement('span'); info.textContent = `Page ${currentPage} of ${totalPages}`; info.style.fontWeight='bold';
    const next = document.createElement('button'); next.className='btn'; next.textContent='Next'; next.disabled = currentPage === totalPages; next.onclick = () => { if(currentPage<totalPages){currentPage++; updateView();} };
    controls.appendChild(prev); controls.appendChild(info); controls.appendChild(next);
  }

  async function refresh(){
    if (!checkAuth()) return;
    const svr = await fetchServerTickets();
    allTickets = svr || localTickets();
    allTickets.sort((a,b) => new Date(b.date) - new Date(a.date)); // Newest first
    updateView();
  }

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; updateView(); });
  if (filterUnresolved) filterUnresolved.addEventListener('change', () => { currentPage = 1; updateView(); });

  async function toggleHandled(id, handled){
    const auth = sessionStorage.getItem('sajj_auth');
    const headers = { 'Content-Type':'application/json' };
    if (auth) headers['Authorization'] = 'Basic ' + auth;
    // try server
    try{ const res = await fetch('/api/tickets/' + encodeURIComponent(id), { method:'PUT', headers, body: JSON.stringify({ handled }) }); if (res.ok){ alert('Updated on server.'); refresh(); return; } }catch(e){}
    // fallback: localStorage
    const tickets = localTickets().map(t => t.id === id ? Object.assign({}, t, { handled }) : t );
    localStorage.setItem('sajj:tickets', JSON.stringify(tickets)); alert('Updated locally.'); refresh();
  }

  async function deleteTicket(id){
    if (!confirm("Delete this message permanently?")) return;
    const auth = sessionStorage.getItem('sajj_auth');
    const headers = auth ? { 'Authorization': 'Basic ' + auth } : {};
    // try server
    try{ const res = await fetch('/api/tickets/' + encodeURIComponent(id), { method:'DELETE', headers }); if (res.ok){ refresh(); return; } }catch(e){}
    // fallback: localStorage
    const tickets = localTickets().filter(t => t.id !== id);
    localStorage.setItem('sajj:tickets', JSON.stringify(tickets)); refresh();
  }

  refresh();
})();