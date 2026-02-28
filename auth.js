// User Authentication System

let currentUser = null;

// Check if user is logged in
function checkUserAuth() {
    if (useFirebase && auth) {
        auth.onAuthStateChanged(user => {
            currentUser = user;
            updateUserUI();
        });
    } else {
        // Fallback to localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
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
        let displayName = currentUser.displayName || 'User';

        // If no display name, extract name from email
        if (!currentUser.displayName && currentUser.email) {
            const emailName = currentUser.email.split('@')[0];
            displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
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
            alert('✅ Login successful!');
        } catch (error) {
            alert('❌ Login failed: ' + error.message);
        }
    } else {
        // Fallback simple auth
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            currentUser = { email: user.email, displayName: user.name };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserUI();
            closeAuthModal();
            alert('✅ Login successful!');
        } else {
            alert('❌ Invalid email or password!');
        }
    }
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

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
            closeAuthModal();
            alert('✅ Account created successfully!');
        } catch (error) {
            alert('❌ Signup failed: ' + error.message);
        }
    } else {
        // Fallback simple auth
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        if (users.find(u => u.email === email)) {
            alert('❌ Email already registered!');
            return;
        }

        users.push({ email, password, name });
        localStorage.setItem('users', JSON.stringify(users));

        currentUser = { email, displayName: name };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserUI();
        closeAuthModal();
        alert('✅ Account created successfully!');
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

    alert('✅ Logged out successfully!');
    window.location.reload();
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
