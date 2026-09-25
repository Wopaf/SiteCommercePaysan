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

// Variables de tri
let usersSortField = 'created';
let usersSortOrder = 'desc';
let ordersSortField = 'date';
let ordersSortOrder = 'desc';
let ordersStatusFilter = 'all';
let ordersSearchQuery = '';
let usersSearchQuery = '';

let app, db, auth, storage, currentAdmin = null;
const DATA = { products: [], baskets: [], orders: [], users: [], settings: {}, carouselImages: [] };

function getToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'success') {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 20);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

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


function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal || !modal.classList.contains('active')) return;
    modal.classList.add('closing');
    modal.addEventListener('animationend', () => {
        modal.classList.remove('active', 'closing');
    }, { once: true });
}

document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeProductModal();
});



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

            DATA.orders = data.orders ? Object.values(data.orders) : [];
            DATA.users = data.users ? Object.entries(data.users).map(([id, u]) => ({id, ...u})) : [];
            DATA.settings = data.settings || {};
            DATA.carouselImages = data.media?.carouselImages || [];
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

    if (section === 'dashboard') {
        renderDashboard();
    }
}

// ===== DASHBOARD =====
function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = DATA.orders.filter(o => o.date?.startsWith(today));
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Commandes non traitées (nouvelles)
    const pendingOrders = DATA.orders.filter(o => orderStatusOf(o) === 'pending');
    const newOrdersAlert = document.getElementById('newOrdersAlert');
    const newOrdersIcon = document.getElementById('newOrdersIcon');
    const newOrdersContent = document.getElementById('newOrdersContent');

    if (pendingOrders.length > 0) {
        newOrdersAlert.classList.remove('no-pending');
        newOrdersIcon.textContent = '🔔';
        newOrdersContent.innerHTML = `<span id="newOrdersCount">${pendingOrders.length}</span><p>nouvelle(s) commande(s) à traiter</p>`;
    } else {
        newOrdersAlert.classList.add('no-pending');
        newOrdersIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#4a7c4e"><path d="m438-513-29-29q-12-11-28-11t-28 12q-12 12-12 28t12 28l56 57q12 12 28.5 12t28.5-12l141-142q12-12 12-28t-12-28q-12-12-28-12t-28 12L438-513Zm42 273-168 72q-40 17-76-6.5T200-241v-519q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v519q0 43-36 66.5t-76 6.5l-168-72Zm0-88 200 86v-518H280v518l200-86Zm0-432H280h400-200Z"/></svg>`;
        newOrdersContent.innerHTML = `<p>Aucune commande à traiter</p>`;
    }

    // Stats de base
    document.getElementById('todayOrders').textContent = todayOrders.length;
    document.getElementById('todayRevenue').textContent = todayRevenue.toFixed(2) + '€';
    document.getElementById('totalUsers').textContent = DATA.users.length;
    
    // Stock disponible (somme des stocks des paniers en kg)
    const totalStock = DATA.baskets.reduce((sum, b) => sum + (b.stock || 0), 0);
    document.getElementById('totalStockKg').textContent = totalStock + ' kg';
    
    // Produits vendus (somme des quantités dans toutes les commandes)
    let totalSold = 0;
    DATA.orders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                if (item.type === 'product') {
                    totalSold += item.quantity || 0;
                }
            });
        }
    });
    document.getElementById('totalSoldKg').textContent = totalSold.toFixed(1) + ' kg';
    
    // Total commandes
    document.getElementById('totalOrdersCount').textContent = DATA.orders.length;

    renderRevenueChart();
    renderMonthlyStats();
}

function renderMonthlyStats() {
    const container = document.getElementById('monthlyStatsList');
    if (!container) return;

    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const months = {};

    DATA.orders.forEach(o => {
        if (!o.date) return;
        const d = new Date(o.date);
        if (isNaN(d)) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!months[key]) {
            months[key] = { year: d.getFullYear(), month: d.getMonth(), count: 0, revenue: 0 };
        }
        months[key].count++;
        if (orderStatusOf(o) === 'delivered') months[key].revenue += o.total || 0;
    });

    const sortedKeys = Object.keys(months).sort().reverse();

    if (sortedKeys.length === 0) {
        container.innerHTML = '<p class="admin-product-empty">Aucune commande</p>';
        return;
    }

    container.innerHTML = sortedKeys.map(key => {
        const m = months[key];
        return `
            <div class="admin-row">
                <div class="admin-row-left">
                    <span class="admin-row-name">${monthNames[m.month]} ${m.year}</span>
                </div>
                <div class="admin-row-right">
                    <span class="admin-row-meta">${m.count} commande${m.count > 1 ? 's' : ''}</span>
                    <span class="admin-row-value">${m.revenue.toFixed(2)}€</span>
                </div>
            </div>
        `;
    }).join('<div class="admin-row-separator"></div>');
}

// ===== Graphiques dashboard (revenus + commandes par jour) =====
let revenueChartRange = 30;

function setRevenueChartRange(range) {
    revenueChartRange = range;
    document.querySelectorAll('.admin-chart-range-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === String(range));
    });
    renderRevenueChart();
}

function niceMaxValue(value) {
    if (value <= 0) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const residual = value / magnitude;
    let niceResidual;
    if (residual <= 1) niceResidual = 1;
    else if (residual <= 2) niceResidual = 2;
    else if (residual <= 5) niceResidual = 5;
    else niceResidual = 10;
    return niceResidual * magnitude;
}

function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Regroupe les commandes par jour sur la plage sélectionnée, une fois pour les deux graphiques.
function getDailyOrderGroups() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let days = revenueChartRange;
    if (revenueChartRange === 'all') {
        const dates = DATA.orders.map(o => new Date(o.date)).filter(d => !isNaN(d));
        if (dates.length === 0) {
            days = 1;
        } else {
            const earliest = new Date(Math.min(...dates));
            earliest.setHours(0, 0, 0, 0);
            days = Math.round((today - earliest) / 86400000) + 1;
        }
    }

    const groups = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = localDateKey(d);
        const dayOrders = DATA.orders.filter(o => o.date && localDateKey(new Date(o.date)) === key);
        groups.push({ date: d, orders: dayOrders });
    }
    return groups;
}

function renderRevenueChart() {
    const dailyGroups = getDailyOrderGroups();

    const revenuePoints = dailyGroups.map(g => ({
        date: g.date,
        value: g.orders.filter(o => orderStatusOf(o) === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0)
    }));
    renderTimeSeriesChart('revenueChartWrap', revenuePoints, {
        formatAxisValue: v => Math.round(v) + '€',
        formatTooltip: v => v.toFixed(2) + '€',
        formatTotal: v => v.toFixed(2) + '€'
    });

    const ordersCountPoints = dailyGroups.map(g => ({ date: g.date, value: g.orders.length }));
    renderTimeSeriesChart('ordersChartWrap', ordersCountPoints, {
        formatAxisValue: v => Math.round(v),
        formatTooltip: v => v + (v > 1 ? ' commandes' : ' commande'),
        formatTotal: v => v + (v > 1 ? ' commandes' : ' commande')
    });
}

const timeSeriesCharts = {};

function renderTimeSeriesChart(containerId, points, opts) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;

    const total = points.reduce((s, p) => s + p.value, 0);
    if (total === 0) {
        wrap.innerHTML = '<p class="admin-chart-empty">Aucune donnée sur cette période</p>';
        delete timeSeriesCharts[containerId];
        return;
    }

    const W = 1000, H = 280;
    const padLeft = 55, padRight = 15, padTop = 20, padBottom = 30;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    const maxValue = niceMaxValue(Math.max(...points.map(p => p.value)));
    const xFor = (i) => padLeft + (i / (points.length - 1 || 1)) * plotW;
    const yFor = (v) => padTop + plotH - (v / maxValue) * plotH;

    const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.value)}`).join(' ');
    const areaPoints = `${padLeft},${padTop + plotH} ${linePoints} ${xFor(points.length - 1)},${padTop + plotH}`;

    const gridSteps = 4;
    let gridLines = '';
    for (let s = 0; s <= gridSteps; s++) {
        const v = (maxValue / gridSteps) * s;
        const y = yFor(v);
        gridLines += `<line class="rc-grid-line" x1="${padLeft}" y1="${y}" x2="${W - padRight}" y2="${y}"/>`;
        gridLines += `<text class="rc-axis-label" x="${padLeft - 8}" y="${y + 4}" text-anchor="end">${opts.formatAxisValue(v)}</text>`;
    }

    const tickCount = Math.min(5, points.length);
    let xLabels = '';
    for (let t = 0; t < tickCount; t++) {
        const idx = Math.round((t / (tickCount - 1 || 1)) * (points.length - 1));
        const label = points[idx].date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        xLabels += `<text class="rc-axis-label" x="${xFor(idx)}" y="${H - 8}" text-anchor="middle">${label}</text>`;
    }

    const last = points[points.length - 1];

    wrap.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" id="${containerId}Svg">
            ${gridLines}
            <line class="rc-baseline" x1="${padLeft}" y1="${padTop + plotH}" x2="${W - padRight}" y2="${padTop + plotH}"/>
            <polygon class="rc-area" points="${areaPoints}"/>
            <polyline class="rc-line" points="${linePoints}"/>
            <circle class="rc-end-dot" cx="${xFor(points.length - 1)}" cy="${yFor(last.value)}" r="4"/>
            ${xLabels}
            <line class="rc-crosshair" id="${containerId}Crosshair" x1="0" y1="${padTop}" x2="0" y2="${padTop + plotH}"/>
            <circle class="rc-hover-dot" id="${containerId}HoverDot" r="5"/>
            <rect class="rc-hit-area" x="${padLeft}" y="${padTop}" width="${plotW}" height="${plotH}"
                onpointermove="handleTimeSeriesHover(event, '${containerId}')" onpointerleave="handleTimeSeriesLeave('${containerId}')"></rect>
        </svg>
        <div class="admin-chart-tooltip" id="${containerId}Tooltip">
            <div class="rc-tooltip-date"></div>
            <div class="rc-tooltip-value"></div>
        </div>
        <div class="admin-chart-total">Total sur la période : <strong>${opts.formatTotal(total)}</strong></div>
    `;

    timeSeriesCharts[containerId] = { points, W, H, padLeft, padRight, padTop, padBottom, plotW, plotH, maxValue, formatTooltip: opts.formatTooltip };
}

function handleTimeSeriesHover(evt, containerId) {
    const state = timeSeriesCharts[containerId];
    if (!state) return;
    const { points } = state;

    const svg = document.getElementById(containerId + 'Svg');
    const rect = svg.getBoundingClientRect();
    const scaleX = state.W / rect.width;
    const svgX = (evt.clientX - rect.left) * scaleX;

    const relX = (svgX - state.padLeft) / state.plotW;
    let idx = Math.round(relX * (points.length - 1));
    idx = Math.max(0, Math.min(points.length - 1, idx));

    const p = points[idx];
    const x = state.padLeft + (idx / (points.length - 1 || 1)) * state.plotW;
    const y = state.padTop + state.plotH - (p.value / state.maxValue) * state.plotH;

    const crosshair = document.getElementById(containerId + 'Crosshair');
    crosshair.setAttribute('x1', x);
    crosshair.setAttribute('x2', x);
    crosshair.style.opacity = 1;

    const dot = document.getElementById(containerId + 'HoverDot');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.style.opacity = 1;

    const scaleBackX = rect.width / state.W;
    const scaleBackY = rect.height / state.H;
    const tooltip = document.getElementById(containerId + 'Tooltip');
    tooltip.style.left = (x * scaleBackX) + 'px';
    tooltip.style.top = (y * scaleBackY) + 'px';
    tooltip.querySelector('.rc-tooltip-date').textContent = p.date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
    tooltip.querySelector('.rc-tooltip-value').textContent = state.formatTooltip(p.value);
    tooltip.classList.add('visible');
}

function handleTimeSeriesLeave(containerId) {
    const crosshair = document.getElementById(containerId + 'Crosshair');
    const dot = document.getElementById(containerId + 'HoverDot');
    const tooltip = document.getElementById(containerId + 'Tooltip');
    if (crosshair) crosshair.style.opacity = 0;
    if (dot) dot.style.opacity = 0;
    if (tooltip) tooltip.classList.remove('visible');
}


function showOrderDetailsFromDashboard(orderId) {
    showAdminSection('orders');
    setTimeout(() => showOrderDetails(orderId), 300);
}

// ===== PRODUITS =====
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function renderProducts() {
    const container = document.getElementById('productsList');
    if (DATA.products.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:3rem;">Aucun produit.</p>';
        return;
    }

    const available = DATA.products.filter(p => p.inStock);
    const unavailable = DATA.products.filter(p => !p.inStock);

    const unitBadgeLabel = (unit) => {
        if (unit === 'lot250g') return 'Par lot de 250g';
        if (unit === 'piece') return 'Par lot';
        return 'Au kilo';
    };

    const renderRow = (product, isAvailable) => {
        return `
            <div class="admin-product-row" data-id="${product.id}">
                <div class="apr-image" onclick="editProduct('${product.id}')" title="Modifier l'image">
                    ${product.image ? `<img src="${escapeHtml(product.image)}" alt="">` : '📦'}
                </div>
                <input type="text" class="apr-input apr-name" value="${escapeHtml(product.name)}"
                    onblur="updateProductField('${product.id}', 'name', this.value.trim())"
                    onkeydown="if(event.key==='Enter') this.blur()">
                <div class="apr-actions-row">
                    <div class="apr-price-group">
                        <span class="apr-price-label">Prix</span>
                        <input type="number" class="apr-input apr-price" step="0.01" min="0" value="${product.price}"
                            onblur="updateProductField('${product.id}', 'price', parseFloat(this.value) || 0)"
                            onkeydown="if(event.key==='Enter') this.blur()">
                    </div>
                    <span class="apr-unit-badge">${unitBadgeLabel(product.unit)}</span>
                    <button class="admin-product-toggle ${isAvailable ? 'to-unavailable' : 'to-available'}" onclick="toggleProductAvailability('${product.id}')">
                        ${isAvailable ? 'Retirer' : 'Ajouter'}
                    </button>
                    <button class="apr-delete" onclick="deleteProduct('${product.id}')" title="Supprimer" aria-label="Supprimer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `;
    };

    const renderList = (products, emptyMsg, isAvailable) => {
        if (products.length === 0) return `<p class="admin-product-empty">${emptyMsg}</p>`;
        return products.map(product => renderRow(product, isAvailable)).join('<div class="admin-row-separator"></div>');
    };

    container.innerHTML = `
        <div class="admin-product-group">
            <div class="admin-product-group-header">
                <span class="admin-product-group-dot available"></span>
                <h3>Produits disponibles</h3>
                <span class="admin-product-group-count">${available.length}</span>
            </div>
            <div class="admin-product-group-list">
                ${renderList(available, 'Aucun produit disponible', true)}
            </div>
        </div>
        <div class="admin-product-group">
            <div class="admin-product-group-header">
                <span class="admin-product-group-dot unavailable"></span>
                <h3>Produits indisponibles</h3>
                <span class="admin-product-group-count">${unavailable.length}</span>
            </div>
            <div class="admin-product-group-list">
                 ${renderList(unavailable, 'Aucun produit indisponible', false)}
            </div>
        </div>
    `;
}

async function updateProductField(productId, field, value) {
    const product = DATA.products.find(p => p.id === productId);
    if (!product) return;
    if (product[field] === value) return;
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/products/${productId}/${field}`), value);
        product[field] = value;
    } catch (err) {
        alert('Erreur lors de la mise à jour: ' + err.message);
        renderProducts();
    }
}

async function toggleProductAvailability(productId) {
    const product = DATA.products.find(p => p.id === productId);
    if (!product) return;
    try {
        await window.firebase.set(
            window.firebase.ref(db, `paniers-du-jardin/products/${productId}/inStock`),
            !product.inStock
        );
        product.inStock = !product.inStock;
        renderProducts();
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}


const PRODUCT_COLOR_PALETTE = [
    '#e74c3c', '#ff8f3c', '#f4c430', '#cddc39',
    '#4caf50', '#2f9e44', '#16a085', '#0eaaa5',
    '#3498db', '#5c6bc0', '#8e44ad', '#d81b60',
    '#c0392b', '#a1887f', '#78909c', '#ff6f91'
];

function renderProductColorPicker(selectedColor) {
    const grid = document.getElementById('productColorGrid');
    if (!grid) return;
    grid.innerHTML = PRODUCT_COLOR_PALETTE.map(hex => `
        <button type="button" class="color-swatch ${hex === selectedColor ? 'active' : ''}"
            data-hex="${hex}" style="background:${hex}" onclick="selectProductColor('${hex}')" aria-label="${hex}"></button>
    `).join('');
    document.getElementById('productColor').value = selectedColor || '';
}

function selectProductColor(hex) {
    document.getElementById('productColor').value = hex;
    document.querySelectorAll('#productColorGrid .color-swatch').forEach(sw => {
        sw.classList.toggle('active', sw.dataset.hex === hex);
    });
}

function handleProductImageUrlInput(url) {
    const preview = document.getElementById('productImagePreview');
    if (!url) {
        preview.innerHTML = '<span class="upload-placeholder">📷 Aucune image</span>';
        return;
    }
    preview.innerHTML = `<img src="${url}" alt="Aperçu du produit" onerror="this.parentElement.innerHTML='<span class=&quot;upload-placeholder&quot;>⚠️ Image introuvable</span>'">`;
}

function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    form.reset();
    handleProductImageUrlInput('');

    if (productId) {
        const product = DATA.products.find(p => p.id === productId);
        if (product) {
            document.getElementById('productModalTitle').textContent = 'Modifier le Produit';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productUnit').value = product.unit || 'kg';
            renderProductColorPicker(product.color || PRODUCT_COLOR_PALETTE[0]);
            if (product.image) {
                document.getElementById('productImageUrl').value = product.image;
                handleProductImageUrlInput(product.image);
            }
        }
    } else {
        document.getElementById('productModalTitle').textContent = 'Ajouter un Produit';
        document.getElementById('productUnit').value = 'kg';
        renderProductColorPicker(PRODUCT_COLOR_PALETTE[0]);
    }
    modal.classList.add('active');
}


async function saveProduct(event) {
    event.preventDefault();
    const productId = document.getElementById('productId').value || `prod_${Date.now()}`;
    const existingProduct = DATA.products.find(p => p.id === productId);
    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        unit: document.getElementById('productUnit').value,
        color: document.getElementById('productColor').value || null,
        inStock: existingProduct ? (existingProduct.inStock ?? true) : true,
        availableMonths: existingProduct?.availableMonths || [],
        image: document.getElementById('productImageUrl').value || null,
    };



    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/products/${productId}`), productData);
        await loadAllAdminData();
        closeProductModal();
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
    }).join('<div class="admin-row-separator"></div>');
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


// ===== COMMANDES =====
const ORDER_STATUS_META = {
    pending: { label: 'En attente', class: 'status-pending' },
    treated: { label: 'Traitée', class: 'status-treated' },
    delivered: { label: 'Livrée', class: 'status-delivered' }
};

function orderStatusOf(order) {
    return order.status && ORDER_STATUS_META[order.status] ? order.status : 'pending';
}

function filterOrdersByStatus(status) {
    ordersStatusFilter = status;
    renderOrders();
}

function searchOrders(query) {
    ordersSearchQuery = query;
    renderOrders();
    const input = document.getElementById('ordersSearchInput');
    if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
    }
}

function orderDisplayName(order) {
    const user = DATA.users.find(u => u.id === order.userId);
    return user ? `${user.firstName} ${user.lastName}` : (order.customerName || '');
}

function renderOrders() {
    const container = document.getElementById('ordersTable');
    if (DATA.orders.length === 0) {
        container.innerHTML = '<p class="admin-product-empty">Aucune commande</p>';
        return;
    }

    let filteredOrders = ordersStatusFilter === 'all'
        ? DATA.orders
        : DATA.orders.filter(o => orderStatusOf(o) === ordersStatusFilter);

    const query = ordersSearchQuery.trim().toLowerCase();
    if (query) {
        filteredOrders = filteredOrders.filter(o =>
            orderDisplayName(o).toLowerCase().includes(query) ||
            o.id.toLowerCase().includes(query)
        );
    }

    const sortOrders = (orders) => {
        return [...orders].sort((a, b) => {
            let valA, valB;
            switch (ordersSortField) {
                case 'id':
                    valA = a.id; valB = b.id; break;
                case 'client':
                    const userA = DATA.users.find(u => u.id === a.userId);
                    const userB = DATA.users.find(u => u.id === b.userId);
                    valA = (userA ? `${userA.firstName} ${userA.lastName}` : a.customerName || '').toLowerCase();
                    valB = (userB ? `${userB.firstName} ${userB.lastName}` : b.customerName || '').toLowerCase();
                    break;
                case 'total':
                    valA = a.total || 0; valB = b.total || 0; break;
                case 'date': default:
                    valA = new Date(a.date); valB = new Date(b.date); break;
            }
            if (valA < valB) return ordersSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return ordersSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const renderOrderList = (orders, emptyMsg) => {
        if (orders.length === 0) return `<p class="admin-product-empty">${emptyMsg}</p>`;
        return sortOrders(orders).map(order => {
            const user = DATA.users.find(u => u.id === order.userId);
            const status = orderStatusOf(order);
            return `
                <div class="admin-row admin-row-order">
                    <div class="admin-row-left" onclick="showOrderDetails('${order.id}')">
                        <select class="admin-row-status-select ${ORDER_STATUS_META[status].class}"
                            onclick="event.stopPropagation()"
                            onchange="updateOrderStatus('${order.id}', this.value)">
                            <option value="pending" ${status === 'pending' ? 'selected' : ''}>En attente</option>
                            <option value="treated" ${status === 'treated' ? 'selected' : ''}>Traitée</option>
                            <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>Livrée</option>
                        </select>
                        <span class="admin-row-id">#${order.id}</span>
                        <span class="admin-row-name">${user ? `${user.firstName} ${user.lastName}` : (order.customerName || 'Inconnu')}</span>
                    </div>
                    <div class="admin-row-right">
                        <span class="admin-row-date">${new Date(order.date).toLocaleDateString('fr-FR')}${order.date ? ' à ' + new Date(order.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        <span class="admin-row-meta">${order.items?.length || 0} article(s)</span>
                        <span class="admin-row-value">${order.total?.toFixed(2)}€</span>
                    </div>
                    <input type="text" class="admin-row-note" value="${escapeHtml(order.note || '')}" placeholder="Ajouter une note..."
                        onclick="event.stopPropagation()"
                        onblur="updateOrderNote('${order.id}', this.value.trim())"
                        onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}">
                </div>
            `;
        }).join('<div class="admin-row-separator"></div>');
    };


    const sortIcon = (field) => ordersSortField === field ? (ordersSortOrder === 'asc' ? '↑' : '↓') : '↕';

    container.innerHTML = `
        <div class="admin-search-bar ${ordersSearchQuery ? 'has-value' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="ordersSearchInput" placeholder="Rechercher par nom ou numéro de commande..."
                value="${escapeHtml(ordersSearchQuery)}"
                oninput="searchOrders(this.value)">
            <button type="button" class="admin-search-clear" onclick="searchOrders('')" aria-label="Effacer la recherche">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
        <div class="admin-list-controls">
            <div class="admin-list-sort">
                <span>Trier par :</span>
                <button class="admin-sort-btn ${ordersSortField === 'date' ? 'active' : ''}" onclick="sortOrdersBy('date')">Date ${sortIcon('date')}</button>
                <button class="admin-sort-btn ${ordersSortField === 'client' ? 'active' : ''}" onclick="sortOrdersBy('client')">Client ${sortIcon('client')}</button>
                <button class="admin-sort-btn ${ordersSortField === 'total' ? 'active' : ''}" onclick="sortOrdersBy('total')">Total ${sortIcon('total')}</button>
            </div>
            <div class="admin-list-sort">
                <span>Filtrer :</span>
                <button class="admin-sort-btn ${ordersStatusFilter === 'all' ? 'active' : ''}" onclick="filterOrdersByStatus('all')">Toutes</button>
                <button class="admin-sort-btn status-pending ${ordersStatusFilter === 'pending' ? 'active' : ''}" onclick="filterOrdersByStatus('pending')">En attente</button>
                <button class="admin-sort-btn status-treated ${ordersStatusFilter === 'treated' ? 'active' : ''}" onclick="filterOrdersByStatus('treated')">Traitée</button>
                <button class="admin-sort-btn status-delivered ${ordersStatusFilter === 'delivered' ? 'active' : ''}" onclick="filterOrdersByStatus('delivered')">Livrée</button>
            </div>
        </div>
        <div class="admin-product-group">
            <div class="admin-product-group-header">
                <h3>Commandes</h3>
                <span class="admin-product-group-count">${filteredOrders.length}</span>
            </div>
            <div class="admin-product-group-list">
                ${renderOrderList(filteredOrders, 'Aucune commande')}
            </div>
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
    
    const status = orderStatusOf(order);
    const meta = ORDER_STATUS_META[status];

    document.getElementById('orderDetailsContent').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="margin:0;">Commande #${order.id}</h3>
            <span class="order-status-badge ${meta.class}">${meta.label}</span>
        </div>

        <p><strong>Date:</strong> ${new Date(order.date).toLocaleString('fr-FR')}</p>
        <p><strong>Total:</strong> ${order.total?.toFixed(2)}€</p>

        <div class="order-status-picker">
            ${Object.entries(ORDER_STATUS_META).map(([key, m]) => `
                <button class="order-status-option ${m.class} ${status === key ? 'active' : ''}" onclick="updateOrderStatus('${order.id}', '${key}')">${m.label}</button>
            `).join('')}
        </div>

        <h4 style="margin-top:1.5rem;">Articles:</h4>
        <div style="background:#f5f5f5;padding:1rem;border-radius:10px;">
            ${order.items.map(item => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid #ddd;">
                    <span style="font-weight:700;font-size:0.85rem;">${item.icon || ''} ${item.name}</span>
                    <div style="display:flex;align-items:center;gap:0.6rem;">
                        <span class="order-item-qty-badge">${formatQtyWithUnit(item.quantity, item.unit)}</span>
                        <span style="width:60px;text-align:right;flex-shrink:0;font-size:0.85rem;">${(item.quantity * item.price).toFixed(2)}€</span>
                    </div>
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
                ` : order.customerName ? `
            <div style="background:#f5f5f5;padding:1rem;border-radius:10px;">
                <p><strong>${escapeHtml(order.customerName)}</strong></p>
                ${order.customerPhone ? `<p>📞 ${escapeHtml(order.customerPhone)}</p>` : ''}
                <p style="font-size:0.8rem;color:var(--gray);margin-top:0.5rem;">Réservation sans compte</p>
            </div>
                ` : '<div style="background:#f5f5f5;padding:1rem;border-radius:10px;"><p>Utilisateur non trouvé</p></div>'}
        
        <div style="margin-top:1.5rem;display:flex;gap:0.75rem;">
            <button class="btn-primary btn-block" onclick="generateInvoicePDF('${order.id}')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:0.5rem;font-size:0.85rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                </svg>
                Éditer la facture
            </button>
            <button class="btn-danger btn-block" onclick="deleteOrder('${order.id}')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:0.5rem;font-size:0.85rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Supprimer définitivement
            </button>
        </div>
    `;

    modal.classList.add('active');
}


function goToUserFromOrder(userId) {
    closeOrderDetails();
    showAdminSection('users');
    setTimeout(() => showUserDetails(userId), 300);
}

async function updateOrderStatus(orderId, status) {
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/orders/${orderId}/status`), status);

        const order = DATA.orders.find(o => o.id === orderId);
        if (order) order.status = status;

        renderOrders();
        if (document.getElementById('orderDetailsModal')?.classList.contains('active')) {
            showOrderDetails(orderId);
        }

        showToast('Statut mis à jour : ' + ORDER_STATUS_META[status].label, 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

async function updateOrderNote(orderId, note) {
    const order = DATA.orders.find(o => o.id === orderId);
    if (!order) return;
    if ((order.note || '') === note) return;
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/orders/${orderId}/note`), note);
        order.note = note;
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la sauvegarde de la note', 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Supprimer définitivement cette commande ? Cette action est irréversible.')) return;
    try {
        await window.firebase.set(window.firebase.ref(db, `paniers-du-jardin/orders/${orderId}`), null);
        DATA.orders = DATA.orders.filter(o => o.id !== orderId);
        closeOrderDetails();
        renderOrders();
        showToast('Commande supprimée', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la suppression', 'error');
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




// ===== UTILISATEURS =====
function getGuestCustomersFromOrders() {
    const map = {};
    DATA.orders.forEach(o => {
        if (!o.customerName) return;
        const key = o.customerName.trim().toLowerCase();
        if (!map[key]) {
            map[key] = { name: o.customerName.trim(), phone: o.customerPhone || '', count: 0 };
        }
        if (!map[key].phone && o.customerPhone) map[key].phone = o.customerPhone;
        map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
}

function renderGuestCustomersList() {
    let guests = getGuestCustomersFromOrders();

    const query = usersSearchQuery.trim().toLowerCase();
    if (query) {
        guests = guests.filter(g =>
            g.name.toLowerCase().includes(query) ||
            (g.phone || '').toLowerCase().includes(query)
        );
    }

    if (guests.length === 0) return '';

    return `
        <div class="admin-product-group">
            <div class="admin-product-group-header">
                <h3>Clients</h3>
                <span class="admin-product-group-count">${guests.length}</span>
            </div>
            <div class="admin-product-group-list">
                ${guests.map(g => `
                    <div class="admin-row">
                        <div class="admin-row-left">
                            <span class="admin-row-name"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M367-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM160-240v-32q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v32q0 33-23.5 56.5T720-160H240q-33 0-56.5-23.5T160-240Zm80 0h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm296.5-343.5Q560-607 560-640t-23.5-56.5Q513-720 480-720t-56.5 23.5Q400-673 400-640t23.5 56.5Q447-560 480-560t56.5-23.5ZM480-640Zm0 400Z"/></svg> ${escapeHtml(g.name)}</span>
                            ${g.phone ? `<span class="admin-row-id"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/></svg> ${escapeHtml(g.phone)}</span>` : ''}
                        </div>
                        <div class="admin-row-right">
                            <span class="admin-row-badge ${g.count > 0 ? 'active' : ''}">${g.count} commande${g.count > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                `).join('<div class="admin-row-separator"></div>')}
            </div>
        </div>
    `;
}

function searchUsers(query) {
    usersSearchQuery = query;
    renderUsers();
    const input = document.getElementById('usersSearchInput');
    if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
    }
}

function renderUsers() {
    const container = document.getElementById('usersTable');

    const searchBar = `
        <div class="admin-search-bar ${usersSearchQuery ? 'has-value' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="usersSearchInput" placeholder="Rechercher par nom ou téléphone..."
                value="${escapeHtml(usersSearchQuery)}"
                oninput="searchUsers(this.value)">
            <button type="button" class="admin-search-clear" onclick="searchUsers('')" aria-label="Effacer la recherche">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
    `;

    if (DATA.users.length === 0) {
        container.innerHTML = searchBar + (renderGuestCustomersList() || '<p class="admin-product-empty">Aucun utilisateur inscrit</p>');
        return;
    }

    const getOrdersCount = (userId) => DATA.orders.filter(o => o.userId === userId).length;

    const query = usersSearchQuery.trim().toLowerCase();
    let sortedUsers = DATA.users.filter(u =>
        !query || `${u.firstName} ${u.lastName}`.toLowerCase().includes(query)
    ).sort((a, b) => {
        let valA, valB;
        switch (usersSortField) {
            case 'name':
                valA = `${a.firstName} ${a.lastName}`.toLowerCase();
                valB = `${b.firstName} ${b.lastName}`.toLowerCase();
                break;
            case 'orders':
                valA = getOrdersCount(a.id); valB = getOrdersCount(b.id); break;
            case 'created': default:
                valA = new Date(a.created || 0); valB = new Date(b.created || 0); break;
        }
        if (valA < valB) return usersSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return usersSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const sortIcon = (field) => usersSortField === field ? (usersSortOrder === 'asc' ? '↑' : '↓') : '↕';

    container.innerHTML = `
        ${searchBar}
        <div class="admin-list-sort">
            <span>Trier par :</span>
            <button class="admin-sort-btn ${usersSortField === 'name' ? 'active' : ''}" onclick="sortUsers('name')">Nom ${sortIcon('name')}</button>
            <button class="admin-sort-btn ${usersSortField === 'orders' ? 'active' : ''}" onclick="sortUsers('orders')">Commandes ${sortIcon('orders')}</button>
            <button class="admin-sort-btn ${usersSortField === 'created' ? 'active' : ''}" onclick="sortUsers('created')">Inscription ${sortIcon('created')}</button>
        </div>
        <div class="admin-product-group">
            <div class="admin-product-group-header">
                <span class="admin-product-group-dot available"></span>
                <h3>Utilisateurs</h3>
                <span class="admin-product-group-count">${sortedUsers.length}</span>
            </div>
            <div class="admin-product-group-list">
                ${sortedUsers.length === 0 ? '<p class="admin-product-empty">Aucun résultat</p>' : sortedUsers.map(user => {
                    const count = getOrdersCount(user.id);
                    return `
                        <div class="admin-row" onclick="showUserDetails('${user.id}')">
                            <div class="admin-row-left">
                                <span class="admin-row-name"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M367-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM160-240v-32q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v32q0 33-23.5 56.5T720-160H240q-33 0-56.5-23.5T160-240Zm80 0h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm296.5-343.5Q560-607 560-640t-23.5-56.5Q513-720 480-720t-56.5 23.5Q400-673 400-640t23.5 56.5Q447-560 480-560t56.5-23.5ZM480-640Zm0 400Z"/></svg> ${user.firstName} ${user.lastName}</span>
                            </div>
                            <div class="admin-row-right">
                                <span class="admin-row-badge ${count > 0 ? 'active' : ''}">${count} commande${count > 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    `;
                }).join('<div class="admin-row-separator"></div>')}
            </div>
        </div>
        ${renderGuestCustomersList()}
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
    closeModal('userDetailsModal');
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
                    <img src="${img}">
                <div class="carousel-image-check">${isSelected ? '✓' : ''}</div>
            </div>
        `;
    }).join('');

}

function closeProductModal() {
    closeModal('productModal');
}

function closeOrderDetails() {
    closeModal('orderDetailsModal');
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
    `).join('<div class="admin-row-separator"></div>');
    
    modal.classList.add('active');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeImagePicker();
    });
}

function closeImagePicker() {
    closeModal('imagePickerModal');
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

function generateInvoicePDF(orderId) {
    const order = DATA.orders.find(o => o.id === orderId);
    if (!order) return;
    const user = DATA.users.find(u => u.id === order.userId);
    const shop = DATA.settings;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const primary = [74, 124, 78];
    const gray = [90, 108, 90];
    const lightBg = [232, 245, 233];

    // --- En-tête commerce ---
    doc.setFontSize(22);
    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.text(shop.shopName || 'Paniers du Jardin', 20, 25);

    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    let headerY = 32;
    if (shop.address) { doc.text(shop.address, 20, headerY); headerY += 5; }
    if (shop.phone) { doc.text(shop.phone, 20, headerY); headerY += 5; }
    if (shop.email) { doc.text(shop.email, 20, headerY); headerY += 5; }

    // --- Titre FACTURE ---
    doc.setFontSize(28);
    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE', 190, 25, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° ${order.id}`, 190, 33, { align: 'right' });
    doc.text(`Date : ${new Date(order.date).toLocaleDateString('fr-FR')}`, 190, 39, { align: 'right' });

    // --- Ligne séparatrice ---
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.5);
    doc.line(20, 50, 190, 50);

    // --- Client ---
    doc.setFontSize(10);
    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Facturé à :', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    let clientY = 67;
    if (user) {
        doc.text(`${user.firstName || ''} ${user.lastName || ''}`, 20, clientY); clientY += 6;
        doc.text(user.email || '', 20, clientY); clientY += 6;
        if (user.phone) { doc.text(user.phone, 20, clientY); clientY += 6; }
    } else if (order.customerName) {
        doc.text(order.customerName, 20, clientY); clientY += 6;
        if (order.customerPhone) { doc.text(order.customerPhone, 20, clientY); clientY += 6; }
    } else {
        doc.text('Client inconnu', 20, clientY); clientY += 6;
    }

    // --- Tableau des articles ---
    let tableY = clientY + 10;

    // En-tête du tableau
    doc.setFillColor(...lightBg);
    doc.roundedRect(20, tableY, 170, 10, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Produit', 25, tableY + 7);
    doc.text('Qté', 110, tableY + 7, { align: 'center' });
    doc.text('Prix unit.', 140, tableY + 7, { align: 'center' });
    doc.text('Total', 185, tableY + 7, { align: 'right' });

    tableY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    // Lignes des articles
    order.items.forEach((item, i) => {
        if (tableY > 260) {
            doc.addPage();
            tableY = 20;
        }

        if (i % 2 === 0) {
            doc.setFillColor(248, 250, 248);
            doc.rect(20, tableY - 5, 170, 9, 'F');
        }

        doc.setFontSize(9);
        doc.text(item.name, 25, tableY);
        doc.text(String(item.quantity), 110, tableY, { align: 'center' });
        doc.text(`${item.price.toFixed(2)} €`, 140, tableY, { align: 'center' });
        doc.text(`${(item.quantity * item.price).toFixed(2)} €`, 185, tableY, { align: 'right' });
        tableY += 9;
    });

    // --- Ligne avant total ---
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, tableY, 190, tableY);
    tableY += 10;

    // --- Total ---
    doc.setFillColor(...primary);
    doc.roundedRect(120, tableY - 5, 70, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total : ${order.total.toFixed(2)} €`, 155, tableY + 3, { align: 'center' });

    // --- Pied de page ---
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text('Merci pour votre commande ! Le paiement se fait sur place lors du retrait.', 105, 280, { align: 'center' });
    doc.text(`${shop.shopName || 'Paniers du Jardin'} — ${shop.address || ''}`, 105, 286, { align: 'center' });

    // --- Télécharger ---
    doc.save(`facture-${order.id}.pdf`);
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


