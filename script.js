const firebaseConfig = {
    apiKey: "AIzaSyCFeVRcxq_YOc2EuNcMZExtZvyQn919wog",
    authDomain: "sitecommercejardin-b348e.firebaseapp.com",
    databaseURL: "https://sitecommercejardin-b348e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sitecommercejardin-b348e",
    storageBucket: "sitecommercejardin-b348e.firebasestorage.app",
    messagingSenderId: "468169255056",
    appId: "1:468169255056:web:33ba4593dac84b41c6d015"
};

let app, db, auth, storage, currentUser = null;
const DATA = { products: [], baskets: [], promotions: [], orders: [], settings: {} };
const STATE = { cart: [], firebaseReady: false };
let currentSlide = 0, carouselImages = [], autoplayInterval, currentMonth = new Date().getMonth() + 1;

// Init Firebase
setTimeout(async () => {
    if (!window.firebase) return;
    app = window.firebase.initializeApp(firebaseConfig);
    db = window.firebase.getDatabase(app);
    auth = window.firebase.getAuth(app);
    storage = window.firebase.getStorage(app);
    STATE.firebaseReady = true;
    
    window.firebase.onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateAuthUI(!!user);
        if (user) loadUserData(user.uid);
    });
    
    await loadAllData();
    initCarousel();
    checkShopStatus();
}, 200);

async function loadAllData() {
    try {
        const snapshot = await window.firebase.get(window.firebase.ref(db, 'paniers-du-jardin'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            DATA.products = data.products ? Object.entries(data.products).map(([id, p]) => ({id, ...p})) : [];
            
            // Corriger le chargement des paniers
            if (data.baskets && typeof data.baskets === 'object') {
                DATA.baskets = [
                    {id: 'petit', name: 'Petit', price: data.baskets.petit?.price || 1, stock: data.baskets.petit?.stock || 1},
                    {id: 'moyen', name: 'Moyen', price: data.baskets.moyen?.price || 2, stock: data.baskets.moyen?.stock || 2},
                    {id: 'grand', name: 'Grand', price: data.baskets.grand?.price || 3, stock: data.baskets.grand?.stock || 3}
                ];
            } else {
                // Valeurs par défaut
                DATA.baskets = [
                    {id: 'petit', name: 'Petit', price: 0, stock: 0},
                    {id: 'moyen', name: 'Moyen', price: 0, stock: 0},
                    {id: 'grand', name: 'Grand', price: 0, stock: 0}
                ];
            }
            
            DATA.promotions = data.promotions || [];
            DATA.orders = data.orders ? Object.values(data.orders) : [];
            DATA.settings = data.settings || {};
            carouselImages = data.media?.carouselImages || ['https://via.placeholder.com/1200x600/7cb342/ffffff?text=Bienvenue'];
            if (data.media?.videoUrl) document.getElementById('exploitationVideo').src = data.media.videoUrl;
        } else {
            // Données par défaut si rien dans Firebase
            DATA.baskets = [
                {id: 'petit', name: 'Petit', price: 0, stock: 0},
                {id: 'moyen', name: 'Moyen', price: 0, stock: 0},
                {id: 'grand', name: 'Grand', price: 0, stock: 0}
            ];
            carouselImages = ['https://via.placeholder.com/1200x600/7cb342/ffffff?text=Bienvenue'];
        }
        renderAll();
        loadSettings();
    } catch (err) {
        console.error('Erreur:', err);
        // Valeurs par défaut en cas d'erreur
        DATA.baskets = [
            {id: 'petit', name: 'Petit', price: 0, stock: 0},
            {id: 'moyen', name: 'Moyen', price: 0, stock: 0},
            {id: 'grand', name: 'Grand', price: 0, stock: 0}
        ];
        carouselImages = ['https://via.placeholder.com/1200x600/7cb342/ffffff?text=Bienvenue'];
        renderAll();
    }
}

function renderAll() {
    renderCarousel();
    renderSeasonalProducts();
    renderBaskets();
    renderCustomProducts();
    setupMonthsFilter();
}

function loadSettings() {
    document.getElementById('shopAddress').textContent = DATA.settings.address || 'Route des Vergers, 44000 Nantes';
    document.getElementById('shopPhone').textContent = DATA.settings.phone || '02 40 XX XX XX';
    document.getElementById('shopEmail').textContent = DATA.settings.email || 'contact@paniersdujardin.fr';
    document.getElementById('footerAddress').textContent = '📍 ' + (DATA.settings.address || 'Route des Vergers');
    document.getElementById('footerPhone').textContent = '📞 ' + (DATA.settings.phone || '02 40 XX XX XX');
    if (DATA.settings.latitude && DATA.settings.longitude) {
        document.getElementById('map').innerHTML = `<iframe width="100%" height="400" frameborder="0" src="https://www.google.com/maps?q=${DATA.settings.latitude},${DATA.settings.longitude}&output=embed"></iframe>`;
    }
}

// Carrousel
function renderCarousel() {
    const track = document.getElementById('carouselTrack');
    const dots = document.getElementById('carouselDots');
    track.innerHTML = carouselImages.map((img, i) => `<div class="carousel-slide ${i===0?'active':''}" style="background-image:url('${img}')"></div>`).join('');
    dots.innerHTML = carouselImages.map((_, i) => `<button class="carousel-dot ${i===0?'active':''}" onclick="goToSlide(${i})"></button>`).join('');
}

function initCarousel() {
    autoplayInterval = setInterval(nextSlide, 10000);
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % carouselImages.length;
    updateCarousel();
}

function prevSlide() {
    currentSlide = (currentSlide - 1 + carouselImages.length) % carouselImages.length;
    updateCarousel();
}

function goToSlide(i) {
    currentSlide = i;
    updateCarousel();
}

function updateCarousel() {
    document.querySelectorAll('.carousel-slide').forEach((s, i) => s.classList.toggle('active', i === currentSlide));
    document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === currentSlide));
}

// Produits saisonniers
function renderSeasonalProducts() {
    const products = DATA.products.filter(p => p.availableMonths?.includes(currentMonth));
    document.getElementById('seasonalHorizontal').innerHTML = products.slice(0, 6).map(p => `
        <div class="seasonal-card">
            <img src="${p.imageUrl || 'https://via.placeholder.com/150'}" alt="${p.name}">
            <h4>${p.name}</h4>
            <p>${p.price}€/kg</p>
        </div>
    `).join('');
}

function setupMonthsFilter() {
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
    document.getElementById('monthsFilter').innerHTML = months.map((m, i) => 
        `<button class="month-btn ${i+1===currentMonth?'active':''}" onclick="filterByMonth(${i+1})">${m}</button>`
    ).join('');
}

function toggleSeasonal() {
    const expanded = document.getElementById('seasonalExpanded');
    const btn = document.getElementById('btnSeeMore');
    const isExpanded = expanded.style.display !== 'none';
    expanded.style.display = isExpanded ? 'none' : 'block';
    btn.querySelector('#seeMoreText').textContent = isExpanded ? 'Voir plus' : 'Voir moins';
    btn.querySelector('.arrow').textContent = isExpanded ? '↓' : '↑';
    if (!isExpanded) filterByMonth(currentMonth);
}

function filterByMonth(month) {
    currentMonth = month;
    document.querySelectorAll('.month-btn').forEach((b, i) => b.classList.toggle('active', i+1 === month));
    const products = DATA.products.filter(p => p.availableMonths?.includes(month));
    document.getElementById('seasonalGrid').innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.imageUrl || 'https://via.placeholder.com/200'}" alt="${p.name}">
            <h4>${p.name}</h4>
            <p>${p.price}€/kg</p>
        </div>
    `).join('');
}

// Paniers prédéfinis
function renderBaskets() {
    const basketsData = [
        {
            id: 'petit',
            name: 'Panier Petit',
            icon: '🧺',
            subtitle: 'Idéal pour 1-2 personnes',
            price: 0,
            stock: 0,
            content: ['3 variétés de fruits', '4 variétés de légumes', 'Environ 3kg']
        },
        {
            id: 'moyen',
            name: 'Panier Moyen',
            icon: '🧺',
            subtitle: 'Parfait pour 3-4 personnes',
            price: 0,
            stock: 0,
            content: ['5 variétés de fruits', '6 variétés de légumes', 'Environ 5kg', '1 surprise du jardin'],
            featured: true
        },
        {
            id: 'grand',
            name: 'Panier Grand',
            icon: '🧺',
            subtitle: 'Pour famille nombreuse',
            price: 0,
            stock: 0,
            content: ['7 variétés de fruits', '8 variétés de légumes', 'Environ 8kg', '2 surprises du jardin', 'Herbes aromatiques']
        }
    ];
    
    // Mettre à jour avec les données Firebase si disponibles
    basketsData.forEach(basket => {
        const firebaseBasket = DATA.baskets.find(b => b.id === basket.id);
        if (firebaseBasket) {
            basket.price = firebaseBasket.price;
            basket.stock = firebaseBasket.stock;
        }
    });
    
    document.getElementById('basketsGrid').innerHTML = basketsData.map(basket => {
        const promo = DATA.promotions.find(p => p.basketId === basket.id);
        const finalPrice = promo ? basket.price * (1 - promo.discount / 100) : basket.price;
        const stockClass = basket.stock < 10 ? 'limited' : basket.stock === 0 ? 'out' : 'available';
        const stockText = basket.stock === 0 ? 'Rupture' : basket.stock < 10 ? `Plus que ${basket.stock}` : `${basket.stock} disponibles`;
        
        return `
            <div class="basket-card ${basket.featured ? 'featured' : ''}">
                <div class="basket-f-content">
                    <div class="basket-f-content2">
                        <div class="basket-icon">${basket.icon}</div>
                        <h3>${basket.name}</h3>                       
                        <div>
                            <span class="basket-price">${basket.price}€</span>
                            <p class="basket-subtitle">${basket.subtitle}</p>
                        </div>
                    </div>
                    <div class="basket-f-content2">
                        <div class="basket-content">
                            <h4>Contenu :</h4>
                            <ul>
                                ${basket.content.map(item => `<li>✓ ${item}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="basket-actions">
                    <div class="basket-content2">
                        <h4>Contenu :</h4>
                        <ul>
                            ${basket.content.map(item => `<li>✓ ${item}</li>`).join('')}
                        </ul>
                    </div>

                    <div>
                        <div class="basket-stock">
                            <span class="stock-badge ${stockClass}">${stockText}</span>
                        </div>
                        <div class="basket-actions2">
                            <div class="qty-selector">
                                <button onclick="changeQty('${basket.id}', -1)"><svg class="icon-qty" height="14px" viewBox="0 -960 960 960" width="14px" fill="#151414"><path d="M240-440q-17 0-28.5-11.5T200-480q0-17 11.5-28.5T240-520h480q17 0 28.5 11.5T760-480q0 17-11.5 28.5T720-440H240Z"/></svg></button>
                                <span id="qty-${basket.id}" class="input-qty">1</span>
                                <button onclick="changeQty('${basket.id}', 1)"><svg class="icon-qty" height="14px" viewBox="0 -960 960 960" width="14px" fill="#151414"><path d="M480-120q-17 0-28.5-11.5T440-160v-280H160q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h280v-280q0-17 11.5-28.5T480-840q17 0 28.5 11.5T520-800v280h280q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H520v280q0 17-11.5 28.5T480-120Z"/></svg>
                            </div>                        
                        </div>
                        <button class="btn-primary" onclick="addBasketToCart('${basket.id}')" ${basket.stock === 0 ? 'disabled' : ''}>
                                ${basket.stock === 0 ? 'Indisponible' : 'Ajouter'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function changeQty(id, change) {
    const el = document.getElementById(`qty-${id}`);
    let qty = parseInt(el.textContent) + change;
    if (qty < 1) qty = 1;
    el.textContent = qty;
}

function addBasketToCart(id) {
    const basket = DATA.baskets.find(b => b.id === id);
    const qty = parseInt(document.getElementById(`qty-${id}`).textContent);
    const promo = DATA.promotions.find(p => p.basketId === id);
    const price = promo ? basket.price * (1 - promo.discount / 100) : basket.price;
    
    const existing = STATE.cart.find(c => c.id === id && c.type === 'basket');
    if (existing) {
        existing.quantity += qty;
    } else {
        STATE.cart.push({ id, name: `Panier ${basket.name}`, price, quantity: qty, type: 'basket', icon: '🧺' });
    }
    updateCart();
    document.getElementById(`qty-${id}`).textContent = '1';
    showToast(`${qty} Panier ${basket.name} ajouté à votre panier !`);
}

// Panier personnalisé
function renderCustomProducts() {
    document.getElementById('customGrid').innerHTML = DATA.products.map(p => `
        <div class="custom-card" data-category="${p.category}">
            <div class="custom-card-img" style="background: url('${p.imageUrl || 'https://via.placeholder.com/150'}') center/cover no-repeat;">
                <div class="custom-card-header">
                    <h4>${p.name}</h4>
                    <p>${p.price}€/kg</p>
                </div>
            </div>
            <div class="custom-card-content" >
                <div class="qty-selector">
                    <button onclick="changeCustomQty('${p.id}', -0.5)">-</button>
                    <div class="input-wrapper">
                    <input type="number" id="custom-${p.id}" value="1" step="0.5" min="0" readonly class="input-qty">
                    <span class="unit">kg</span>
                    </div>
                    <button onclick="changeCustomQty('${p.id}', 0.5)">+</button>
                </div>
                <button class="btn-primary" onclick="addCustomToCart('${p.id}')">Ajouter</button>
            </div>
        </div>
    `).join('');
}

function filterProducts(cat) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(cat === 'all' ? 'tous' : cat)));
    document.querySelectorAll('.custom-card').forEach(c => {
        c.style.display = cat === 'all' || c.dataset.category === cat ? 'block' : 'none';
    });
}

function changeCustomQty(id, change) {
    const el = document.getElementById(`custom-${id}`);
    let val = parseFloat(el.value) + change;
    if (val < 0) val = 0;
    el.value = val.toFixed(1);
}

function addCustomToCart(id) {
    const product = DATA.products.find(p => p.id === id);
    const qty = parseFloat(document.getElementById(`custom-${id}`).value);
    if (qty <= 0) return;
    
    const existing = STATE.cart.find(c => c.id === id && c.type === 'product');
    if (existing) {
        existing.quantity += qty;
    } else {
        STATE.cart.push({ id, name: product.name, price: product.price, quantity: qty, type: 'product', icon: product.category === 'fruits' ? '🍎' : '🥕' });
    }
    updateCart();
    document.getElementById(`custom-${id}`).value = '0';
    showToast(`${qty}kg de ${product.name} ajouté à votre panier !`);
}

// Panier
function updateCart() {
    const count = document.getElementById('cartCount');
    const items = document.getElementById('cartItems');
    const total = document.getElementById('totalPrice');
    
    count.textContent = STATE.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (STATE.cart.length === 0) {
        items.innerHTML = '<p>Votre panier est vide</p>';
        total.textContent = '0€';
        return;
    }
    
    const totalPrice = STATE.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    total.textContent = totalPrice.toFixed(2) + '€';
    
    items.innerHTML = STATE.cart.map((item, i) => `
        <div class="cart-item">
            <span>${item.icon} ${item.name}</span>
            <span>${item.quantity}×${item.price}€</span>
            <button onclick="removeFromCart(${i})">×</button>
        </div>
    `).join('');
}

function removeFromCart(index) {
    STATE.cart.splice(index, 1);
    updateCart();
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    document.getElementById('cartOverlay').classList.toggle('active');
}

function checkout() {
    if (STATE.cart.length === 0) return alert('Votre panier est vide');
    
    if (!currentUser) {
        alert('⚠️ Vous devez être connecté pour réserver une commande');
        openAuthModal();
        return;
    }
    
    document.getElementById('paymentModal').classList.add('active');
    
    const totalPrice = STATE.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('finalTotal').textContent = totalPrice.toFixed(2) + ' €';
    
    document.getElementById('orderSummary').innerHTML = STATE.cart.map(item => `
        <div class="order-item">
            <div class="order-item-info">
                <span class="order-item-icon">${item.icon}</span>
                <span class="order-item-name">${item.name}</span>
            </div>
            <div class="order-item-details">
                <span>${item.quantity} × ${item.price.toFixed(2)}€</span>
                <strong>${(item.quantity * item.price).toFixed(2)}€</strong>
            </div>
        </div>
    `).join('');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

document.getElementById('paymentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        alert('⚠️ Vous devez être connecté');
        return;
    }
    
    const order = {
        id: `CMD-${Date.now()}`,
        userId: currentUser.uid,
        items: STATE.cart,
        total: STATE.cart.reduce((s, i) => s + (i.price * i.quantity), 0),
        date: new Date().toISOString(),
        status: 'reserved'
    };
    
    try {
        const ordersRef = window.firebase.ref(db, `paniers-du-jardin/orders/${order.id}`);
        await window.firebase.set(ordersRef, order);
        STATE.cart = [];
        updateCart();
        closePaymentModal();
        showToast('✅ Commande réservée avec succès ! Vous recevrez une confirmation par email.', 'success');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
});

// Auth
function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function showAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    try {
        await window.firebase.signInWithEmailAndPassword(auth, e.target[0].value, e.target[1].value);
        closeAuthModal();
        alert('Connecté !');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const firstName = e.target[0].value;
    const lastName = e.target[1].value;
    const email = e.target[2].value;
    const phone = e.target[3].value;
    const password = e.target[4].value;
    
    try {
        const userCredential = await window.firebase.createUserWithEmailAndPassword(auth, email, password);
        
        // Sauvegarder les infos utilisateur
        await window.firebase.set(
            window.firebase.ref(db, `paniers-du-jardin/users/${userCredential.user.uid}`),
            {
                firstName,
                lastName,
                email,
                phone: phone || '',
                created: new Date().toISOString()
            }
        );
        
        closeAuthModal();
        alert('✅ Compte créé avec succès !');
    } catch (error) {
        alert('Erreur d\'inscription : ' + error.message);
    }
}

function updateAuthUI(loggedIn) {
    const btn = document.getElementById('authBtn');
    btn.innerHTML = loggedIn ? 'Mon Compte' : 'Connexion';
    btn.onclick = loggedIn ? () => navigateTo('mon-compte') : openAuthModal;
}

async function loadUserData(uid) {
    try {
        const snapshot = await window.firebase.get(window.firebase.ref(db, `paniers-du-jardin/users/${uid}`));
        if (snapshot.exists()) {
            const user = snapshot.val();
            document.getElementById('userName').textContent = `${user.firstName} ${user.lastName}`;
            document.getElementById('userInitials').textContent = (user.firstName[0] + (user.lastName[0] || '')).toUpperCase();
            
            // Pré-remplir les champs du formulaire
            const firstNameField = document.getElementById('userFirstName');
            const lastNameField = document.getElementById('userLastName');
            const emailField = document.getElementById('userEmail');
            const phoneField = document.getElementById('userPhone');
            
            if (firstNameField) firstNameField.value = user.firstName || '';
            if (lastNameField) lastNameField.value = user.lastName || '';
            if (emailField) emailField.value = user.email || '';
            if (phoneField) phoneField.value = user.phone || '';
        }
    } catch (err) {
        console.error('Erreur:', err);
    }
}

async function logout() {
    await window.firebase.signOut(auth);
    navigateTo('accueil');
}

// Mettre à jour le menu mobile actif
function updateMobileNav(page) {
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
}

// Synchroniser le compteur panier mobile
function updateCartCount() {
    const count = STATE.cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
    const mobileCount = document.getElementById('mobileCartCount');
    if (mobileCount) mobileCount.textContent = count;
}



// Navigation
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[href="#${page}"]`)?.classList.add('active');
    window.scrollTo(0, 0);
    updateMobileNav(page);
}

function handleMobileAccount() {
    if (currentUser) {
        navigateTo('mon-compte');
    } else {
        openAuthModal();
    }
}



document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(link.getAttribute('href').substring(1));
    });
});

function toggleMobileMenu() {
    document.getElementById('navMenu').classList.toggle('active');
}

function showAccount(section) {
    document.querySelectorAll('.account-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');
    document.querySelectorAll('.account-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

document.getElementById('userForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/users/${currentUser.uid}`), {
            firstName: document.getElementById('userFirstName').value,
            lastName: document.getElementById('userLastName').value,
            email: document.getElementById('userEmail').value,
            phone: document.getElementById('userPhone').value || ''
        });
        alert('✅ Informations enregistrées !');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
});

// ===== AUTHENTIFICATION GOOGLE =====
async function signInWithGoogle() {
    try {
        const provider = new window.firebase.GoogleAuthProvider();
        const result = await window.firebase.signInWithPopup(auth, provider);
        const user = result.user;
        
        const userRef = window.firebase.ref(db, `paniers-du-jardin/users/${user.uid}`);
        const snapshot = await window.firebase.get(userRef);
        
        if (!snapshot.exists()) {
            const names = user.displayName?.split(' ') || ['', ''];
            await window.firebase.set(userRef, {
                firstName: names[0],
                lastName: names.slice(1).join(' ') || names[0],
                email: user.email,
                created: new Date().toISOString(),
                photoURL: user.photoURL
            });
        }
        
        closeAuthModal();
        alert('✅ Connecté avec Google !');
    } catch (error) {
        alert('Erreur: ' + error.message);
    }
}

// ===== VÉRIFICATION OUVERTURE BOUTIQUE =====
async function checkShopStatus() {
    try {
        const statusRef = window.firebase.ref(db, 'paniers-du-jardin/settings/shopStatus');
        const snapshot = await window.firebase.get(statusRef);
        
        if (snapshot.exists()) {
            const status = snapshot.val();
            if (!status.isOpen) {
                document.getElementById('shopClosedMessage').style.display = 'block';
                document.getElementById('orderSection').style.display = 'none';
                document.querySelector('.divider').style.display = 'none';
                document.querySelector('.custom-basket-section').style.display = 'none';
                
                const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
                const reopenDay = status.reopenDay ? days[status.reopenDay] : 'bientôt';
                document.getElementById('reopeningMessage').textContent = `Repassez ${reopenDay} !`;
            } else {
                document.getElementById('shopClosedMessage').style.display = 'none';
                document.getElementById('orderSection').style.display = 'block';
                document.querySelector('.divider').style.display = 'block';
                document.querySelector('.custom-basket-section').style.display = 'block';
            }
        }
    } catch (err) {
        console.error('Erreur vérification boutique:', err);
    }
}

// ===== NOTIFICATION TOAST =====
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
