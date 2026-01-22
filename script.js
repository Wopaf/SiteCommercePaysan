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
    loadCart();  // Ajouter cette ligne
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
    renderHomeBasketsPreview();
    renderSeasonalProducts();
    renderBaskets();
    renderCustomProducts();
}

function renderHomeBasketsPreview() {
    const container = document.getElementById('homeBasketsPreview');
    if (!container) return;
    
    const basketsInfo = [
        {
            id: 'petit',
            name: 'Petit Panier',
            icon: '🥬',
            persons: '1-2 pers.',
            description: 'L\'essentiel pour cuisiner frais au quotidien',
            highlights: ['3kg de produits', '7 variétés'],
            color: '#e8f5e9'
        },
        {
            id: 'moyen',
            name: 'Panier Familial',
            icon: '🥗',
            persons: '3-4 pers.',
            description: 'Le choix préféré de nos clients, varié et généreux',
            highlights: ['5kg de produits', '11 variétés', '+ 1 surprise'],
            popular: true,
            color: '#fff3e0'
        },
        {
            id: 'grand',
            name: 'Grand Panier',
            icon: '🍎',
            persons: '5+ pers.',
            description: 'L\'abondance du jardin pour les grandes tablées',
            highlights: ['8kg de produits', '15 variétés', '+ herbes fraîches'],
            color: '#fce4ec'
        }
    ];
    
    container.innerHTML = basketsInfo.map(basket => {
        const firebaseBasket = DATA.baskets.find(b => b.id === basket.id);
        const price = firebaseBasket?.price || 0;
        const stock = firebaseBasket?.stock || 0;
        
            return `
            <div class="home-basket-card" style="--card-accent: ${basket.color}">
                <div class="home-basket-header">
                    <span class="home-basket-icon">${basket.icon}</span>
                    <div class="home-basket-title">
                        <h3>${basket.name}</h3>
                        <span class="home-basket-persons">${basket.persons}</span>
                    </div>
                </div>
                <p class="home-basket-desc">${basket.description}</p>
                <ul class="home-basket-highlights">
                    ${basket.highlights.map(h => `<li><span class="check">✓</span> ${h}</li>`).join('')}
                </ul>
                <div class="home-basket-footer">
                    <div class="home-basket-price">
                        <span class="price-value">${price}€</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}



function loadSettings() {
    document.getElementById('shopAddress').textContent = DATA.settings.address || 'Route des Vergers, 44000 Nantes';
    document.getElementById('shopPhone').textContent = DATA.settings.phone || '02 40 XX XX XX';
    document.getElementById('shopEmail').textContent = DATA.settings.email || 'contact@paniersdujardin.fr';
    document.getElementById('footerAddress').textContent = '📍 ' + (DATA.settings.address || 'Route des Vergers');
    document.getElementById('footerPhone').textContent = '📞 ' + (DATA.settings.phone || '02 40 XX XX XX');
    
    // Adresse page accueil
    const homeAddress = document.getElementById('homeAddress');
    if (homeAddress) homeAddress.textContent = DATA.settings.address || 'Route des Vergers, 44000 Nantes';
    
    // Maps
    if (DATA.settings.latitude && DATA.settings.longitude) {
        const mapIframe = `<iframe width="100%" height="100%" frameborder="0" src="https://www.google.com/maps?q=${DATA.settings.latitude},${DATA.settings.longitude}&z=12&output=embed"></iframe>`;
        document.getElementById('map').innerHTML = mapIframe;
        const homeMap = document.getElementById('homeMap');
        if (homeMap) homeMap.innerHTML = mapIframe;
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

// Produits saisonniers - Nouveau design
function renderSeasonalProducts() {
    setupMonthsSelector();
    filterByMonth(currentMonth);
}

function setupMonthsSelector() {
    const months = [
        { short: 'Jan', full: 'Janvier' },
        { short: 'Fév', full: 'Février' },
        { short: 'Mar', full: 'Mars' },
        { short: 'Avr', full: 'Avril' },
        { short: 'Mai', full: 'Mai' },
        { short: 'Juin', full: 'Juin' },
        { short: 'Juil', full: 'Juillet' },
        { short: 'Août', full: 'Août' },
        { short: 'Sep', full: 'Septembre' },
        { short: 'Oct', full: 'Octobre' },
        { short: 'Nov', full: 'Novembre' },
        { short: 'Déc', full: 'Décembre' }
    ];
    
    const container = document.getElementById('monthsSelector');
    if (!container) return;
    
    container.innerHTML = months.map((m, i) => `
        <button class="month-chip ${i + 1 === currentMonth ? 'active' : ''}" 
                onclick="filterByMonth(${i + 1})" 
                data-month="${i + 1}">
            ${m.short}
        </button>
    `).join('');
}

function filterByMonth(month) {
    currentMonth = month;
    
    // Mettre à jour les boutons actifs
    document.querySelectorAll('.month-chip').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.month) === month);
    });
    
    // Mettre à jour le label du mois
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const labelContainer = document.getElementById('currentMonthLabel');
    if (labelContainer) {
        labelContainer.innerHTML = `
            <span class="month-icon">📅</span>
            <span>Produits disponibles en <strong>${monthNames[month - 1]}</strong></span>
        `;
    }
    
    // Filtrer et afficher les produits
    const products = DATA.products.filter(p => p.availableMonths?.includes(month));
    const grid = document.getElementById('seasonalGrid');
    const empty = document.getElementById('seasonalEmpty');
    
    if (products.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'flex';
    } else {
        grid.style.display = 'grid';
        empty.style.display = 'none';
        
        grid.innerHTML = products.map(p => `
            <div class="seasonal-product-card">
                <div class="seasonal-product-img" style="background-image: url('${p.imageUrl || 'https://via.placeholder.com/200'}')">
                    <span class="seasonal-product-category">${p.category === 'fruits' ? '🍎 Fruit' : '🥬 Légume'}</span>
                </div>
                <div class="seasonal-product-info">
                    <h4>${p.name}</h4>
                    <div class="seasonal-product-price">${p.price}€<span>/kg</span></div>
                </div>
            </div>
        `).join('');
    }
}








// Paniers prédéfinis
function renderBaskets() {
    const container = document.getElementById('basketsGrid');
    if (!container) return;
    
    const basketsInfo = [
        {
            id: 'petit',
            name: 'Petit Panier',
            icon: '🥬',
            persons: '1-2 pers.',
            description: 'L\'essentiel pour cuisiner frais au quotidien',
            highlights: ['3kg de produits', '7 variétés'],
            color: '#e8f5e9'
        },
        {
            id: 'moyen',
            name: 'Panier Familial',
            icon: '🥗',
            persons: '3-4 pers.',
            description: 'Le choix préféré de nos clients, varié et généreux',
            highlights: ['5kg de produits', '11 variétés', '+ 1 surprise'],
            popular: true,
            color: '#fff3e0'
        },
        {
            id: 'grand',
            name: 'Grand Panier',
            icon: '🍎',
            persons: '5+ pers.',
            description: 'L\'abondance du jardin pour les grandes tablées',
            highlights: ['8kg de produits', '15 variétés', '+ herbes fraîches'],
            color: '#fce4ec'
        }
    ];
    
    container.innerHTML = basketsInfo.map(basket => {
        const firebaseBasket = DATA.baskets.find(b => b.id === basket.id);
        const price = firebaseBasket?.price || 0;
        const stock = firebaseBasket?.stock || 0;
        const stockText = stock === 0 ? 'Rupture' : stock < 10 ? `Plus que ${stock}` : `${stock} dispo.`;
        const stockClass = stock === 0 ? 'out' : stock < 10 ? 'limited' : 'available';
        
        return `
            <div class="home-basket-card" style="--card-accent: ${basket.color}">
                <div class="home-basket-header">
                    <span class="home-basket-icon">${basket.icon}</span>
                    <div class="home-basket-title2">
                        <h3>${basket.name}</h3>
                        <span class="home-basket-persons">${basket.persons}</span>
                    </div>
                </div>
                <p class="home-basket-desc">${basket.description}</p>
                <ul class="home-basket-highlights">
                    ${basket.highlights.map(h => `<li><span class="check">✓</span> ${h}</li>`).join('')}
                </ul>
                    <div class="home-basket-price2">
                        <span class="price-value">${price}€</span>
                        <span class="stock-badge ${stockClass}">${stockText}</span>
                    </div>
                <div class="basket-order-controls">
                    <div class="qty-selector-mini">
                        <button class="qty-btn-mini" onclick="changeQty('${basket.id}', -1)"><svg height="16px" viewBox="0 -960 960 960" width="16px" fill="#4a7c4e"><path d="M240-440q-17 0-28.5-11.5T200-480q0-17 11.5-28.5T240-520h480q17 0 28.5 11.5T760-480q0 17-11.5 28.5T720-440H240Z"/></svg></button>
                        <span id="qty-${basket.id}">1</span>
                        <button class="qty-btn-mini" onclick="changeQty('${basket.id}', 1)"><svg height="16px" viewBox="0 -960 960 960" width="16px" fill="#4a7c4e"><path d="M480-120q-17 0-28.5-11.5T440-160v-280H160q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h280v-280q0-17 11.5-28.5T480-840q17 0 28.5 11.5T520-800v280h280q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H520v280q0 17-11.5 28.5T480-120Z"/></svg></button>
                    </div>
                    <button class="btn-primary" onclick="addBasketToCart('${basket.id}')" ${stock === 0 ? 'disabled' : ''}>
                        ${stock === 0 ? 'Épuisé' : 'Ajouter'}
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








// Paniers personnalisés sauvegardés
let userBaskets = [];
let currentBasketId = null;
let customBasket = [];

// Charger les paniers de l'utilisateur depuis Firebase
async function loadUserBaskets() {
    if (!currentUser) {
        userBaskets = [];
        renderBasketDropdown();
        return;
    }
    
    try {
        const snapshot = await window.firebase.get(
            window.firebase.ref(db, `paniers-du-jardin/users/${currentUser.uid}/customBaskets`)
        );
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            userBaskets = Object.entries(data).map(([id, basket]) => ({
                id,
                ...basket
            }));
        } else {
            userBaskets = [];
        }
        
        renderBasketDropdown();
        
        // Charger le premier panier ou créer un nouveau
        if (userBaskets.length > 0) {
            selectBasket(userBaskets[0].id);
        } else {
            createDefaultBasket();
        }
    } catch (err) {
        console.error('Erreur chargement paniers:', err);
        userBaskets = [];
        renderBasketDropdown();
    }
}

function createDefaultBasket() {
    currentBasketId = 'temp_' + Date.now();
    customBasket = [];
    document.getElementById('currentBasketName').textContent = 'Mon Panier';
    renderBasketSummary();
}

function renderBasketDropdown() {
    const container = document.getElementById('basketDropdownList');
    if (!container) return;
    
    if (userBaskets.length === 0) {
        container.innerHTML = '<p class="dropdown-empty">Aucun panier sauvegardé</p>';
        return;
    }
    
    container.innerHTML = userBaskets.map(basket => `
        <div class="basket-dropdown-item ${basket.id === currentBasketId ? 'active' : ''}" 
             onclick="selectBasket('${basket.id}')">
            <span class="basket-item-name">${basket.name}</span>
            <span class="basket-item-count">${basket.items?.length || 0} produits</span>
        </div>
    `).join('');
}

function toggleBasketDropdown() {
    const dropdown = document.getElementById('basketDropdown');
    dropdown.classList.toggle('open');
}

// Fermer le dropdown si on clique ailleurs
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('basketDropdown');
    const header = document.querySelector('.basket-summary-title');
    if (dropdown && !dropdown.contains(e.target) && !header.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

function selectBasket(basketId) {
    const basket = userBaskets.find(b => b.id === basketId);
    if (!basket) return;
    
    currentBasketId = basketId;
    customBasket = basket.items ? [...basket.items] : [];
    document.getElementById('currentBasketName').textContent = basket.name;
    
    renderBasketSummary();
    renderBasketDropdown();
    toggleBasketDropdown();
}

function openNewBasketModal() {
    document.getElementById('newBasketModal').classList.add('active');
    document.getElementById('newBasketName').value = '';
    document.getElementById('newBasketName').focus();
    toggleBasketDropdown();
}

function closeNewBasketModal() {
    document.getElementById('newBasketModal').classList.remove('active');
}

async function createNewBasket() {
    const name = document.getElementById('newBasketName').value.trim();
    if (!name) {
        alert('Veuillez entrer un nom pour le panier');
        return;
    }
    
    if (!currentUser) {
        alert('Vous devez être connecté pour sauvegarder un panier');
        closeNewBasketModal();
        return;
    }
    
    const newBasketId = 'basket_' + Date.now();
    const newBasket = {
        name: name,
        items: [],
        createdAt: new Date().toISOString()
    };
    
    try {
        await window.firebase.set(
            window.firebase.ref(db, `paniers-du-jardin/users/${currentUser.uid}/customBaskets/${newBasketId}`),
            newBasket
        );
        
        userBaskets.push({ id: newBasketId, ...newBasket });
        currentBasketId = newBasketId;
        customBasket = [];
        document.getElementById('currentBasketName').textContent = name;
        
        renderBasketDropdown();
        renderBasketSummary();
        closeNewBasketModal();
        showToast(`Panier "${name}" créé !`);
    } catch (err) {
        alert('Erreur lors de la création: ' + err.message);
    }
}

async function saveCurrentBasket() {
    if (!currentUser) {
        alert('Vous devez être connecté pour sauvegarder un panier');
        return;
    }
    
    // Si c'est un panier temporaire, ouvrir le modal pour le nommer
    if (currentBasketId.startsWith('temp_')) {
        openNewBasketModal();
        return;
    }
    
    const basket = userBaskets.find(b => b.id === currentBasketId);
    if (!basket) return;
    
    try {
        await window.firebase.set(
            window.firebase.ref(db, `paniers-du-jardin/users/${currentUser.uid}/customBaskets/${currentBasketId}/items`),
            customBasket
        );
        
        // Mettre à jour localement
        basket.items = [...customBasket];
        renderBasketDropdown();
        showToast('Panier sauvegardé !');
    } catch (err) {
        alert('Erreur lors de la sauvegarde: ' + err.message);
    }
}

async function deleteCurrentBasket() {
    if (!currentUser || currentBasketId.startsWith('temp_')) {
        customBasket = [];
        renderBasketSummary();
        return;
    }
    
    const basket = userBaskets.find(b => b.id === currentBasketId);
    if (!basket) return;
    
    if (!confirm(`Supprimer le panier "${basket.name}" ?`)) return;
    
    try {
        await window.firebase.set(
            window.firebase.ref(db, `paniers-du-jardin/users/${currentUser.uid}/customBaskets/${currentBasketId}`),
            null
        );
        
        userBaskets = userBaskets.filter(b => b.id !== currentBasketId);
        
        if (userBaskets.length > 0) {
            selectBasket(userBaskets[0].id);
        } else {
            createDefaultBasket();
        }
        
        renderBasketDropdown();
        showToast('Panier supprimé');
    } catch (err) {
        alert('Erreur lors de la suppression: ' + err.message);
    }
}

function addToCustomBasket(productId) {
    const product = DATA.products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = customBasket.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 0.5;
    } else {
        customBasket.push({
            id: productId,
            name: product.name,
            price: product.price,
            quantity: 0.5
        });
    }
    
    renderBasketSummary();
}

function removeFromCustomBasket(productId) {
    customBasket = customBasket.filter(item => item.id !== productId);
    renderBasketSummary();
}

function changeCustomBasketQty(productId, change) {
    const item = customBasket.find(i => i.id === productId);
    if (!item) return;
    
    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCustomBasket(productId);
        return;
    }
    
    renderBasketSummary();
}

function renderBasketSummary() {
    const container = document.getElementById('basketSummaryItems');
    const totalEl = document.getElementById('basketSummaryTotal');
    if (!container) return;
    
    if (customBasket.length === 0) {
        container.innerHTML = '<p class="basket-empty">Votre panier est vide</p>';
        totalEl.textContent = '0€';
        return;
    }
    
    let total = 0;
    container.innerHTML = customBasket.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="basket-summary-row">
                <span class="item-name">${item.name}</span>
                <span class="item-price">${item.price}€/kg</span>
                <div class="item-qty-controls">
                    <button class="qty-btn-mini" onclick="changeCustomBasketQty('${item.id}', -0.5)"><svg height="16px" viewBox="0 -960 960 960" width="16px" fill="#4a7c4e"><path d="M240-440q-17 0-28.5-11.5T200-480q0-17 11.5-28.5T240-520h480q17 0 28.5 11.5T760-480q0 17-11.5 28.5T720-440H240Z"/></svg></button>
                    <span>${item.quantity} kg</span>
                    <button class="qty-btn-mini" onclick="changeCustomBasketQty('${item.id}', 0.5)"><svg height="16px" viewBox="0 -960 960 960" width="16px" fill="#4a7c4e"><path d="M480-120q-17 0-28.5-11.5T440-160v-280H160q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h280v-280q0-17 11.5-28.5T480-840q17 0 28.5 11.5T520-800v280h280q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H520v280q0 17-11.5 28.5T480-120Z"/></svg></button>
                </div>
                <span class="item-total">${itemTotal.toFixed(2)}€</span>
            </div>
        `;
    }).join('');
    
    totalEl.textContent = total.toFixed(2) + '€';
}


function renderCustomProducts() {
    const container = document.getElementById('productsTable');
    if (!container) return;
    
    container.innerHTML = DATA.products.map(p => `
        <div class="product-row" data-category="${p.category}">
            <span class="product-name">${p.name}</span>
            <span class="product-price">${p.price}€/kg</span>
            <button class="btn-secondary" onclick="addToCustomBasket('${p.id}')">Ajouter</button>
        </div>
    `).join('');
    
    // Charger les paniers utilisateur
    loadUserBaskets();
}

function scrollToProducts() {
    document.querySelector('.products-list-panel').scrollIntoView({ behavior: 'smooth' });
}

function validateCustomBasket() {
    if (customBasket.length === 0) {
        alert('Votre panier est vide');
        return;
    }
    
    customBasket.forEach(item => {
        const existing = STATE.cart.find(c => c.id === item.id && c.type === 'product');
        if (existing) {
            existing.quantity += item.quantity;
        } else {
            STATE.cart.push({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                type: 'product'
            });
        }
    });
    
    updateCart();
    showToast('Panier ajouté à la commande !');
    toggleCart();
}

// Navigation mobile entre panneaux
function showProductsPanel() {
    if (window.innerWidth <= 900) {
        document.getElementById('basketSummaryPanel').classList.add('mobile-hidden');
        document.getElementById('productsListPanel').classList.add('mobile-visible');
    } else {
        scrollToProducts();
    }
}

function showBasketPanel() {
    document.getElementById('productsListPanel').classList.remove('mobile-visible');
    document.getElementById('basketSummaryPanel').classList.remove('mobile-hidden');
}

function addToCustomBasket(productId) {
    const product = DATA.products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = customBasket.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 0.5;
    } else {
        customBasket.push({
            id: productId,
            name: product.name,
            price: product.price,
            quantity: 0.5
        });
    }
    
    renderBasketSummary();
    
    // Sur mobile, retourner au panier
    if (window.innerWidth <= 900) {
        showBasketPanel();
    }
}

function filterProducts(cat) {
    document.querySelectorAll('.filter-btn').forEach(b => 
        b.classList.toggle('active', b.textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(cat === 'all' ? 'tous' : cat))
    );

    document.querySelectorAll('.product-row').forEach(row => {
        row.style.display = cat === 'all' || row.dataset.category === cat ? 'flex' : 'none';
    });
}












function changeCustomQty(id, change) {
    const input = document.getElementById(`custom-${id}`);
    let qty = parseFloat(input.value) + change;
    if (qty < 0.5) qty = 0.5;
    input.value = qty;
    
    // Mettre à jour le prix total
    const price = parseFloat(input.dataset.price);
    const total = (qty * price).toFixed(2);
    document.getElementById(`total-${id}`).textContent = `${total}€`;
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


function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        STATE.cart = JSON.parse(savedCart);
        updateCart();
    }
}



// Panier
function updateCart() {
    const count = document.getElementById('cartCount');
    const items = document.getElementById('cartItems');
    const total = document.getElementById('totalPrice');
    
    // Sauvegarder dans localStorage
    localStorage.setItem('cart', JSON.stringify(STATE.cart));
    
    count.textContent = STATE.cart.length;
    
    if (STATE.cart.length === 0) {
        items.innerHTML = '<p>Votre panier est vide</p>';
        total.textContent = '0€';
        return;
    }
    
    const totalPrice = STATE.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    total.textContent = totalPrice.toFixed(2) + '€';
    
    items.innerHTML = STATE.cart.map((item, i) => {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        if (item.type === 'product') {
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-details">${item.quantity} kg × ${item.price}€/kg</span>
                    </div>
                    <div class="cart-item-total">${itemTotal}€</div>
                    <button onclick="removeFromCart(${i})">×</button>
                </div>
            `;
        } else {
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-details">× ${item.quantity}</span>
                    </div>
                    <div class="cart-item-total">${itemTotal}€</div>
                    <button onclick="removeFromCart(${i})">×</button>
                </div>
            `;
        }
    }).join('');
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



function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[href="#${page}"]`)?.classList.add('active');
    window.scrollTo(0, 0);
    updateMobileNav(page);
    
    // Cacher/afficher le footer et navbar selon la page
    const footer = document.querySelector('.footer');
    const navbar = document.querySelector('.navbar');
    const pagesToHide = ['commander', 'contact', 'mon-compte'];
    
    if (footer) {
        footer.style.display = pagesToHide.includes(page) ? 'none' : '';
    }
    if (navbar) {
        navbar.style.display = pagesToHide.includes(page) ? 'none' : '';
    }
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
    
    // Charger les commandes si on affiche l'onglet commandes
    if (section === 'orders' && currentUser) {
        loadUserOrders();
    }
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



async function loadUserOrders() {
    const container = document.getElementById('userOrders');
    if (!container || !currentUser) return;
    
    container.innerHTML = '<p style="text-align:center;color:#999;">Chargement...</p>';
    
    try {
        const snapshot = await window.firebase.get(window.firebase.ref(db, 'paniers-du-jardin/orders'));
        if (snapshot.exists()) {
            const allOrders = snapshot.val();
            const userOrders = Object.entries(allOrders)
                .map(([id, order]) => ({ id, ...order }))
                .filter(order => order.userId === currentUser.uid)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (userOrders.length === 0) {
                container.innerHTML = '<p class="no-orders">Vous n\'avez pas encore passé de commande.</p>';
                return;
            }
            
            container.innerHTML = `
                <div class="user-orders-list">
                    ${userOrders.map(order => `
                        <div class="user-order-card" onclick="showUserOrderDetails('${order.id}')">
                            <div class="user-order-header">
                                <span class="user-order-id">#${order.id}</span>
                                <span class="user-order-status ${order.treated ? 'treated' : 'pending'}">
                                    ${order.treated ? '✓ Traitée' : '⏳ En cours'}
                                </span>
                            </div>
                            <div class="user-order-info">
                                <div class="user-order-date">
                                     ${new Date(order.date).toLocaleDateString('fr-FR', { 
                                        day: 'numeric', 
                                        month: 'long', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                                <div class="user-order-items">
                                    ${order.items?.length || 0} article(s)
                                </div>
                            </div>
                            <div class="user-order-footer">
                                <span class="user-order-total">${order.total?.toFixed(2) || '0.00'}€</span>
                                <span class="user-order-view">Voir détails →</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = '<p class="no-orders">Vous n\'avez pas encore passé de commande.</p>';
        }
    } catch (err) {
        console.error('Erreur chargement commandes:', err);
        container.innerHTML = '<p style="color:#c62828;">Erreur lors du chargement des commandes.</p>';
    }
}

function showUserOrderDetails(orderId) {
    const order = null;
    
    // Récupérer la commande depuis Firebase
    window.firebase.get(window.firebase.ref(db, `paniers-du-jardin/orders/${orderId}`)).then(snapshot => {
        if (!snapshot.exists()) return;
        const order = snapshot.val();
        
        // Créer ou récupérer le modal
        let modal = document.getElementById('userOrderModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'userOrderModal';
            modal.className = 'modal';
            modal.innerHTML = '<div class="modal-content"><div id="userOrderContent"></div></div>';
            document.body.appendChild(modal);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        }
        
        document.getElementById('userOrderContent').innerHTML = `
            <div class="order-detail-header">
                <h3>Commande #${orderId}</h3>
                <button class="close-btn" onclick="document.getElementById('userOrderModal').classList.remove('active')">×</button>
            </div>
            <div class="order-detail-status ${order.treated ? 'treated' : 'pending'}">
                ${order.treated ? '✓ Commande traitée' : '⏳ Commande en cours de traitement'}
            </div>
            <div class="order-detail-date">
                📅 Commandé le ${new Date(order.date).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>
            <div class="order-detail-section">
                <h4>Articles commandés</h4>
                <div class="order-items-list">
                    ${order.items?.map(item => `
                        <div class="order-item-row">
                            <span class="order-item-name">${item.name}</span>
                            <span class="order-item-qty">${item.type === 'product' ? item.quantity + ' kg' : '× ' + item.quantity}</span>
                            <span class="order-item-price">${(item.price * item.quantity).toFixed(2)}€</span>
                        </div>
                    `).join('') || '<p>Aucun article</p>'}
                </div>
            </div>
            <div class="order-detail-total">
                <span>Total</span>
                <strong>${order.total?.toFixed(2) || '0.00'}€</strong>
            </div>
        `;
        
        modal.classList.add('active');
    });
}




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
