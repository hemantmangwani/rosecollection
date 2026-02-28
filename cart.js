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

    // Auto-fill user details
    const nameField = document.getElementById('checkoutName');
    const emailField = document.getElementById('checkoutEmail');
    const phoneField = document.getElementById('checkoutPhone');
    const addressField = document.getElementById('checkoutAddress');

    nameField.value = currentUser.displayName || currentUser.name || '';
    emailField.value = currentUser.email || '';
    phoneField.value = currentUser.phone || '';
    addressField.value = currentUser.address || '';

    // Count how many fields were auto-filled
    const autoFilledFields = [];
    if (nameField.value) autoFilledFields.push('Name');
    if (emailField.value) autoFilledFields.push('Email');
    if (phoneField.value) autoFilledFields.push('Phone');
    if (addressField.value) autoFilledFields.push('Address');

    if (autoFilledFields.length > 0) {
        console.log(`✅ Auto-filled: ${autoFilledFields.join(', ')}`);

        // Show a subtle notification
        if (phoneField.value && addressField.value) {
            // All important fields filled
            console.log('🎉 All your details are ready! Just review and confirm.');
        } else if (!addressField.value) {
            console.log('📍 Tip: Click "Use Current Location" to auto-fill your address');
        }
    } else {
        console.log('ℹ️ Please fill in your details');
    }

    // Update checkout total
    updateCheckoutTotal();
}

// Update checkout total (defined in index.html, but make sure it's called)
function updateCheckoutTotal() {
    const checkoutTotal = document.getElementById('checkoutTotal');
    if (checkoutTotal) {
        checkoutTotal.textContent = '₹' + getCartTotal().toFixed(2);
    }
}

// Close checkout modal
function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
}

// Get current location using Geolocation API
async function getCurrentLocation() {
    const addressField = document.getElementById('checkoutAddress');
    const locationBtn = document.querySelector('.btn-location');

    if (!navigator.geolocation) {
        alert('❌ Geolocation is not supported by your browser');
        return;
    }

    // Disable button and show loading
    locationBtn.disabled = true;
    locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            console.log('📍 Location obtained:', lat, lon);

            try {
                // Use reverse geocoding to get address
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const data = await response.json();

                if (data && data.display_name) {
                    addressField.value = data.display_name;
                    showSuccess('Location detected successfully!');
                } else {
                    addressField.value = `Latitude: ${lat}, Longitude: ${lon}`;
                    showInfo('Coordinates obtained. Please add more address details.');
                }
            } catch (error) {
                console.error('Error getting address:', error);
                addressField.value = `Latitude: ${lat}, Longitude: ${lon}`;
                showInfo('Location coordinates obtained. Please add more address details.');
            } finally {
                // Re-enable button
                locationBtn.disabled = false;
                locationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Use Current Location';
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to get your location. ';

            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please enable location permissions in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Request timed out. Please try again.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
            }

            alert('❌ ' + errorMessage);

            // Re-enable button
            locationBtn.disabled = false;
            locationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Use Current Location';
        }
    );
}

// Validate email format
function validateEmail(email) {
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    return emailRegex.test(email);
}

// Validate phone number (Indian format: 10 digits starting with 6-9)
function validatePhone(phone) {
    const phoneRegex = /^[6-9][0-9]{9}$/;
    return phoneRegex.test(phone);
}

// Update user profile with latest phone and address
async function updateUserProfile(phone, address) {
    if (!currentUser) return;

    try {
        // Check if phone or address has changed
        const phoneChanged = phone && phone !== currentUser.phone;
        const addressChanged = address && address !== currentUser.address;

        if (!phoneChanged && !addressChanged) {
            console.log('ℹ️ No profile changes needed');
            return;
        }

        if (useFirebase && db && currentUser.uid) {
            // Update Firestore
            await db.collection('users').doc(currentUser.uid).update({
                phone: phone,
                address: address,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update current user object
            currentUser.phone = phone;
            currentUser.address = address;

            console.log('✅ User profile updated in Firestore');
        } else {
            // Update localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex(u => u.email === currentUser.email);

            if (userIndex !== -1) {
                users[userIndex].phone = phone;
                users[userIndex].address = address;
                localStorage.setItem('users', JSON.stringify(users));
            }

            // Update current user
            currentUser.phone = phone;
            currentUser.address = address;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            console.log('✅ User profile updated in localStorage');
        }

        // Show notification if changes were saved
        if (phoneChanged || addressChanged) {
            const changes = [];
            if (phoneChanged) changes.push('phone number');
            if (addressChanged) changes.push('address');
            console.log(`📝 Saved ${changes.join(' and ')} to your profile for future orders`);
        }
    } catch (error) {
        console.error('❌ Error updating user profile:', error);
        // Don't block order placement if profile update fails
    }
}

// Process order with address
async function processOrder(e) {
    e.preventDefault();

    const customerName = document.getElementById('checkoutName').value.trim();
    const customerEmail = document.getElementById('checkoutEmail').value.trim();
    const customerPhone = document.getElementById('checkoutPhone').value.trim();
    const customerAddress = document.getElementById('checkoutAddress').value.trim();

    // Validate email
    if (!validateEmail(customerEmail)) {
        alert('❌ Please enter a valid email address (e.g., user@example.com)');
        document.getElementById('checkoutEmail').focus();
        return;
    }

    // Validate phone number
    if (!validatePhone(customerPhone)) {
        alert('❌ Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
        document.getElementById('checkoutPhone').focus();
        return;
    }

    // Validate address length
    if (customerAddress.length < 10) {
        alert('❌ Please enter a complete delivery address');
        document.getElementById('checkoutAddress').focus();
        return;
    }

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
        // Update user profile with new address/phone if changed
        await updateUserProfile(customerPhone, customerAddress);

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
        showSuccess(`Order #${result.orderId} placed successfully! Opening WhatsApp...`, 3000);

        // Open WhatsApp in new tab, keep website open
        setTimeout(() => window.open(whatsappUrl, '_blank'), 500);
    } else {
        showError('Error placing order: ' + result.error);
    }
}

// Make location function globally available
window.getCurrentLocation = getCurrentLocation;

console.log('✅ cart.js loaded, getCurrentLocation available');

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

    // Attach location button event listener (retry every 500ms until found)
    const attachLocationButton = () => {
        const btnGetLocation = document.getElementById('btnGetLocation');
        if (btnGetLocation && !btnGetLocation.hasAttribute('data-listener-attached')) {
            btnGetLocation.addEventListener('click', getCurrentLocation);
            btnGetLocation.setAttribute('data-listener-attached', 'true');
            console.log('✅ Location button listener attached');
        }
    };

    // Try to attach immediately
    attachLocationButton();

    // Also try when checkout modal is shown
    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.style.display === 'flex') {
                    setTimeout(attachLocationButton, 100);
                }
            });
        });
        observer.observe(checkoutModal, { attributes: true, attributeFilter: ['style'] });
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
