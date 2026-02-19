# Firebase Setup Guide for Rose Collection

## Step 1: Create Firebase Account

1. Go to **https://firebase.google.com/**
2. Click **"Get Started"** or **"Go to Console"**
3. Sign in with your Google account (create one if you don't have)

## Step 2: Create New Project

1. Click **"Add project"** or **"Create a project"**
2. **Project name:** `rose-collection` (or any name you like)
3. Click **Continue**
4. **Google Analytics:** You can disable it (not needed) or keep it
5. Click **Create project**
6. Wait for project creation (30 seconds)
7. Click **Continue**

## Step 3: Set Up Firestore Database

1. In the left sidebar, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. **Select location:** Choose closest to India (asia-south1 - Mumbai)
4. **Security rules:** Select **"Start in test mode"** (we'll secure it later)
5. Click **Next** → **Enable**
6. Wait for database creation

## Step 4: Get Firebase Configuration

1. Click the **Settings icon** (⚙️) next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>`
5. **App nickname:** `rose-collection-web`
6. **DON'T** check "Also set up Firebase Hosting"
7. Click **"Register app"**
8. You'll see a `firebaseConfig` object - **COPY THIS!** It looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "rose-collection-xxxx.firebaseapp.com",
  projectId: "rose-collection-xxxx",
  storageBucket: "rose-collection-xxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxx"
};
```

9. **IMPORTANT:** Save this configuration - we'll need it!
10. Click **"Continue to console"**

## Step 5: Set Up Security Rules (Important!)

1. Go to **Firestore Database**
2. Click **"Rules"** tab
3. Replace the rules with this (to make it secure):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow everyone to READ products
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null; // Only authenticated users can write
    }

    // For now, allow all writes (we'll add admin auth later)
    match /products/{productId} {
      allow read, write: if true;
    }
  }
}
```

4. Click **"Publish"**

## Step 6: Enable Authentication (for Admin Panel)

1. In left sidebar, click **"Build"** → **"Authentication"**
2. Click **"Get started"**
3. Click **"Email/Password"** under Sign-in method
4. **Enable** the toggle
5. Click **"Save"**
6. Click **"Users"** tab
7. Click **"Add user"**
8. **Email:** Your admin email (e.g., admin@rosecollection.com)
9. **Password:** Your admin password (e.g., Rose@123456)
10. Click **"Add user"**

## ✅ You're Done!

Now copy your `firebaseConfig` and send it to me, or paste it in the next message!

It should look like:
```
apiKey: "AIza..."
authDomain: "..."
projectId: "..."
storageBucket: "..."
messagingSenderId: "..."
appId: "..."
```

Once you provide this, I'll update your website to use Firebase! 🚀
