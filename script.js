// ===== IMPORTS FIREBASE (chargés depuis le module principal) =====
// Les imports sont gérés dans index.html avec type="module"

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCFeVRcxq_YOc2EuNcMZExtZvyQn919wog",
    authDomain: "sitecommercejardin-b348e.firebaseapp.com",
    databaseURL: "https://sitecommercejardin-b348e-default-rtdb.europe-west1.firebasedatabase.app/", // À vérifier dans Firebase Console
    projectId: "sitecommercejardin-b348e",
    storageBucket: "sitecommercejardin-b348e.firebasestorage.app",
    messagingSenderId: "468169255056",
    appId: "1:468169255056:web:33ba4593dac84b41c6d015",
    measurementId: "G-X8V2SGWXKQ"
};

// Variables Firebase
let app;
let database;
let analytics;

// Données du site (structure par défaut)
const DATA = {
    seasonalFruits: [
        { name: 'Pommes', icon: '🍎', description: 'Variétés locales croquantes', stock: 50 },
        { name: 'Poires', icon: '🍐', description: 'Juteuses et sucrées', stock: 30 },
        { name: 'Carottes', icon: '🥕', description: 'Fraîches du jardin', stock: 100 },
        { name: 'Tomates', icon: '🍅', description: 'Gorgées de soleil', stock: 15 },
        { name: 'Courgettes', icon: '🥒', description: 'Tendres et savoureuses', stock: 45 },
        { name: 'Salades', icon: '🥬', description: 'Croquantes et bio', stock: 80 }
    ],
    
    baskets: [
        {
            id: 'petit',
            name: 'Panier Petit',
            icon: '🧺',
            subtitle: 'Idéal pour 1-2 personnes',
            price: 15,
            content: ['3 variétés de fruits', '4 variétés de légumes', 'Environ 3kg'],
            stock: 25
        },
        {
            id: 'moyen',
            name: 'Panier Moyen',
            icon: '🧺',
            subtitle: 'Parfait pour 3-4 personnes',
            price: 25,
            content: ['5 variétés de fruits', '6 variétés de légumes', 'Environ 5kg', '1 surprise du jardin'],
            stock: 30,
            featured: true
        },
        {
            id: 'grand',
            name: 'Panier Grand',
            icon: '🧺',
            subtitle: 'Pour famille nombreuse',
            price: 40,
            content: ['7 variétés de fruits', '8 variétés de légumes', 'Environ 8kg', '2 surprises du jardin', 'Herbes aromatiques'],
            stock: 15
        }
    ],
    
    promotions: [],
    orders: []
};

// État de l'application (local à chaque utilisateur)
const STATE = {
    cart: [],
    adminLoggedIn: false,
    firebaseReady: false
};

// Mot de passe admin
const ADMIN_PASSWORD = 'admin123';

// ===== INITIALISATION FIREBASE =====
// Cette fonction sera appelée depuis le module principal
window.initializeFirebaseApp = async function(firebaseApp, firebaseDatabase, firebaseAnalytics) {
    try {
        // Initialiser Firebase
        app = firebaseApp.initializeApp(firebaseConfig);
        database = firebaseDatabase.getDatabase(app);
        
        // Analytics optionnel
        if (firebaseAnalytics) {
            analytics = firebaseAnalytics.getAnalytics(app);
        }
        
        STATE.firebaseReady = true;
        console.log('✅ Firebase initialisé avec succès');
        
        // Charger les données depuis Firebase
        await loadDataFromFirebase(firebaseDatabase);
        
        // Écouter les changements en temps réel
        setupRealtimeListeners(firebaseDatabase);
        
    } catch (error) {
        console.error('❌ Erreur Firebase:', error);
        console.log('⚠️ Mode hors ligne - utilisation du localStorage');
        loadFromLocalStorage();
    }
};

// ===== CHARGEMENT DES DONNÉES DEPUIS FIREBASE =====
async function loadDataFromFirebase(firebaseDatabase) {
    const dbRef = firebaseDatabase.ref(database, 'paniers-du-jardin');
    
    try {
        // Charger les paniers
        const basketsRef = firebaseDatabase.ref(database, 'paniers-du-jardin/baskets');
        const basketsSnapshot = await firebaseDatabase.get(basketsRef);
        
        if (basketsSnapshot.exists()) {
            const baskets = basketsSnapshot.val();
            baskets.forEach(basket => {
                const localBasket = DATA.baskets.find(b => b.id === basket.id);
                if (localBasket) {
                    localBasket.stock = basket.stock;
                }
            });
            renderBaskets();
        } else {
            // Initialiser Firebase avec les données par défaut
            await initializeFirebaseData(firebaseDatabase);
        }
        
        // Charger les promotions
        const promosRef = firebaseDatabase.ref(database, 'paniers-du-jardin/promotions');
        const promosSnapshot = await firebaseDatabase.get(promosRef);
        
        if (promosSnapshot.exists()) {
            DATA.promotions = promosSnapshot.val() || [];
            renderBaskets();
        }
        
        // Charger les fruits de saison
        const fruitsRef = firebaseDatabase.ref(database, 'paniers-du-jardin/seasonalFruits');
        const fruitsSnapshot = await firebaseDatabase.get(fruitsRef);
        
        if (fruitsSnapshot.exists()) {
            const fruits = fruitsSnapshot.val();
            fruits.forEach(fruit => {
                const localFruit = DATA.seasonalFruits.find(f => f.name === fruit.name);
                if (localFruit) {
                    localFruit.stock = fruit.stock;
                }
            });
            renderSeasonalFruits();
        }
        
        // Charger les commandes
        const ordersRef = firebaseDatabase.ref(database, 'paniers-du-jardin/orders');
        const ordersSnapshot = await firebaseDatabase.get(ordersRef);
        
        if (ordersSnapshot.exists()) {
            DATA.orders = ordersSnapshot.val() || [];
        }
        
    } catch (error) {
        console.error('❌ Erreur chargement données:', error);
        loadFromLocalStorage();
    }
    
    // Charger le panier local (reste en localStorage pour chaque utilisateur)
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        STATE.cart = JSON.parse(savedCart);
        updateCartDisplay();
    }
}

// ===== INITIALISER FIREBASE AVEC LES DONNÉES PAR DÉFAUT =====
async function initializeFirebaseData(firebaseDatabase) {
    try {
        await firebaseDatabase.set(firebaseDatabase.ref(database, 'paniers-du-jardin/baskets'), DATA.baskets);
        await firebaseDatabase.set(firebaseDatabase.ref(database, 'paniers-du-jardin/promotions'), DATA.promotions);
        await firebaseDatabase.set(firebaseDatabase.ref(database, 'paniers-du-jardin/seasonalFruits'), DATA.seasonalFruits);
        await firebaseDatabase.set(firebaseDatabase.ref(database, 'paniers-du-jardin/orders'), DATA.orders);
        console.log('✅ Données initiales enregistrées dans Firebase');
    } catch (error) {
        console.error('❌ Erreur initialisation données:', error);
    }
}

// ===== ÉCOUTE EN TEMPS RÉEL =====
function setupRealtimeListeners(firebaseDatabase) {
    // Écouter les changements de stocks de paniers
    const basketsRef = firebaseDatabase.ref(database, 'paniers-du-jardin/baskets');
    firebaseDatabase.onValue(basketsRef, (snapshot) => {
        if (snapshot.exists()) {
            const baskets = snapshot.val();
            baskets.forEach(basket => {
                const localBasket = DATA.baskets.find(b => b.id === basket.id);
                if (localBasket) {
                    localBasket.stock = basket.stock;
                }
            });
            renderBaskets();
        }
    });
    
    // Écouter les changements de promotions
    const promosRef = firebaseDatabase.ref(database, 'paniers-du-jardin/promotions');
    firebaseDatabase.onValue(promosRef, (snapshot) => {
        if (snapshot.exists()) {
            DATA.promotions = snapshot.val() || [];
            renderBaskets();
        }
    });
    
    // Écouter les changements de stocks de fruits
    const fruitsRef = firebaseDatabase.ref(database, 'paniers-du-jardin/seasonalFruits');
    firebaseDatabase.onValue(fruitsRef, (snapshot) => {
        if (snapshot.exists()) {
            const fruits = snapshot.val();
            fruits.forEach(fruit => {
                const localFruit = DATA.seasonalFruits.find(f => f.name === fruit.name);
                if (localFruit) {
                    localFruit.stock = fruit.stock;
                }
            });
            renderSeasonalFruits();
        }
    });
}

// ===== SAUVEGARDE DANS FIREBASE =====
async function saveToFirebase(firebaseDatabase, path, data) {
    if (STATE.firebaseReady && database) {
        try {
            const dbRef = firebaseDatabase.ref(database, `paniers-du-jardin/${path}`);
            await firebaseDatabase.set(dbRef, data);
            console.log(`✅ ${path} sauvegardé dans Firebase`);
        } catch (error) {
            console.error(`❌ Erreur sauvegarde ${path}:`, error);
            saveToLocalStorage();
        }
    }
}

// ===== NAVIGATION =====
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${pageId}`) {
            link.classList.add('active');
        }
    });
    
    window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('href').substring(1);
            navigateTo(pageId);
        });
    });
    
    initializePage();
});

// ===== INITIALISATION =====
function initializePage() {
    renderSeasonalFruits();
    renderBaskets();
    updateCartDisplay();
    
    // Firebase sera initialisé depuis le module principal
    if (!STATE.firebaseReady) {
        console.log('⏳ En attente de Firebase...');
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    const savedCart = localStorage.getItem('cart');
    const savedPromotions = localStorage.getItem('promotions');
    const savedOrders = localStorage.getItem('orders');
    const savedBaskets = localStorage.getItem('baskets');
    const savedFruits = localStorage.getItem('seasonalFruits');
    
    if (savedCart) {
        STATE.cart = JSON.parse(savedCart);
        updateCartDisplay();
    }
    
    if (savedPromotions) {
        DATA.promotions = JSON.parse(savedPromotions);
        renderBaskets();
    }
    
    if (savedOrders) {
        DATA.orders = JSON.parse(savedOrders);
    }
    
    if (savedBaskets) {
        const baskets = JSON.parse(savedBaskets);
        baskets.forEach(basket => {
            const localBasket = DATA.baskets.find(b => b.id === basket.id);
            if (localBasket) {
                localBasket.stock = basket.stock;
            }
        });
        renderBaskets();
    }
    
    if (savedFruits) {
        const fruits = JSON.parse(savedFruits);
        fruits.forEach(fruit => {
            const localFruit = DATA.seasonalFruits.find(f => f.name === fruit.name);
            if (localFruit) {
                localFruit.stock = fruit.stock;
            }
        });
        renderSeasonalFruits();
    }
}

function saveToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(STATE.cart));
    localStorage.setItem('promotions', JSON.stringify(DATA.promotions));
    localStorage.setItem('orders', JSON.stringify(DATA.orders));
    localStorage.setItem('baskets', JSON.stringify(DATA.baskets));
    localStorage.setItem('seasonalFruits', JSON.stringify(DATA.seasonalFruits));
}

// ===== AFFICHAGE DES FRUITS DE SAISON =====
function renderSeasonalFruits() {
    const container = document.getElementById('seasonalFruits');
    
    container.innerHTML = DATA.seasonalFruits.map(fruit => {
        let stockClass = 'available';
        let stockText = 'En stock';
        
        if (fruit.stock < 20) {
            stockClass = 'limited';
            stockText = `Stock limité (${fruit.stock})`;
        }
        if (fruit.stock === 0) {
            stockClass = 'out';
            stockText = 'Rupture';
        }
        
        return `
            <div class="seasonal-card">
                <div class="seasonal-icon">${fruit.icon}</div>
                <h3>${fruit.name}</h3>
                <p>${fruit.description}</p>
                <span class="stock-badge ${stockClass}">${stockText}</span>
            </div>
        `;
    }).join('');
}

// ===== AFFICHAGE DES PANIERS =====
function renderBaskets() {
    const container = document.getElementById('basketsGrid');
    
    container.innerHTML = DATA.baskets.map(basket => {
        const promo = DATA.promotions.find(p => p.basketId === basket.id);
        const hasPromo = promo && promo.discount > 0;
        const finalPrice = hasPromo ? basket.price * (1 - promo.discount / 100) : basket.price;
        
        let stockClass = 'available';
        let stockText = `${basket.stock} disponibles`;
        
        if (basket.stock < 10) {
            stockClass = 'limited';
            stockText = `Plus que ${basket.stock} !`;
        }
        if (basket.stock === 0) {
            stockClass = 'out';
            stockText = 'Rupture de stock';
        }
        
        return `
            <div class="basket-card ${basket.featured ? 'featured' : ''}">
                ${basket.featured ? '<div class="featured-badge">Populaire</div>' : ''}
                <div class="basket-icon">${basket.icon}</div>
                <h3>${basket.name}</h3>
                <p class="basket-subtitle">${basket.subtitle}</p>
                
                <div class="basket-price">
                    ${hasPromo ? `<span class="price-original">${basket.price}€</span>` : ''}
                    <span class="price-current ${hasPromo ? 'price-promo' : ''}">${finalPrice.toFixed(2)}€</span>
                    ${hasPromo ? `<div style="color: var(--orange); font-weight: 600;">-${promo.discount}% 🎉</div>` : ''}
                </div>
                
                <div class="basket-content">
                    <h4>Contenu du panier:</h4>
                    <ul>
                        ${basket.content.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="basket-stock">
                    <span class="stock-badge ${stockClass}">${stockText}</span>
                </div>
                
                <div class="basket-actions">
                    <div class="quantity-selector">
                        <button class="quantity-btn" onclick="changeQuantity('${basket.id}', -1)">-</button>
                        <span class="quantity-value" id="qty-${basket.id}">1</span>
                        <button class="quantity-btn" onclick="changeQuantity('${basket.id}', 1)">+</button>
                    </div>
                    <button class="btn-primary add-to-cart" onclick="addToCart('${basket.id}')" ${basket.stock === 0 ? 'disabled' : ''}>
                        ${basket.stock === 0 ? 'Indisponible' : 'Ajouter'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== GESTION DES QUANTITÉS =====
function changeQuantity(basketId, change) {
    const qtyElement = document.getElementById(`qty-${basketId}`);
    let currentQty = parseInt(qtyElement.textContent);
    const basket = DATA.baskets.find(b => b.id === basketId);
    
    currentQty += change;
    
    if (currentQty < 1) currentQty = 1;
    if (currentQty > basket.stock) currentQty = basket.stock;
    
    qtyElement.textContent = currentQty;
}

// ===== GESTION DU PANIER =====
function addToCart(basketId) {
    const basket = DATA.baskets.find(b => b.id === basketId);
    const qtyElement = document.getElementById(`qty-${basketId}`);
    const quantity = parseInt(qtyElement.textContent);
    
    if (basket.stock < quantity) {
        alert('Stock insuffisant !');
        return;
    }
    
    const existingItem = STATE.cart.find(item => item.id === basketId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        const promo = DATA.promotions.find(p => p.basketId === basket.id);
        const finalPrice = promo ? basket.price * (1 - promo.discount / 100) : basket.price;
        
        STATE.cart.push({
            id: basket.id,
            name: basket.name,
            icon: basket.icon,
            price: finalPrice,
            originalPrice: basket.price,
            quantity: quantity
        });
    }
    
    qtyElement.textContent = '1';
    
    updateCartDisplay();
    localStorage.setItem('cart', JSON.stringify(STATE.cart));
    
    const cartButton = document.querySelector('.cart-button');
    cartButton.classList.add('pulse');
    setTimeout(() => cartButton.classList.remove('pulse'), 600);
}

function removeFromCart(basketId) {
    STATE.cart = STATE.cart.filter(item => item.id !== basketId);
    updateCartDisplay();
    localStorage.setItem('cart', JSON.stringify(STATE.cart));
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const totalPrice = document.getElementById('totalPrice');
    
    const totalItems = STATE.cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    if (STATE.cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Votre panier est vide</p>';
        totalPrice.textContent = '0,00 €';
        return;
    }
    
    const total = STATE.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalPrice.textContent = `${total.toFixed(2)} €`;
    
    cartItems.innerHTML = STATE.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-icon">${item.icon}</div>
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p class="cart-item-price">${item.price.toFixed(2)}€ × ${item.quantity}</p>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">×</button>
        </div>
    `).join('');
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// ===== PAIEMENT =====
function checkout() {
    if (STATE.cart.length === 0) {
        alert('Votre panier est vide !');
        return;
    }
    
    toggleCart();
    openPaymentModal();
}

function openPaymentModal() {
    const modal = document.getElementById('paymentModal');
    const orderSummary = document.getElementById('orderSummary');
    const finalTotal = document.getElementById('finalTotal');
    
    const total = STATE.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    orderSummary.innerHTML = STATE.cart.map(item => `
        <div class="summary-item">
            <span>${item.name} × ${item.quantity}</span>
            <span>${(item.price * item.quantity).toFixed(2)}€</span>
        </div>
    `).join('');
    
    finalTotal.textContent = `${total.toFixed(2)} €`;
    
    modal.classList.add('active');
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const paymentForm = document.getElementById('paymentForm');
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            processPayment();
        });
    }
});

async function processPayment() {
    const orderId = `CMD-${Date.now()}`;
    const order = {
        id: orderId,
        date: new Date().toLocaleString('fr-FR'),
        items: [...STATE.cart],
        total: STATE.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };
    
    DATA.orders.push(order);
    
    // Réduire les stocks
    STATE.cart.forEach(cartItem => {
        const basket = DATA.baskets.find(b => b.id === cartItem.id);
        if (basket) {
            basket.stock -= cartItem.quantity;
        }
    });
    
    // Sauvegarder dans Firebase
    if (STATE.firebaseReady && window.firebaseDatabase) {
        await saveToFirebase(window.firebaseDatabase, 'baskets', DATA.baskets);
        await saveToFirebase(window.firebaseDatabase, 'orders', DATA.orders);
    } else {
        saveToLocalStorage();
    }
    
    STATE.cart = [];
    
    renderBaskets();
    updateCartDisplay();
    closePaymentModal();
    localStorage.setItem('cart', JSON.stringify(STATE.cart));
    
    alert(`✅ Commande validée !\n\nNuméro de commande : ${orderId}\nVous recevrez un email de confirmation.\n\nMerci de votre confiance !`);
}

// ===== ADMINISTRATION =====
function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        STATE.adminLoggedIn = true;
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        renderAdminPanel();
    } else {
        alert('Mot de passe incorrect !');
    }
}

function adminLogout() {
    STATE.adminLoggedIn = false;
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

function renderAdminPanel() {
    renderStockManagement();
    renderPromotionsManagement();
    renderOrdersList();
}

function renderStockManagement() {
    const container = document.getElementById('stockManagement');
    
    container.innerHTML = DATA.baskets.map(basket => `
        <div class="stock-item">
            <div>
                <strong>${basket.name}</strong>
                <p style="color: var(--text-gray); font-size: 0.9rem;">Stock actuel: ${basket.stock}</p>
            </div>
            <div class="stock-controls">
                <input type="number" class="stock-input" id="stock-${basket.id}" value="${basket.stock}" min="0">
                <button class="btn-secondary" onclick="updateStock('${basket.id}')">Mettre à jour</button>
            </div>
        </div>
    `).join('');
}

async function updateStock(basketId) {
    const input = document.getElementById(`stock-${basketId}`);
    const newStock = parseInt(input.value);
    
    const basket = DATA.baskets.find(b => b.id === basketId);
    if (basket) {
        basket.stock = newStock;
        
        // Sauvegarder dans Firebase
        if (STATE.firebaseReady && window.firebaseDatabase) {
            await saveToFirebase(window.firebaseDatabase, 'baskets', DATA.baskets);
        } else {
            saveToLocalStorage();
        }
        
        renderBaskets();
        renderStockManagement();
        alert('Stock mis à jour !');
    }
}

function renderPromotionsManagement() {
    const promoList = document.getElementById('promoList');
    
    if (DATA.promotions.length === 0) {
        promoList.innerHTML = '<p class="text-muted">Aucune promotion active</p>';
        return;
    }
    
    promoList.innerHTML = DATA.promotions.map((promo, index) => {
        const basket = DATA.baskets.find(b => b.id === promo.basketId);
        return `
            <div class="promo-item">
                <div>
                    <strong>${basket.name}</strong>
                    <span style="color: var(--orange); margin-left: 1rem;">-${promo.discount}%</span>
                </div>
                <button class="btn-secondary" onclick="removePromotion(${index})">Supprimer</button>
            </div>
        `;
    }).join('');
}

async function addPromotion() {
    const basketId = document.getElementById('promoBasket').value;
    const discount = parseInt(document.getElementById('promoDiscount').value);
    
    if (!discount || discount <= 0 || discount > 100) {
        alert('Veuillez entrer une réduction valide (1-100%)');
        return;
    }
    
    DATA.promotions = DATA.promotions.filter(p => p.basketId !== basketId);
    DATA.promotions.push({ basketId, discount });
    
    // Sauvegarder dans Firebase
    if (STATE.firebaseReady && window.firebaseDatabase) {
        await saveToFirebase(window.firebaseDatabase, 'promotions', DATA.promotions);
    } else {
        saveToLocalStorage();
    }
    
    renderBaskets();
    renderPromotionsManagement();
    
    document.getElementById('promoDiscount').value = '';
}

async function removePromotion(index) {
    DATA.promotions.splice(index, 1);
    
    // Sauvegarder dans Firebase
    if (STATE.firebaseReady && window.firebaseDatabase) {
        await saveToFirebase(window.firebaseDatabase, 'promotions', DATA.promotions);
    } else {
        saveToLocalStorage();
    }
    
    renderBaskets();
    renderPromotionsManagement();
}

function renderOrdersList() {
    const container = document.getElementById('ordersList');
    
    if (DATA.orders.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucune commande pour le moment</p>';
        return;
    }
    
    container.innerHTML = DATA.orders.slice(-10).reverse().map(order => `
        <div class="order-item">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>${order.id}</strong>
                <span style="color: var(--text-gray);">${order.date}</span>
            </div>
            <div style="color: var(--text-gray);">
                ${order.items.map(item => `${item.name} × ${item.quantity}`).join(', ')}
            </div>
            <div style="margin-top: 0.5rem; font-weight: 600; color: var(--primary-green);">
                Total: ${order.total.toFixed(2)}€
            </div>
        </div>
    `).join('');
}

// ===== ANIMATIONS ET EFFETS =====
document.addEventListener('mousemove', (e) => {
    const vegetables = document.querySelectorAll('.floating-veg');
    
    vegetables.forEach((veg, index) => {
        const speed = (index + 1) * 0.05;
        const x = (window.innerWidth - e.pageX * speed) / 100;
        const y = (window.innerHeight - e.pageY * speed) / 100;
        
        veg.style.transform = `translate(${x}px, ${y}px)`;
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const cartSidebar = document.getElementById('cartSidebar');
        if (cartSidebar.classList.contains('open')) {
            toggleCart();
        }
        
        const modal = document.getElementById('paymentModal');
        if (modal.classList.contains('active')) {
            closePaymentModal();
        }
    }
});

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.seasonal-card, .basket-card, .benefit-card');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s, transform 0.6s';
        observer.observe(el);
    });
});

