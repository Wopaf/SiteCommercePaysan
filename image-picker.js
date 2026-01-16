// ==== GESTIONNAIRE D'IMAGES DEPUIS GITHUB ====

const GITHUB_MEDIA_URL = 'https://raw.githubusercontent.com/VOTRE_USERNAME/VOTRE_REPO/main/medias/';

// Liste des images disponibles (à mettre à jour manuellement)
const AVAILABLE_IMAGES = [
    'carousel-1.jpg',
    'carousel-2.jpg',
    'carousel-3.jpg',
    'tomate.jpg',
    'carotte.jpg',
    'pomme.jpg',
    'salade.jpg',
    'banane.jpg',
    'fraise.jpg',
    // Ajoutez vos images ici
];

function openImagePicker(callback) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:800px;">
            <div class="modal-header">
                <h3>Choisir une image</h3>
                <button onclick="this.closest('.modal').remove()" class="close-modal">✕</button>
            </div>
            <div class="modal-body">
                <div class="image-picker-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(150px, 1fr));gap:1rem;">
                    ${AVAILABLE_IMAGES.map(img => `
                        <div class="image-picker-item" style="cursor:pointer;border:3px solid transparent;border-radius:10px;overflow:hidden;transition:0.3s;" onclick="selectImage('${img}', this)">
                            <img src="${GITHUB_MEDIA_URL}${img}" style="width:100%;height:150px;object-fit:cover;" onerror="this.src='https://via.placeholder.com/150'">
                            <p style="text-align:center;padding:0.5rem;font-size:0.8rem;background:#f5f5f5;">${img}</p>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top:2rem;">
                    <h4>Ou entrez une URL personnalisée :</h4>
                    <input type="url" id="customImageUrl" class="input-field" placeholder="https://exemple.com/image.jpg">
                </div>
                <div class="form-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn-primary" onclick="confirmImageSelection()">Valider</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Stocker le callback
    window.imagePickerCallback = callback;
    window.selectedImage = null;
    
    // Fermer en cliquant sur l'overlay
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function selectImage(imageName, element) {
    // Retirer sélection précédente
    document.querySelectorAll('.image-picker-item').forEach(item => {
        item.style.border = '3px solid transparent';
    });
    
    // Sélectionner
    element.style.border = '3px solid #4a7c4e';
    window.selectedImage = GITHUB_MEDIA_URL + imageName;
}

function confirmImageSelection() {
    const customUrl = document.getElementById('customImageUrl').value;
    const finalUrl = customUrl || window.selectedImage;
    
    if (!finalUrl) {
        alert('Veuillez sélectionner une image ou entrer une URL');
        return;
    }
    
    if (window.imagePickerCallback) {
        window.imagePickerCallback(finalUrl);
    }
    
    // Fermer modal
    document.querySelector('.image-picker-grid').closest('.modal').remove();
}

// ==== UTILISATION ====
// Dans admin.js, remplacer les inputs d'URL par :
// <button onclick="openImagePicker((url) => { document.getElementById('productImageUrl').value = url; })">
//     Choisir une image
// </button>
