// Category Management

// Default categories
const DEFAULT_CATEGORIES = ['all', 'men', 'others'];

// Get categories from Firebase or localStorage
async function getCategories() {
    if (useFirebase && db) {
        try {
            const doc = await db.collection('settings').doc('categories').get();
            if (doc.exists) {
                return doc.data().list || getDefaultCategories();
            }
        } catch (error) {
            console.error('Error getting categories:', error);
        }
    }

    // Fallback to localStorage
    const stored = localStorage.getItem('roseCollectionCategories');
    return stored ? JSON.parse(stored) : getDefaultCategories();
}

// Get default categories
function getDefaultCategories() {
    return [
        'all',
        'men',
        'jeans',
        'shirt',
        'tshirt',
        'lower',
        'hoodies',
        'sweaters',
        'summer-wear',
        'winter-wear',
        'others'
    ];
}

// Save categories to Firebase or localStorage
async function saveCategories(categories) {
    if (useFirebase && db) {
        try {
            await db.collection('settings').doc('categories').set({
                list: categories,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error saving categories:', error);
            return { success: false, error: error.message };
        }
    }

    // Fallback to localStorage
    localStorage.setItem('roseCollectionCategories', JSON.stringify(categories));
    return { success: true };
}

// Add new category
async function addCategory(categoryName) {
    const categories = await getCategories();
    const slug = categoryName.toLowerCase().replace(/\s+/g, '-');

    // Check if already exists
    if (categories.includes(slug)) {
        return { success: false, error: 'Category already exists!' };
    }

    categories.push(slug);
    return await saveCategories(categories);
}

// Delete category
async function deleteCategory(categorySlug) {
    // Prevent deleting default categories
    if (DEFAULT_CATEGORIES.includes(categorySlug)) {
        return { success: false, error: 'Cannot delete default category!' };
    }

    const categories = await getCategories();
    const filtered = categories.filter(c => c !== categorySlug);

    return await saveCategories(filtered);
}

// Count products in category
async function countProductsInCategory(categorySlug) {
    if (useFirebase && db) {
        try {
            const snapshot = await db.collection('products')
                .where('category', '==', categorySlug)
                .get();
            return snapshot.size;
        } catch (error) {
            console.error('Error counting products:', error);
            return 0;
        }
    }

    // Fallback to localStorage
    const products = getProductsFromLocalStorage();
    return products.filter(p => p.category === categorySlug).length;
}

// Display categories in admin panel
async function loadCategoriesInAdmin() {
    const categories = await getCategories();
    const grid = document.getElementById('categoriesGrid');

    if (!grid) return;

    const categoryCards = await Promise.all(categories.map(async (cat) => {
        const count = await countProductsInCategory(cat);
        const isDefault = DEFAULT_CATEGORIES.includes(cat);
        const displayName = cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        return `
            <div class="category-card ${isDefault ? 'default-category' : ''}">
                <h3>${displayName}</h3>
                <p class="category-count">${count} product${count !== 1 ? 's' : ''}</p>
                <button class="delete-category-btn" onclick="handleDeleteCategory('${cat}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
    }));

    grid.innerHTML = categoryCards.join('');
}

// Handle delete category
async function handleDeleteCategory(categorySlug) {
    const count = await countProductsInCategory(categorySlug);

    if (count > 0) {
        if (!confirm(`This category has ${count} product(s). Deleting it will NOT delete the products, but they will be uncategorized. Continue?`)) {
            return;
        }
    }

    if (!confirm(`Are you sure you want to delete this category?`)) {
        return;
    }

    const result = await deleteCategory(categorySlug);

    if (result.success) {
        alert('✅ Category deleted successfully!');
        loadCategoriesInAdmin();
        updateCategoryDropdown();
    } else {
        alert('❌ Error: ' + result.error);
    }
}

// Update category dropdown in product form
async function updateCategoryDropdown() {
    const categories = await getCategories();
    const dropdown = document.getElementById('productCategory');

    if (!dropdown) return;

    // Keep current selection
    const currentValue = dropdown.value;

    // Update options (exclude 'all')
    const options = categories
        .filter(cat => cat !== 'all')
        .map(cat => {
            const displayName = cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `<option value="${cat}">${displayName}</option>`;
        });

    dropdown.innerHTML = '<option value="">Select Category</option>' + options.join('');

    // Restore selection if still exists
    if (currentValue && categories.includes(currentValue)) {
        dropdown.value = currentValue;
    }
}

// Initialize category management
function initCategoryManagement() {
    // Tab switching
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');

            // Update tab buttons
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update tab content
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(targetTab + 'Tab').classList.add('active');

            // Load categories if switching to categories tab
            if (targetTab === 'categories') {
                loadCategoriesInAdmin();
            }
        });
    });

    // Add category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            document.getElementById('categoryForm').style.display = 'block';
            document.getElementById('categoryName').focus();
        });
    }

    // Cancel category button
    const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
    if (cancelCategoryBtn) {
        cancelCategoryBtn.addEventListener('click', () => {
            document.getElementById('categoryForm').style.display = 'none';
            document.getElementById('categoryFormElement').reset();
        });
    }

    // Category form submission
    const categoryForm = document.getElementById('categoryFormElement');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const categoryName = document.getElementById('categoryName').value.trim();

            if (!categoryName) {
                alert('Please enter a category name!');
                return;
            }

            const result = await addCategory(categoryName);

            if (result.success) {
                alert('✅ Category added successfully!');
                document.getElementById('categoryForm').style.display = 'none';
                document.getElementById('categoryFormElement').reset();
                loadCategoriesInAdmin();
                updateCategoryDropdown();
            } else {
                alert('❌ Error: ' + result.error);
            }
        });
    }

    // Initial load of category dropdown
    updateCategoryDropdown();
}
