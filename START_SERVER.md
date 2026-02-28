# 🚀 How to Run Rose Collection Website

## ⚠️ IMPORTANT: Don't Open HTML Files Directly!

**Problem:** You're opening `file:///Users/hemant.mangwani/...` which doesn't work with Firebase.

**Solution:** Run a local web server.

---

## ✅ Quick Start (Choose ONE method)

### Method 1: Python (Easiest - Recommended)

**If you have Python installed:**

1. Open Terminal
2. Navigate to the shop folder:
   ```bash
   cd /Users/hemant.mangwani/gitproject/20jan/Bhagavata/shop
   ```

3. Run this command:
   ```bash
   python3 -m http.server 8000
   ```

4. Open browser and go to:
   ```
   http://localhost:8000
   ```

5. Click on `index.html` or `my-orders.html`

**To stop:** Press `Ctrl+C` in terminal

---

### Method 2: Node.js (If you have Node)

1. Install http-server globally (one time only):
   ```bash
   npm install -g http-server
   ```

2. Navigate to shop folder:
   ```bash
   cd /Users/hemant.mangwani/gitproject/20jan/Bhagavata/shop
   ```

3. Run:
   ```bash
   http-server -p 8000
   ```

4. Open browser:
   ```
   http://localhost:8000
   ```

---

### Method 3: PHP (If you have PHP)

1. Navigate to shop folder:
   ```bash
   cd /Users/hemant.mangwani/gitproject/20jan/Bhagavata/shop
   ```

2. Run:
   ```bash
   php -S localhost:8000
   ```

3. Open browser:
   ```
   http://localhost:8000
   ```

---

### Method 4: VS Code Live Server Extension

1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. It will open in browser automatically

---

## 🎯 After Starting Server

1. Go to: `http://localhost:8000`
2. You should see the Rose Collection homepage
3. Login with your account (hemant@gmail.com)
4. Click "My Orders" to see your orders

---

## 🔍 Why This is Needed

Firebase requires:
- `http://` or `https://` protocol
- NOT `file://` protocol

When you open HTML files directly (double-click), they use `file://` which:
- ❌ Doesn't work with Firebase
- ❌ Doesn't work with authentication
- ❌ Blocks cross-origin requests
- ❌ Can't use web storage properly

When you use a local server (http://localhost):
- ✅ Works with Firebase
- ✅ Authentication works
- ✅ Database connections work
- ✅ Everything functions normally

---

## 📱 Testing on Mobile

If you want to test on your phone on the same WiFi:

1. Find your computer's IP address:
   - Mac: System Preferences → Network
   - Windows: `ipconfig` in CMD
   - Linux: `ifconfig`

2. Start server on your computer (use any method above)

3. On your phone, open browser and go to:
   ```
   http://YOUR_IP_ADDRESS:8000
   ```
   Example: `http://192.168.1.100:8000`

---

## ✅ Verify It's Working

After starting the server, you should see in console:
```
✅ Firebase initialized successfully!
```

NOT:
```
❌ Firebase initialization error
```

---

## 🚀 Quick Command (Copy-Paste)

**For Mac/Linux:**
```bash
cd /Users/hemant.mangwani/gitproject/20jan/Bhagavata/shop && python3 -m http.server 8000
```

**Then open:** http://localhost:8000

---

## 🐛 Troubleshooting

### "Command not found: python3"
- Try: `python -m http.server 8000`
- Or install Python from python.org

### "Port 8000 already in use"
- Use different port: `python3 -m http.server 8080`
- Then open: http://localhost:8080

### Still getting file:// in browser
- Don't double-click HTML files
- Start server first
- Then navigate to http://localhost:8000 in browser

---

## 🎉 Ready!

Once the server is running and you open `http://localhost:8000`:
1. ✅ Firebase will work
2. ✅ Authentication will work
3. ✅ My Orders page will work
4. ✅ Everything will function properly!
