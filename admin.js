const firebaseConfig = {
    apiKey: "AIzaSyCFeVRcxq_YOc2EuNcMZExtZvyQn919wog",
    authDomain: "sitecommercejardin-b348e.firebaseapp.com",
    databaseURL: "https://sitecommercejardin-b348e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sitecommercejardin-b348e",
    storageBucket: "sitecommercejardin-b348e.firebasestorage.app",
    messagingSenderId: "468169255056",
    appId: "1:468169255056:web:33ba4593dac84b41c6d015"
};

let app, db, auth, storage, currentAdmin = null;
const DATA = { products: [], baskets: [], promotions: [], orders: [], users: [], settings: {}, carouselImages: [], videoUrl: '' };

// Init Firebase
setTimeout(async () => {
    if (!window.firebase) return console.error('Firebase non chargé');
    
    app = window.firebase.initializeApp(firebaseConfig);
    db = window.firebase.getDatabase(app);
    auth = window.firebase.getAuth(app);
    storage = window.firebase.getStorage(app);
    
    window.firebase.onAuthStateChanged(auth, async (user) => {
        if (user) {
            const isAdmin = await checkAdmin(user.uid);
            if (isAdmin) {
                currentAdmin = user;
                showDashboard();
                await loadAllAdminData();
            } else {
                alert('Accès refusé : vous n\'êtes pas administrateur');
                await window.firebase.signOut(auth);
            }
        }
    });
}, 200);

async function checkAdmin(uid) {
    try {
        const snapshot = await window.firebase.get(window.firebase.ref(db, `paniers-du-jardin/admins/${uid}`));
        return snapshot.exists() && snapshot.val() === true;
    } catch (err) {
        return false;
    }
}

// Connexion Admin
async function adminLogin(event) {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        await window.firebase.signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('Erreur de connexion : ' + error.message);
    }
}

function showDashboard() {
    document.getElementById('adminLoginPage').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
}

async function adminLogout() {
    await window.firebase.signOut(auth);
    document.getElementById('adminLoginPage').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

// Chargement des données
async function loadAllAdminData() {
    try {
        const snapshot = await window.firebase.get(window.firebase.ref(db, 'paniers-du-jardin'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            DATA.products = data.products ? Object.entries(data.products).map(([id, p]) => ({id, ...p})) : [];
            DATA.baskets = data.baskets || [];
            DATA.promotions = data.promotions || [];
            DATA.orders = data.orders ? Object.values(data.orders) : [];
            DATA.users = data.users ? Object.entries(data.users).map(([id, u]) => ({id, ...u})) : [];
            DATA.settings = data.settings || {};
            DATA.carouselImages = data.media?.carouselImages || [];
            DATA.videoUrl = data.media?.videoUrl || '';
        }
        renderDashboard();
        renderProducts();
        renderBaskets();
        renderOrders();
        renderUsers();
        renderMedia();
        renderSettings();
    } catch (err) {
        console.error('Erreur chargement:', err);
    }
}

// Navigation
function showAdminSection(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`admin-${section}`).classList.add('active');
    
    document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const titles = {
        dashboard: 'Tableau de bord',
        products: 'Gestion des Produits',
        baskets: 'Gestion des Paniers',
        orders: 'Commandes',
        users: 'Utilisateurs',
        media: 'Gestion des Médias',
        settings: 'Paramètres'
    };
    document.getElementById('adminSectionTitle').textContent = titles[section] || section;
}

// ===== DASHBOARD =====
function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = DATA.orders.filter(o => o.date?.startsWith(today));
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    document.getElementById('todayOrders').textContent = todayOrders.length;
    document.getElementById('todayRevenue').textContent = todayRevenue.toFixed(2) + '€';
    document.getElementById('totalProducts').textContent = DATA.products.length;
    document.getElementById('totalUsers').textContent = DATA.users.length;
    
    const dashboardOrders = document.getElementById('dashboardOrders');
    if (todayOrders.length === 0) {
        dashboardOrders.innerHTML = '<p style="text-align:center;color:#999;">Aucune commande aujourd\'hui</p>';
    } else {
        dashboardOrders.innerHTML = todayOrders.slice(0, 5).map(order => `
            <div style="padding:1rem;border-bottom:1px solid #ddd;cursor:pointer;transition:0.3s;" 
                 onclick="showOrderDetailsFromDashboard('${order.id}')"
                 onmouseover="this.style.background='#f5f5f5'"
                 onmouseout="this.style.background='white'">
                <strong>${order.id}</strong> - ${order.total?.toFixed(2)}€
                <div style="font-size:0.9rem;color:#666;">${order.items?.length || 0} article(s)</div>
            </div>
        `).join('');
    }
}

function showOrderDetailsFromDashboard(orderId) {
    showAdminSection('orders');
    setTimeout(() => showOrderDetails(orderId), 300);
}

// ===== PRODUITS =====
function renderProducts() {
    const container = document.getElementById('productsList');
    
    if (DATA.products.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:3rem;">Aucun produit. Cliquez sur "Ajouter un produit"</p>';
        return;
    }
    
    container.innerHTML = DATA.products.map(product => `
        <div class="product-card-admin">
            <img src="${product.imageUrl || 'https://via.placeholder.com/200'}" class="product-img">
            <div class="product-info">
                <h4>${product.name}</h4>
                <div class="product-meta">
                    <span class="badge">Stock: ${product.inStock ? 'Illimité' : product.stock}</span>
                    <span class="price-tag">${product.price}€/kg</span>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-secondary btn-sm" onclick="editProduct('${product.id}')">✏️ Modifier</button>
                <button class="btn-danger btn-sm" onclick="deleteProduct('${product.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    form.reset();
    
    if (productId) {
        const product = DATA.products.find(p => p.id === productId);
        if (product) {
            document.getElementById('productModalTitle').textContent = 'Modifier le Produit';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productInStock').checked = product.inStock || false;
            document.getElementById('productImageUrl').value = product.imageUrl || '';
            
            if (product.imageUrl) {
                document.getElementById('productImagePreview').innerHTML = `<img src="${product.imageUrl}" style="width:100%;height:200px;object-fit:cover;border-radius:10px;">`;
            }
            
            document.querySelectorAll('.months-checkboxes input').forEach(cb => {
                cb.checked = product.availableMonths?.includes(parseInt(cb.value)) || false;
            });
        }
    } else {
        document.getElementById('productModalTitle').textContent = 'Ajouter un Produit';
        document.getElementById('productImagePreview').innerHTML = '<span class="upload-placeholder">Aperçu de l\'image</span>';
    }
    
    modal.classList.add('active');
}

// Ajouter un événement pour prévisualiser l'image quand on colle une URL
document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('productImageUrl');
    if (urlInput) {
        urlInput.addEventListener('input', (e) => {
            const url = e.target.value;
            if (url) {
                document.getElementById('productImagePreview').innerHTML = `<img src="${url}" style="width:100%;height:200px;object-fit:cover;border-radius:10px;" onerror="this.parentElement.innerHTML='<span class=\\'upload-placeholder\\'>Image invalide</span>'">`;
            }
        });
    }
});

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function changeProductStock(change) {
    const input = document.getElementById('productStock');
    let value = parseInt(input.value) + change;
    if (value < 0) value = 0;
    input.value = value;
}

function toggleInStock() {
    const checkbox = document.getElementById('productInStock');
    const stockInput = document.getElementById('productStock');
    stockInput.disabled = checkbox.checked;
    if (checkbox.checked) stockInput.value = 0;
}

async function saveProduct(event) {
    event.preventDefault();
    
    const productId = document.getElementById('productId').value || `prod_${Date.now()}`;
    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        inStock: document.getElementById('productInStock').checked,
        availableMonths: Array.from(document.querySelectorAll('.months-checkboxes input:checked')).map(cb => parseInt(cb.value)),
        imageUrl: document.getElementById('productImageUrl').value || 'https://via.placeholder.com/200'
    };
    
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/products/${productId}`), productData);
        await loadAllAdminData();
        closeProductModal();
        alert('✅ Produit enregistré !');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

function editProduct(productId) {
    openProductModal(productId);
}

async function deleteProduct(productId) {
    if (!confirm('Supprimer ce produit ?')) return;
    
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/products/${productId}`), null);
        await loadAllAdminData();
        alert('✅ Produit supprimé');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

// ===== PANIERS =====
function renderBaskets() {
    const container = document.getElementById('basketsAdminList');
    const baskets = [{id:'petit',name:'Panier Petit',price:15,stock:25},{id:'moyen',name:'Panier Moyen',price:25,stock:30},{id:'grand',name:'Panier Grand',price:40,stock:15}];
    
    container.innerHTML = baskets.map(basket => `
        <div style="background:white;padding:1.5rem;border-radius:15px;margin-bottom:1rem;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <h4>${basket.name}</h4>
            <p>Prix: ${basket.price}€ | Stock: ${basket.stock}</p>
            <div style="display: grid; gap:0.5rem;margin-top:1rem;align-items:center;">
                <div style="display:flex;gap:0.5rem;margin-top:1rem;align-items:center;">
                    <label>Stock:</label>
                    <button onclick="changeBasketStock('${basket.id}', -5)" style="padding:0.5rem 0.7rem; width: 34px;;border:none;background:#ddd;border-radius:20px;cursor:pointer;">-</button>
                    <input class="input-number" type="number" id="basket-stock-${basket.id}" value="${basket.stock}"">
                    <button onclick="changeBasketStock('${basket.id}', 5)" style="padding:0.5rem 0.7rem; width: 34px; border:none;background:#ddd;border-radius:20px;cursor:pointer;">+</button>
                </div>
                <button onclick="saveBasketStock('${basket.id}')" class="btn-primary" style="padding:0.5rem 1.5rem;">Enregistrer</button>
            </div>
        </div>
    `).join('');
    
    renderPromotions();
}

function changeBasketStock(basketId, change) {
    const input = document.getElementById(`basket-stock-${basketId}`);
    let value = parseInt(input.value) + change;
    if (value < 0) value = 0;
    input.value = value;
}

async function saveBasketStock(basketId) {
    const newStock = parseInt(document.getElementById(`basket-stock-${basketId}`).value);
    
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/baskets/${basketId}/stock`), newStock);
        alert('✅ Stock mis à jour');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

function renderPromotions() {
    const container = document.getElementById('promoList');
    
    if (DATA.promotions.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;">Aucune promotion active</p>';
        return;
    }
    
    container.innerHTML = DATA.promotions.map((promo, index) => `
        <div style="display:flex;justify-content:space-between;padding:1rem;background:#fff3e0;border-radius:10px;margin-top:0.5rem;">
            <div>
                <strong>Panier ${promo.basketId}</strong>
                <span style="color:#ff8f3c;margin-left:1rem;font-weight:600;">-${promo.discount}%</span>
            </div>
            <button class="btn-secondary" onclick="removePromotion(${index})" style="background:#e57373;color:white;border:none;">Supprimer</button>
        </div>
    `).join('');
}

async function addPromotion() {
    const basketId = document.getElementById('promoBasket').value;
    const discount = parseInt(document.getElementById('promoDiscount').value);
    
    if (!discount || discount <= 0 || discount > 100) {
        alert('Veuillez entrer une réduction valide (1-100%)');
        return;
    }
    
    const newPromotions = DATA.promotions.filter(p => p.basketId !== basketId);
    newPromotions.push({ basketId, discount });
    
    try {
        await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/promotions'), newPromotions);
        DATA.promotions = newPromotions;
        renderPromotions();
        document.getElementById('promoDiscount').value = '';
        alert('✅ Promotion ajoutée');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

async function removePromotion(index) {
    DATA.promotions.splice(index, 1);
    
    try {
        await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/promotions'), DATA.promotions);
        renderPromotions();
        alert('✅ Promotion supprimée');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

// ===== COMMANDES =====
function renderOrders() {
    const container = document.getElementById('ordersTable');
    
    if (DATA.orders.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:3rem;">Aucune commande</p>';
        return;
    }
    
    container.innerHTML = `
        <table style="width:100%;background:white;border-radius:15px;overflow:hidden;">
            <thead style="background:#4a7c4e;color:white;">
                <tr>
                    <th style="padding:0.5rem 1rem;text-align:left;">Commande</th>
                    <th style="padding:0.5rem 1rem;text-align:left;">Date</th>
                    <th style="padding:0.5rem 1rem;text-align:left;">Articles</th>
                    <th style="padding:0.5rem 1rem;text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${DATA.orders.slice(-20).reverse().map(order => `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:1rem;">${order.id}</td>
                        <td style="padding:1rem;">${new Date(order.date).toLocaleDateString('fr-FR')}</td>
                        <td style="padding:1rem;">${order.items?.length || 0} article(s)</td>
                        <td style="padding:1rem;text-align:right;font-weight:600;">${order.total?.toFixed(2)}€</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filterOrders(status) {
    // Implémentation future pour filtrer par statut
    renderOrders();
}

// ===== UTILISATEURS =====
function renderUsers() {
    const container = document.getElementById('usersTable');
    
    if (DATA.users.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:3rem;">Aucun utilisateur inscrit</p>';
        return;
    }
    
    container.innerHTML = `
        <table style="width:100%;background:white;border-radius:15px;overflow:hidden;">
            <thead style="background:#4a7c4e;color:white;">
                <tr>
                    <th style="padding:1rem;text-align:left;">Nom</th>
                    <th style="padding:1rem;text-align:left;">Email</th>
                    <th style="padding:1rem;text-align:left;">Inscription</th>
                </tr>
            </thead>
            <tbody>
                ${DATA.users.map(user => `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:1rem;">${user.firstName} ${user.lastName}</td>
                        <td style="padding:1rem;">${user.email}</td>
                        <td style="padding:1rem;">${user.created ? new Date(user.created).toLocaleDateString('fr-FR') : 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ===== MÉDIAS avec URLs =====
function renderMedia() {
    renderCarouselImages();
    if (DATA.videoUrl) {
        document.getElementById('currentVideo').src = DATA.videoUrl;
        document.getElementById('videoUrl').value = DATA.videoUrl;
    }
}

function renderCarouselImages() {
    const container = document.getElementById('carouselImagesGrid');
    
    if (DATA.carouselImages.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:2rem;">Aucune image</p>';
        return;
    }
    
    container.innerHTML = DATA.carouselImages.map((img, index) => `
        <div style="position:relative;">
            <img src="${img}" style="width:100%;height:200px;object-fit:cover;border-radius:10px;">
            <button onclick="deleteCarouselImage(${index})" style="position:absolute;top:10px;right:10px;background:#e57373;color:white;border:none;padding:0.5rem;border-radius:50%;cursor:pointer;width:35px;height:35px;">×</button>
        </div>
    `).join('');
}

async function addCarouselImageUrl() {
    const url = document.getElementById('carouselImageUrl').value.trim();
    
    if (!url) {
        alert('Veuillez entrer une URL d\'image');
        return;
    }
    
    // Vérifier que c'est une URL valide
    try {
        new URL(url);
    } catch (err) {
        alert('URL invalide');
        return;
    }
    
    DATA.carouselImages.push(url);
    
    try {
        await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/media/carouselImages'), DATA.carouselImages);
        renderCarouselImages();
        document.getElementById('carouselImageUrl').value = '';
        alert('✅ Image ajoutée');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

async function deleteCarouselImage(index) {
    if (!confirm('Supprimer cette image ?')) return;
    
    DATA.carouselImages.splice(index, 1);
    
    try {
        await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/media/carouselImages'), DATA.carouselImages);
        renderCarouselImages();
        alert('✅ Image supprimée');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

async function saveVideoUrl() {
    const url = document.getElementById('videoUrl').value.trim();
    
    if (!url) {
        alert('Veuillez entrer une URL de vidéo');
        return;
    }
    
    // Vérifier que c'est une URL valide
    try {
        new URL(url);
    } catch (err) {
        alert('URL invalide');
        return;
    }
    
    try {
        await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/media/videoUrl'), url);
        DATA.videoUrl = url;
        document.getElementById('currentVideo').src = url;
        alert('✅ Vidéo enregistrée');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

// ===== PARAMÈTRES =====
function renderSettings() {
    document.getElementById('shopName').value = DATA.settings.shopName || 'Paniers du Jardin';
    document.getElementById('shopAddressInput').value = DATA.settings.address || '';
    document.getElementById('shopPhoneInput').value = DATA.settings.phone || '';
    document.getElementById('shopEmailInput').value = DATA.settings.email || '';
    document.getElementById('shopLat').value = DATA.settings.latitude || '';
    document.getElementById('shopLng').value = DATA.settings.longitude || '';
}

document.getElementById('settingsForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const settings = {
        shopName: document.getElementById('shopName').value,
        address: document.getElementById('shopAddressInput').value,
        phone: document.getElementById('shopPhoneInput').value,
        email: document.getElementById('shopEmailInput').value,
        latitude: document.getElementById('shopLat').value,
        longitude: document.getElementById('shopLng').value
    };
    
    try {
        await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/settings'), settings);
        DATA.settings = settings;
        alert('✅ Paramètres enregistrés');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
});

// ===== SYSTÈME OUVERTURE/FERMETURE BOUTIQUE =====
let shopStatus = { isOpen: true, reopenDay: null };

async function loadShopStatus() {
    try {
        const snapshot = await window.firebase.get(window.firebase.ref(db, 'paniers-du-jardin/settings/shopStatus'));
        if (snapshot.exists()) {
            shopStatus = snapshot.val();
        }
        renderShopStatusToggle();
    } catch (err) {
        console.error('Erreur chargement statut:', err);
    }
}

function renderShopStatusToggle() {
    const container = document.getElementById('shopStatusToggle');
    if (!container) return;
    
    container.innerHTML = `
        <div class="shop-status-card">
            <h3>Statut de la Boutique</h3>
            <div class="status-toggle">
                <label class="toggle-switch">
                    <input type="checkbox" ${shopStatus.isOpen ? 'checked' : ''} onchange="toggleShopStatus()">
                    <span class="toggle-slider"></span>
                </label>
                <span class="status-text">${shopStatus.isOpen ? 'Ouverte' : 'Fermée'}</span>
            </div>
            ${!shopStatus.isOpen ? `
                <div class="reopen-day-selector">
                    <label>Jour de réouverture :</label>
                    <select id="reopenDaySelect" class="input-field">
                        <option value="">Non défini</option>
                        <option value="1" ${shopStatus.reopenDay === 1 ? 'selected' : ''}>Lundi</option>
                        <option value="2" ${shopStatus.reopenDay === 2 ? 'selected' : ''}>Mardi</option>
                        <option value="3" ${shopStatus.reopenDay === 3 ? 'selected' : ''}>Mercredi</option>
                        <option value="4" ${shopStatus.reopenDay === 4 ? 'selected' : ''}>Jeudi</option>
                        <option value="5" ${shopStatus.reopenDay === 5 ? 'selected' : ''}>Vendredi</option>
                        <option value="6" ${shopStatus.reopenDay === 6 ? 'selected' : ''}>Samedi</option>
                        <option value="0" ${shopStatus.reopenDay === 0 ? 'selected' : ''}>Dimanche</option>
                    </select>
                    <button class="btn-primary" onclick="saveReopenDay()">Enregistrer</button>
                </div>
            ` : ''}
        </div>
    `;
}

async function toggleShopStatus() {
    shopStatus.isOpen = !shopStatus.isOpen;
    if (shopStatus.isOpen) {
        shopStatus.reopenDay = null;
    }
    
    try {
        await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/settings/shopStatus'), shopStatus);
        renderShopStatusToggle();
        alert(shopStatus.isOpen ? '✅ Boutique ouverte !' : '⚠️ Boutique fermée');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

async function saveReopenDay() {
    const day = document.getElementById('reopenDaySelect').value;
    shopStatus.reopenDay = day ? parseInt(day) : null;
    
    try {
        await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/settings/shopStatus'), shopStatus);
        renderShopStatusToggle();
        alert('✅ Jour de réouverture enregistré !');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

// ===== AMÉLIORATIONS COMMANDES =====
let selectedOrder = null;

function renderOrders() {
    const container = document.getElementById('ordersTable');
    
    if (DATA.orders.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:3rem;">Aucune commande</p>';
        return;
    }
    
    // Trier par date (plus récente en premier)
    const sortedOrders = [...DATA.orders].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = `
        <table style="width:100%;background:white;border-radius:15px;overflow:hidden;">
            <thead style="background:#4a7c4e;color:white;">
                <tr>
                    <th id="c-th-cmd" style="padding:1rem;text-align:left;">Commande</th>
                    <th id="c-th-date" style="padding:1rem;text-align:left;">Date</th>
                    <th id="c-th-articles" style="padding:1rem;text-align:left;">Articles</th>
                    <th id="c-th-total" style="padding:1rem;text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${sortedOrders.map(order => `
                    <tr style="border-bottom:1px solid #eee;cursor:pointer;" onclick="showOrderDetails('${order.id}')">
                        <td id="c-td-cmd" style="padding:1rem;">${order.id}</td>
                        <td id="c-td-date" style="padding:1rem;">${new Date(order.date).toLocaleString('fr-FR')}</td>
                        <td id="c-td-articles" style="padding:1rem;">${order.items?.length || 0} article(s)</td>
                        <td id="c-td-total" style="padding:1rem;text-align:right;font-weight:600;">${order.total?.toFixed(2)}€</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showOrderDetails(orderId) {
    const order = DATA.orders.find(o => o.id === orderId);
    if (!order) return;
    
    selectedOrder = order;
    const user = DATA.users.find(u => u.id === order.userId);
    
    const modal = document.getElementById('orderDetailsModal') || createOrderDetailsModal();
    document.getElementById('orderDetailsContent').innerHTML = `
        <h3>Commande ${order.id}</h3>
        <p><strong>Date:</strong> ${new Date(order.date).toLocaleString('fr-FR')}</p>
        <p><strong>Total:</strong> ${order.total?.toFixed(2)}€</p>
        
        <h4 style="margin-top:1.5rem;">Articles:</h4>
        <div style="background:#f5f5f5;padding:1rem;border-radius:10px;">
            ${order.items.map(item => `
                <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #ddd;">
                    <span>${item.icon} ${item.name}</span>
                    <span>${item.quantity} × ${item.price}€ = ${(item.quantity * item.price).toFixed(2)}€</span>
                </div>
            `).join('')}
        </div>
        
        <h4 style="margin-top:1.5rem;">Client:</h4>
        <div style="background:#e8f5e9;padding:1rem;border-radius:10px;">
            ${user ? `
                <p><strong>${user.firstName} ${user.lastName}</strong></p>
                <p>📧 ${user.email}</p>
                <button class="btn-primary" style="margin-top:0.5rem;" onclick="goToUserProfile('${user.id}')">Voir le profil</button>
            ` : '<p>Utilisateur non trouvé</p>'}
        </div>
    `;
    
    modal.classList.add('active');
}

function createOrderDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'orderDetailsModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Détails de la commande</h3>
                <button class="close-modal" onclick="closeOrderDetails()">✕</button>
            </div>
            <div class="modal-body" id="orderDetailsContent"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function closeOrderDetails() {
    document.getElementById('orderDetailsModal')?.classList.remove('active');
}

function goToUserProfile(userId) {
    closeOrderDetails();
    showAdminSection('users');
    setTimeout(() => showUserDetails(userId), 300);
}

// ===== AMÉLIORATIONS UTILISATEURS =====
function renderUsers() {
    const container = document.getElementById('usersTable');
    
    if (DATA.users.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:3rem;">Aucun utilisateur inscrit</p>';
        return;
    }
    
    container.innerHTML = `
        <table style="width:100%;background:white;border-radius:15px;overflow:hidden;">
            <thead style="background:#4a7c4e;color:white;">
                <tr>
                    <th id="u-th-nom" style="padding:0.5rem 1rem;text-align:left;">Nom</th>
                    <th id="u-th-email" style="padding:0.5rem 1rem;text-align:left;">Email</th>
                    <th id="u-th-tel" style="padding:0.5rem 1rem;text-align:left;">Téléphone</th>
                    <th id="u-th-inscription" style="padding:0.5rem 1rem;text-align:left;">Inscription</th>
                    <th id="u-th-commande" style="padding:0.5rem 1rem;text-align:center;">Commandes</th>
                    <th id="u-th-statut" style="padding:0.5rem 1rem;text-align:center;">Statut</th>
                </tr>
            </thead>
            <tbody>
                ${DATA.users.map(user => {
                    const userOrders = DATA.orders.filter(o => o.userId === user.id);
                    const isAdmin = adminsList.includes(user.id);
                    return `
                        <tr style="border-bottom:1px solid #eee;cursor:pointer;" onclick="showUserDetails('${user.id}')">
                            <td id="u-td-nom" style="padding:1rem;">${user.firstName} ${user.lastName}</td>
                            <td id="u-td-email" style="padding:1rem;">${user.email}</td>
                            <td id="u-td-tel" style="padding:1rem;">${user.phone || 'Non renseigné'}</td>
                            <td id="u-td-inscription" style="padding:1rem;">${user.created ? new Date(user.created).toLocaleDateString('fr-FR') : 'N/A'}</td>
                            <td id="u-td-commande" style="padding:1rem;text-align:center;font-weight:600;">${userOrders.length}</td>
                            <td id="u-td-statut" style="padding:1rem;text-align:center;">
                                ${isAdmin ? '<span class="admin-badge">👑 Admin</span>' : '<span style="color:#999;">Client</span>'}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function showUserDetails(userId) {
    const user = DATA.users.find(u => u.id === userId);
    if (!user) return;
    
    const userOrders = DATA.orders.filter(o => o.userId === user.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const modal = document.getElementById('userDetailsModal') || createUserDetailsModal();
    document.getElementById('userDetailsContent').innerHTML = `
        <h3>${user.firstName} ${user.lastName}</h3>
        <p>📧 ${user.email}</p>
        <p><strong>Inscription:</strong> ${user.created ? new Date(user.created).toLocaleDateString('fr-FR') : 'N/A'}</p>
        <p><strong>Nombre de commandes:</strong> ${userOrders.length}</p>
        
        <h4 style="margin-top:2rem;">Historique des commandes:</h4>
        ${userOrders.length === 0 ? '<p style="color:#999;">Aucune commande</p>' : `
            <div style="max-height:400px;overflow-y:auto;">
                ${userOrders.map(order => `
                    <div style="background:#f5f5f5;padding:1rem;border-radius:10px;margin:0.5rem 0;cursor:pointer;" onclick="showOrderDetails('${order.id}')">
                        <div style="display:flex;justify-content:space-between;">
                            <strong>${order.id}</strong>
                            <span>${new Date(order.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div style="color:#666;font-size:0.9rem;margin-top:0.5rem;">
                            ${order.items.length} article(s) - ${order.total?.toFixed(2)}€
                        </div>
                    </div>
                `).join('')}
            </div>
        `}
    `;
    
    modal.classList.add('active');
}

function createUserDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'userDetailsModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Profil utilisateur</h3>
                <button class="close-modal" onclick="closeUserDetails()">✕</button>
            </div>
            <div class="modal-body" id="userDetailsContent"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function closeUserDetails() {
    document.getElementById('userDetailsModal')?.classList.remove('active');
}

// Initialiser le statut boutique au chargement
setTimeout(() => {
    if (STATE.firebaseReady) loadShopStatus();
}, 1000);

// ===== GESTION DES ADMINISTRATEURS =====
let adminsList = [];

async function loadAdminsList() {
    try {
        const snapshot = await window.firebase.get(window.firebase.ref(db, 'paniers-du-jardin/admins'));
        if (snapshot.exists()) {
            const admins = snapshot.val();
            adminsList = Object.keys(admins).filter(uid => admins[uid] === true);
        }
        renderAdminsList();
    } catch (err) {
        console.error('Erreur chargement admins:', err);
    }
}

async function renderAdminsList() {
    const container = document.getElementById('adminsList');
    if (!container) return;
    
    if (adminsList.length === 0) {
        container.innerHTML = '<p style="color:#999;">Aucun administrateur</p>';
        return;
    }
    
    let html = '';
    for (const uid of adminsList) {
        const user = DATA.users.find(u => u.id === uid);
        html += `
            <div class="admin-item">
                <div>
                    <strong>${user ? `${user.firstName} ${user.lastName}` : 'Utilisateur inconnu'}</strong>
                    <br><small>${user ? user.email : uid}</small>
                </div>
                ${uid !== currentAdmin.uid ? `
                    <button class="btn-secondary" style="background:#e57373;color:white;border:none;" onclick="removeAdmin('${uid}')">Retirer</button>
                ` : '<span style="color:#4a7c4e;font-weight:600;">● Vous</span>'}
            </div>
        `;
    }
    
    container.innerHTML = html;
}

async function addAdmin() {
    const uid = document.getElementById('newAdminUid').value.trim();
    
    if (!uid) {
        alert('⚠️ Veuillez entrer un UID');
        return;
    }
    
    // Vérifier si l'utilisateur existe
    const userSnapshot = await window.firebase.get(window.firebase.ref(db, `paniers-du-jardin/users/${uid}`));
    if (!userSnapshot.exists()) {
        alert('❌ Cet utilisateur n\'existe pas');
        return;
    }
    
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/admins/${uid}`), true);
        adminsList.push(uid);
        renderAdminsList();
        document.getElementById('newAdminUid').value = '';
        alert('✅ Administrateur ajouté !');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

async function removeAdmin(uid) {
    if (!confirm('Retirer cet administrateur ?')) return;
    
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/admins/${uid}`), null);
        adminsList = adminsList.filter(id => id !== uid);
        renderAdminsList();
        alert('✅ Administrateur retiré');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

// Charger les admins au démarrage
setTimeout(() => {
    if (STATE.firebaseReady) loadAdminsList();
}, 1500);

// ==== GESTION STATUT COMMANDES ====
async function toggleOrderStatus(orderId) {
    const order = DATA.orders.find(o => o.id === orderId);
    if (!order) return;
    
    order.processed = !order.processed;
    
    try {
        await window.firebase.set(
            window.firebase.ref(db, `paniers-du-jardin/orders/${orderId}/processed`),
            order.processed
        );
        renderOrders();
        if (document.getElementById('orderDetailsModal')?.classList.contains('active')) {
            showOrderDetails(orderId);
        }
        alert(order.processed ? '✅ Commande marquée comme traitée' : '⚠️ Commande marquée comme non traitée');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

// ==== FILTRES COMMANDES ====
let orderFilters = { sortBy: 'date', sortOrder: 'desc' };

function applySortOrders(criteria) {
    orderFilters.sortBy = criteria;
    renderOrders();
}

function toggleSortOrder() {
    orderFilters.sortOrder = orderFilters.sortOrder === 'desc' ? 'asc' : 'desc';
    renderOrders();
}

// ==== FILTRES UTILISATEURS ====
let userFilters = { sortBy: 'name', sortOrder: 'asc' };

function applySortUsers(criteria) {
    userFilters.sortBy = criteria;
    renderUsers();
}

function toggleUserSortOrder() {
    userFilters.sortOrder = userFilters.sortOrder === 'desc' ? 'asc' : 'desc';
    renderUsers();
}

// ==== MODIFICATION PRIX PANIERS ====
async function updateBasketPrice(basketId) {
    const newPrice = parseFloat(prompt('Nouveau prix pour ce panier:'));
    if (isNaN(newPrice) || newPrice < 0) {
        alert('Prix invalide');
        return;
    }
    
    try {
        await window.firebase.set(
            window.firebase.ref(db, `paniers-du-jardin/baskets/${basketId}/price`),
            newPrice
        );
        await loadAllAdminData();
        alert('✅ Prix mis à jour !');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}
