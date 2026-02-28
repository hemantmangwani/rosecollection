// Firebase Admin Panel JavaScript

// useFirebase is defined in firebase-config.js

// Fallback credentials for localStorage mode
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Check if user is logged in
function isLoggedIn() {
    if (useFirebase && auth) {
        return auth.currentUser !== null;
    }
    return sessionStorage.getItem('adminLoggedIn') === 'true';
}

// Show login modal or dashboard
async function checkAuth() {
    const loginModal = document.getElementById('loginModal');
    const adminDashboard = document.getElementById('adminDashboard');

    if (useFirebase && auth) {
        // Firebase authentication
        auth.onAuthStateChanged(user => {
            if (user) {
                loginModal.style.display = 'none';
                adminDashboard.style.display = 'block';
                loadProducts();
            } else {
                loginModal.style.display = 'flex';
                adminDashboard.style.display = 'none';
            }
        });
    } else {
        // Fallback to simple login
        if (isLoggedIn()) {
            loginModal.style.display = 'none';
            adminDashboard.style.display = 'block';
            loadProducts();
        } else {
            loginModal.style.display = 'flex';
            adminDashboard.style.display = 'none';
        }
    }
}

// Handle login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (useFirebase && auth) {
        // Firebase email/password authentication
        try {
            await auth.signInWithEmailAndPassword(username, password);
            // Success - auth state listener will handle UI
        } catch (error) {
            console.error('Login error:', error);
            alert('Invalid credentials! Error: ' + error.message);
        }
    } else {
        // Fallback simple login
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            checkAuth();
        } else {
            alert('Invalid credentials! Default: admin / admin123');
        }
    }
});

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();

    if (useFirebase && auth) {
        await auth.signOut();
    } else {
        sessionStorage.removeItem('adminLoggedIn');
        checkAuth();
    }
});

// Show add product form
document.getElementById('addProductBtn').addEventListener('click', () => {
    document.getElementById('productForm').style.display = 'block';
    document.getElementById('formTitle').textContent = 'Add New Product';
    document.getElementById('productFormElement').reset();
    document.getElementById('productId').value = '';
    clearAllImages(); // Clear all image previews

    // Re-initialize image upload in case it wasn't initialized earlier
    setTimeout(() => setupImageUpload(), 100);
});

// Cancel form
document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('productForm').style.display = 'none';
    document.getElementById('productFormElement').reset();
    clearAllImages(); // Clear all image previews
});

// Handle product form submission
document.getElementById('productFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();

    const productId = document.getElementById('productId').value;
    const productSKU = document.getElementById('productSKU').value.trim();

    // Check if SKU is unique (only for new products or if SKU changed)
    if (useFirebase && !productId) {
        const existingSKU = await checkSKUExists(productSKU);
        if (existingSKU) {
            alert('⚠️ This Product Number already exists! Please use a unique number.');
            return;
        }
    }

    // Get images from new multiple images field, fallback to single image for backward compatibility
    const imagesField = document.getElementById('productImages');
    let images = [];

    // First, check if uploadedImageURLs array has any images
    if (uploadedImageURLs && uploadedImageURLs.length > 0) {
        images = uploadedImageURLs;
    } else if (imagesField && imagesField.value) {
        try {
            images = JSON.parse(imagesField.value);
        } catch (e) {
            if (imagesField.value) {
                images = [imagesField.value];
            }
        }
    } else {
        // Fallback to old single image field if exists
        const oldImageField = document.getElementById('productImage');
        if (oldImageField && oldImageField.value) {
            images = [oldImageField.value];
        }
    }

    if (!images || images.length === 0) {
        alert('⚠️ Please add at least one product image!');
        return;
    }

    // Get color variants if enabled
    const enableColorVariants = document.getElementById('enableColorVariants');
    const hasColorVariants = enableColorVariants && enableColorVariants.checked && colorVariants.length > 0;

    const product = {
        sku: productSKU,
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        size: document.getElementById('productSize').value || '',
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        images: images, // Array of image URLs
        image: images[0], // Primary image for backward compatibility
        description: document.getElementById('productDescription').value,
        hasColorVariants: hasColorVariants,
        colorVariants: hasColorVariants ? colorVariants : []
    };

    console.log('Saving product with color variants:', product);

    if (useFirebase) {
        // Firebase mode
        let result;
        if (productId) {
            result = await updateProductInFirebase(productId, product);
        } else {
            result = await addProductToFirebase(product);
        }

        if (result.success) {
            alert(productId ? 'Product updated successfully!' : 'Product added successfully!');
            document.getElementById('productForm').style.display = 'none';
            document.getElementById('productFormElement').reset();
            clearAllImages(); // Clear all image previews
            // Products will update automatically via real-time listener
        } else {
            alert('Error: ' + result.error);
        }
    } else {
        // LocalStorage fallback mode
        let products = getProductsFromLocalStorage();

        if (productId) {
            products = products.map(p => p.id == productId ? { ...product, id: productId } : p);
        } else {
            products.push({ ...product, id: Date.now() });
        }

        saveProductsToLocalStorage(products);
        loadProducts();
        document.getElementById('productForm').style.display = 'none';
        document.getElementById('productFormElement').reset();
        clearAllImages(); // Clear all image previews
    }
});

// Load products in table
async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    const noProductsAdmin = document.getElementById('noProductsAdmin');

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;"><div class="loading"></div> Loading...</td></tr>';

    let products = [];

    if (useFirebase) {
        // Set up real-time listener
        listenToProducts((updatedProducts) => {
            products = updatedProducts;
            displayProductsInTable(products, tbody, noProductsAdmin);
        });
    } else {
        products = getProductsFromLocalStorage();
        displayProductsInTable(products, tbody, noProductsAdmin);
    }
}

// Check if SKU already exists
async function checkSKUExists(sku) {
    if (!useFirebase) return false;

    try {
        const snapshot = await db.collection('products')
            .where('sku', '==', sku)
            .get();
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking SKU:', error);
        return false;
    }
}

// Display products in table
function displayProductsInTable(products, tbody, noProductsAdmin) {
    if (products.length === 0) {
        tbody.innerHTML = '';
        noProductsAdmin.style.display = 'block';
        return;
    }

    noProductsAdmin.style.display = 'none';
    tbody.innerHTML = products.map(product => `
        <tr>
            <td><img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'"></td>
            <td><strong style="color: #d4447e;">${product.sku || 'N/A'}</strong></td>
            <td>${product.name}${product.size ? '<br><small>Size: ' + product.size + '</small>' : ''}</td>
            <td><span style="text-transform: capitalize;">${product.category}</span></td>
            <td>₹${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.stock}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editProduct('${product.id}', ${JSON.stringify(product).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Edit product
function editProduct(id, product) {
    document.getElementById('productForm').style.display = 'block';
    document.getElementById('formTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = id;
    document.getElementById('productSKU').value = product.sku || '';
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productSize').value = product.size || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDescription').value = product.description || '';

    // Handle images - support both new (array) and old (single image) formats
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        // New format with multiple images
        uploadedImageURLs = [...product.images];
        document.getElementById('productImages').value = JSON.stringify(product.images);
        displayImagesPreview('imagesPreviewContainer');
    } else if (product.image) {
        // Old format with single image - convert to array
        uploadedImageURLs = [product.image];
        document.getElementById('productImages').value = JSON.stringify([product.image]);
        displayImagesPreview('imagesPreviewContainer');
    }

    // Load color variants if available
    if (product.hasColorVariants && product.colorVariants && product.colorVariants.length > 0) {
        loadColorVariants(product.colorVariants);
    }

    // Scroll to form
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

// Delete product
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    if (useFirebase) {
        const result = await deleteProductFromFirebase(id);
        if (result.success) {
            alert('Product deleted successfully!');
            // Products will update automatically via real-time listener
        } else {
            alert('Error deleting product: ' + result.error);
        }
    } else {
        let products = getProductsFromLocalStorage();
        products = products.filter(p => p.id != id);
        saveProductsToLocalStorage(products);
        loadProducts();
    }
}

// LocalStorage helper functions (fallback)
function getProductsFromLocalStorage() {
    const products = localStorage.getItem('roseCollectionProducts');
    return products ? JSON.parse(products) : [];
}

function saveProductsToLocalStorage(products) {
    localStorage.setItem('roseCollectionProducts', JSON.stringify(products));
}

// Image Upload Functionality
let uploadedImageURLs = []; // Changed to array for multiple images
let storage = null;

// Initialize Firebase Storage
if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    storage = firebase.storage();
}

// Switch between upload methods
function switchUploadMethod(method) {
    const uploadMethod = document.getElementById('uploadMethod');
    const urlMethod = document.getElementById('urlMethod');
    const tabs = document.querySelectorAll('.upload-tab');

    tabs.forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-method="${method}"]`).classList.add('active');

    if (method === 'upload') {
        uploadMethod.classList.add('active');
        urlMethod.classList.remove('active');
    } else {
        uploadMethod.classList.remove('active');
        urlMethod.classList.add('active');
    }
}

// Track if image upload is initialized to prevent duplicate listeners
let imageUploadInitialized = false;

// Setup image upload
function setupImageUpload() {
    const dropZone = document.getElementById('imageDropZone');
    const fileInput = document.getElementById('imageFileInput');

    if (!dropZone || !fileInput) {
        console.log('Image upload elements not found, will initialize when form is shown');
        return;
    }

    // Prevent duplicate initialization
    if (imageUploadInitialized) {
        return;
    }
    imageUploadInitialized = true;

    // Click to select files
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Files selected
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) handleImageFiles(files);
    });

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) handleImageFiles(files);
    });

    console.log('✅ Image upload initialized');
}

// Add image URLs from textarea
function addImageURLs() {
    const urlsTextarea = document.getElementById('productImageURLs');
    if (!urlsTextarea) {
        console.error('URL textarea not found');
        return;
    }

    const urls = urlsTextarea.value.trim().split('\n').filter(url => url.trim());

    console.log('Raw URLs:', urls);

    if (urls.length === 0) {
        alert('Please enter at least one image URL');
        return;
    }

    // Validate and add URLs
    const validUrls = [];
    const invalidUrls = [];

    for (let url of urls) {
        url = url.trim();
        if (url) {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                validUrls.push(url);
            } else {
                invalidUrls.push(url);
            }
        }
    }

    console.log('Valid URLs:', validUrls);
    console.log('Invalid URLs:', invalidUrls);

    if (validUrls.length === 0) {
        let errorMsg = 'No valid URLs found. Please enter valid URLs starting with http:// or https://';
        if (invalidUrls.length > 0) {
            errorMsg += '\n\nInvalid URLs found:\n' + invalidUrls.join('\n');
        }
        alert(errorMsg);
        return;
    }

    if (invalidUrls.length > 0) {
        console.warn('Skipping invalid URLs:', invalidUrls);
    }

    // Add to uploadedImageURLs
    uploadedImageURLs = [...uploadedImageURLs, ...validUrls];

    console.log('Total images in array:', uploadedImageURLs.length);
    console.log('uploadedImageURLs:', uploadedImageURLs);

    // Update hidden field
    const productImagesField = document.getElementById('productImages');
    if (productImagesField) {
        productImagesField.value = JSON.stringify(uploadedImageURLs);
        console.log('Hidden field updated:', productImagesField.value);
    }

    // Show preview
    displayImagesPreview('urlImagesPreviewContainer');

    // Clear textarea
    urlsTextarea.value = '';

    alert(`✅ ${validUrls.length} image(s) added successfully!\n\nTotal images: ${uploadedImageURLs.length}`);
}

// Make globally available
window.addImageURLs = addImageURLs;

// Handle multiple image files upload
async function handleImageFiles(files) {
    const dropZone = document.getElementById('imageDropZone');
    const uploadProgress = document.getElementById('uploadProgress');

    dropZone.style.display = 'none';
    uploadProgress.style.display = 'block';

    let successCount = 0;
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith('image/')) {
            alert(`❌ ${file.name} is not an image file!`);
            continue;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert(`❌ ${file.name} is too large! Max 10MB`);
            continue;
        }

        document.getElementById('progressText').textContent = `Uploading ${i + 1} of ${totalFiles}...`;
        document.getElementById('progressFill').style.width = `${((i + 1) / totalFiles) * 100}%`;

        const imageURL = await uploadSingleImage(file);
        if (imageURL) {
            uploadedImageURLs.push(imageURL);
            successCount++;
        }
    }

    uploadProgress.style.display = 'none';
    dropZone.style.display = 'block';

    if (successCount > 0) {
        // Update hidden field
        document.getElementById('productImages').value = JSON.stringify(uploadedImageURLs);

        // Show preview
        displayImagesPreview('imagesPreviewContainer');

        alert(`✅ ${successCount} image(s) uploaded successfully!`);
    }
}

// Upload single image and return URL
async function uploadSingleImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = async function(e) {
            const base64Image = e.target.result.split(',')[1];

            try {
                const formData = new FormData();
                formData.append('image', base64Image);

                const response = await fetch('https://api.imgbb.com/1/upload?key=d607b8116e90c07a5e744b85634be0fc', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success && result.data) {
                    const imageURL = result.data.image?.url || result.data.display_url || result.data.url;
                    console.log('✅ Image uploaded:', imageURL);
                    resolve(imageURL);
                } else {
                    console.error('❌ Upload failed for', file.name);
                    resolve(null);
                }
            } catch (error) {
                console.error('❌ Upload error:', error);
                resolve(null);
            }
        };

        reader.readAsDataURL(file);
    });
}

// Display images preview with remove buttons
function displayImagesPreview(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    uploadedImageURLs.forEach((url, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        previewItem.innerHTML = `
            <img src="${url}" alt="Product Image ${index + 1}">
            <button type="button" class="remove-btn" onclick="removeImageFromList(${index})">
                <i class="fas fa-times"></i>
            </button>
            ${index === 0 ? '<span class="primary-badge">Primary</span>' : ''}
        `;
        container.appendChild(previewItem);
    });
}

// Remove image from list
function removeImageFromList(index) {
    uploadedImageURLs.splice(index, 1);
    document.getElementById('productImages').value = JSON.stringify(uploadedImageURLs);

    // Refresh both previews
    displayImagesPreview('imagesPreviewContainer');
    displayImagesPreview('urlImagesPreviewContainer');
}

// Handle image file upload - Using Base64 encoding (works everywhere!) - DEPRECATED (kept for compatibility)
async function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('❌ Please select an image file!');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('❌ Image is too large! Max 10MB');
        return;
    }

    // Show progress
    const dropZone = document.getElementById('imageDropZone');
    const uploadProgress = document.getElementById('uploadProgress');
    const imagePreview = document.getElementById('imagePreview');

    dropZone.style.display = 'none';
    uploadProgress.style.display = 'block';
    document.getElementById('progressText').textContent = 'Uploading image...';

    try {
        // Convert image to base64
        const reader = new FileReader();

        reader.onload = async function(e) {
            const base64Image = e.target.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix

            // Try ImgBB first
            try {
                document.getElementById('progressText').textContent = 'Uploading to ImgBB...';

                const formData = new FormData();
                formData.append('image', base64Image);

                const response = await fetch('https://api.imgbb.com/1/upload?key=d607b8116e90c07a5e744b85634be0fc', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success && result.data) {
                    // Try different URL formats to find working one
                    const imageURL = result.data.image?.url || result.data.display_url || result.data.url;
                    uploadedImageURL = imageURL;

                    document.getElementById('productImage').value = imageURL;

                    uploadProgress.style.display = 'none';
                    imagePreview.style.display = 'block';
                    document.getElementById('previewImg').src = imageURL;

                    console.log('✅ Image uploaded successfully!');
                    console.log('📋 Image URL:', imageURL);
                } else {
                    throw new Error('ImgBB upload failed');
                }
            } catch (imgbbError) {
                console.error('ImgBB error:', imgbbError);
                // Fallback to Imgur
                await uploadToImgur(base64Image, dropZone, uploadProgress, imagePreview);
            }
        };

        reader.onerror = function() {
            alert('❌ Failed to read image file');
            dropZone.style.display = 'block';
            uploadProgress.style.display = 'none';
        };

        reader.readAsDataURL(file);

    } catch (error) {
        console.error('Upload error:', error);
        alert('❌ Upload failed: ' + error.message);
        dropZone.style.display = 'block';
        uploadProgress.style.display = 'none';
    }
}

// Alternative upload to Imgur (if ImgBB fails)
async function uploadToImgur(base64Image, dropZone, uploadProgress, imagePreview) {
    try {
        document.getElementById('progressText').textContent = 'Uploading to Imgur...';

        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                'Authorization': 'Client-ID 546c25a59c58ad7',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Image,
                type: 'base64'
            })
        });

        const result = await response.json();

        if (result.success && result.data && result.data.link) {
            const imageURL = result.data.link;
            uploadedImageURL = imageURL;

            document.getElementById('productImage').value = imageURL;

            uploadProgress.style.display = 'none';
            imagePreview.style.display = 'block';
            document.getElementById('previewImg').src = imageURL;

            console.log('✅ Image uploaded to Imgur:', imageURL);
        } else {
            throw new Error('Imgur upload failed');
        }
    } catch (error) {
        console.error('Imgur upload error:', error);
        alert('❌ Both upload services failed.\n\n📌 Solution:\n1. Click "Use URL" tab\n2. Go to https://imgbb.com\n3. Upload your image there\n4. Copy the direct link\n5. Paste it here');
        dropZone.style.display = 'block';
        uploadProgress.style.display = 'none';
    }
}

// Remove uploaded image (legacy - for backward compatibility)
function removeImage() {
    const dropZone = document.getElementById('imageDropZone');
    const imagePreview = document.getElementById('imagePreview');
    const fileInput = document.getElementById('imageFileInput');

    uploadedImageURL = '';
    const oldImageField = document.getElementById('productImage');
    if (oldImageField) oldImageField.value = '';
    if (fileInput) fileInput.value = '';

    if (imagePreview) imagePreview.style.display = 'none';
    if (dropZone) dropZone.style.display = 'block';
}

// Clear all images for multiple image upload
function clearAllImages() {
    uploadedImageURLs = [];
    const fileInput = document.getElementById('imageFileInput');
    const dropZone = document.getElementById('imageDropZone');
    const urlsTextarea = document.getElementById('productImageURLs');
    const productImagesField = document.getElementById('productImages');

    if (fileInput) fileInput.value = '';
    if (urlsTextarea) urlsTextarea.value = '';
    if (productImagesField) productImagesField.value = '';

    // Clear preview containers
    const containers = ['imagesPreviewContainer', 'urlImagesPreviewContainer'];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';
    });

    if (dropZone) dropZone.style.display = 'block';

    // Clear color variants
    colorVariants = [];
    const enableColorVariantsCheckbox = document.getElementById('enableColorVariants');
    if (enableColorVariantsCheckbox) {
        enableColorVariantsCheckbox.checked = false;
    }
    const colorVariantsContainer = document.getElementById('colorVariantsContainer');
    if (colorVariantsContainer) {
        colorVariantsContainer.style.display = 'none';
    }
    const colorVariantsList = document.getElementById('colorVariantsList');
    if (colorVariantsList) {
        colorVariantsList.innerHTML = '';
    }
    const productColorVariantsField = document.getElementById('productColorVariants');
    if (productColorVariantsField) {
        productColorVariantsField.value = '';
    }

    // Also clear old single image for backward compatibility
    removeImage();
}

// Make functions globally available
window.removeImageFromList = removeImageFromList;
window.addImageURLs = addImageURLs;
window.clearAllImages = clearAllImages;

// Tab switching functionality
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.admin-tab');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            const targetContent = document.getElementById(tabName + 'Tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Load data for the active tab
            if (tabName === 'products') {
                loadProducts();
            } else if (tabName === 'categories') {
                loadCategoriesForAdmin();
            } else if (tabName === 'orders') {
                if (typeof loadOrders === 'function') {
                    loadOrders();
                }
            }
        });
    });
}

// ============================================
// Color Variants Management
// ============================================

let colorVariants = [];
let variantCounter = 0;

// Toggle color variants section
function toggleColorVariants() {
    const checkbox = document.getElementById('enableColorVariants');
    const container = document.getElementById('colorVariantsContainer');

    if (checkbox && container) {
        container.style.display = checkbox.checked ? 'block' : 'none';

        if (!checkbox.checked) {
            // Clear variants when disabled
            colorVariants = [];
            document.getElementById('colorVariantsList').innerHTML = '';
            document.getElementById('productColorVariants').value = '';
        }
    }
}

// Add color variant
function addColorVariant() {
    const variantId = `variant_${variantCounter++}`;

    const variant = {
        id: variantId,
        colorName: '',
        colorHex: '#ff6b9d',
        images: [],
        stock: 0
    };

    colorVariants.push(variant);

    const variantsList = document.getElementById('colorVariantsList');
    const variantHTML = `
        <div class="color-variant-item" data-variant-id="${variantId}">
            <div class="variant-header">
                <h4><i class="fas fa-palette"></i> Color Variant #${colorVariants.length}</h4>
                <button type="button" class="btn-remove-variant" onclick="removeColorVariant('${variantId}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>

            <div class="variant-fields">
                <div class="variant-field">
                    <label>Color Name *</label>
                    <input type="text" class="variant-color-name" placeholder="e.g., Red, Blue, Black"
                           onchange="updateVariant('${variantId}', 'colorName', this.value)" required>
                </div>

                <div class="variant-field">
                    <label>Color Code</label>
                    <div class="color-picker-group">
                        <input type="color" class="variant-color-hex" value="#ff6b9d"
                               onchange="updateVariant('${variantId}', 'colorHex', this.value)">
                        <input type="text" class="variant-color-hex-text" value="#ff6b9d" readonly>
                    </div>
                </div>

                <div class="variant-field">
                    <label>Stock Quantity *</label>
                    <input type="number" class="variant-stock" min="0" value="0" placeholder="Available stock"
                           onchange="updateVariant('${variantId}', 'stock', this.value)" required>
                </div>
            </div>

            <div class="variant-images-section">
                <h5><i class="fas fa-images"></i> Images for this color (one URL per line)</h5>
                <textarea class="variant-image-urls" placeholder="https://example.com/red-product-1.jpg&#10;https://example.com/red-product-2.jpg"
                          onchange="updateVariantImages('${variantId}', this.value)"></textarea>
                <div class="variant-images-preview" data-variant-id="${variantId}"></div>
            </div>
        </div>
    `;

    variantsList.insertAdjacentHTML('beforeend', variantHTML);
    updateColorVariantsField();
}

// Remove color variant
function removeColorVariant(variantId) {
    if (!confirm('Remove this color variant?')) return;

    colorVariants = colorVariants.filter(v => v.id !== variantId);
    const variantElement = document.querySelector(`[data-variant-id="${variantId}"]`);
    if (variantElement) {
        variantElement.remove();
    }

    updateColorVariantsField();
}

// Update variant field
function updateVariant(variantId, field, value) {
    const variant = colorVariants.find(v => v.id === variantId);
    if (variant) {
        if (field === 'stock') {
            variant[field] = parseInt(value) || 0;
        } else {
            variant[field] = value;
        }

        // Sync color hex display
        if (field === 'colorHex') {
            const variantElement = document.querySelector(`[data-variant-id="${variantId}"]`);
            if (variantElement) {
                const hexText = variantElement.querySelector('.variant-color-hex-text');
                if (hexText) hexText.value = value;
            }
        }

        updateColorVariantsField();
    }
}

// Update variant images
function updateVariantImages(variantId, urlsText) {
    const variant = colorVariants.find(v => v.id === variantId);
    if (!variant) return;

    const urls = urlsText.split('\n')
        .map(url => url.trim())
        .filter(url => url && (url.startsWith('http://') || url.startsWith('https://')));

    variant.images = urls;

    // Update preview
    const previewContainer = document.querySelector(`.variant-images-preview[data-variant-id="${variantId}"]`);
    if (previewContainer) {
        previewContainer.innerHTML = urls.map(url => `
            <div class="variant-image-preview">
                <img src="${url}" alt="Variant image">
            </div>
        `).join('');
    }

    updateColorVariantsField();
}

// Update hidden field with all variants data
function updateColorVariantsField() {
    const field = document.getElementById('productColorVariants');
    if (field) {
        field.value = JSON.stringify(colorVariants);
        console.log('Color variants updated:', colorVariants);
    }
}

// Load variants when editing product
function loadColorVariants(variants) {
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
        return;
    }

    // Enable color variants
    const checkbox = document.getElementById('enableColorVariants');
    if (checkbox) {
        checkbox.checked = true;
        toggleColorVariants();
    }

    // Clear existing
    colorVariants = [];
    document.getElementById('colorVariantsList').innerHTML = '';

    // Add each variant
    variants.forEach(variantData => {
        addColorVariant();
        const variantId = colorVariants[colorVariants.length - 1].id;
        const variant = colorVariants.find(v => v.id === variantId);

        if (variant) {
            variant.colorName = variantData.colorName || '';
            variant.colorHex = variantData.colorHex || '#ff6b9d';
            variant.images = variantData.images || [];
            variant.stock = variantData.stock || 0;

            // Update UI
            const variantElement = document.querySelector(`[data-variant-id="${variantId}"]`);
            if (variantElement) {
                variantElement.querySelector('.variant-color-name').value = variant.colorName;
                variantElement.querySelector('.variant-color-hex').value = variant.colorHex;
                variantElement.querySelector('.variant-color-hex-text').value = variant.colorHex;
                variantElement.querySelector('.variant-stock').value = variant.stock;
                variantElement.querySelector('.variant-image-urls').value = variant.images.join('\n');

                // Update preview
                updateVariantImages(variantId, variant.images.join('\n'));
            }
        }
    });
}

// Make functions globally available
window.toggleColorVariants = toggleColorVariants;
window.addColorVariant = addColorVariant;
window.removeColorVariant = removeColorVariant;
window.updateVariant = updateVariant;
window.updateVariantImages = updateVariantImages;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (useFirebase) {
        console.log('🔥 Admin panel using Firebase');
    } else {
        console.log('💾 Admin panel using localStorage (Firebase not configured)');
    }
    checkAuth();
    setupImageUpload();
    initCategoryManagement();
    setupTabSwitching();
});
