// Firebase Product Management Functions

// Get all products from Firebase
async function getProductsFromFirebase() {
    try {
        const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
        const products = [];
        snapshot.forEach(doc => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return products;
    } catch (error) {
        console.error('Error getting products:', error);
        return [];
    }
}

// Add product to Firebase
async function addProductToFirebase(product) {
    try {
        const docRef = await db.collection('products').add({
            ...product,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding product:', error);
        return { success: false, error: error.message };
    }
}

// Update product in Firebase
async function updateProductInFirebase(productId, product) {
    try {
        await db.collection('products').doc(productId).update({
            ...product,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating product:', error);
        return { success: false, error: error.message };
    }
}

// Delete product from Firebase
async function deleteProductFromFirebase(productId) {
    try {
        await db.collection('products').doc(productId).delete();
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: error.message };
    }
}

// Real-time listener for products (automatically updates when data changes)
function listenToProducts(callback) {
    return db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const products = [];
        snapshot.forEach(doc => {
            const productData = {
                id: doc.id,
                ...doc.data()
            };
            products.push(productData);

            // Debug: Log color variants
            if (productData.hasColorVariants && productData.colorVariants) {
                console.log('📦 Product loaded with color variants:', productData.name, {
                    hasColorVariants: productData.hasColorVariants,
                    variantCount: productData.colorVariants.length,
                    colors: productData.colorVariants.map(v => v.colorName)
                });
            }
        });
        console.log('✅ Total products loaded from Firebase:', products.length);
        callback(products);
    }, error => {
        console.error('Error listening to products:', error);
        callback([]);
    });
}
