// User Authentication System

let currentUser = null;

// Check if user is logged in
function checkUserAuth() {
    if (useFirebase && auth) {
        auth.onAuthStateChanged(async user => {
            if (user && db) {
                // Load additional user details from Firestore
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        currentUser = {
                            ...user,
                            displayName: user.displayName || userData.name, // Use Firebase displayName or Firestore name
                            phone: userData.phone,
                            address: userData.address,
                            name: userData.name // Keep name field for reference
                        };
                        console.log('✅ User loaded from Firestore:', currentUser.displayName);
                    } else {
                        currentUser = user;
                        console.log('⚠️ User not found in Firestore, using Firebase auth only');
                    }
                } catch (error) {
                    console.error('❌ Error loading user details:', error);
                    currentUser = user;
                }
            } else {
                currentUser = user;
            }
            updateUserUI();
        });
    } else {
        // Fallback to localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            console.log('✅ User loaded from localStorage:', currentUser.displayName);
        }
        updateUserUI();
    }
}

// Update UI based on user state
function updateUserUI() {
    const userBtn = document.getElementById('userBtn');
    const userMenu = document.getElementById('userMenu');

    if (!userBtn) return;

    if (currentUser) {
        // User is logged in
        let displayName = currentUser.displayName || currentUser.name || 'User';

        console.log('👤 Updating UI for user:', {
            displayName: currentUser.displayName,
            name: currentUser.name,
            email: currentUser.email,
            finalDisplayName: displayName
        });

        // If no display name, extract name from email
        if (!displayName || displayName === 'User') {
            if (currentUser.email) {
                const emailName = currentUser.email.split('@')[0];
                displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            }
        }

        // Use just first name
        const firstName = displayName.split(' ')[0];

        userBtn.innerHTML = `
            <i class="fas fa-user-circle"></i>
            <span title="${currentUser.email}">${firstName}</span>
        `;
        if (userMenu) {
            userMenu.style.display = 'block';
        }

        console.log('✅ UI updated with name:', firstName);
    } else {
        // User is not logged in
        userBtn.innerHTML = `
            <i class="fas fa-user"></i>
            <span>Login</span>
        `;
        if (userMenu) {
            userMenu.style.display = 'none';
        }
    }
}

// Show login modal
function showLoginModal() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
}

// Show signup modal
function showSignupModal() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
}

// Close auth modal
function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (useFirebase && auth) {
        try {
            await auth.signInWithEmailAndPassword(email, password);
            closeAuthModal();
            showSuccess('Welcome back! Login successful');
            // User details will be loaded by onAuthStateChanged
        } catch (error) {
            showError('Login failed: ' + error.message);
        }
    } else {
        // Fallback simple auth
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            currentUser = {
                email: user.email,
                displayName: user.name,
                phone: user.phone || '',
                address: user.address || '',
                uid: user.uid
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserUI();
            closeAuthModal();
            showSuccess(`Welcome back, ${user.name}!`);
            console.log('✅ Logged in as:', currentUser.displayName);
        } else {
            showError('Invalid email or password');
        }
    }
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const address = document.getElementById('signupAddress').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    // Validate email
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    if (!emailRegex.test(email)) {
        alert('❌ Please enter a valid email address');
        document.getElementById('signupEmail').focus();
        return;
    }

    // Validate phone
    const phoneRegex = /^[6-9][0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
        alert('❌ Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
        document.getElementById('signupPhone').focus();
        return;
    }

    if (password !== confirmPassword) {
        alert('❌ Passwords do not match!');
        return;
    }

    if (password.length < 6) {
        alert('❌ Password must be at least 6 characters!');
        return;
    }

    if (useFirebase && auth) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({
                displayName: name
            });

            // Save additional user details to Firestore
            if (db) {
                await db.collection('users').doc(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    phone: phone,
                    address: address || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            closeAuthModal();
            showSuccess('Account created successfully! Your details will be auto-filled during checkout', 5000);
        } catch (error) {
            showError('Signup failed: ' + error.message);
        }
    } else {
        // Fallback simple auth
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        if (users.find(u => u.email === email)) {
            alert('❌ Email already registered!');
            return;
        }

        const newUser = {
            email,
            password,
            name,
            phone,
            address: address || '',
            uid: 'user_' + Date.now()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        currentUser = {
            email,
            displayName: name,
            phone,
            address: address || '',
            uid: newUser.uid
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserUI();
        closeAuthModal();
        showSuccess(`Welcome, ${name}! Your details will be auto-filled during checkout`, 5000);
    }
}

// Handle logout
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;

    if (useFirebase && auth) {
        await auth.signOut();
    } else {
        localStorage.removeItem('currentUser');
        currentUser = null;
        updateUserUI();
    }

    showSuccess('Logged out successfully!');
    setTimeout(() => window.location.reload(), 1000);
}

// Initialize auth
function initAuth() {
    checkUserAuth();

    // User button click
    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.addEventListener('click', () => {
            if (currentUser) {
                // Show user menu
                const dropdown = document.getElementById('userDropdown');
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                }
            } else {
                showLoginModal();
            }
        });
    }

    // Login form
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Signup form
    const signupFormElement = document.getElementById('signupFormElement');
    if (signupFormElement) {
        signupFormElement.addEventListener('submit', handleSignup);
    }

    // Close modal on background click
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeAuthModal();
            }
        });
    }
}
