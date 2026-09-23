const firebaseConfig = {
    apiKey: "AIzaSyDlG-Y-B5AnnIWCLy9Qy-gehhu5oVESVX0",
    authDomain: "sitecommercejardin.firebaseapp.com",
    databaseURL: "https://sitecommercejardin-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sitecommercejardin",
    storageBucket: "sitecommercejardin.firebasestorage.app",
    messagingSenderId: "237086182110",
    appId: "1:237086182110:web:56f7168f30271c8d53504f",
    measurementId: "G-T2WJ5T8K1R"
};

let app, db, auth, storage, currentUser = null;
const DATA = { products: [], baskets: [], orders: [], settings: {} };
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

    // Vérifier l'affichage footer/navbar au chargement
    setTimeout(() => {
        const activePage = document.querySelector('.page.active')?.id;
        if (activePage) {
            navigateTo(activePage);
        }

        // Attendre que tous les éléments aient fini de se redimensionner/positionner avant de révéler la page
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.body.classList.add('loaded');
            });
        });
    }, 300);


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
    document.getElementById('footerAddress').textContent = (DATA.settings.address || 'Route des Vergers');
    document.getElementById('footerPhone').textContent = (DATA.settings.phone || '02 40 XX XX XX');
    const footerEmail = document.getElementById('footerEmail');
    if (footerEmail) footerEmail.textContent = DATA.settings.email || 'contact@paniersdujardin.fr';


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
                onmouseenter="previewMonth(${i + 1})"
                onmouseleave="endPreview()"
                data-month="${i + 1}">
            ${m.short}
        </button>
    `).join('');
}

function renderSeasonalGrid(products, isPreview) {
    const grid = document.getElementById('seasonalGrid');
    const empty = document.getElementById('seasonalEmpty');
    
    if (products.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'flex';
    } else {
        grid.style.display = 'grid';
        empty.style.display = 'none';
        
        grid.innerHTML = products.map(p => `
            <div class="seasonal-product-tag">
                <span class="seasonal-tag-emoji">${p.category === 'fruits' ? '🍎' : '🥬'}</span>
                <span class="seasonal-tag-name">${p.name}</span>
            </div>
        `).join('');
    }
    
    grid.classList.toggle('seasonal-preview', isPreview);
}

function filterByMonth(month) {
    currentMonth = month;
    
    // Mettre à jour les boutons actifs
    document.querySelectorAll('.month-chip').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.month) === month);
    });
    
    const products = DATA.products.filter(p => p.availableMonths?.includes(month));
    renderSeasonalGrid(products, false);
}

function previewMonth(month) {
    if (month === currentMonth) return;
    
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const labelContainer = document.getElementById('currentMonthLabel');
    if (labelContainer) {
        labelContainer.innerHTML = `
            <span class="month-icon">👀</span>
            <span>Aperçu : <strong>${monthNames[month - 1]}</strong></span>
        `;
    }
    
    const products = DATA.products.filter(p => p.availableMonths?.includes(month));
    renderSeasonalGrid(products, true);
}

function endPreview() {
    filterByMonth(currentMonth);
}



function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal || !modal.classList.contains('active')) return;
    modal.classList.add('closing');
    modal.addEventListener('animationend', () => {
        modal.classList.remove('active', 'closing');
    }, { once: true });
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

const CUSTOM_BASKET_STORAGE_KEY = 'bl_customBasket';

function loadCustomBasketFromStorage() {
    try {
        const raw = localStorage.getItem(CUSTOM_BASKET_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.error('Erreur lecture panier local:', err);
        return [];
    }
}

function saveCustomBasketToStorage() {
    try {
        localStorage.setItem(CUSTOM_BASKET_STORAGE_KEY, JSON.stringify(customBasket));
    } catch (err) {
        console.error('Erreur sauvegarde panier local:', err);
    }
}

let customBasket = loadCustomBasketFromStorage();

// ===== Mon Panier (onglet mobile) =====
const MP_CATEGORY_META = {
    fruits:  { icon: '🍎', color1: '#ff8f3c', color2: '#ffd08a' },
    legumes: { icon: '🥕', color1: '#448548', color2: '#a8d5a2' },
    herbes:  { icon: '🌿', color1: '#2f9e44', color2: '#b7e4c7' },
    default: { icon: '🧺', color1: '#0eaaa5', color2: '#8fe3df' }
};
let mpSelectedProductId = null;
let mpPendingQty = 1;
let mpScrollTimeout = null;

function mpGetProductMeta(product) {
    const base = MP_CATEGORY_META[product?.category] || MP_CATEGORY_META.default;
    if (product?.color) {
        return { icon: base.icon, color1: product.color, color2: lightenColor(product.color, 35) };
    }
    return base;
}

function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * percent / 100));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * percent / 100));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

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

function openConfirmDeleteBasketModal() {
    const basket = userBaskets.find(b => b.id === currentBasketId);
    const basketName = basket ? basket.name : 'Mon Panier';
    document.getElementById('confirmDeleteBasketName').textContent = `Le panier "${basketName}" sera supprimé définitivement.`;
    document.getElementById('confirmDeleteBasketModal').classList.add('active');
}

function closeConfirmDeleteBasketModal() {
    closeModal('confirmDeleteBasketModal');
}

async function confirmDeleteBasket() {
    closeConfirmDeleteBasketModal();
    
    if (!currentUser || currentBasketId.startsWith('temp_')) {
        customBasket = [];
        renderBasketSummary();
        return;
    }
    
    const basket = userBaskets.find(b => b.id === currentBasketId);
    if (!basket) return;
    
    try {
        await window.firebase.set(
            window.firebase.ref(db, `paniers-du-jardin/users/${currentUser.uid}/customBaskets/${currentBasketId}`),
            null
        );
        
        userBaskets = userBaskets.filter(b => b.id !== currentBasketId);
        
        if (userBaskets.length > 0) {
            currentBasketId = userBaskets[0].id;
            customBasket = [...userBaskets[0].items];
        } else {
            currentBasketId = 'temp_' + Date.now();
            customBasket = [];
        }
        
        renderBasketSummary();
        renderBasketDropdown();
        showToast('Panier supprimé', 'success');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

function deleteCurrentBasket() {
    openConfirmDeleteBasketModal();
}

document.getElementById('confirmDeleteBasketModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeConfirmDeleteBasketModal();
});



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
    saveCustomBasketToStorage();

    const container = document.getElementById('basketSummaryItems');
    const totalEl = document.getElementById('basketSummaryTotal');
    if (!container) return;

    if (customBasket.length === 0) {
        container.innerHTML = '<p class="basket-empty">Votre panier est vide</p>';
        totalEl.textContent = '0€';
        renderMonPanierGrid();
        return;
    }

    let total = 0;
    container.innerHTML = customBasket.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const unit = item.unit || 'kg';
        const step = getUnitMeta(unit).step;
                return `
            <div class="basket-summary-row" data-id="${item.id}">
                <span class="item-name">${item.name}</span>
                <span class="item-price">${formatUnitPrice(item.price, unit)}</span>
                <div class="item-qty-controls">
                    <button class="qty-btn-mini" onclick="changeCustomBasketQty('${item.id}', -${step})"><svg height="16px" viewBox="0 -960 960 960" width="16px" fill="#4a7c4e"><path d="M240-440q-17 0-28.5-11.5T200-480q0-17 11.5-28.5T240-520h480q17 0 28.5 11.5T760-480q0 17-11.5 28.5T720-440H240Z"/></svg></button>
                    <span>${formatQtyWithUnit(item.quantity, unit)}</span>
                    <button class="qty-btn-mini" onclick="changeCustomBasketQty('${item.id}', ${step})"><svg height="16px" viewBox="0 -960 960 960" width="16px" fill="#4a7c4e"><path d="M480-120q-17 0-28.5-11.5T440-160v-280H160q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h280v-280q0-17 11.5-28.5T480-840q17 0 28.5 11.5T520-800v280h280q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H520v280q0 17-11.5 28.5T480-120Z"/></svg></button>
                </div>
                <span class="item-total">${itemTotal.toFixed(2)}€</span>
            </div>
        `;
    }).join('');

    totalEl.textContent = total.toFixed(2) + '€';

    renderMonPanierGrid();
}


function renderCustomProducts() {
    const container = document.getElementById('productsTable');
    if (!container) return;

    container.innerHTML = DATA.products.map(p => `
        <div class="product-row" data-category="${p.category}">
            <span class="product-name">${p.name}</span>
            <span class="product-price">${formatUnitPrice(p.price, p.unit)}</span>
            <button class="btn-secondary" onclick="addToCustomBasket('${p.id}')">Ajouter</button>
        </div>
    `).join('');

    // Charger les paniers utilisateur
    loadUserBaskets();

    renderMonPanierWheel();
}

function scrollToProducts() {
    document.querySelector('.products-list-panel').scrollIntoView({ behavior: 'smooth' });
}

// ===== Mon Panier (onglet mobile) =====

function renderMonPanierWheel() {
    const wheel = document.getElementById('mpWheel');
    if (!wheel) return;

    const available = DATA.products.filter(p => p.inStock !== false);

    if (available.length === 0) {
        wheel.innerHTML = '<p class="mp-wheel-empty">Aucun produit disponible</p>';
        return;
    }

    const shadowItem = '<div class="mp-wheel-card mp-wheel-shadow" aria-hidden="true"><div class="mp-wheel-circle"></div></div>';
    const shadowItems = shadowItem.repeat(3);

    wheel.innerHTML = shadowItems + available.map(p => {
        const meta = mpGetProductMeta(p);
        const circleStyle = (p.image
            ? `background-image:url('${p.image}')`
            : `background:${meta.color1}`) + `;--wheel-color:${meta.color1}`;
        return `
            <div class="mp-wheel-card" data-id="${p.id}" onclick="mpSelectProduct('${p.id}', true)">
                <div class="mp-wheel-circle" style="${circleStyle}">${p.image ? '' : meta.icon}</div>
                <span class="mp-wheel-name">${p.name}</span>
            </div>
        `;
    }).join('') + shadowItems;

    mpSelectedProductId = available[Math.min(3, available.length - 1)].id;
    mpSelectProduct(mpSelectedProductId, false);

    wheel.removeEventListener('scroll', mpHandleWheelScroll);
    wheel.addEventListener('scroll', mpHandleWheelScroll, { passive: true });
    wheel.removeEventListener('scroll', mpRequestWheelRadialUpdate);
    wheel.addEventListener('scroll', mpRequestWheelRadialUpdate, { passive: true });
    wheel.removeEventListener('wheel', mpHandleMouseWheel);
    wheel.addEventListener('wheel', mpHandleMouseWheel, { passive: false });
    wheel.removeEventListener('pointerdown', mpWheelDragStart);
    wheel.addEventListener('pointerdown', mpWheelDragStart);
    wheel.removeEventListener('click', mpWheelClickGuard);
    wheel.addEventListener('click', mpWheelClickGuard, { capture: true });

    mpApplyWheelRadialTransforms();

    window.removeEventListener('resize', mpRequestWheelRadialUpdate);
    window.addEventListener('resize', mpRequestWheelRadialUpdate);
}

const mpWheelDrag = { active: false, moved: false, startX: 0, startScrollLeft: 0 };

function mpWheelDragStart(e) {
    if (e.pointerType === 'touch') return; // le tactile natif gère déjà le scroll
    const wheel = e.currentTarget;
    mpWheelDrag.active = true;
    mpWheelDrag.moved = false;
    mpWheelDrag.startX = e.clientX;
    mpWheelDrag.startScrollLeft = wheel.scrollLeft;
    wheel.setPointerCapture(e.pointerId);
    wheel.classList.add('mp-wheel-dragging');
    wheel.addEventListener('pointermove', mpWheelDragMove);
    wheel.addEventListener('pointerup', mpWheelDragEnd);
    wheel.addEventListener('pointercancel', mpWheelDragEnd);
}

function mpWheelDragMove(e) {
    if (!mpWheelDrag.active) return;
    const wheel = e.currentTarget;
    const dx = e.clientX - mpWheelDrag.startX;
    if (Math.abs(dx) > 3) mpWheelDrag.moved = true;
    wheel.scrollLeft = mpWheelDrag.startScrollLeft - dx;
    mpClampWheelScroll(wheel);
}

function mpWheelDragEnd(e) {
    if (!mpWheelDrag.active) return;
    mpWheelDrag.active = false;
    const wheel = e.currentTarget;
    wheel.classList.remove('mp-wheel-dragging');
    wheel.removeEventListener('pointermove', mpWheelDragMove);
    wheel.removeEventListener('pointerup', mpWheelDragEnd);
    wheel.removeEventListener('pointercancel', mpWheelDragEnd);
}

function mpWheelClickGuard(e) {
    if (mpWheelDrag.moved) {
        e.stopPropagation();
        e.preventDefault();
        mpWheelDrag.moved = false;
    }
}

function mpHandleMouseWheel(e) {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!delta) return;
    e.preventDefault();
    e.currentTarget.scrollLeft += delta;
    mpClampWheelScroll(e.currentTarget);
}

function mpHandleWheelScroll() {
    clearTimeout(mpScrollTimeout);
    mpScrollTimeout = setTimeout(() => {
        const wheel = document.getElementById('mpWheel');
        if (!wheel) return;
        const center = wheel.scrollLeft + wheel.clientWidth / 2;
        let closest = null, closestDist = Infinity;
        wheel.querySelectorAll('.mp-wheel-card').forEach(card => {
            const dist = Math.abs((card.offsetLeft + card.offsetWidth / 2) - center);
            if (dist < closestDist) { closestDist = dist; closest = card; }
        });
        if (closest) mpSelectProduct(closest.dataset.id, false);
    }, 30);
}

let mpWheelRafId = null;
let mpWheelCentered = false;

function mpRequestWheelRadialUpdate() {
    if (mpWheelRafId) return;
    mpWheelRafId = requestAnimationFrame(() => {
        mpWheelRafId = null;
        mpApplyWheelRadialTransforms();
    });
}

// Empêche de faire défiler la roue jusqu'aux items shadow (décoratifs, en début/fin de liste).
function mpClampWheelScroll(wheel) {
    const realCards = wheel.querySelectorAll('.mp-wheel-card:not(.mp-wheel-shadow)');
    if (!realCards.length) return;

    const first = realCards[0];
    const last = realCards[realCards.length - 1];
    const half = wheel.clientWidth / 2;
    const min = first.offsetLeft + first.offsetWidth / 2 - half;
    const max = last.offsetLeft + last.offsetWidth / 2 - half;

    if (wheel.scrollLeft < min) wheel.scrollLeft = min;
    else if (wheel.scrollLeft > max) wheel.scrollLeft = max;
}

// Courbe chaque carte le long d'un arc, comme si elle glissait sur la jante d'une roue.
function mpApplyWheelRadialTransforms() {
    const wheel = document.getElementById('mpWheel');
    if (!wheel) return;
    const cards = wheel.querySelectorAll('.mp-wheel-card');
    if (!cards.length) return;

    mpClampWheelScroll(wheel);

    const center = wheel.scrollLeft + wheel.clientWidth / 2;
    const maxAngle = 30;
    const range = wheel.clientWidth / 2 + 40;

    cards.forEach(card => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const t = Math.max(-1, Math.min(1, (cardCenter - center) / range));
        const angle = t * maxAngle;
        const rad = angle * Math.PI / 180;
        const drop = Math.abs(angle*angle)/15;
        const scale = 1 - 0 * Math.abs(t);
        const opacity = 0.3 + 0.7 * Math.cos(rad);
        card.style.transform = `translateY(${drop}px) rotate(${angle}deg) scale(${scale})`;
        card.style.opacity = opacity;
    });
}

function mpSelectProduct(productId, scrollIntoView) {
    if (!productId) return;
    const product = DATA.products.find(p => p.id === productId);
    if (!product) return;

    mpSelectedProductId = productId;
    mpPendingQty = getUnitMeta(product.unit).defaultQty;

    document.querySelectorAll('.mp-wheel-card').forEach(card => {
        card.classList.toggle('active', card.dataset.id === productId);
    });

    if (scrollIntoView) {
        document.querySelector(`.mp-wheel-card[data-id="${productId}"]`)
            ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    mpUpdateBackground(product);
    mpRefreshQtyControls(false);
}

function mpRefreshQtyControls(animate = true, direction = 0) {
    const product = DATA.products.find(p => p.id === mpSelectedProductId);
    const unit = getUnitMeta(product?.unit);
    const labelEl = document.getElementById('mpQtyLabel');
    const valueEl = document.getElementById('mpQtyValue');
    if (labelEl) labelEl.textContent = unit.label;
    if (valueEl) {
        const newValue = formatQtyWithUnit(mpPendingQty, product?.unit);
        if (valueEl.textContent !== newValue) {
            valueEl.textContent = newValue;
            valueEl.classList.remove('mp-qty-value-pulse-left', 'mp-qty-value-pulse-right');
            if (animate) {
                void valueEl.offsetWidth;
                valueEl.classList.add(direction < 0 ? 'mp-qty-value-pulse-left' : 'mp-qty-value-pulse-right');
            }
        }
    }
    mpUpdateQtyInfo(animate);
}

function mpUpdateQtyInfo(animate = true) {
    const priceEl = document.getElementById('mpQtyPrice');
    const subtotalEl = document.getElementById('mpQtySubtotal');
    if (!priceEl || !subtotalEl) return;

    const product = DATA.products.find(p => p.id === mpSelectedProductId);
    const price = product?.price || 0;
    const [currency, unitSuffix] = getUnitMeta(product?.unit).priceSuffix.split('/');
    priceEl.innerHTML = `<span class="mp-qty-price-amount">${price.toFixed(2)} ${currency}</span><span class="mp-qty-price-unit">/${unitSuffix}</span>`;

    const newSubtotal = `${(price * mpPendingQty).toFixed(2)} €`;
    if (subtotalEl.textContent !== newSubtotal) {
        subtotalEl.textContent = newSubtotal;
        subtotalEl.classList.remove('mp-qty-subtotal-pulse');
        if (animate) {
            void subtotalEl.offsetWidth;
            subtotalEl.classList.add('mp-qty-subtotal-pulse');
        }
    }
}

let mpBgActiveLayer = 0;
let mpBgRequestId = 0;

function mpShowGradientBackground(meta) {
    const icon = document.getElementById('mpBackgroundIcon');
    const layer0 = document.getElementById('mpBgLayer0');
    const layer1 = document.getElementById('mpBgLayer1');
    icon.style.opacity = '0.16';
    icon.textContent = meta.icon;

    const gradient = `radial-gradient(circle at 50% 25%, ${darkenColor(meta.color2, 12)}, ${darkenColor(meta.color1, 12)} 75%)`;
    const nextLayer = mpBgActiveLayer === 0 ? layer1 : layer0;
    const currentLayer = mpBgActiveLayer === 0 ? layer0 : layer1;
    nextLayer.style.background = gradient;
    nextLayer.classList.add('active');
    currentLayer.classList.remove('active');
    mpBgActiveLayer = mpBgActiveLayer === 0 ? 1 : 0;
}

function mpUpdateBackground(product) {
    const meta = mpGetProductMeta(product);
    mpShowGradientBackground(meta);
}

function playSound(src) {
    try {
        new Audio(src).play().catch(() => {});
    } catch (e) {}
}

function mpChangeQty(direction) {
    const product = DATA.products.find(p => p.id === mpSelectedProductId);
    const step = getUnitMeta(product?.unit).step;
    mpPendingQty = Math.max(step, Math.round((mpPendingQty + direction * step) * 10) / 10);
    mpRefreshQtyControls(true, direction);
    playSound('medias/Button.wav');
}

function mpAddToBasket() {
    if (!mpSelectedProductId) return;
    const product = DATA.products.find(p => p.id === mpSelectedProductId);
    if (!product) return;

    const existing = customBasket.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += mpPendingQty;
    } else {
        customBasket.push({ id: product.id, name: product.name, price: product.price, unit: product.unit || 'kg', quantity: mpPendingQty });
    }

    renderBasketSummary();
    showToast(`${product.name} ajouté au panier`);
    playSound('medias/Panier.wav');

    mpPendingQty = getUnitMeta(product.unit).defaultQty;
    mpRefreshQtyControls();

    const card = document.querySelector(`.mp-item-card[data-id="${product.id}"]`);
    if (card) {
        card.classList.add(existing ? 'mp-item-updated' : 'mp-item-new');
        card.addEventListener('animationend', () => card.classList.remove('mp-item-new', 'mp-item-updated'), { once: true });
    }
}

function mpFormatItemQty(qty, unit) {
    if (unit === 'lot250g') return `${qty}x 250g`;
    return formatQtyWithUnit(qty, unit);
}

function renderMonPanierGrid() {
    const grid = document.getElementById('mpItemsGrid');
    const totalEl = document.getElementById('mpTotalValue');
    if (!grid) return;

    if (customBasket.length === 0) {
        grid.innerHTML = '<p class="mp-items-empty" id="mpItemsEmpty">Votre panier est vide, choisissez un produit ci-dessous 👇</p>';
    } else {
        grid.innerHTML = customBasket.map(item => {
            const itemTotal = (item.price * item.quantity).toFixed(2);
            return `
                <div class="mp-item-card" data-id="${item.id}">
                    <button class="mp-item-remove" onclick="removeFromCustomBasket('${item.id}')" aria-label="Retirer">×</button>
                    <span class="mp-item-name">${item.name}</span>
                    <span class="mp-item-qty">${mpFormatItemQty(item.quantity, item.unit || 'kg')}</span>
                    <span class="mp-item-price">${itemTotal}€</span>
                </div>
            `;
        }).join('');
        mpArrangeItemsInCircle();
    }

    const total = customBasket.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (totalEl) totalEl.textContent = total.toFixed(2) + '€';

    mpUpdateBasketImage();
}

let mpLastBasketCount = null;

function mpUpdateBasketImage() {
    const totalCard = document.getElementById('mpTotalCard');
    if (!totalCard) return;
    const step = Math.min(customBasket.length, 5);
    const fileName = step === 0 ? 'Panier.png' : `Panier${step}.png`;
    totalCard.style.backgroundImage = `url('medias/${fileName}')`;

    if (mpLastBasketCount !== null && mpLastBasketCount !== customBasket.length) {
        totalCard.classList.remove('mp-total-card-bounce');
        void totalCard.offsetWidth;
        totalCard.classList.add('mp-total-card-bounce');
    }
    mpLastBasketCount = customBasket.length;
}

// Dispose les mp-item-card en cercle(s) autour du panier (mp-total-card), fixe au centre.
function mpArrangeItemsInCircle() {
    const zone = document.getElementById('mpOrbitZone');
    if (!zone) return;
    const cards = zone.querySelectorAll('.mp-item-card');
    if (!cards.length) return;

    const perRing = 8;
    const ringGap = 92;
    const centerY = zone.clientHeight * 0.30;
    const verticalLimit = Math.min(centerY, zone.clientHeight - centerY) - 60;
    const horizontalLimit = zone.clientWidth / 2 - 60;
    const maxRadius = Math.max(130, Math.min(horizontalLimit, verticalLimit));
    const baseRadius = Math.min(270, maxRadius);

    cards.forEach((card, i) => {
        const ring = Math.floor(i / perRing);
        const ringStart = ring * perRing;
        const ringCount = Math.min(perRing, cards.length - ringStart);
        const indexInRing = i - ringStart;
        const radius = Math.min(baseRadius + ring * ringGap, maxRadius + ring * ringGap);
        const angle = (indexInRing / ringCount) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        card.style.setProperty('--ox', `${x}px`);
        card.style.setProperty('--oy', `${y}px`);
    });
}

window.removeEventListener('resize', mpArrangeItemsInCircle);
window.addEventListener('resize', mpArrangeItemsInCircle);

function openMpBasketsModal() {
    renderMpBasketsList();
    document.getElementById('mpBasketsModal').classList.add('active');
}

function closeMpBasketsModal() {
    document.getElementById('mpBasketsModal').classList.remove('active');
}

function renderMpBasketsList() {
    const container = document.getElementById('mpBasketsList');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = '<p class="dropdown-empty">Connectez-vous pour retrouver vos paniers sauvegardés.</p>';
        return;
    }
    if (userBaskets.length === 0) {
        container.innerHTML = '<p class="dropdown-empty">Aucun panier sauvegardé</p>';
        return;
    }

    container.innerHTML = userBaskets.map(basket => `
        <div class="mp-basket-list-item ${basket.id === currentBasketId ? 'active' : ''}" onclick="mpLoadBasket('${basket.id}')">
            <span class="basket-item-name">${basket.name}</span>
            <span class="basket-item-count">${basket.items?.length || 0} produits</span>
        </div>
    `).join('');
}

function mpLoadBasket(basketId) {
    selectBasket(basketId);
    closeMpBasketsModal();
}

document.getElementById('mpBasketsModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeMpBasketsModal();
});

function validateCustomBasket() {
    if (customBasket.length === 0) {
        alert('Votre panier est vide');
        return;
    }

    if (STATE.cart.length > 0) {
        STATE.cart = [];
    }

    customBasket.forEach(item => {
        STATE.cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            unit: item.unit || 'kg',
            quantity: item.quantity,
            type: 'product'
        });
    });

    updateCart();
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
    const step = getUnitMeta(product.unit).step;

    const existing = customBasket.find(item => item.id === productId);
    if (existing) {
        existing.quantity += step;
    } else {
        customBasket.push({
            id: productId,
            name: product.name,
            price: product.price,
            unit: product.unit || 'kg',
            quantity: step
        });
    }

        renderBasketSummary();

    const row = document.querySelector(`.basket-summary-row[data-id="${productId}"]`);
    if (row) {
        row.classList.add(existing ? 'basket-row-updated' : 'basket-row-new');
        row.addEventListener('animationend', () => {
            row.classList.remove('basket-row-new', 'basket-row-updated');
        }, { once: true });
    }

    
    // Sur mobile, retourner au panier
    if (window.innerWidth <= 900) {
        showBasketPanel();
    }
}

function filterProducts(cat) {
    document.querySelectorAll('.filter-btn').forEach(b => 
        b.classList.toggle('active', b.textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(cat === 'all' ? 'tous' : cat))
    );

    const searchInput = document.getElementById('productSearchInput');
    const search = searchInput ? searchInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';

    document.querySelectorAll('.product-row').forEach(row => {
        const matchesCategory = cat === 'all' || row.dataset.category === cat;
        const name = row.querySelector('.product-name').textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matchesSearch = name.includes(search);
        row.style.display = matchesCategory && matchesSearch ? 'flex' : 'none';
    });
}



function searchProducts(query) {
    const search = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    document.querySelectorAll('.product-row').forEach(row => {
        const name = row.querySelector('.product-name').textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matchesSearch = name.includes(search);
        const activeFilter = document.querySelector('.filter-btn.active:not(#filter-back-btn)');
        const cat = activeFilter ? activeFilter.textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'tous';
        const matchesCategory = cat === 'tous' || row.dataset.category === cat;
        row.style.display = matchesSearch && matchesCategory ? 'flex' : 'none';
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
                        <span class="cart-item-details">${formatQtyWithUnit(item.quantity, item.unit || 'kg')} × ${formatUnitPrice(item.price, item.unit)}</span>
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
        toggleCart();
        document.getElementById('loginRequiredModal').classList.add('active');
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

// closeAuthModal
function closeAuthModal() {
    closeModal('authModal');
}

function closeLoginRequiredModal() {
    closeModal('loginRequiredModal');
}

document.getElementById('loginRequiredModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLoginRequiredModal();
});


document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAuthModal();
});


// closeNewBasketModal
function closeNewBasketModal() {
    closeModal('newBasketModal');
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



function updateFooterNavbarVisibility() {
    const activePage = document.querySelector('.page.active')?.id;
    const footer = document.querySelector('.footer');
    const navbar = document.querySelector('.navbar');
    const mobileBottomNav = document.getElementById('mobileBottomNav');
    const pagesToHide = ['commander', 'contact', 'mon-compte', 'mon-panier'];
    const isSmallScreen = window.innerWidth < 950;

    const shouldHide = activePage && pagesToHide.includes(activePage) && isSmallScreen;

    if (footer) {
        footer.style.display = shouldHide ? 'none' : '';
    }
    if (navbar) {
        navbar.classList.toggle('navbar-collapsed', activePage === 'mon-panier');
    }
    if (mobileBottomNav) {
        mobileBottomNav.classList.toggle('mp-nav-collapsed', activePage === 'mon-panier');
    }
    document.body.classList.toggle('mp-page-active', activePage === 'mon-panier');
}



function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[href="#${page}"]`)?.classList.add('active');
    window.scrollTo(0, 0);
    updateMobileNav(page);
    updateFooterNavbarVisibility();

    if (page === 'mon-panier') {
        if (!document.querySelector('#mpWheel .mp-wheel-card')) renderMonPanierWheel();
        renderMonPanierGrid();
        requestAnimationFrame(() => {
            mpApplyWheelRadialTransforms();
            if (!mpWheelCentered) {
                mpWheelCentered = true;
                mpSelectProduct(mpSelectedProductId, true);
            }
        });
    }
}

window.addEventListener('resize', updateFooterNavbarVisibility);

// Appeler au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateFooterNavbarVisibility, 500);
    // Filet de sécurité si Firebase ne répond jamais : révèle quand même la page.
    setTimeout(() => document.body.classList.add('loaded'), 5000);
});



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
                            <span class="order-item-qty">${item.type === 'product' ? formatQtyWithUnit(item.quantity, item.unit || 'kg') : '× ' + item.quantity}</span>
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
    }, 2000);
}
