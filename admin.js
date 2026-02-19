// Admin credentials (in production, this should be handled server-side)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Check if user is logged in
function isLoggedIn() {
    return sessionStorage.getItem('adminLoggedIn') === 'true';
}

// Get products from localStorage
function getProducts() {
    const products = localStorage.getItem('roseCollectionProducts');
    return products ? JSON.parse(products) : [];
}

// Save products to localStorage
function saveProducts(products) {
    localStorage.setItem('roseCollectionProducts', JSON.stringify(products));
}

// Show login modal or dashboard
function checkAuth() {
    const loginModal = document.getElementById('loginModal');
    const adminDashboard = document.getElementById('adminDashboard');

    if (isLoggedIn()) {
        loginModal.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadProducts();
    } else {
        loginModal.style.display = 'flex';
        adminDashboard.style.display = 'none';
    }
}

// Handle login
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        checkAuth();
    } else {
        alert('Invalid credentials! Default: admin / admin123');
    }
});

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem('adminLoggedIn');
    checkAuth();
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
document.getElementById('productFormElement').addEventListener('submit', (e) => {
    e.preventDefault();

    const productId = document.getElementById('productId').value;
    const product = {
        id: productId || Date.now(),
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        image: document.getElementById('productImage').value,
        description: document.getElementById('productDescription').value
    };

    let products = getProducts();

    if (productId) {
        // Update existing product
        products = products.map(p => p.id == productId ? product : p);
    } else {
        // Add new product
        products.push(product);
    }

    saveProducts(products);
    loadProducts();
    document.getElementById('productForm').style.display = 'none';
    document.getElementById('productFormElement').reset();
});

// Load products in table
function loadProducts() {
    const products = getProducts();
    const tbody = document.getElementById('productsTableBody');
    const noProductsAdmin = document.getElementById('noProductsAdmin');

    if (products.length === 0) {
        tbody.innerHTML = '';
        noProductsAdmin.style.display = 'block';
        return;
    }

    noProductsAdmin.style.display = 'none';
    tbody.innerHTML = products.map(product => `
        <tr>
            <td><img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'"></td>
            <td>${product.name}</td>
            <td><span style="text-transform: capitalize;">${product.category}</span></td>
            <td>₹${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.stock}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Edit product
function editProduct(id) {
    const products = getProducts();
    const product = products.find(p => p.id == id);

    if (product) {
        document.getElementById('productForm').style.display = 'block';
        document.getElementById('formTitle').textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productImage').value = product.image;
        document.getElementById('productDescription').value = product.description || '';

        // Scroll to form
        document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
    }
}

// Delete product
function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        let products = getProducts();
        products = products.filter(p => p.id != id);
        saveProducts(products);
        loadProducts();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
