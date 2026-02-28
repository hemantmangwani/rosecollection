// Order Management System

// Order statuses
const ORDER_STATUSES = {
    PENDING: 'pending',           // Order received, waiting for admin
    ACCEPTED: 'accepted',         // Admin accepted the order
    PROCESSING: 'processing',     // Order is being prepared
    OUT_FOR_DELIVERY: 'out-for-delivery', // Order sent for delivery
    DELIVERED: 'delivered',       // Order successfully delivered
    CANCELLED: 'cancelled'        // Order cancelled
};

// Save order to Firebase/localStorage
async function saveOrder(orderData) {
    const order = {
        orderId: 'ORD-' + Date.now(),
        userId: orderData.userId || null, // Store user ID for tracking
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        items: orderData.items,
        totalAmount: orderData.totalAmount,
        status: ORDER_STATUSES.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (useFirebase && db) {
        try {
            await db.collection('orders').doc(order.orderId).set({
                ...order,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, orderId: order.orderId };
        } catch (error) {
            console.error('Error saving order:', error);
            return { success: false, error: error.message };
        }
    }

    // Fallback to localStorage
    const orders = JSON.parse(localStorage.getItem('roseCollectionOrders') || '[]');
    orders.unshift(order);
    localStorage.setItem('roseCollectionOrders', JSON.stringify(orders));
    return { success: true, orderId: order.orderId };
}

// Get all orders
async function getAllOrders() {
    if (useFirebase && db) {
        try {
            const snapshot = await db.collection('orders')
                .orderBy('createdAt', 'desc')
                .get();
            const orders = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                orders.push({
                    orderId: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
                });
            });
            return orders;
        } catch (error) {
            console.error('Error getting orders:', error);
            return [];
        }
    }

    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('roseCollectionOrders') || '[]');
}

// Update order status
async function updateOrderStatus(orderId, status) {
    if (useFirebase && db) {
        try {
            await db.collection('orders').doc(orderId).update({
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating order:', error);
            return { success: false, error: error.message };
        }
    }

    // Fallback to localStorage
    const orders = JSON.parse(localStorage.getItem('roseCollectionOrders') || '[]');
    const orderIndex = orders.findIndex(o => o.orderId === orderId);
    if (orderIndex !== -1) {
        orders[orderIndex].status = status;
        orders[orderIndex].updatedAt = new Date().toISOString();
        localStorage.setItem('roseCollectionOrders', JSON.stringify(orders));
        return { success: true };
    }
    return { success: false, error: 'Order not found' };
}

// Delete order
async function deleteOrder(orderId) {
    if (useFirebase && db) {
        try {
            await db.collection('orders').doc(orderId).delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting order:', error);
            return { success: false, error: error.message };
        }
    }

    // Fallback to localStorage
    let orders = JSON.parse(localStorage.getItem('roseCollectionOrders') || '[]');
    orders = orders.filter(o => o.orderId !== orderId);
    localStorage.setItem('roseCollectionOrders', JSON.stringify(orders));
    return { success: true };
}

// Get orders for a specific user
async function getUserOrders(userEmail) {
    if (useFirebase && db) {
        try {
            // Try with orderBy first
            let snapshot;
            try {
                snapshot = await db.collection('orders')
                    .where('customerEmail', '==', userEmail)
                    .orderBy('createdAt', 'desc')
                    .get();
            } catch (indexError) {
                // If index error, try without orderBy
                console.warn('Firestore index required, fetching without orderBy:', indexError);
                snapshot = await db.collection('orders')
                    .where('customerEmail', '==', userEmail)
                    .get();
            }

            const orders = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                orders.push({
                    orderId: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
                });
            });

            // Sort manually if we couldn't use orderBy
            orders.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB - dateA; // Descending order
            });

            return orders;
        } catch (error) {
            console.error('Error getting user orders:', error);

            // Fallback to getting all orders and filtering
            try {
                const allOrders = await getAllOrders();
                return allOrders.filter(order => order.customerEmail === userEmail);
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                return [];
            }
        }
    }

    // Fallback to localStorage
    const allOrders = JSON.parse(localStorage.getItem('roseCollectionOrders') || '[]');
    return allOrders.filter(order => order.customerEmail === userEmail);
}

// Listen to orders in real-time (Firebase only)
function listenToOrders(callback) {
    if (useFirebase && db) {
        return db.collection('orders')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const orders = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    orders.push({
                        orderId: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate?.() || new Date()
                    });
                });
                callback(orders);
            });
    }
    return null;
}

// Listen to user-specific orders in real-time (Firebase only)
function listenToUserOrders(userEmail, callback) {
    if (useFirebase && db) {
        try {
            return db.collection('orders')
                .where('customerEmail', '==', userEmail)
                .onSnapshot(snapshot => {
                    const orders = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        orders.push({
                            orderId: doc.id,
                            ...data,
                            createdAt: data.createdAt?.toDate?.() || new Date()
                        });
                    });

                    // Sort manually by createdAt descending
                    orders.sort((a, b) => {
                        const dateA = new Date(a.createdAt);
                        const dateB = new Date(b.createdAt);
                        return dateB - dateA;
                    });

                    callback(orders);
                }, error => {
                    console.error('Error in user orders listener:', error);
                    // Try fallback - get all orders and filter
                    getUserOrders(userEmail).then(orders => {
                        callback(orders);
                    });
                });
        } catch (error) {
            console.error('Error setting up user orders listener:', error);
            return null;
        }
    }
    return null;
}

// Get status display info
function getStatusInfo(status) {
    const statusMap = {
        'pending': { label: 'Pending', icon: 'clock', color: '#ffc107', description: 'Order received, waiting for confirmation' },
        'accepted': { label: 'Accepted', icon: 'check-circle', color: '#17a2b8', description: 'Order confirmed and accepted' },
        'processing': { label: 'Processing', icon: 'cog', color: '#007bff', description: 'Order is being prepared' },
        'out-for-delivery': { label: 'Out for Delivery', icon: 'shipping-fast', color: '#fd7e14', description: 'Order is on the way' },
        'delivered': { label: 'Delivered', icon: 'check-double', color: '#28a745', description: 'Order successfully delivered' },
        'cancelled': { label: 'Cancelled', icon: 'times-circle', color: '#dc3545', description: 'Order cancelled' }
    };
    return statusMap[status] || statusMap['pending'];
}
