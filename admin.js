const firebaseConfig = {
    apiKey: "AIzaSyCFeVRcxq_YOc2EuNcMZExtZvyQn919wog",
    authDomain: "sitecommercejardin-b348e.firebaseapp.com",
    databaseURL: "https://sitecommercejardin-b348e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sitecommercejardin-b348e",
    storageBucket: "sitecommercejardin-b348e.firebasestorage.app",
    messagingSenderId: "468169255056",
    appId: "1:468169255056:web:33ba4593dac84b41c6d015"
    
};

// Variables de tri
let usersSortField = 'created';
let usersSortOrder = 'desc';
let ordersSortField = 'date';
let ordersSortOrder = 'desc';

let app, db, auth, storage, currentAdmin = null;
const DATA = { products: [], baskets: [], promotions: [], orders: [], users: [], settings: {}, carouselImages: [], videoUrl: '' };

// Init Firebase (Logique identique à script.js)
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
                await loadAdminsList(); // Charger la liste des admins
                await loadShopStatus(); // Charger le statut de la boutique
            } else {
                alert('Accès refusé : vous n\'êtes pas administrateur');
                await window.firebase.signOut(auth);
            }
        }
    });
}, 200);






// Mot de passe admin
const ADMIN_PASSWORD = 'Admin123';
let isAdminLoggedIn = false;

// Init Firebase
setTimeout(async () => {
    if (!window.firebase) return console.error('Firebase non chargé');
    
    window.firebaseApp = window.firebase.initializeApp(firebaseConfig);
    db = window.firebase.getDatabase(window.firebaseApp);
    
    // Vérifier si déjà connecté (session storage)
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        isAdminLoggedIn = true;
        showDashboard();
        await loadAllAdminData();
        await loadShopStatus();
    }
}, 200);

// Connexion Admin
function adminLogin(event) {
    event.preventDefault();
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        sessionStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
        loadAllAdminData();
        loadShopStatus();
    } else {
        alert('Mot de passe incorrect');
    }
}

function showDashboard() {
    document.getElementById('adminLoginPage').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
}

function adminLogout() {
    isAdminLoggedIn = false;
    sessionStorage.removeItem('adminLoggedIn');
    document.getElementById('adminLoginPage').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}






// Chargement des données (Logique synchronisée avec script.js)
async function loadAllAdminData() {
    try {
        const snapshot = await window.firebase.get(window.firebase.ref(db, 'paniers-du-jardin'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            DATA.products = data.products ? Object.entries(data.products).map(([id, p]) => ({id, ...p})) : [];
            
            // Logique de paniers identique à script.js
            if (data.baskets && typeof data.baskets === 'object') {
                DATA.baskets = [
                    {id: 'petit', name: 'Panier Petit', price: data.baskets.petit?.price || 0, stock: data.baskets.petit?.stock || 0},
                    {id: 'moyen', name: 'Panier Moyen', price: data.baskets.moyen?.price || 0, stock: data.baskets.moyen?.stock || 0},
                    {id: 'grand', name: 'Panier Grand', price: data.baskets.grand?.price || 0, stock: data.baskets.grand?.stock || 0}
                ];
            } else {
                DATA.baskets = [
                    {id: 'petit', name: 'Panier Petit', price: 0, stock: 0},
                    {id: 'moyen', name: 'Panier Moyen', price: 0, stock: 0},
                    {id: 'grand', name: 'Panier Grand', price: 0, stock: 0}
                ];
            }

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
        container.innerHTML = '<p style="text-align:center;color:#999;padding:3rem;">Aucun produit.</p>';
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
                <button class="btn-secondary" onclick="editProduct('${product.id}')">✏️ Modifier</button>
                <button class="btn-danger" onclick="deleteProduct('${product.id}')">🗑️</button>
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
    }
    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
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


// Variable pour suivre quel panier est en mode édition
let editingBasketId = null;

function renderBaskets() {
    const container = document.getElementById('basketsAdminList');
    if (!container) return;

    container.innerHTML = DATA.baskets.map(basket => {
        const isEditing = editingBasketId === basket.id;
        
        return `
            <div style="background:white;padding:1.5rem;border-radius:15px;margin-bottom:1rem;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <h4 style="margin:0;">${basket.name}</h4>
                    ${!isEditing ? `
                        <button onclick="toggleBasketEdit('${basket.id}')" class="btn-secondary" style="padding:0.5rem 1rem;font-size:0.9rem;">
                            ✏️ Modifier
                        </button>
                    ` : ''}
                </div>
                
                <p style="margin:0.5rem 0;color:#666;">Prix: <strong>${basket.price}€</strong> | Stock: <strong>${basket.stock}</strong></p>
                
                ${isEditing ? `
                    <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #eee;">
                        <div style="display:flex;gap:0.5rem;margin-bottom:1rem;align-items:center;">
                            <label style="width:80px;">Stock</label>
                            <button class="qty-btn" onclick="changeBasketField('${basket.id}', 'stock', -1)">-</button>
                            <input class="input-number" type="number" id="basket-stock-${basket.id}" value="${basket.stock}">
                            <button class="qty-btn" onclick="changeBasketField('${basket.id}', 'stock', 1)">+</button>
                        </div>

                        <div style="display:flex;gap:0.5rem;margin-bottom:1rem;align-items:center;">
                            <label style="width:80px;">Prix (€)</label>
                            <button class="qty-btn" onclick="changeBasketField('${basket.id}', 'price', -1)">-</button>
                            <input class="input-number" type="number" id="basket-price-${basket.id}" value="${basket.price}" step="0.5">
                            <button class="qty-btn" onclick="changeBasketField('${basket.id}', 'price', 1)">+</button>
                        </div>
                        
                        <div style="display:flex;gap:0.5rem;margin-top:1rem;">
                            <button onclick="cancelBasketEdit()" class="btn-secondary" style="flex:1;">Annuler</button>
                            <button onclick="saveBasketData('${basket.id}')" class="btn-primary" style="flex:1;">Enregistrer</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function toggleBasketEdit(basketId) {
    editingBasketId = basketId;
    renderBaskets();
}

function cancelBasketEdit() {
    editingBasketId = null;
    renderBaskets();
}


function changeBasketField(id, field, change) {
    const input = document.getElementById(`basket-${field}-${id}`);
    let value = parseFloat(input.value) + change;
    if (value < 0) value = 0;
    input.value = value;
}

async function saveBasketData(basketId) {
    const newStock = parseInt(document.getElementById(`basket-stock-${basketId}`).value);
    const newPrice = parseFloat(document.getElementById(`basket-price-${basketId}`).value);
    
    try {
        // Mise à jour groupée dans Firebase
        const updates = {};
        updates[`paniers-du-jardin/baskets/${basketId}/stock`] = newStock;
        updates[`paniers-du-jardin/baskets/${basketId}/price`] = newPrice;
        
        await window.firebase.update(window.firebase.ref(db), updates);
        
        alert('✅ Panier mis à jour avec succès');
        await loadAllAdminData(); // Recharger pour actualiser l'UI
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

// ===== PROMOTIONS =====
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
    
    const pendingOrders = DATA.orders.filter(o => !o.treated);
    const treatedOrders = DATA.orders.filter(o => o.treated);

    const sortOrders = (orders) => {
        return [...orders].sort((a, b) => {
            let valA, valB;
            switch (ordersSortField) {
                case 'id':
                    valA = a.id;
                    valB = b.id;
                    break;
                case 'client':
                    const userA = DATA.users.find(u => u.id === a.userId);
                    const userB = DATA.users.find(u => u.id === b.userId);
                    valA = userA ? `${userA.firstName} ${userA.lastName}`.toLowerCase() : '';
                    valB = userB ? `${userB.firstName} ${userB.lastName}`.toLowerCase() : '';
                    break;
                case 'items':
                    valA = a.items?.length || 0;
                    valB = b.items?.length || 0;
                    break;
                case 'total':
                    valA = a.total || 0;
                    valB = b.total || 0;
                    break;
                case 'date':
                default:
                    valA = new Date(a.date);
                    valB = new Date(b.date);
                    break;
            }
            if (valA < valB) return ordersSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return ordersSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortIcon = (field) => {
        if (ordersSortField !== field) return '↕';
        return ordersSortOrder === 'asc' ? '↑' : '↓';
    };

    const sortBtnStyle = (field) => {
        const isActive = ordersSortField === field;
        return `background:${isActive ? 'rgba(255,255,255,0.3)' : 'transparent'};border:none;color:white;cursor:pointer;padding:0.25rem 0.5rem;border-radius:5px;font-size:0.85rem;margin-left:0.5rem;`;
    };

    const renderTable = (orders, emptyMessage) => {
        if (orders.length === 0) {
            return `<p style="text-align:center;color:#999;padding:2rem;">${emptyMessage}</p>`;
        }
        return `
            <table style="width:100%;background:white;border-radius:15px;overflow:hidden;">
                <thead style="background:#4a7c4e;color:white;">
                    <tr>
                        <th style="padding:1rem;text-align:left;">
                            Commande <button style="${sortBtnStyle('id')}" onclick="sortOrdersBy('id')">${sortIcon('id')}</button>
                        </th>
                        <th id="c-th-date" style="padding:1rem;text-align:left;">
                            Date <button style="${sortBtnStyle('date')}" onclick="sortOrdersBy('date')">${sortIcon('date')}</button>
                        </th>
                        <th id="c-th-name" style="padding:1rem;text-align:left;">
                            Client <button style="${sortBtnStyle('client')}" onclick="sortOrdersBy('client')">${sortIcon('client')}</button>
                        </th>
                        <th style="padding:1rem;text-align:left;">
                            Articles <button style="${sortBtnStyle('items')}" onclick="sortOrdersBy('items')">${sortIcon('items')}</button>
                        </th>
                        <th style="padding:1rem;text-align:right;">
                            Total <button style="${sortBtnStyle('total')}" onclick="sortOrdersBy('total')">${sortIcon('total')}</button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${sortOrders(orders).map(order => {
                        const user = DATA.users.find(u => u.id === order.userId);
                        return `
                            <tr style="border-bottom:1px solid #eee;cursor:pointer;" onclick="showOrderDetails('${order.id}')">
                                <td style="padding:1rem;">#${order.id}</td>
                                <td id="c-td-date" tyle="padding:1rem;">${new Date(order.date).toLocaleString('fr-FR')}</td>
                                <td id="c-td-name" style="padding:1rem;">${user ? `${user.firstName} ${user.lastName}` : 'Inconnu'}</td>
                                <td style="padding:1rem;">${order.items?.length || 0} article(s)</td>
                                <td style="padding:1rem;text-align:right;font-weight:600;">${order.total?.toFixed(2)}€</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    };

    container.innerHTML = `
        <div style="margin-bottom:2rem;">
            <h3 style="color:#e57373;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
                <span style="background:#e57373;color:white;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.9rem;">${pendingOrders.length}</span>
                Commandes à traiter
            </h3>
            ${renderTable(pendingOrders, 'Aucune commande en attente 🎉')}
        </div>
        
        <div>
            <h3 style="color:#4a7c4e;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
                <span style="background:#4a7c4e;color:white;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.9rem;">${treatedOrders.length}</span>
                Commandes traitées
            </h3>
            ${renderTable(treatedOrders, 'Aucune commande traitée')}
        </div>
    `;
}

function sortOrdersBy(field) {
    if (ordersSortField === field) {
        ordersSortOrder = ordersSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        ordersSortField = field;
        ordersSortOrder = 'desc';
    }
    renderOrders();
}



function showOrderDetails(orderId) {
    const order = DATA.orders.find(o => o.id === orderId);
    if (!order) return;
    const user = DATA.users.find(u => u.id === order.userId);
    const modal = document.getElementById('orderDetailsModal') || createOrderDetailsModal();
    
    const isTreated = order.treated || false;
    
    document.getElementById('orderDetailsContent').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="margin:0;">Commande #${order.id}</h3>
            <span style="padding:0.5rem 1rem;border-radius:20px;font-size:0.85rem;font-weight:600;${isTreated ? 'background:#e8f5e9;color:#4a7c4e;' : 'background:#ffebee;color:#e57373;'}">
                ${isTreated ? '✓ Traitée' : '⏳ En attente'}
            </span>
        </div>
        
        <p><strong>Date:</strong> ${new Date(order.date).toLocaleString('fr-FR')}</p>
        <p><strong>Total:</strong> ${order.total?.toFixed(2)}€</p>
        
        <div style="margin:1.5rem 0;padding:1rem;background:#f8f9fa;border-radius:10px;">
            <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer;">
                <input type="checkbox" id="orderTreatedCheckbox" ${isTreated ? 'checked' : ''} 
                       onchange="toggleOrderTreated('${order.id}', this.checked)"
                       style="width:20px;height:20px;cursor:pointer;">
                <span style="font-weight:500;">Marquer comme ${isTreated ? 'non traitée' : 'traitée'}</span>
            </label>
        </div>
        
        <h4 style="margin-top:1.5rem;">Articles:</h4>
        <div style="background:#f5f5f5;padding:1rem;border-radius:10px;">
            ${order.items.map(item => `
                <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #ddd;">
                    <span>${item.icon || ''} ${item.name}</span>
                    <span>${item.quantity} × ${item.price}€ = ${(item.quantity * item.price).toFixed(2)}€</span>
                </div>
            `).join('')}
        </div>
        
        <h4 style="margin-top:1.5rem;">Client:</h4>
        ${user ? `
            <div onclick="goToUserFromOrder('${user.id}')"
                 style="background:#e8f5e9;padding:1rem;border-radius:10px;cursor:pointer;transition:background 0.2s;"
                 onmouseover="this.style.background='#c8e6c9'"
                 onmouseout="this.style.background='#e8f5e9'">
                <p><strong>${user.firstName} ${user.lastName}</strong></p>
                <p>📧 ${user.email}</p>
                ${user.phone ? `<p>📞 ${user.phone}</p>` : ''}
                <p style="font-size:0.85rem;color:var(--primary);margin-top:0.5rem;">Cliquez pour voir le profil →</p>
            </div>
        ` : '<div style="background:#f5f5f5;padding:1rem;border-radius:10px;"><p>Utilisateur non trouvé</p></div>'}
    `;
    modal.classList.add('active');
}


function goToUserFromOrder(userId) {
    closeOrderDetails();
    showAdminSection('users');
    setTimeout(() => showUserDetails(userId), 300);
}

async function toggleOrderTreated(orderId, treated) {
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/orders/${orderId}/treated`), treated);
        
        // Mettre à jour localement
        const order = DATA.orders.find(o => o.id === orderId);
        if (order) order.treated = treated;
        
        // Rafraîchir l'affichage
        renderOrders();
        showOrderDetails(orderId);
        
        showToast(treated ? 'Commande marquée comme traitée' : 'Commande marquée comme non traitée', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}


function createOrderDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'orderDetailsModal';
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>Détails</h3><button class="close-btn" onclick="closeOrderDetails()">✕</button></div><div id="orderDetailsContent" class="modal-body"></div></div>`;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeOrderDetails();
    });
    document.body.appendChild(modal);
    return modal;
}


function closeOrderDetails() {
    document.getElementById('orderDetailsModal')?.classList.remove('active');
}

// ===== UTILISATEURS =====
function renderUsers() {
    const container = document.getElementById('usersTable');
    if (DATA.users.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:3rem;">Aucun utilisateur inscrit</p>';
        return;
    }
    
    // Fonction pour compter les commandes d'un utilisateur
    const getOrdersCount = (userId) => DATA.orders.filter(o => o.userId === userId).length;
    
    // Tri des utilisateurs
    let sortedUsers = [...DATA.users].sort((a, b) => {
        let valA, valB;
        switch (usersSortField) {
            case 'name':
                valA = `${a.firstName} ${a.lastName}`.toLowerCase();
                valB = `${b.firstName} ${b.lastName}`.toLowerCase();
                break;
            case 'orders':
                valA = getOrdersCount(a.id);
                valB = getOrdersCount(b.id);
                break;
            case 'created':
            default:
                valA = new Date(a.created || 0);
                valB = new Date(b.created || 0);
                break;
        }
        if (valA < valB) return usersSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return usersSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const sortIcon = (field) => {
        if (usersSortField !== field) return '↕';
        return usersSortOrder === 'asc' ? '↑' : '↓';
    };

    const sortBtnStyle = (field) => {
        const isActive = usersSortField === field;
        return `background:${isActive ? 'rgba(255,255,255,0.3)' : 'transparent'};border:none;color:white;cursor:pointer;padding:0.25rem 0.5rem;border-radius:5px;font-size:0.85rem;margin-left:0.5rem;`;
    };

    container.innerHTML = `
        <table style="width:100%;background:white;border-radius:15px;overflow:hidden;">
            <thead style="background:#4a7c4e;color:white;">
                <tr>
                    <th style="padding:1rem;text-align:left;">
                        Nom <button style="${sortBtnStyle('name')}" onclick="sortUsers('name')">${sortIcon('name')}</button>
                    </th>
                    <th style="padding:1rem;text-align:center;">
                        Commandes <button style="${sortBtnStyle('orders')}" onclick="sortUsers('orders')">${sortIcon('orders')}</button>
                    </th>
                </tr>
            </thead>
            <tbody>
                ${sortedUsers.map(user => {
                    const userOrdersCount = getOrdersCount(user.id);
                    return `
                        <tr style="border-bottom:1px solid #eee;cursor:pointer;" onclick="showUserDetails('${user.id}')">
                            <td style="padding:1rem;">${user.firstName} ${user.lastName}</td>
                            <td style="padding:1rem;text-align:center;">
                                <span style="background:${userOrdersCount > 0 ? '#e8f5e9' : '#f5f5f5'};color:${userOrdersCount > 0 ? '#4a7c4e' : '#999'};padding:0.25rem 0.75rem;border-radius:20px;font-weight:600;">
                                    ${userOrdersCount}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}


function sortUsers(field) {
    if (usersSortField === field) {
        usersSortOrder = usersSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        usersSortField = field;
        usersSortOrder = 'desc';
    }
    renderUsers();
}



function showUserDetails(userId) {
    const user = DATA.users.find(u => u.id === userId);
    if (!user) return;

    // Récupérer les commandes de cet utilisateur
    const userOrders = DATA.orders.filter(o => o.userId === userId);

    // Générer la liste des commandes
    let ordersHtml = '';
    if (userOrders.length === 0) {
        ordersHtml = '<p style="color:#999;font-style:italic;">Aucune commande</p>';
    } else {
        ordersHtml = `
            <div style="max-height:250px;overflow-y:auto;">
                ${userOrders.map(order => `
                    <div onclick="goToOrderFromUser('${order.id}')"
                         style="padding:0.75rem;margin-bottom:0.5rem;background:#f8f9fa;border-radius:8px;cursor:pointer;transition:background 0.2s;"
                         onmouseover="this.style.background='#e8f5e9'"
                         onmouseout="this.style.background='#f8f9fa'">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="color:var(--primary);">#${order.id}</strong>
                            <span style="font-weight:600;">${order.total?.toFixed(2)}€</span>
                        </div>
                        <div style="font-size:0.85rem;color:#666;margin-top:0.25rem;">
                            ${new Date(order.date).toLocaleDateString('fr-FR')} • ${order.items?.length || 0} article(s)
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    const modal = document.getElementById('userDetailsModal') || createUserDetailsModal();
    document.getElementById('userDetailsContent').innerHTML = `
        <h3>${user.firstName} ${user.lastName}</h3>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Téléphone:</strong> ${user.phone || '<span style="color:#999;">Non renseigné</span>'}</p>
        <p><strong>Inscription:</strong> ${user.created ? new Date(user.created).toLocaleDateString('fr-FR') : 'N/A'}</p>

        <div style="margin-top:1.5rem;border-top:1px solid #eee;padding-top:1rem;">
            <h4 style="margin-bottom:0.75rem;color:var(--primary);">Commandes (${userOrders.length})</h4>
            ${ordersHtml}
        </div>
    `;
    modal.classList.add('active');
}

function goToOrderFromUser(orderId) {
    closeUserDetails();
    showAdminSection('orders');
    setTimeout(() => showOrderDetails(orderId), 300);
}


function createUserDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'userDetailsModal';
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>Détails</h3><button class="close-btn" onclick="closeUserDetails()">✕</button></div><div id="userDetailsContent" class="modal-body"></div></div>`;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeUserDetails();
    });
    document.body.appendChild(modal);
    return modal;
}


function closeUserDetails() {
    document.getElementById('userDetailsModal')?.classList.remove('active');
}





// ===== MÉDIAS =====
const AVAILABLE_IMAGES = [
    'medias/image.png',
    'medias/courgetteistock-662fd99a96bd5.png',
    'medias/tomates.png',
    'medias/petit-jardin-potager.png',
    'medias/12.png',
    'medias/20210525_124406_2-casto-3663602760214-0.png'
];

function renderMedia() {
    renderCarouselImages();
    // La vidéo est maintenant en dur dans le HTML
}

function renderCarouselImages() {
    const container = document.getElementById('carouselImagesGrid');
    
    container.innerHTML = AVAILABLE_IMAGES.map((img, index) => {
        const isSelected = DATA.carouselImages.includes(img);
        return `
            <div class="carousel-image-item ${isSelected ? 'selected' : ''}" onclick="toggleCarouselImage('${img}')">
                <img src="${img}" style="width:100%;height:150px;object-fit:cover;border-radius:10px;">
                <div class="carousel-image-check">${isSelected ? '✓' : ''}</div>
            </div>
        `;
    }).join('');
}

async function toggleCarouselImage(img) {
    const index = DATA.carouselImages.indexOf(img);
    if (index > -1) {
        DATA.carouselImages.splice(index, 1);
    } else {
        DATA.carouselImages.push(img);
    }
    try {
        await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/media/carouselImages'), DATA.carouselImages);
        renderCarouselImages();
    } catch (err) { alert(err.message); }
}

// Sélecteur d'images pour les produits
function openImagePicker() {
    const modal = document.getElementById('imagePickerModal');
    const grid = document.getElementById('imagePickerGrid');
    const currentImage = document.getElementById('productImageUrl').value;
    
    grid.innerHTML = AVAILABLE_IMAGES.map(img => `
        <div class="image-picker-item ${currentImage === img ? 'selected' : ''}" onclick="selectProductImage('${img}')">
            <img src="${img}" alt="Image">
            ${currentImage === img ? '<div class="image-picker-check">✓</div>' : ''}
        </div>
    `).join('');
    
    modal.classList.add('active');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeImagePicker();
    });
}

function closeImagePicker() {
    document.getElementById('imagePickerModal').classList.remove('active');
}

function selectProductImage(img) {
    document.getElementById('productImageUrl').value = img;
    document.getElementById('productImagePreview').innerHTML = `<img src="${img}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    closeImagePicker();
}









// ===== PARAMÈTRES =====
function renderSettings() {
    document.getElementById('shopName').value = DATA.settings.shopName || '';
    document.getElementById('shopAddressInput').value = DATA.settings.address || '';
    document.getElementById('shopPhoneInput').value = DATA.settings.phone || '';
    document.getElementById('shopEmailInput').value = DATA.settings.email || '';
}

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const settings = {
        shopName: document.getElementById('shopName').value,
        address: document.getElementById('shopAddressInput').value,
        phone: document.getElementById('shopPhoneInput').value,
        email: document.getElementById('shopEmailInput').value
    };
    try {
        await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/settings'), settings);
        alert('Paramètres enregistrés');
    } catch (err) { alert(err.message); }
});

// ===== STATUT BOUTIQUE =====
let shopStatus = { isOpen: true, reopenDay: null };

async function loadShopStatus() {
    const snapshot = await window.firebase.get(window.firebase.ref(db, 'paniers-du-jardin/settings/shopStatus'));
    if (snapshot.exists()) shopStatus = snapshot.val();
    renderShopStatusToggle();
}

function renderShopStatusToggle() {
    const container = document.getElementById('shopStatusToggle');
    if (!container) return;
    container.innerHTML = `
        <div class="shop-status-card ${shopStatus.isOpen ? 'shop-open' : 'shop-closed'}">
            <div class="shop-status-info">
                <h3>Boutique ${shopStatus.isOpen ? 'OUVERTE' : 'FERMÉE'}</h3>
                <p>${shopStatus.isOpen ? 'Les clients peuvent passer commande' : 'Les commandes sont désactivées'}</p>
            </div>
            <button class="btn-shop-toggle ${shopStatus.isOpen ? 'btn-close' : 'btn-open'}" onclick="toggleShopStatus()">
                ${shopStatus.isOpen ? 'Fermer la boutique' : 'Ouvrir la boutique'}
            </button>
        </div>
    `;
}


async function toggleShopStatus() {
    shopStatus.isOpen = !shopStatus.isOpen;
    await window.firebase.set(window.firebase.ref(db, 'paniers-du-jardin/settings/shopStatus'), shopStatus);
    renderShopStatusToggle();
}

// ===== GESTION DES ADMINS =====
let adminsList = [];
async function loadAdminsList() {
    const snapshot = await window.firebase.get(window.firebase.ref(db, 'paniers-du-jardin/admins'));
    if (snapshot.exists()) adminsList = Object.keys(snapshot.val());
    renderAdminsList();
}

function renderAdminsList() {
    const container = document.getElementById('adminsList');
    if (!container) return;
    container.innerHTML = adminsList.map(uid => `<div>Admin UID: ${uid} <button onclick="removeAdmin('${uid}')">Supprimer</button></div>`).join('');
}

async function addAdmin() {
    const uid = document.getElementById('newAdminUid').value.trim();
    if (!uid) return;
    await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/admins/${uid}`), true);
    await loadAdminsList();
}

async function removeAdmin(uid) {
    if (uid === currentAdmin.uid) return alert('Impossible de se supprimer soi-même');
    await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/admins/${uid}`), null);
    await loadAdminsList();
}