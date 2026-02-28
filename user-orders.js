// User Orders Page

let userOrders = [];
let orderUnsubscribe = null;

// Initialize user orders page
function initUserOrders() {
    console.log('initUserOrders called, currentUser:', currentUser);

    // Check login status immediately
    checkUserLoginStatus();

    // If user exists, load orders
    if (currentUser) {
        console.log('User found, loading orders');
        loadUserOrders();
    } else {
        console.log('No user found, showing login required');
    }
}

// Check if user is logged in
function checkUserLoginStatus() {
    const loginRequired = document.getElementById('loginRequired');
    const userOrdersContainer = document.getElementById('userOrdersContainer');

    console.log('checkUserLoginStatus - currentUser:', currentUser);
    console.log('loginRequired element:', loginRequired);
    console.log('userOrdersContainer element:', userOrdersContainer);

    if (!loginRequired || !userOrdersContainer) {
        console.error('Required DOM elements not found!');
        return;
    }

    // Check if user is logged in
    const isLoggedIn = currentUser && (currentUser.email || currentUser.uid);

    if (isLoggedIn) {
        console.log('User is logged in, showing orders container');
        loginRequired.style.display = 'none';
        userOrdersContainer.style.display = 'block';
    } else {
        console.log('User is NOT logged in, showing login required');
        loginRequired.style.display = 'flex';
        userOrdersContainer.style.display = 'none';
    }
}

// Load user orders
async function loadUserOrders() {
    console.log('Loading user orders...', currentUser);

    if (!currentUser) {
        console.log('No current user found');
        return;
    }

    const ordersLoading = document.getElementById('ordersLoading');
    const noOrders = document.getElementById('noOrders');
    const userOrdersList = document.getElementById('userOrdersList');

    if (!ordersLoading || !noOrders || !userOrdersList) {
        console.error('Required DOM elements not found');
        return;
    }

    ordersLoading.style.display = 'block';
    noOrders.style.display = 'none';
    userOrdersList.innerHTML = '';

    try {
        // Get user email
        const userEmail = currentUser.email || currentUser.emailAddress;
        console.log('User email:', userEmail);

        // Set up real-time listener if using Firebase
        if (useFirebase && db && userEmail) {
            console.log('Using Firebase for orders');

            // Unsubscribe from previous listener
            if (orderUnsubscribe) {
                orderUnsubscribe();
            }

            // Set up new listener
            orderUnsubscribe = listenToUserOrders(userEmail, (orders) => {
                console.log('Received orders from Firebase:', orders);
                userOrders = orders;
                displayUserOrders(orders);
                ordersLoading.style.display = 'none';
            });
        } else {
            // Fallback to localStorage
            console.log('Using localStorage for orders');
            const orders = await getUserOrders(userEmail);
            console.log('Received orders from localStorage:', orders);
            userOrders = orders;
            displayUserOrders(orders);
            ordersLoading.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersLoading.style.display = 'none';
        userOrdersList.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error loading orders. Please refresh the page.</div>';
    }
}

// Display user orders
function displayUserOrders(orders) {
    console.log('Displaying orders:', orders);

    const noOrders = document.getElementById('noOrders');
    const userOrdersList = document.getElementById('userOrdersList');

    if (!noOrders || !userOrdersList) {
        console.error('Display elements not found');
        return;
    }

    if (orders.length === 0) {
        console.log('No orders to display');
        noOrders.style.display = 'flex';
        userOrdersList.innerHTML = '';
        return;
    }

    console.log(`Displaying ${orders.length} orders`);
    noOrders.style.display = 'none';

    userOrdersList.innerHTML = orders.map(order => {
        const orderDate = new Date(order.createdAt);
        const formattedDate = orderDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusInfo = getStatusInfo(order.status);
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

        return `
            <div class="user-order-card status-${order.status}">
                <div class="user-order-header">
                    <div>
                        <h3><i class="fas fa-receipt"></i> ${order.orderId}</h3>
                        <p class="order-date-small">
                            <i class="fas fa-calendar"></i> ${formattedDate}
                        </p>
                    </div>
                    <div class="user-order-status">
                        <span class="status-badge status-${order.status}">
                            <i class="fas fa-${statusInfo.icon}"></i> ${statusInfo.label}
                        </span>
                    </div>
                </div>

                <!-- Order Progress Tracker -->
                <div class="order-progress-tracker">
                    <div class="progress-step ${['pending', 'accepted', 'processing', 'out-for-delivery', 'delivered'].includes(order.status) ? 'completed' : ''} ${order.status === 'pending' ? 'active' : ''}">
                        <div class="progress-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="progress-label">Pending</div>
                    </div>
                    <div class="progress-line ${['accepted', 'processing', 'out-for-delivery', 'delivered'].includes(order.status) ? 'completed' : ''}"></div>

                    <div class="progress-step ${['accepted', 'processing', 'out-for-delivery', 'delivered'].includes(order.status) ? 'completed' : ''} ${order.status === 'accepted' ? 'active' : ''}">
                        <div class="progress-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="progress-label">Accepted</div>
                    </div>
                    <div class="progress-line ${['processing', 'out-for-delivery', 'delivered'].includes(order.status) ? 'completed' : ''}"></div>

                    <div class="progress-step ${['processing', 'out-for-delivery', 'delivered'].includes(order.status) ? 'completed' : ''} ${order.status === 'processing' ? 'active' : ''}">
                        <div class="progress-icon">
                            <i class="fas fa-cog"></i>
                        </div>
                        <div class="progress-label">Processing</div>
                    </div>
                    <div class="progress-line ${['out-for-delivery', 'delivered'].includes(order.status) ? 'completed' : ''}"></div>

                    <div class="progress-step ${['out-for-delivery', 'delivered'].includes(order.status) ? 'completed' : ''} ${order.status === 'out-for-delivery' ? 'active' : ''}">
                        <div class="progress-icon">
                            <i class="fas fa-shipping-fast"></i>
                        </div>
                        <div class="progress-label">Out for Delivery</div>
                    </div>
                    <div class="progress-line ${order.status === 'delivered' ? 'completed' : ''}"></div>

                    <div class="progress-step ${order.status === 'delivered' ? 'completed active' : ''}">
                        <div class="progress-icon">
                            <i class="fas fa-check-double"></i>
                        </div>
                        <div class="progress-label">Delivered</div>
                    </div>
                </div>

                ${order.status === 'cancelled' ? `
                    <div class="cancelled-notice">
                        <i class="fas fa-times-circle"></i> This order has been cancelled
                    </div>
                ` : `
                    <div class="status-description">
                        <i class="fas fa-info-circle"></i> ${statusInfo.description}
                    </div>
                `}

                <!-- Order Items Preview -->
                <div class="order-items-preview">
                    ${order.items.slice(0, 3).map(item => `
                        <div class="preview-item">
                            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'">
                            <div class="preview-item-info">
                                <h4>${item.name}</h4>
                                <p>Qty: ${item.quantity} × ₹${parseFloat(item.price).toFixed(2)}</p>
                            </div>
                        </div>
                    `).join('')}
                    ${order.items.length > 3 ? `
                        <div class="more-items">
                            +${order.items.length - 3} more item${order.items.length - 3 !== 1 ? 's' : ''}
                        </div>
                    ` : ''}
                </div>

                <div class="user-order-footer">
                    <div class="order-total-amount">
                        <span>Total Amount:</span>
                        <strong>₹${parseFloat(order.totalAmount).toFixed(2)}</strong>
                    </div>
                    <button class="btn-view-order" onclick="viewUserOrderDetails('${order.orderId}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// View user order details
function viewUserOrderDetails(orderId) {
    const order = userOrders.find(o => o.orderId === orderId);
    if (!order) return;

    const modal = document.getElementById('userOrderDetailModal');
    const content = document.getElementById('userOrderDetailContent');

    const orderDate = new Date(order.createdAt);
    const formattedDate = orderDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const statusInfo = getStatusInfo(order.status);

    content.innerHTML = `
        <h2><i class="fas fa-receipt"></i> Order Details</h2>

        <div class="order-detail-section">
            <h3>Order Status</h3>
            <div class="status-detail-box status-${order.status}">
                <div class="status-icon-large">
                    <i class="fas fa-${statusInfo.icon}"></i>
                </div>
                <div>
                    <h4>${statusInfo.label}</h4>
                    <p>${statusInfo.description}</p>
                </div>
            </div>
        </div>

        <div class="order-detail-section">
            <h3>Order Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Order ID:</label>
                    <span>${order.orderId}</span>
                </div>
                <div class="detail-item">
                    <label>Order Date:</label>
                    <span>${formattedDate}</span>
                </div>
                <div class="detail-item">
                    <label>Total Amount:</label>
                    <span class="amount">₹${parseFloat(order.totalAmount).toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <label>Payment:</label>
                    <span>Cash on Delivery</span>
                </div>
            </div>
        </div>

        <div class="order-detail-section">
            <h3>Delivery Address</h3>
            <div class="address-box">
                <p><strong>${order.customerName}</strong></p>
                <p><i class="fas fa-phone"></i> ${order.customerPhone}</p>
                <p><i class="fas fa-envelope"></i> ${order.customerEmail}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${order.customerAddress}</p>
            </div>
        </div>

        <div class="order-detail-section">
            <h3>Order Items</h3>
            <div class="order-items-table">
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Size</th>
                            <th>Price</th>
                            <th>Qty</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>
                                    <div class="item-with-image">
                                        <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/50x50?text=No+Image'">
                                        <span>${item.name}</span>
                                    </div>
                                </td>
                                <td>${item.sku || 'N/A'}</td>
                                <td>${item.size || '-'}</td>
                                <td>₹${parseFloat(item.price).toFixed(2)}</td>
                                <td>${item.quantity}</td>
                                <td>₹${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5" class="text-right"><strong>Total:</strong></td>
                            <td><strong>₹${parseFloat(order.totalAmount).toFixed(2)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <div class="modal-actions">
            <button class="btn-whatsapp" onclick="contactShopWhatsApp('${order.orderId}')">
                <i class="fab fa-whatsapp"></i> Contact Shop
            </button>
            <button class="btn-secondary" onclick="closeUserOrderDetailModal()">Close</button>
        </div>
    `;

    modal.style.display = 'flex';
}

// Close user order detail modal
function closeUserOrderDetailModal() {
    document.getElementById('userOrderDetailModal').style.display = 'none';
}

// Contact shop via WhatsApp
function contactShopWhatsApp(orderId) {
    const phoneNumber = '917999095600';
    const message = `Hello Rose Collection! 🌹\n\nI have a query about my order ${orderId}.\n\nThank you!`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (orderUnsubscribe) {
        orderUnsubscribe();
    }
});
