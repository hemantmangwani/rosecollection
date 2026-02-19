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
});

// Cancel form
document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('productForm').style.display = 'none';
    document.getElementById('productFormElement').reset();
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (useFirebase) {
        console.log('🔥 Admin panel using Firebase');
    } else {
        console.log('💾 Admin panel using localStorage (Firebase not configured)');
    }
    checkAuth();
});
