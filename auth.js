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

// ============================================
// Auth State Management
// ============================================

const AuthState = {
    activeMethod: 'google', // 'google' | 'email' | 'phone'
    isProcessing: false,
    confirmationResult: null, // Phone OTP verifier
    recaptchaVerifier: null,
    otpTimer: null,

    reset() {
        this.isProcessing = false;
        this.confirmationResult = null;

        // Clear OTP timer
        if (this.otpTimer) {
            clearInterval(this.otpTimer);
            this.otpTimer = null;
        }

        // Clear reCAPTCHA
        if (this.recaptchaVerifier) {
            try {
                this.recaptchaVerifier.clear();
            } catch (e) {
                console.log('reCAPTCHA already cleared');
            }
            this.recaptchaVerifier = null;
        }
    }
};

// ============================================
// Modal Functions
// ============================================

// Show login modal
function showLoginModal() {
    document.getElementById('authModal').style.display = 'flex';

    // Default to Google (fastest and most popular)
    const preferredMethod = localStorage.getItem('preferredAuthMethod') || 'google';
    switchAuthTab(preferredMethod);
}

// Show signup modal (for backward compatibility, switches to email tab)
function showSignupModal() {
    document.getElementById('authModal').style.display = 'flex';
    switchAuthTab('email');
    // Show signup form in email tab
    document.getElementById('emailLoginForm').style.display = 'none';
    document.getElementById('emailSignupForm').style.display = 'block';
}

// Close auth modal
function closeAuthModal() {
    // Clean up auth state
    AuthState.reset();

    // Hide modal
    document.getElementById('authModal').style.display = 'none';

    // Reset forms
    resetAuthForms();
}

// Reset all auth forms to initial state
function resetAuthForms() {
    // Reset phone OTP flow
    document.getElementById('phoneInputStep').style.display = 'block';
    document.getElementById('phoneOTPStep').style.display = 'none';
    document.getElementById('phoneProfileStep').style.display = 'none';
    document.getElementById('phoneNumberInput').value = '';

    // Clear OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => input.value = '');

    // Reset email forms
    document.getElementById('emailLoginForm').style.display = 'block';
    document.getElementById('emailSignupForm').style.display = 'none';

    // Clear form fields
    if (document.getElementById('loginFormElement')) {
        document.getElementById('loginFormElement').reset();
    }
    if (document.getElementById('signupFormElement')) {
        document.getElementById('signupFormElement').reset();
    }
}

// Switch between auth tabs
function switchAuthTab(method) {
    // Clean up previous method
    AuthState.reset();

    // Update active method
    AuthState.activeMethod = method;

    // Update tab active states
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById('tab-' + method).classList.add('active');

    // Show/hide tab content
    document.getElementById('phoneOTPContent').style.display = method === 'phone' ? 'block' : 'none';
    document.getElementById('googleContent').style.display = method === 'google' ? 'block' : 'none';
    document.getElementById('emailContent').style.display = method === 'email' ? 'block' : 'none';

    // Reset forms
    resetAuthForms();
}

// ============================================
// Phone OTP Authentication
// ============================================

// Initialize phone authentication
function initPhoneAuth() {
    if (!auth) {
        console.error('Firebase auth not initialized');
        return;
    }

    const sendButton = document.getElementById('phone-send-otp-btn');
    if (!sendButton) return;

    sendButton.addEventListener('click', sendOTP);
}

// Format phone number with country code
function formatPhoneNumber(input) {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');

    // Validate 10-digit Indian number
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
        throw new Error('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
    }

    return '+91' + digits;
}

// Send OTP to phone number
async function sendOTP() {
    const phoneInput = document.getElementById('phoneNumberInput');
    const phoneValue = phoneInput.value.trim();

    if (!phoneValue) {
        showError('Please enter your phone number');
        phoneInput.focus();
        return;
    }

    try {
        // Format and validate phone number
        const phoneNumber = formatPhoneNumber(phoneValue);

        // Show loading
        showLoading('Sending OTP...');

        // Initialize reCAPTCHA if not already done
        if (!AuthState.recaptchaVerifier) {
            AuthState.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
                'recaptcha-container',
                {
                    'size': 'invisible',
                    'callback': () => {
                        console.log('reCAPTCHA verified');
                    },
                    'expired-callback': () => {
                        showError('reCAPTCHA expired. Please try again.');
                        hideLoading();
                    }
                }
            );
        }

        // Send OTP
        AuthState.confirmationResult = await auth.signInWithPhoneNumber(
            phoneNumber,
            AuthState.recaptchaVerifier
        );

        hideLoading();

        // Show OTP input UI
        document.getElementById('phoneInputStep').style.display = 'none';
        document.getElementById('phoneOTPStep').style.display = 'block';
        document.getElementById('sentToNumber').textContent = phoneValue;

        // Focus first OTP input
        document.querySelector('.otp-input[data-index="0"]').focus();

        // Start countdown timer
        startOTPTimer(60);

        showSuccess('OTP sent to ' + phoneNumber);
    } catch (error) {
        hideLoading();
        console.error('Error sending OTP:', error);

        if (error.code === 'auth/invalid-phone-number') {
            showError('Invalid phone number format');
        } else if (error.code === 'auth/too-many-requests') {
            showError('Too many requests. Please try again later.');
        } else {
            showError(error.message || 'Failed to send OTP. Please try again.');
        }
    }
}

// Verify OTP code
async function verifyOTP() {
    const otpCode = getOTPFromInputs();

    if (otpCode.length !== 6) {
        showError('Please enter complete 6-digit OTP');
        return;
    }

    try {
        showLoading('Verifying OTP...');

        const userCredential = await AuthState.confirmationResult.confirm(otpCode);
        const user = userCredential.user;

        console.log('✅ Phone verified:', user.phoneNumber);

        // Check if user exists in Firestore
        if (db) {
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                // New user - show profile completion
                hideLoading();
                document.getElementById('phoneOTPStep').style.display = 'none';
                document.getElementById('phoneProfileStep').style.display = 'block';
                document.getElementById('profileName').focus();
            } else {
                // Existing user - login complete
                hideLoading();
                closeAuthModal();
                showSuccess('Welcome back!');
                // Remember this auth method
                localStorage.setItem('preferredAuthMethod', 'phone');
            }
        } else {
            // No Firestore, complete login
            hideLoading();
            closeAuthModal();
            showSuccess('Login successful!');
            localStorage.setItem('preferredAuthMethod', 'phone');
        }
    } catch (error) {
        hideLoading();
        console.error('Error verifying OTP:', error);

        if (error.code === 'auth/invalid-verification-code') {
            showError('Invalid OTP. Please check and try again.');
        } else if (error.code === 'auth/code-expired') {
            showError('OTP expired. Please request a new one.');
        } else {
            showError(error.message || 'Verification failed. Please try again.');
        }

        // Clear OTP inputs
        document.querySelectorAll('.otp-input').forEach(input => input.value = '');
        document.querySelector('.otp-input[data-index="0"]').focus();
    }
}

// Save profile after phone OTP signup
async function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim() || null;

    if (!name) {
        showError('Please enter your name');
        document.getElementById('profileName').focus();
        return;
    }

    try {
        showLoading('Saving profile...');

        const user = auth.currentUser;
        const phone = user.phoneNumber;

        // Save to Firestore
        if (db) {
            await db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                phone: phone,
                address: '',
                authProvider: 'phone',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        hideLoading();
        closeAuthModal();
        showSuccess('Welcome, ' + name + '!');
        localStorage.setItem('preferredAuthMethod', 'phone');
    } catch (error) {
        hideLoading();
        console.error('Error saving profile:', error);
        showError('Failed to save profile. Please try again.');
    }
}

// Start OTP countdown timer
function startOTPTimer(seconds) {
    const countdownElement = document.getElementById('countdown');
    const timerText = document.getElementById('otpTimer');
    const resendButton = document.getElementById('resendOTPBtn');

    let remaining = seconds;

    // Show timer, hide resend button
    timerText.style.display = 'block';
    resendButton.style.display = 'none';

    AuthState.otpTimer = setInterval(() => {
        remaining--;
        countdownElement.textContent = remaining;

        if (remaining <= 0) {
            clearInterval(AuthState.otpTimer);
            AuthState.otpTimer = null;

            // Hide timer, show resend button
            timerText.style.display = 'none';
            resendButton.style.display = 'block';
        }
    }, 1000);
}

// Resend OTP
async function resendOTP() {
    // Clear OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => input.value = '');

    // Go back to phone input
    document.getElementById('phoneOTPStep').style.display = 'none';
    document.getElementById('phoneInputStep').style.display = 'block';

    // Automatically resend
    await sendOTP();
}

// Get OTP from input boxes
function getOTPFromInputs() {
    let otp = '';
    document.querySelectorAll('.otp-input').forEach(input => {
        otp += input.value;
    });
    return otp;
}

// Setup OTP input auto-advance
function setupOTPInputs() {
    const inputs = document.querySelectorAll('.otp-input');

    inputs.forEach((input, index) => {
        // Auto-advance on input
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < 5) {
                inputs[index + 1].focus();
            }
        });

        // Backspace to previous input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                inputs[index - 1].focus();
            }
        });

        // Only allow numbers
        input.addEventListener('beforeinput', (e) => {
            if (e.data && !/^[0-9]$/.test(e.data)) {
                e.preventDefault();
            }
        });

        // Paste handling
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
            const digits = pastedData.split('').slice(0, 6);

            digits.forEach((digit, i) => {
                if (inputs[i]) {
                    inputs[i].value = digit;
                }
            });

            // Focus last filled input or next empty
            const lastIndex = Math.min(digits.length, 5);
            inputs[lastIndex].focus();
        });
    });
}

// ============================================
// Google Sign-In Authentication
// ============================================

// Initialize Google authentication
function initGoogleAuth() {
    const googleButton = document.getElementById('googleSignInBtn');
    if (!googleButton) return;

    googleButton.addEventListener('click', signInWithGoogle);
}

// Sign in with Google
async function signInWithGoogle() {
    if (!auth) {
        showError('Firebase not initialized');
        return;
    }

    try {
        showLoading('Opening Google Sign-In...');

        const googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.setCustomParameters({
            prompt: 'select_account'
        });

        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;

        console.log('✅ Google sign-in successful:', user.email);

        // Extract Google profile data
        const googleData = {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        };

        // Check if user exists in Firestore
        if (db) {
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                // New Google user - create profile
                await db.collection('users').doc(user.uid).set({
                    name: googleData.name,
                    email: googleData.email,
                    phone: '',
                    address: '',
                    photoURL: googleData.photoURL,
                    authProvider: 'google',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                hideLoading();
                closeAuthModal();
                showSuccess('Account created! Welcome, ' + googleData.name);
            } else {
                // Existing user - update name/email if changed
                await db.collection('users').doc(user.uid).update({
                    name: googleData.name,
                    email: googleData.email,
                    photoURL: googleData.photoURL,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                hideLoading();
                closeAuthModal();
                showSuccess('Welcome back, ' + googleData.name.split(' ')[0] + '!');
            }
        } else {
            hideLoading();
            closeAuthModal();
            showSuccess('Login successful!');
        }

        // Remember this auth method
        localStorage.setItem('preferredAuthMethod', 'google');
    } catch (error) {
        hideLoading();
        console.error('Google sign-in error:', error);

        if (error.code === 'auth/popup-closed-by-user') {
            showInfo('Sign-in cancelled');
        } else if (error.code === 'auth/popup-blocked') {
            showError('Please allow popups for Google Sign-In');
        } else {
            showError(error.message || 'Google sign-in failed');
        }
    }
}

// ============================================
// Loading Helpers
// ============================================

function showLoading(message) {
    const loader = document.getElementById('authLoader');
    const loaderMessage = document.getElementById('authLoaderMessage');

    if (loader && loaderMessage) {
        loaderMessage.textContent = message;
        loader.style.display = 'flex';
    }
}

function hideLoading() {
    const loader = document.getElementById('authLoader');
    if (loader) {
        loader.style.display = 'none';
    }
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
            // Remember this auth method
            localStorage.setItem('preferredAuthMethod', 'email');
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
                    authProvider: 'email',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            closeAuthModal();
            showSuccess('Account created successfully! Your details will be auto-filled during checkout', 5000);
            // Remember this auth method
            localStorage.setItem('preferredAuthMethod', 'email');
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

    // Setup auth tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const method = tab.getAttribute('data-method');
            switchAuthTab(method);
        });
    });

    // Setup phone OTP inputs auto-advance
    setupOTPInputs();

    // Phone OTP buttons
    const verifyOTPBtn = document.getElementById('phone-verify-otp-btn');
    if (verifyOTPBtn) {
        verifyOTPBtn.addEventListener('click', verifyOTP);
    }

    const resendOTPBtn = document.getElementById('resendOTPBtn');
    if (resendOTPBtn) {
        resendOTPBtn.addEventListener('click', resendOTP);
    }

    const backToPhoneBtn = document.getElementById('backToPhoneInput');
    if (backToPhoneBtn) {
        backToPhoneBtn.addEventListener('click', () => {
            document.getElementById('phoneOTPStep').style.display = 'none';
            document.getElementById('phoneInputStep').style.display = 'block';
            AuthState.reset();
        });
    }

    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }

    // Initialize phone auth
    initPhoneAuth();

    // Initialize Google auth
    initGoogleAuth();

    // Email tab - switch between login and signup
    const showEmailSignup = document.getElementById('showEmailSignup');
    if (showEmailSignup) {
        showEmailSignup.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('emailLoginForm').style.display = 'none';
            document.getElementById('emailSignupForm').style.display = 'block';
        });
    }

    const showEmailLogin = document.getElementById('showEmailLogin');
    if (showEmailLogin) {
        showEmailLogin.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('emailSignupForm').style.display = 'none';
            document.getElementById('emailLoginForm').style.display = 'block';
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

    console.log('✅ Enhanced auth system initialized with Phone OTP + Google + Email');
}
