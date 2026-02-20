// Firebase Admin Panel JavaScript

// Check if Firebase is available
const useFirebase = typeof db !== 'undefined' && db !== null;

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
    removeImage(); // Clear image preview
});

// Cancel form
document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('productForm').style.display = 'none';
    document.getElementById('productFormElement').reset();
    removeImage(); // Clear image preview
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

    const product = {
        sku: productSKU,
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        size: document.getElementById('productSize').value || '',
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        image: document.getElementById('productImage').value,
        description: document.getElementById('productDescription').value
    };

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
    document.getElementById('productImage').value = product.image;
    document.getElementById('productDescription').value = product.description || '';

    // Show existing image preview
    if (product.image) {
        const dropZone = document.getElementById('imageDropZone');
        const imagePreview = document.getElementById('imagePreview');

        dropZone.style.display = 'none';
        imagePreview.style.display = 'block';
        document.getElementById('previewImg').src = product.image;
        uploadedImageURL = product.image;
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
let uploadedImageURL = '';
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

// Setup image upload
function setupImageUpload() {
    const dropZone = document.getElementById('imageDropZone');
    const fileInput = document.getElementById('imageFileInput');
    const urlInput = document.getElementById('productImageURL');

    if (!dropZone || !fileInput) return;

    // Click to select file
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File selected
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageFile(file);
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
        const file = e.dataTransfer.files[0];
        if (file) handleImageFile(file);
    });

    // URL input with auto-conversion for ImgBB/Imgur page URLs
    urlInput.addEventListener('input', (e) => {
        let url = e.target.value.trim();

        if (url) {
            // Auto-convert ImgBB page URL to direct image URL
            if (url.includes('ibb.co/') && !url.includes('i.ibb.co')) {
                // Extract image ID and convert to direct URL
                const match = url.match(/ibb\.co\/([a-zA-Z0-9]+)/);
                if (match) {
                    alert('⚠️ Please use the DIRECT image URL, not the page URL.\n\n📌 Right-click on the image → "Copy image address"');
                }
            }

            // Auto-convert Imgur page URL to direct image URL
            if (url.includes('imgur.com/') && !url.includes('i.imgur.com')) {
                const match = url.match(/imgur\.com\/([a-zA-Z0-9]+)/);
                if (match) {
                    url = `https://i.imgur.com/${match[1]}.jpg`;
                    urlInput.value = url;
                    alert('✅ Auto-converted to direct Imgur URL!');
                }
            }

            document.getElementById('productImage').value = url;
        }
    });
}

// Handle image file upload - Using Base64 encoding (works everywhere!)
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

// Remove uploaded image
function removeImage() {
    const dropZone = document.getElementById('imageDropZone');
    const imagePreview = document.getElementById('imagePreview');
    const fileInput = document.getElementById('imageFileInput');

    uploadedImageURL = '';
    document.getElementById('productImage').value = '';
    fileInput.value = '';

    imagePreview.style.display = 'none';
    dropZone.style.display = 'block';
}

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
});
