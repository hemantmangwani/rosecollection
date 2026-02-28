// Shopping Cart System

let cart = [];

// Get cart from localStorage
function getCart() {
    const saved = localStorage.getItem('roseCollectionCart');
    return saved ? JSON.parse(saved) : [];
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('roseCollectionCart', JSON.stringify(cart));
    updateCartUI();
}

// Add to cart
function addToCart(product) {
    // For products with color variants, check if same product with same color exists
    let existing;
    if (product.selectedColor) {
        existing = cart.find(item => item.id === product.id && item.selectedColor === product.selectedColor);
    } else {
        existing = cart.find(item => item.id === product.id && !item.selectedColor);
    }

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCart();
    const colorMsg = product.selectedColor ? ` (${product.selectedColor})` : '';
    showCartNotification(`✅ Added to cart!${colorMsg}`);
}

// Remove from cart (using index to handle same product with different colors)
function removeFromCart(index) {
    if (!confirm('Remove this item from cart?')) return;
    cart.splice(index, 1);
    saveCart();
    displayCartItems(); // Refresh display
}

// Update quantity (using index to handle same product with different colors)
function updateCartQuantity(index, quantity) {
    if (cart[index]) {
        cart[index].quantity = Math.max(1, parseInt(quantity));
        saveCart();
        displayCartItems(); // Refresh display
    }
}

// Get cart total
function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Get cart count
function getCartCount() {
    return cart.reduce((count, item) => count + item.quantity, 0);
}

// Update cart UI
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const count = getCartCount();

    if (cartCount) {
        cartCount.textContent = count;
        cartCount.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Show cart notification
function showCartNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Show cart modal
function showCartModal() {
    const modal = document.getElementById('cartModal');
    modal.style.display = 'flex';
    displayCartItems();
}

// Close cart modal
function closeCartModal() {
    document.getElementById('cartModal').style.display = 'none';
}

// Display cart items
function displayCartItems() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <button class="btn-primary" onclick="closeCartModal()">Continue Shopping</button>
            </div>
        `;
        cartTotal.textContent = '₹0.00';
        return;
    }

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p class="cart-item-sku">${item.sku || 'N/A'}</p>
                ${item.selectedColor ? `
                    <p class="cart-item-color">
                        <span class="color-indicator" style="background-color: ${item.selectedColorHex || '#ccc'};"></span>
                        <strong>Color:</strong> ${item.selectedColor}
                    </p>
                ` : ''}
                <p class="cart-item-price">₹${parseFloat(item.price).toFixed(2)}</p>
            </div>
            <div class="cart-item-quantity">
                <button onclick="updateCartQuantity(${index}, ${item.quantity - 1})">
                    <i class="fas fa-minus"></i>
                </button>
                <span>${item.quantity}</span>
                <button onclick="updateCartQuantity(${index}, ${item.quantity + 1})">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="cart-item-total">
                <p>₹${(item.price * item.quantity).toFixed(2)}</p>
                <button class="remove-btn" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    cartTotal.textContent = '₹' + getCartTotal().toFixed(2);
}

// Show checkout form
function checkout() {
    if (!currentUser) {
        alert('Please login to place an order!');
        closeCartModal();
        showLoginModal();
        return;
    }

    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // Show checkout form modal
    document.getElementById('checkoutModal').style.display = 'flex';
    document.getElementById('checkoutName').value = currentUser.displayName || '';
    document.getElementById('checkoutEmail').value = currentUser.email || '';
}

// Close checkout modal
function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
}

// Process order with address
async function processOrder(e) {
    e.preventDefault();

    const customerName = document.getElementById('checkoutName').value;
    const customerEmail = document.getElementById('checkoutEmail').value;
    const customerPhone = document.getElementById('checkoutPhone').value;
    const customerAddress = document.getElementById('checkoutAddress').value;

    // Save order to database
    const orderData = {
        userId: currentUser ? currentUser.uid : null,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items: cart,
        totalAmount: getCartTotal()
    };

    const result = await saveOrder(orderData);

    if (result.success) {
        // Send to WhatsApp
        const phoneNumber = '917999095600';

        let message = `🛒 *New Order ${result.orderId}*\n\n`;
        message += `👤 *Customer Details:*\n`;
        message += `Name: ${customerName}\n`;
        message += `📧 Email: ${customerEmail}\n`;
        message += `📱 Phone: ${customerPhone}\n`;
        message += `📍 Address: ${customerAddress}\n\n`;
        message += `*Order Details:*\n`;
        message += `━━━━━━━━━━━━━━━━\n\n`;

        cart.forEach((item, index) => {
            message += `${index + 1}. *${item.name}*\n`;
            message += `   🔢 SKU: ${item.sku || 'N/A'}\n`;
            if (item.selectedColor) message += `   🎨 Color: ${item.selectedColor}\n`;
            if (item.size) message += `   📏 Size: ${item.size}\n`;
            message += `   💰 Price: ₹${item.price}\n`;
            message += `   📦 Quantity: ${item.quantity}\n`;
            message += `   💵 Subtotal: ₹${(item.price * item.quantity).toFixed(2)}\n\n`;
        });

        message += `━━━━━━━━━━━━━━━━\n`;
        message += `*Total Amount: ₹${getCartTotal().toFixed(2)}*\n\n`;
        message += `Order ID: ${result.orderId}\n\n`;
        message += `Thank you! 🙏`;

        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

        // Clear cart and close modals BEFORE redirecting
        cart = [];
        saveCart();
        closeCheckoutModal();
        closeCartModal();

        // Show success message
        alert(`✅ Order ${result.orderId} placed successfully!\nOpening WhatsApp...`);

        // Open WhatsApp in new tab, keep website open
        window.open(whatsappUrl, '_blank');
    } else {
        alert('❌ Error placing order: ' + result.error);
    }
}

// Initialize cart
function initCart() {
    cart = getCart();
    updateCartUI();

    // Cart button click
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.addEventListener('click', showCartModal);
    }

    // Close cart modal
    const closeCart = document.getElementById('closeCart');
    if (closeCart) {
        closeCart.addEventListener('click', closeCartModal);
    }

    // Checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }

    // Close checkout modal
    const closeCheckout = document.getElementById('closeCheckout');
    if (closeCheckout) {
        closeCheckout.addEventListener('click', closeCheckoutModal);
    }

    // Checkout form submission
    const checkoutForm = document.getElementById('checkoutFormElement');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', processOrder);
    }
}
