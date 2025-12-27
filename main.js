// Simple slideshow controls and autoplay for placeholder slides
(() => {
	const slides = Array.from(document.querySelectorAll('.slide'));
	const dots = Array.from(document.querySelectorAll('.dot'));
	const prevBtn = document.querySelector('.slideshow-control.prev');
	const nextBtn = document.querySelector('.slideshow-control.next');
	let index = 0;
	let autoplayId = null;
	const AUTOPLAY_MS = 5000;

	function show(i){
		if (i < 0) i = slides.length - 1;
		if (i >= slides.length) i = 0;
		slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
		dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
		index = i;
	}

	function next(){ show(index + 1); }
	function prev(){ show(index - 1); }

	prevBtn && prevBtn.addEventListener('click', () => { prev(); resetAutoplay(); });
	nextBtn && nextBtn.addEventListener('click', () => { next(); resetAutoplay(); });

	dots.forEach(d => d.addEventListener('click', (e) => {
		const i = Number(e.currentTarget.getAttribute('data-index')) - 1;
		show(i);
		resetAutoplay();
	}));

	document.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowLeft') { prev(); resetAutoplay(); }
		if (e.key === 'ArrowRight') { next(); resetAutoplay(); }
	});

	function startAutoplay(){
		if (autoplayId) return;
		autoplayId = setInterval(() => next(), AUTOPLAY_MS);
	}
	function stopAutoplay(){
		if (!autoplayId) return;
		clearInterval(autoplayId);
		autoplayId = null;
	}
	function resetAutoplay(){ stopAutoplay(); startAutoplay(); }

	const wrapper = document.querySelector('.slides-wrapper');
	wrapper && wrapper.addEventListener('mouseenter', stopAutoplay);
	wrapper && wrapper.addEventListener('mouseleave', startAutoplay);

		// initialize
		if (slides.length){ show(0); startAutoplay(); }
})();

// Simple shop: render products, add-to-cart and cart persistence
(function(){
	// Prices are already specified in Nigerian Naira (NGN). Skip live conversion when PRICE_BASE_USD is false.
	const PRICE_BASE_USD = false;
	const PRODUCTS = [
		{id: 'p1', name: 'SAJJ Amber', price: 3000, image: '2.png', category: 'oil perfume', description: 'A warm and inviting scent with top notes of Bergamot and Pink Pepper, a heart of Amber and Vanilla, resting on a Sandalwood base. Perfect for a soft life.'},
		{id: 'p2', name: 'SAJJ Dayyan', price: 3500, image: '1.png', category: 'oil perfume', description: 'A calm and sophisticated Oud. Clean and fresh, it features Lemon and Sea Salt top notes, Sage and Iris heart, and a smooth White Musk base. The ultimate clean steeze for those who appreciate a subtle yet powerful scent.'},
		{id: 'p3', name: 'SAJJ Intense', price: 4000, image: '4.png', category: 'oil perfume', description: 'Bold and captivating. Coffee and Cardamom open up to Praline and Jasmine, finishing with Cedarwood. For the main character.'},
		{id: 'p4', name: 'Oud al SAJJ', price: 5000, image: '5.png', category: 'oil perfume', description: 'Rich and powerful. Saffron and Nutmeg lead into Agarwood (Oud), with a deep Patchouli and Musk base. Pure boss energy.'},
		{id: 'p5', name: 'SAJJ Addictive', price: 4000, image: '3.png', category: 'oil perfume', description: 'Sweet and seductive. Caramel and Peach top notes, Tuberose and Honey heart, and a Tonka Bean base. A true party starter.'},
		{id: 'p6', name: 'Sample kit', price: 5000, image: 'logo-removebg-preview.png', category: 'oil perfume', description: 'Can\'t decide? Try our curated selection of our best-selling scents in smaller vials to find your perfect match.'},
		{id: 'cs1', name: 'Mystery Scent 1', price: 0, image: null, category: 'oil perfume', comingSoon: true, description: 'A new fragrance is currently in the works. Stay tuned for the reveal!'},
		{id: 'cs2', name: 'Mystery Scent 2', price: 0, image: null, category: 'oil perfume', comingSoon: true, description: 'Something special is coming. Sign up for our newsletter to be the first to know.'},
		{id: 'cs3', name: 'Mystery Scent 3', price: 0, image: null, category: 'oil perfume', comingSoon: true, description: 'We are crafting another masterpiece. Watch this space.'}
	];

	const grid = document.getElementById('product-grid');
	const cartToggle = document.getElementById('cart-toggle');
	const cartPanel = document.getElementById('cart-panel');
	const cartItemsEl = document.getElementById('cart-items');
	const cartCountEl = document.getElementById('cart-count');
	const cartTotalEl = document.getElementById('cart-total');
	const closeCartBtn = document.getElementById('close-cart');
	const sortSelect = document.getElementById('sort-select');
	const searchInput = document.getElementById('product-search');

	let cart = JSON.parse(localStorage.getItem('cart:items') || '[]');

	function formatPrice(v){ return v.toFixed(2); }


	function renderProducts(){
		if (!grid) return;
		grid.innerHTML = '';

		let displayProducts = [...PRODUCTS];

		// Search Filter
		if (searchInput && searchInput.value.trim()) {
			const term = searchInput.value.toLowerCase().trim();
			displayProducts = displayProducts.filter(p => p.name.toLowerCase().includes(term));
		}

		if (sortSelect && sortSelect.value === 'price-asc') displayProducts.sort((a, b) => a.price - b.price);
		if (sortSelect && sortSelect.value === 'price-desc') displayProducts.sort((a, b) => b.price - a.price);

		// Limit products if data-limit is set (e.g. on Home page)
		if (grid.dataset.limit) {
			const limit = parseInt(grid.dataset.limit, 10);
			if (!isNaN(limit)) {
				displayProducts = displayProducts.slice(0, limit);
			}
		}

		displayProducts.forEach(p => {

			const card = document.createElement('div');
			card.className = 'product-card';

			// category badge
			const badge = document.createElement('div'); badge.className = 'product-badge'; badge.textContent = (p.category || '').replace(/^\w/, c => c.toUpperCase());
			card.appendChild(badge);

			// longevity badge
			if (!p.comingSoon) {
				const longBadge = document.createElement('div'); longBadge.className = 'longevity-badge'; 
				const isOud = p.name.includes('Oud') || p.name === 'SAJJ Dayyan';
				longBadge.textContent = isOud ? '⏱️ 48h+' : '⏱️ 24h+';
				if (isOud) longBadge.classList.add('oud');
				card.appendChild(longBadge);
			}

			const imgWrap = document.createElement('div');
			imgWrap.className = 'product-img';
			if (p.image){
				const img = document.createElement('img');
				img.src = p.image; img.alt = p.name;
				imgWrap.appendChild(img);
			} else {
				const ph = document.createElement('div');
				ph.className = 'img-placeholder';
				if (p.comingSoon) {
					ph.textContent = '🔒';
					ph.style.fontSize = '40px';
					ph.style.background = '#f0f0f0';
				} else {
					ph.textContent = 'SAJJ';
				}
				imgWrap.appendChild(ph);
			}

			// quick overlay
			const overlay = document.createElement('div'); overlay.className = 'img-overlay';
			overlay.innerHTML = '<button class="btn btn-ghost" type="button" aria-label="Quick view">👁 Quick view</button>';
			imgWrap.appendChild(overlay);

			const title = document.createElement('div');
			title.className = 'product-title';
			title.textContent = p.name;

			const price = document.createElement('div');
			price.className = 'product-price';
			if (p.comingSoon) {
				price.innerHTML = '<span style="color:#888;font-size:14px;font-weight:normal">Stay tuned</span>';
			} else {
				price.innerHTML = '<span class="currency">₦</span>' + formatPrice(p.price);
			}

			const actions = document.createElement('div'); actions.className = 'product-actions';
			if (p.comingSoon) {
				const csBtn = document.createElement('button');
				csBtn.className = 'btn btn-ghost';
				csBtn.textContent = 'Coming Soon';
				csBtn.disabled = true;
				csBtn.style.width = '100%';
				csBtn.style.cursor = 'default';
				csBtn.style.opacity = '0.7';
				actions.appendChild(csBtn);
			} else {
				const addBtn = document.createElement('button'); addBtn.className = 'btn btn-primary'; addBtn.textContent = '🛒 Add to cart'; addBtn.addEventListener('click', () => { addToCart(p.id); });
				const infoBtn = document.createElement('button'); infoBtn.className = 'btn btn-ghost'; infoBtn.textContent = 'Details'; infoBtn.addEventListener('click', () => { openProductModal(p); });
				actions.appendChild(addBtn); actions.appendChild(infoBtn);
			}

			card.appendChild(imgWrap);
			card.appendChild(title);
			card.appendChild(price);
			card.appendChild(actions);

			grid.appendChild(card);
		});
	}

    // --- PRODUCT MODAL LOGIC ---
    function openProductModal(product) {
        let modal = document.getElementById('sajj-product-modal');
        if (!modal) {
            // Create modal HTML if it doesn't exist
            const div = document.createElement('div');
            div.innerHTML = `
                <div id="sajj-product-modal" class="sajj-modal-overlay">
                    <div class="sajj-modal">
                        <button class="sajj-modal-close">&times;</button>
                        <div class="sajj-modal-img"><img src="" alt=""></div>
                        <h3 class="sajj-modal-title"></h3>
                        <span class="sajj-modal-price"></span>
                        <p class="sajj-modal-desc">Experience the premium quality of SAJJ. Long-lasting, handcrafted oil perfume designed to make you stand out.</p>
                        <button class="btn btn-primary sajj-modal-add" style="width:100%">Add to Cart</button>
                    </div>
                </div>`;
            document.body.appendChild(div.firstElementChild);
            modal = document.getElementById('sajj-product-modal');
            modal.querySelector('.sajj-modal-close').addEventListener('click', () => modal.classList.remove('open'));
            modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.remove('open'); });
        }
        
        modal.querySelector('.sajj-modal-title').textContent = product.name;
        modal.querySelector('.sajj-modal-price').textContent = '₦' + formatPrice(product.price);
        modal.querySelector('.sajj-modal-desc').textContent = product.description || 'Experience the premium quality of SAJJ.';
        
        const imgEl = modal.querySelector('.sajj-modal-img img');
        if (product.image) {
            imgEl.src = product.image;
            imgEl.alt = product.name;
        } else {
            imgEl.src = 'logo-removebg-preview.png'; // Fallback
        }

        modal.querySelector('.sajj-modal-add').onclick = () => { addToCart(product.id); modal.classList.remove('open'); };
        modal.classList.add('open');
    }

	if (sortSelect) sortSelect.addEventListener('change', renderProducts);
	if (searchInput) searchInput.addEventListener('input', renderProducts);

	function saveCart(){ localStorage.setItem('cart:items', JSON.stringify(cart)); }

	function addToCart(id){
		const item = cart.find(i => i.id === id);
		if (item) item.qty += 1;
		else { const p = PRODUCTS.find(x => x.id === id); cart.push({id: p.id, name: p.name, price: p.price, qty:1}); }
		saveCart(); updateCartUI(); openCart();
	}

	function removeFromCart(id){ cart = cart.filter(i => i.id !== id); saveCart(); updateCartUI(); }

	function updateCartUI(){
		const count = cart.reduce((s,i)=>s+i.qty,0);
		const total = cart.reduce((s,i)=>s + i.qty * i.price, 0);
		cartCountEl && (cartCountEl.textContent = count);
		// update navbar cart count if present
		const navCount = document.getElementById('nav-cart-count'); if (navCount) navCount.textContent = count;
		cartTotalEl && (cartTotalEl.textContent = formatPrice(total));
		if (!cartItemsEl) return;
		cartItemsEl.innerHTML = '';
		if (cart.length === 0){ cartItemsEl.innerHTML = '<div>Your cart is empty.</div>'; return; }

		cart.forEach(i => {
			const row = document.createElement('div'); row.className = 'cart-item';
			const ph = document.createElement('div'); ph.className = 'img-placeholder'; ph.style.width='56px'; ph.style.height='56px'; ph.textContent = '';
			const meta = document.createElement('div'); meta.className = 'meta';
			const name = document.createElement('div'); name.className = 'name'; name.textContent = i.name;
			const qty = document.createElement('div'); qty.className = 'qty'; qty.textContent = `Qty: ${i.qty} — ₦${formatPrice(i.price)}`;
			meta.appendChild(name); meta.appendChild(qty);
			const rem = document.createElement('button'); rem.className = 'btn btn-ghost'; rem.textContent = 'Remove';
			rem.addEventListener('click', () => removeFromCart(i.id));
			row.appendChild(ph); row.appendChild(meta); row.appendChild(rem);
			cartItemsEl.appendChild(row);
		});
	}

	function openCart(){ if (!cartPanel) return; cartPanel.style.display = 'block'; cartPanel.setAttribute('aria-hidden','false'); cartToggle && cartToggle.setAttribute('aria-expanded','true'); }
	function closeCart(){ if (!cartPanel) return; cartPanel.style.display = 'none'; cartPanel.setAttribute('aria-hidden','true'); cartToggle && cartToggle.setAttribute('aria-expanded','false'); }

	cartToggle && cartToggle.addEventListener('click', () => { const vis = cartPanel && cartPanel.style.display !== 'block'; vis ? openCart() : closeCart(); });
	closeCartBtn && closeCartBtn.addEventListener('click', closeCart);

	async function fetchAndConvert(){
		if (typeof PRICE_BASE_USD !== 'undefined' && PRICE_BASE_USD === false){
			console.info('PRICE_BASE_USD is false — prices are treated as NGN already; skipping conversion.');
			return;
		}
		try{
			const resp = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=NGN');
			if (!resp.ok) throw new Error('network');
			const data = await resp.json();
			const rate = data && data.rates && data.rates.NGN;
			if (rate){
				PRODUCTS.forEach(p => { p.price = +(p.price * rate).toFixed(2); });
				console.info('Prices converted to NGN at rate', rate);
			} else {
				console.warn('NGN rate not found in response');
			}
		}catch(err){
			console.warn('Failed to fetch exchange rate, leaving base prices as-is', err);
		}
	}

	

	// initialize: attempt conversion then render
	fetchAndConvert().finally(() => { renderProducts(); updateCartUI(); initFooter(); initNav(); });

	// listen for changes to localStorage (sync across tabs)
	window.addEventListener('storage', (e) => {
		if (e.key === 'cart:items'){
			try{ cart = JSON.parse(localStorage.getItem('cart:items') || '[]'); updateCartUI(); }catch(err){ }
		}
	});

	// FOOTER: newsletter handling, back-to-top and year
	function initFooter(){
		const form = document.getElementById('newsletter-form');
		const emailInput = document.getElementById('newsletter-email');
		const msg = document.getElementById('newsletter-msg');
		const back = document.getElementById('back-to-top');
		const yearEl = document.getElementById('copy-year');

		if (yearEl){ yearEl.textContent = new Date().getFullYear(); }

		if (form){
			form.addEventListener('submit', (e) => {
				e.preventDefault();
				const email = (emailInput && emailInput.value || '').trim();
				if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
					msg.textContent = 'Please enter a valid email.'; msg.style.color = '#f9c0c0'; return;
				}
				
                // Send to server
                fetch('/api/subscribe', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email }) })
                .then(res => {
                    msg.textContent = 'Thanks — you are subscribed!'; msg.style.color = '#b6f2c6';
                })
                .catch(() => { msg.textContent = 'Error subscribing.'; });

				if (emailInput) emailInput.value = '';
			});
		}

		if (back){ back.addEventListener('click', () => { window.scrollTo({top:0, behavior:'smooth'}); }); }
	}

	// NAV: mobile toggle and accessibility
	function initNav(){
		const nav = document.querySelector('.site-nav');
		const toggle = document.querySelector('.nav-toggle');
		if (!nav || !toggle) return;
		toggle.addEventListener('click', () => {
			const expanded = toggle.getAttribute('aria-expanded') === 'true';
			toggle.setAttribute('aria-expanded', String(!expanded));
			nav.classList.toggle('open');
		});
		document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => {
			nav.classList.remove('open');
			toggle.setAttribute('aria-expanded','false');
		}));
		document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); }});
	}

})();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker failed', err));
  });
}
