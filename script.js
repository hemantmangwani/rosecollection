// Check if Firebase is available
const useFirebase = typeof db !== 'undefined' && db !== null;

// Get products from localStorage (fallback)
function getProductsFromLocalStorage() {
    const products = localStorage.getItem('roseCollectionProducts');
    return products ? JSON.parse(products) : [];
}

// Display products
async function displayProducts(filterCategory = 'all') {
    const productsGrid = document.getElementById('products-grid');
    const noProducts = document.getElementById('no-products');

    // Show loading
    productsGrid.innerHTML = '<div style="text-align: center; padding: 3rem; grid-column: 1/-1;"><div class="loading"></div><p>Loading products...</p></div>';

    let products = [];

    if (useFirebase) {
        // Get products from Firebase
        products = await getProductsFromFirebase();
    } else {
        // Fallback to localStorage
        products = getProductsFromLocalStorage();
    }

    // Filter products
    const filteredProducts = filterCategory === 'all'
        ? products
        : products.filter(p => p.category === filterCategory);

    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '';
        noProducts.style.display = 'block';
        return;
    }

    noProducts.style.display = 'none';
    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="product-card" data-category="${product.category}">
            ${product.sku ? `<div class="product-badge">
                <i class="fas fa-barcode"></i> ${product.sku}
            </div>` : ''}
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-name">${product.name}</h3>
                ${product.size ? `<p class="product-size"><i class="fas fa-ruler"></i> Size: ${product.size}</p>` : ''}
                <p class="product-description">${product.description || 'Premium quality product'}</p>
                <div class="product-price">₹${parseFloat(product.price).toFixed(2)}</div>
                <div class="product-stock">
                    ${product.stock > 0
                        ? `<i class="fas fa-check-circle" style="color: green;"></i> In Stock (${product.stock})`
                        : '<i class="fas fa-times-circle" style="color: red;"></i> Out of Stock'}
                </div>
                <button class="buy-btn" onclick="buyProduct('${product.sku || product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.size || ''}')" ${product.stock === 0 ? 'disabled' : ''}>
                    <i class="fab fa-whatsapp"></i> Buy on WhatsApp
                </button>
            </div>
        </div>
    `).join('');
}

// Buy product via WhatsApp
function buyProduct(productSKU, productName, productPrice, productSize) {
    const phoneNumber = '917999095600'; // Your WhatsApp number (079990 95600)

    let message = `नमस्ते Rose Collection! 🌹

I'm interested in this product:

📦 *Product:* ${productName}
🔢 *Product No:* ${productSKU}`;

    if (productSize) {
        message += `\n📏 *Size:* ${productSize}`;
    }

    message += `\n💰 *Price:* ₹${productPrice}

Please confirm availability and provide more details.

Thank you! 🙏`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to initialize
    if (useFirebase) {
        console.log('🔥 Using Firebase for real-time data');

        // Set up real-time listener for products
        listenToProducts((products) => {
            // Store in memory for filtering
            window.currentProducts = products;
            displayProductsFromData(products);
        });
    } else {
        console.log('💾 Using localStorage (Firebase not configured)');
        await displayProducts();
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
        });
    }

    // Scroll to top button
    const scrollTopBtn = document.getElementById('scrollTop');

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Add scroll animations
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

    // Observe product cards
    setTimeout(() => {
        document.querySelectorAll('.product-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease-out';
            observer.observe(card);
        });
    }, 100);

    // Filter functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            // Display filtered products
            const category = btn.getAttribute('data-category');

            if (useFirebase && window.currentProducts) {
                displayProductsFromData(window.currentProducts, category);
            } else {
                displayProducts(category);
            }
        });
    });

    // Helper function to display products from data
    window.displayProductsFromData = function(products, filterCategory = 'all') {
        const productsGrid = document.getElementById('products-grid');
        const noProducts = document.getElementById('no-products');

        // Filter products
        const filteredProducts = filterCategory === 'all'
            ? products
            : products.filter(p => p.category === filterCategory);

        if (filteredProducts.length === 0) {
            productsGrid.innerHTML = '';
            noProducts.style.display = 'block';
            return;
        }

        noProducts.style.display = 'none';
        productsGrid.innerHTML = filteredProducts.map(product => `
            <div class="product-card" data-category="${product.category}">
                ${product.sku ? `<div class="product-badge">
                    <i class="fas fa-barcode"></i> ${product.sku}
                </div>` : ''}
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">
                <div class="product-info">
                    <span class="product-category">${product.category}</span>
                    <h3 class="product-name">${product.name}</h3>
                    ${product.size ? `<p class="product-size"><i class="fas fa-ruler"></i> Size: ${product.size}</p>` : ''}
                    <p class="product-description">${product.description || 'Premium quality product'}</p>
                    <div class="product-price">₹${parseFloat(product.price).toFixed(2)}</div>
                    <div class="product-stock">
                        ${product.stock > 0
                            ? `<i class="fas fa-check-circle" style="color: green;"></i> In Stock (${product.stock})`
                            : '<i class="fas fa-times-circle" style="color: red;"></i> Out of Stock'}
                    </div>
                    <button class="buy-btn" onclick="buyProduct('${product.sku || product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.size || ''}')" ${product.stock === 0 ? 'disabled' : ''}>
                        <i class="fab fa-whatsapp"></i> Buy on WhatsApp
                    </button>
                </div>
            </div>
        `).join('');

        // Re-apply scroll animations
        setTimeout(() => {
            document.querySelectorAll('.product-card').forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                card.style.transition = 'all 0.6s ease-out';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 50);
            });
        }, 100);
    };

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add some sample products if none exist (for demo purposes)
    if (getProducts().length === 0) {
        const sampleProducts = [
            {
                id: Date.now() + 1,
                name: 'Classic Cotton Shirt',
                category: 'men',
                price: 1499,
                stock: 25,
                image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=300&fit=crop',
                description: 'Comfortable cotton shirt for everyday wear'
            },
            {
                id: Date.now() + 2,
                name: 'Elegant Summer Dress',
                category: 'women',
                price: 2499,
                stock: 15,
                image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop',
                description: 'Beautiful summer dress perfect for any occasion'
            },
            {
                id: Date.now() + 3,
                name: 'Kids Denim Jacket',
                category: 'kids',
                price: 1299,
                stock: 30,
                image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=300&h=300&fit=crop',
                description: 'Stylish denim jacket for kids'
            },
            {
                id: Date.now() + 4,
                name: 'Leather Handbag',
                category: 'accessories',
                price: 3499,
                stock: 10,
                image: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=300&h=300&fit=crop',
                description: 'Premium leather handbag'
            }
        ];
        localStorage.setItem('roseCollectionProducts', JSON.stringify(sampleProducts));
        displayProducts();
    }
});