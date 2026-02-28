// Admin Orders Management

let currentOrders = [];
let currentOrderFilter = 'all';

// Load and display orders
async function loadOrders() {
    const ordersList = document.getElementById('ordersList');
    const noOrdersAdmin = document.getElementById('noOrdersAdmin');

    if (!ordersList) return;

    // Show loading
    ordersList.innerHTML = '<div class="loading-orders"><i class="fas fa-spinner fa-spin"></i> Loading orders...</div>';

    try {
        currentOrders = await getAllOrders();

        if (currentOrders.length === 0) {
            ordersList.style.display = 'none';
            noOrdersAdmin.style.display = 'block';
            return;
        }

        noOrdersAdmin.style.display = 'none';
        ordersList.style.display = 'block';
        displayOrders(currentOrders);
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersList.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error loading orders</div>';
    }
}

// Display orders based on filter
function displayOrders(orders, filterStatus = 'all') {
    const ordersList = document.getElementById('ordersList');

    // Filter orders
    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter(order => order.status === filterStatus);

    if (filteredOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="no-orders-filtered">
                <i class="fas fa-filter"></i>
                <p>No ${filterStatus} orders found</p>
            </div>
        `;
        return;
    }

    ordersList.innerHTML = filteredOrders.map(order => {
        const orderDate = new Date(order.createdAt);
        const formattedDate = orderDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusClass = order.status === 'completed' ? 'status-completed' :
                           order.status === 'cancelled' ? 'status-cancelled' :
                           'status-pending';

        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

        return `
            <div class="order-card ${statusClass}">
                <div class="order-header">
                    <div class="order-id-section">
                        <h3><i class="fas fa-receipt"></i> ${order.orderId}</h3>
                        <span class="order-status ${statusClass}">${order.status.toUpperCase()}</span>
                    </div>
                    <div class="order-date">
                        <i class="fas fa-clock"></i> ${formattedDate}
                    </div>
                </div>

                <div class="order-customer-info">
                    <div class="customer-detail">
                        <i class="fas fa-user"></i>
                        <strong>${order.customerName}</strong>
                    </div>
                    <div class="customer-detail">
                        <i class="fas fa-envelope"></i>
                        <a href="mailto:${order.customerEmail}">${order.customerEmail}</a>
                    </div>
                    <div class="customer-detail">
                        <i class="fas fa-phone"></i>
                        <a href="tel:${order.customerPhone}">${order.customerPhone}</a>
                    </div>
                    <div class="customer-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${order.customerAddress}</span>
                    </div>
                </div>

                <div class="order-items-summary">
                    <div class="items-count">
                        <i class="fas fa-box"></i>
                        <strong>${itemCount} item${itemCount !== 1 ? 's' : ''}</strong>
                    </div>
                    <div class="order-total">
                        <strong>Total: ₹${parseFloat(order.totalAmount).toFixed(2)}</strong>
                    </div>
                </div>

                <div class="order-actions">
                    <button class="btn-view" onclick="viewOrderDetails('${order.orderId}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${order.status === 'pending' ? `
                        <button class="btn-accept" onclick="updateOrderStatusAdmin('${order.orderId}', 'accepted')">
                            <i class="fas fa-check-circle"></i> Accept
                        </button>
                    ` : ''}
                    ${order.status === 'accepted' ? `
                        <button class="btn-processing" onclick="updateOrderStatusAdmin('${order.orderId}', 'processing')">
                            <i class="fas fa-cog"></i> Start Processing
                        </button>
                    ` : ''}
                    ${order.status === 'processing' ? `
                        <button class="btn-delivery" onclick="updateOrderStatusAdmin('${order.orderId}', 'out-for-delivery')">
                            <i class="fas fa-shipping-fast"></i> Send for Delivery
                        </button>
                    ` : ''}
                    ${order.status === 'out-for-delivery' ? `
                        <button class="btn-complete" onclick="updateOrderStatusAdmin('${order.orderId}', 'delivered')">
                            <i class="fas fa-check-double"></i> Mark Delivered
                        </button>
                    ` : ''}
                    ${!['delivered', 'cancelled'].includes(order.status) ? `
                        <button class="btn-cancel" onclick="updateOrderStatusAdmin('${order.orderId}', 'cancelled')">
                            <i class="fas fa-times-circle"></i> Cancel
                        </button>
                    ` : ''}
                    <button class="btn-whatsapp" onclick="contactCustomerWhatsApp('${order.customerPhone}', '${order.customerName}', '${order.orderId}')">
                        <i class="fab fa-whatsapp"></i> Contact
                    </button>
                    <button class="btn-delete" onclick="deleteOrderAdmin('${order.orderId}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// View order details in modal
function viewOrderDetails(orderId) {
    const order = currentOrders.find(o => o.orderId === orderId);
    if (!order) return;

    const modal = document.getElementById('orderDetailModal');
    const content = document.getElementById('orderDetailContent');

    const orderDate = new Date(order.createdAt);
    const formattedDate = orderDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    content.innerHTML = `
        <h2><i class="fas fa-receipt"></i> Order Details</h2>

        <div class="order-detail-section">
            <h3>Order Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Order ID:</label>
                    <span>${order.orderId}</span>
                </div>
                <div class="detail-item">
                    <label>Status:</label>
                    <span class="order-status status-${order.status}">${order.status.toUpperCase()}</span>
                </div>
                <div class="detail-item">
                    <label>Order Date:</label>
                    <span>${formattedDate}</span>
                </div>
                <div class="detail-item">
                    <label>Total Amount:</label>
                    <span class="amount">₹${parseFloat(order.totalAmount).toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div class="order-detail-section">
            <h3>Customer Details</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Name:</label>
                    <span>${order.customerName}</span>
                </div>
                <div class="detail-item">
                    <label>Email:</label>
                    <span><a href="mailto:${order.customerEmail}">${order.customerEmail}</a></span>
                </div>
                <div class="detail-item">
                    <label>Phone:</label>
                    <span><a href="tel:${order.customerPhone}">${order.customerPhone}</a></span>
                </div>
                <div class="detail-item full-width">
                    <label>Delivery Address:</label>
                    <span>${order.customerAddress}</span>
                </div>
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
            ${order.status === 'pending' ? `
                <button class="btn-accept" onclick="updateOrderStatusAdmin('${order.orderId}', 'accepted'); closeOrderDetailModal();">
                    <i class="fas fa-check-circle"></i> Accept Order
                </button>
            ` : ''}
            ${order.status === 'accepted' ? `
                <button class="btn-processing" onclick="updateOrderStatusAdmin('${order.orderId}', 'processing'); closeOrderDetailModal();">
                    <i class="fas fa-cog"></i> Start Processing
                </button>
            ` : ''}
            ${order.status === 'processing' ? `
                <button class="btn-delivery" onclick="updateOrderStatusAdmin('${order.orderId}', 'out-for-delivery'); closeOrderDetailModal();">
                    <i class="fas fa-shipping-fast"></i> Send for Delivery
                </button>
            ` : ''}
            ${order.status === 'out-for-delivery' ? `
                <button class="btn-complete" onclick="updateOrderStatusAdmin('${order.orderId}', 'delivered'); closeOrderDetailModal();">
                    <i class="fas fa-check-double"></i> Mark as Delivered
                </button>
            ` : ''}
            ${!['delivered', 'cancelled'].includes(order.status) ? `
                <button class="btn-cancel" onclick="updateOrderStatusAdmin('${order.orderId}', 'cancelled'); closeOrderDetailModal();">
                    <i class="fas fa-times-circle"></i> Cancel Order
                </button>
            ` : ''}
            <button class="btn-whatsapp" onclick="contactCustomerWhatsApp('${order.customerPhone}', '${order.customerName}', '${order.orderId}')">
                <i class="fab fa-whatsapp"></i> Contact Customer
            </button>
            <button class="btn-secondary" onclick="closeOrderDetailModal()">Close</button>
        </div>
    `;

    modal.style.display = 'flex';
}

// Close order detail modal
function closeOrderDetailModal() {
    document.getElementById('orderDetailModal').style.display = 'none';
}

// Update order status
async function updateOrderStatusAdmin(orderId, newStatus) {
    const statusMessages = {
        'accepted': 'Accept this order?',
        'processing': 'Start processing this order?',
        'out-for-delivery': 'Mark this order as out for delivery?',
        'delivered': 'Mark this order as delivered?',
        'cancelled': 'Cancel this order?'
    };

    const successMessages = {
        'accepted': 'Order accepted successfully!',
        'processing': 'Order marked as processing!',
        'out-for-delivery': 'Order marked as out for delivery!',
        'delivered': 'Order marked as delivered!',
        'cancelled': 'Order cancelled successfully!'
    };

    const confirmMessage = statusMessages[newStatus] || 'Update order status?';

    if (!confirm(confirmMessage)) return;

    const result = await updateOrderStatus(orderId, newStatus);

    if (result.success) {
        alert(`✅ ${successMessages[newStatus] || 'Order updated successfully!'}`);
        await loadOrders();
        displayOrders(currentOrders, currentOrderFilter);
    } else {
        alert('❌ Error updating order: ' + result.error);
    }
}

// Delete order
async function deleteOrderAdmin(orderId) {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;

    const result = await deleteOrder(orderId);

    if (result.success) {
        alert('✅ Order deleted successfully!');
        await loadOrders();
        displayOrders(currentOrders, currentOrderFilter);
    } else {
        alert('❌ Error deleting order: ' + result.error);
    }
}

// Contact customer via WhatsApp
function contactCustomerWhatsApp(phone, customerName, orderId) {
    const message = `Hello ${customerName}! 👋\n\nThis is Rose Collection regarding your order ${orderId}.\n\nHow can we help you?`;
    const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Initialize orders tab
function initOrdersTab() {
    const ordersTab = document.querySelector('[data-tab="orders"]');
    if (!ordersTab) return;

    // Load orders when tab is clicked
    ordersTab.addEventListener('click', async () => {
        await loadOrders();
    });

    // Set up filter buttons
    const filterButtons = document.querySelectorAll('.order-filters .filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            // Display filtered orders
            currentOrderFilter = btn.getAttribute('data-status');
            displayOrders(currentOrders, currentOrderFilter);
        });
    });

    // Set up real-time listener if using Firebase
    if (useFirebase && db) {
        listenToOrders((orders) => {
            currentOrders = orders;
            // Only update display if orders tab is active
            const ordersTabContent = document.getElementById('ordersTab');
            if (ordersTabContent && ordersTabContent.classList.contains('active')) {
                displayOrders(orders, currentOrderFilter);
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrdersTab);
} else {
    initOrdersTab();
}
