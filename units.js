// Unités de vente des produits — partagé entre le site (script.js) et l'admin (admin.js)
const PRODUCT_UNITS = {
    kg: { value: 'kg', label: 'Au kilo', shortLabel: 'kg', priceSuffix: '€/kg', step: 0.5, defaultQty: 1 },
    lot250g: { value: 'lot250g', label: 'Lot de 250g', shortLabel: 'lot de 250g', priceSuffix: '€/lot 250g', step: 1, defaultQty: 1 },
    piece: { value: 'piece', label: 'À la pièce', shortLabel: 'pièce', priceSuffix: '€/pièce', step: 1, defaultQty: 1 }
};

function getUnitMeta(unit) {
    return PRODUCT_UNITS[unit] || PRODUCT_UNITS.kg;
}

function formatUnitPrice(price, unit) {
    return `${Number(price || 0).toFixed(2)} ${getUnitMeta(unit).priceSuffix}`;
}

function formatQtyWithUnit(qty, unit) {
    const meta = getUnitMeta(unit);
    if (unit === 'piece') return `${qty} ${qty > 1 ? 'pièces' : 'pièce'}`;
    if (unit === 'lot250g') return `${qty} ${qty > 1 ? 'lots' : 'lot'} de 250g`;
    return `${qty} kg`;
}
