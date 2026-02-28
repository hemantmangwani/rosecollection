// useFirebase is defined in firebase-config.js

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

    // COMPREHENSIVE DEBUG: Log all product data
    console.log('=== DISPLAYING PRODUCTS ===');
    console.log('Total filtered products:', filteredProducts.length);
    filteredProducts.forEach((p, i) => {
        console.log(`Product ${i + 1}: ${p.name}`);
        console.log('  - hasColorVariants:', p.hasColorVariants);
        console.log('  - colorVariants:', p.colorVariants);
        console.log('  - Full product data:', p);
    });
    console.log('=== END DEBUG ===');

    productsGrid.innerHTML = filteredProducts.map(product => {
        const productIdSafe = (product.id || '').toString().replace(/'/g, "\\'");

        // Check if product has color variants
        const hasColorVariants = product.hasColorVariants && product.colorVariants && product.colorVariants.length > 0;

        // Debug logging
        if (hasColorVariants) {
            console.log('✅ Product with color variants:', product.name, product.colorVariants);
        } else {
            console.log('❌ Product WITHOUT color variants:', product.name);
        }

        // If has color variants, use first variant's images and stock by default
        let images, currentStock;
        if (hasColorVariants) {
            const firstVariant = product.colorVariants[0];
            images = firstVariant.images && firstVariant.images.length > 0
                ? firstVariant.images
                : (product.images || [product.image] || ['https://via.placeholder.com/300x300?text=No+Image']);
            currentStock = firstVariant.stock || 0;
        } else {
            images = product.images && Array.isArray(product.images) && product.images.length > 0
                ? product.images
                : (product.image ? [product.image] : ['https://via.placeholder.com/300x300?text=No+Image']);
            currentStock = product.stock || 0;
        }

        const hasMultipleImages = images.length > 1;

        // Generate slider HTML
        const sliderHTML = hasMultipleImages ? `
            <div class="product-image-slider" data-product-id="${productIdSafe}">
                <div class="slider-track">
                    ${images.map(img => `<img src="${img}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">`).join('')}
                </div>
                <button class="slider-nav prev" onclick="event.stopPropagation(); changeSlide('${productIdSafe}', -1)"><i class="fas fa-chevron-left"></i></button>
                <button class="slider-nav next" onclick="event.stopPropagation(); changeSlide('${productIdSafe}', 1)"><i class="fas fa-chevron-right"></i></button>
                <div class="slider-dots">
                    ${images.map((_, i) => `<button class="slider-dot ${i === 0 ? 'active' : ''}" onclick="event.stopPropagation(); goToSlide('${productIdSafe}', ${i})"></button>`).join('')}
                </div>
            </div>
        ` : `<img src="${images[0]}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">`;

        // Generate color selector HTML if product has color variants
        const colorSelectorHTML = hasColorVariants ? `
            <div class="color-selector">
                <span class="color-selector-label">Select Color:</span>
                <div class="color-options">
                    ${product.colorVariants.map((variant, index) => `
                        <div class="color-option-wrapper">
                            <button class="color-option ${index === 0 ? 'selected' : ''}"
                                    style="background-color: ${variant.colorHex};"
                                    onclick="selectProductColor('${productIdSafe}', ${index})"
                                    title="${variant.colorName}">
                            </button>
                            <span class="color-option-name">${variant.colorName}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        return `
        <div class="product-card" data-category="${product.category}" data-product-id="${productIdSafe}" data-has-variants="${hasColorVariants}">
            ${product.sku ? `<div class="product-badge">
                <i class="fas fa-barcode"></i> ${product.sku}
            </div>` : ''}
            ${sliderHTML}
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-name">${product.name}</h3>
                ${product.size ? `<p class="product-size"><i class="fas fa-ruler"></i> Size: ${product.size}</p>` : ''}
                ${colorSelectorHTML}
                <p class="product-description">${product.description || 'Premium quality product'}</p>
                <div class="product-price">₹${parseFloat(product.price).toFixed(2)}</div>
                <div class="product-stock" data-product-id="${productIdSafe}">
                    ${currentStock > 0
                        ? `<i class="fas fa-check-circle" style="color: green;"></i> In Stock (${currentStock})`
                        : '<i class="fas fa-times-circle" style="color: red;"></i> Out of Stock'}
                </div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" onclick='addToCartWithColor(${JSON.stringify(product).replace(/'/g, "&#39;")}, "${productIdSafe}")' ${currentStock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="order-now-btn" onclick='orderNow("${productIdSafe}", ${JSON.stringify(product).replace(/'/g, "&#39;")})' ${currentStock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-bag"></i> Order Now
                    </button>
                    <button class="buy-whatsapp-btn" onclick="buyProductWithColor('${productIdSafe}', ${JSON.stringify(product).replace(/'/g, "&#39;")})" ${currentStock === 0 ? 'disabled' : ''}>
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Initialize auto-play for sliders after a short delay to ensure DOM is ready
    setTimeout(() => {
        try {
            initializeSliders();
        } catch (error) {
            console.warn('Slider initialization skipped:', error);
        }
    }, 100);

    // Add event listeners to product action buttons
    setTimeout(() => {
        attachProductButtonListeners();
    }, 150);
}

// Order Now - Redirect to login/checkout
function orderNow(productId, product) {
    if (!currentUser) {
        alert('Please login to place an order!');
        showLoginModal();
        return;
    }

    // If user is logged in, add to cart and go to checkout
    const productData = typeof product === 'string' ? JSON.parse(product) : product;

    // Get selected color if product has variants
    const hasColorVariants = productData.hasColorVariants && productData.colorVariants && productData.colorVariants.length > 0;
    if (hasColorVariants) {
        const selectedColorIndex = selectedColors[productId] || 0;
        const selectedVariant = productData.colorVariants[selectedColorIndex];

        productData.selectedColor = selectedVariant.colorName;
        productData.selectedColorHex = selectedVariant.colorHex;
        productData.stock = selectedVariant.stock;
        productData.images = selectedVariant.images || productData.images;
    }

    addToCart(productData);
    showCartModal();
}

// Buy product via WhatsApp
function buyProduct(productSKU, productName, productPrice, productSize, selectedColor) {
    console.log('buyProduct called:', { productSKU, productName, productPrice, productSize, selectedColor });

    const phoneNumber = '917999095600'; // Your WhatsApp number (079990 95600)

    let message = `नमस्ते Rose Collection! 🌹

I'm interested in this product:

📦 *Product:* ${productName}
🔢 *Product No:* ${productSKU}`;

    if (selectedColor) {
        message += `\n🎨 *Color:* ${selectedColor}`;
    }

    if (productSize) {
        message += `\n📏 *Size:* ${productSize}`;
    }

    message += `\n💰 *Price:* ₹${productPrice}

Please confirm availability and provide more details.

Thank you! 🙏`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    console.log('Opening WhatsApp URL:', whatsappUrl);

    // Open WhatsApp in new tab, keep website open
    window.open(whatsappUrl, '_blank');
}

// Load filter buttons dynamically
async function loadFilterButtons() {
    const categories = await getCategories();
    const filterContainer = document.querySelector('.filter-container');

    if (!filterContainer) return;

    const buttons = categories.map(cat => {
        const displayName = cat === 'all' ? 'All' : cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const activeClass = cat === 'all' ? 'active' : '';

        return `<button class="filter-btn ${activeClass}" data-category="${cat}">${displayName}</button>`;
    });

    filterContainer.innerHTML = buttons.join('');

    // Re-attach filter functionality
    attachFilterListeners();
}

// Attach filter button listeners
function attachFilterListeners() {
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
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Load filter buttons first
    await loadFilterButtons();

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

        // COMPREHENSIVE DEBUG: Log all product data
        console.log('=== DISPLAYING PRODUCTS (Firebase) ===');
        console.log('Total filtered products:', filteredProducts.length);
        filteredProducts.forEach((p, i) => {
            console.log(`Product ${i + 1}: ${p.name}`);
            console.log('  - hasColorVariants:', p.hasColorVariants);
            console.log('  - colorVariants:', p.colorVariants);
        });
        console.log('=== END DEBUG ===');

        noProducts.style.display = 'none';
        productsGrid.innerHTML = filteredProducts.map(product => {
            const productIdSafe = (product.id || '').toString().replace(/'/g, "\\'");

            // Check if product has color variants
            const hasColorVariants = product.hasColorVariants && product.colorVariants && product.colorVariants.length > 0;

            // Debug logging
            if (hasColorVariants) {
                console.log('✅ Product with color variants:', product.name, product.colorVariants);
            } else {
                console.log('❌ Product WITHOUT color variants:', product.name);
            }

            // If has color variants, use first variant's images and stock by default
            let images, currentStock;
            if (hasColorVariants) {
                const firstVariant = product.colorVariants[0];
                images = firstVariant.images && firstVariant.images.length > 0
                    ? firstVariant.images
                    : (product.images || [product.image] || ['https://via.placeholder.com/300x300?text=No+Image']);
                currentStock = firstVariant.stock || 0;
            } else {
                images = product.images && Array.isArray(product.images) && product.images.length > 0
                    ? product.images
                    : (product.image ? [product.image] : ['https://via.placeholder.com/300x300?text=No+Image']);
                currentStock = product.stock || 0;
            }

            const hasMultipleImages = images.length > 1;

            // Generate slider HTML
            const sliderHTML = hasMultipleImages ? `
                <div class="product-image-slider" data-product-id="${productIdSafe}">
                    <div class="slider-track">
                        ${images.map(img => `<img src="${img}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">`).join('')}
                    </div>
                    <button class="slider-nav prev" onclick="event.stopPropagation(); changeSlide('${productIdSafe}', -1)"><i class="fas fa-chevron-left"></i></button>
                    <button class="slider-nav next" onclick="event.stopPropagation(); changeSlide('${productIdSafe}', 1)"><i class="fas fa-chevron-right"></i></button>
                    <div class="slider-dots">
                        ${images.map((_, i) => `<button class="slider-dot ${i === 0 ? 'active' : ''}" onclick="event.stopPropagation(); goToSlide('${productIdSafe}', ${i})"></button>`).join('')}
                    </div>
                </div>
            ` : `<img src="${images[0]}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">`;

            // Generate color selector HTML if product has color variants
            const colorSelectorHTML = hasColorVariants ? `
                <div class="color-selector">
                    <span class="color-selector-label">Select Color:</span>
                    <div class="color-options">
                        ${product.colorVariants.map((variant, index) => `
                            <div class="color-option-wrapper">
                                <button class="color-option ${index === 0 ? 'selected' : ''}"
                                        style="background-color: ${variant.colorHex};"
                                        onclick="selectProductColor('${productIdSafe}', ${index})"
                                        title="${variant.colorName}">
                                </button>
                                <span class="color-option-name">${variant.colorName}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '';

            return `
            <div class="product-card" data-category="${product.category}" data-product-id="${productIdSafe}" data-has-variants="${hasColorVariants}">
                ${product.sku ? `<div class="product-badge">
                    <i class="fas fa-barcode"></i> ${product.sku}
                </div>` : ''}
                ${sliderHTML}
                <div class="product-info">
                    <span class="product-category">${product.category}</span>
                    <h3 class="product-name">${product.name}</h3>
                    ${product.size ? `<p class="product-size"><i class="fas fa-ruler"></i> Size: ${product.size}</p>` : ''}
                    ${colorSelectorHTML}
                    <p class="product-description">${product.description || 'Premium quality product'}</p>
                    <div class="product-price">₹${parseFloat(product.price).toFixed(2)}</div>
                    <div class="product-stock" data-product-id="${productIdSafe}">
                        ${currentStock > 0
                            ? `<i class="fas fa-check-circle" style="color: green;"></i> In Stock (${currentStock})`
                            : '<i class="fas fa-times-circle" style="color: red;"></i> Out of Stock'}
                    </div>
                    <div class="product-actions">
                        <button class="add-to-cart-btn" data-product-id="${productIdSafe}" ${currentStock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                        <button class="order-now-btn" data-product-id="${productIdSafe}" ${currentStock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-bag"></i> Order Now
                        </button>
                        <button class="buy-whatsapp-btn" data-product-id="${productIdSafe}" ${currentStock === 0 ? 'disabled' : ''}>
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Initialize auto-play for sliders after a short delay to ensure DOM is ready
        setTimeout(() => {
            try {
                initializeSliders();
            } catch (error) {
                console.warn('Slider initialization skipped:', error);
            }
        }, 100);

        // Add event listeners to product action buttons
        setTimeout(() => {
            attachProductButtonListeners();
        }, 150);

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

    // Note: Sample products code removed - using Firebase for products now
});

// ============================================
// Image Slider Functionality
// ============================================

const sliderStates = {};
const sliderIntervals = {};

// Initialize all sliders with auto-play
function initializeSliders() {
    const sliders = document.querySelectorAll('.product-image-slider');

    sliders.forEach(slider => {
        if (!slider || !slider.dataset) return; // Safety check

        const productId = slider.dataset.productId;
        if (!productId) return; // Skip if no product ID

        const images = slider.querySelectorAll('.slider-track img');
        if (!images || images.length === 0) return; // Skip if no images

        if (!sliderStates[productId]) {
            sliderStates[productId] = {
                currentIndex: 0,
                totalImages: images.length
            };
        }

        // Start auto-play
        startAutoPlay(productId);
    });
}

// Change slide manually
function changeSlide(productId, direction) {
    if (!productId) return;

    const state = sliderStates[productId];
    if (!state) return;

    // Stop auto-play when manually changing
    stopAutoPlay(productId);

    state.currentIndex += direction;

    // Wrap around
    if (state.currentIndex < 0) {
        state.currentIndex = state.totalImages - 1;
    } else if (state.currentIndex >= state.totalImages) {
        state.currentIndex = 0;
    }

    updateSlider(productId);

    // Restart auto-play after 5 seconds
    setTimeout(() => startAutoPlay(productId), 5000);
}

// Go to specific slide
function goToSlide(productId, index) {
    if (!productId || index === undefined) return;

    const state = sliderStates[productId];
    if (!state) return;

    // Stop auto-play when manually selecting
    stopAutoPlay(productId);

    state.currentIndex = index;
    updateSlider(productId);

    // Restart auto-play after 5 seconds
    setTimeout(() => startAutoPlay(productId), 5000);
}

// Update slider position and dots
function updateSlider(productId) {
    if (!productId) return;

    const slider = document.querySelector(`.product-image-slider[data-product-id="${productId}"]`);
    if (!slider) return;

    const state = sliderStates[productId];
    if (!state) return;

    const track = slider.querySelector('.slider-track');
    const dots = slider.querySelectorAll('.slider-dot');

    // Update track position
    if (track) {
        track.style.transform = `translateX(-${state.currentIndex * 100}%)`;
    }

    // Update dots
    if (dots && dots.length > 0) {
        dots.forEach((dot, index) => {
            if (index === state.currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

// Start auto-play
function startAutoPlay(productId) {
    if (!productId) return;

    // Clear any existing interval
    stopAutoPlay(productId);

    // Auto-advance every 3 seconds
    sliderIntervals[productId] = setInterval(() => {
        const state = sliderStates[productId];
        if (!state) {
            stopAutoPlay(productId);
            return;
        }

        state.currentIndex = (state.currentIndex + 1) % state.totalImages;
        updateSlider(productId);
    }, 3000);
}

// Stop auto-play
function stopAutoPlay(productId) {
    if (sliderIntervals[productId]) {
        clearInterval(sliderIntervals[productId]);
        delete sliderIntervals[productId];
    }
}

// Make functions globally available
window.changeSlide = changeSlide;
window.goToSlide = goToSlide;
window.initializeSliders = initializeSliders;

// ============================================
// Color Variant Selection
// ============================================

// Track selected colors for each product
const selectedColors = {};

// Select color for a product
function selectProductColor(productId, variantIndex) {
    if (!productId) return;

    // Store selected color
    selectedColors[productId] = variantIndex;

    // Update UI - highlight selected color
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (!productCard) return;

    // Update color option buttons
    const colorOptions = productCard.querySelectorAll('.color-option');
    colorOptions.forEach((option, index) => {
        if (index === variantIndex) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });

    // Get product data from window.currentProducts
    const product = window.currentProducts?.find(p => p.id == productId);
    if (!product || !product.colorVariants || !product.colorVariants[variantIndex]) {
        console.error('Product or variant not found');
        return;
    }

    const selectedVariant = product.colorVariants[variantIndex];

    // Update images in slider
    const slider = productCard.querySelector('.product-image-slider');
    if (slider) {
        const sliderTrack = slider.querySelector('.slider-track');
        if (sliderTrack && selectedVariant.images && selectedVariant.images.length > 0) {
            sliderTrack.innerHTML = selectedVariant.images.map(img =>
                `<img src="${img}" alt="${product.name} - ${selectedVariant.colorName}" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">`
            ).join('');

            // Update slider dots
            const dotsContainer = slider.querySelector('.slider-dots');
            if (dotsContainer) {
                dotsContainer.innerHTML = selectedVariant.images.map((_, i) =>
                    `<button class="slider-dot ${i === 0 ? 'active' : ''}" onclick="event.stopPropagation(); goToSlide('${productId}', ${i})"></button>`
                ).join('');
            }

            // Reset slider state
            if (sliderStates[productId]) {
                sliderStates[productId].currentIndex = 0;
                sliderStates[productId].totalImages = selectedVariant.images.length;
            } else {
                sliderStates[productId] = {
                    currentIndex: 0,
                    totalImages: selectedVariant.images.length
                };
            }

            // Restart slider
            stopAutoPlay(productId);
            updateSlider(productId);
            startAutoPlay(productId);
        }
    } else {
        // Single image - update it
        const productImage = productCard.querySelector('.product-image');
        if (productImage && selectedVariant.images && selectedVariant.images[0]) {
            productImage.src = selectedVariant.images[0];
        }
    }

    // Update stock display
    const stockElement = productCard.querySelector('.product-stock');
    if (stockElement) {
        const stock = selectedVariant.stock || 0;
        stockElement.innerHTML = stock > 0
            ? `<i class="fas fa-check-circle" style="color: green;"></i> In Stock (${stock})`
            : '<i class="fas fa-times-circle" style="color: red;"></i> Out of Stock';
    }

    // Update button states
    const addToCartBtn = productCard.querySelector('.add-to-cart-btn');
    const buyNowBtn = productCard.querySelector('.buy-whatsapp-btn');

    if (selectedVariant.stock > 0) {
        if (addToCartBtn) addToCartBtn.disabled = false;
        if (buyNowBtn) buyNowBtn.disabled = false;
    } else {
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (buyNowBtn) buyNowBtn.disabled = true;
    }
}

// Add to cart with color selection
function addToCartWithColor(product, productId) {
    if (!product) return;

    const hasVariants = product.hasColorVariants && product.colorVariants && product.colorVariants.length > 0;

    if (hasVariants) {
        const variantIndex = selectedColors[productId] !== undefined ? selectedColors[productId] : 0;
        const selectedVariant = product.colorVariants[variantIndex];

        if (!selectedVariant) {
            alert('Please select a color');
            return;
        }

        if (selectedVariant.stock <= 0) {
            alert('This color is out of stock');
            return;
        }

        // Add color info to product
        const productWithColor = {
            ...product,
            selectedColor: selectedVariant.colorName,
            selectedColorHex: selectedVariant.colorHex,
            selectedColorImages: selectedVariant.images,
            stock: selectedVariant.stock,
            image: selectedVariant.images && selectedVariant.images[0] ? selectedVariant.images[0] : product.image
        };

        addToCart(productWithColor);
    } else {
        // No variants, add normally
        addToCart(product);
    }
}

// Buy product with color via WhatsApp
function buyProductWithColor(productId, product) {
    console.log('buyProductWithColor called:', { productId, product });

    // Handle if product is passed as JSON string
    const productData = typeof product === 'string' ? JSON.parse(product) : product;

    if (!productData) {
        console.error('No product data');
        return;
    }

    const hasVariants = productData.hasColorVariants && productData.colorVariants && productData.colorVariants.length > 0;
    console.log('Has variants:', hasVariants);

    if (hasVariants) {
        const variantIndex = selectedColors[productId] !== undefined ? selectedColors[productId] : 0;
        const selectedVariant = productData.colorVariants[variantIndex];
        console.log('Selected variant:', selectedVariant);

        if (!selectedVariant) {
            alert('Please select a color');
            return;
        }

        if (selectedVariant.stock <= 0) {
            alert('This color is out of stock');
            return;
        }

        buyProduct(
            productData.sku || productData.id,
            productData.name,
            productData.price,
            productData.size || '',
            selectedVariant.colorName
        );
    } else {
        console.log('No variants, buying directly');
        buyProduct(productData.sku || productData.id, productData.name, productData.price, productData.size || '');
    }
}

// Attach event listeners to product action buttons
function attachProductButtonListeners() {
    console.log('Attaching product button listeners...');

    // Add to Cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = btn.getAttribute('data-product-id');
            const product = window.currentProducts?.find(p => p.id == productId);
            if (product) {
                addToCartWithColor(product, productId);
            }
        });
    });

    // Order Now buttons
    document.querySelectorAll('.order-now-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = btn.getAttribute('data-product-id');
            const product = window.currentProducts?.find(p => p.id == productId);
            if (product) {
                orderNow(productId, product);
            }
        });
    });

    // WhatsApp buttons
    document.querySelectorAll('.buy-whatsapp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = btn.getAttribute('data-product-id');
            console.log('WhatsApp button clicked for product:', productId);
            const product = window.currentProducts?.find(p => p.id == productId);
            console.log('Found product:', product);
            if (product) {
                buyProductWithColor(productId, product);
            } else {
                console.error('Product not found in window.currentProducts');
            }
        });
    });

    console.log('Button listeners attached');
}

// Make color functions globally available
window.selectProductColor = selectProductColor;
window.addToCartWithColor = addToCartWithColor;
window.buyProductWithColor = buyProductWithColor;
window.attachProductButtonListeners = attachProductButtonListeners;