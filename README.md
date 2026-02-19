# Rose Collection - E-Commerce Website

## 🌹 Welcome to Rose Collection

A beautiful, interactive e-commerce website for managing and displaying clothing products.

## 📍 Store Location
**Naman Tower, Ghanta Ghar Chowk**
Near Ghanta Ghar, Ghaspura
Khandwa, Madhya Pradesh 450001

📞 **Phone:** 079990 95600

## 🚀 Quick Start

### 1. Add Your Logo
To use your store logo:
1. Copy your logo file `474044974_1155492932281406_4353325053586269034_n.jpg` to the `shop` folder
2. Rename it to `logo.png` (or update the filename in the HTML files)
3. The logo will automatically appear in the header

**OR** you can use any image editing software to convert your logo:
```bash
# If you have ImageMagick installed:
convert 474044974_1155492932281406_4353325053586269034_n.jpg logo.png
```

### 2. Open the Website
Simply open `index.html` in your web browser:
```bash
open index.html
```

### 3. Access Admin Panel
- Click "Admin" in the navigation or open `admin.html`
- **Login Credentials:**
  - Username: `admin`
  - Password: `admin123`

## ✨ Features

### Customer-Facing Features:
- 🎨 Beautiful, modern design with rose theme
- 📱 Fully responsive (works on all devices)
- 🔍 Product filtering by category
- ✨ Smooth animations and transitions
- 🗺️ Embedded Google Maps for store location
- 📞 Click-to-call phone number
- 🔝 Scroll to top button
- 💫 Interactive hover effects

### Admin Features:
- ➕ Add new products
- ✏️ Edit existing products
- 🗑️ Delete products
- 📊 View all products in a table
- 🖼️ Add product images via URL
- 📝 Manage product descriptions
- 💰 Set prices and stock quantities
- 🏷️ Categorize products (Men, Women, Kids, Accessories)

## 📂 File Structure
```
shop/
├── index.html          # Main shop page
├── admin.html          # Admin panel
├── styles.css          # All styling
├── script.js           # Main website JavaScript
├── admin.js            # Admin panel JavaScript
├── logo.png            # Your logo (add this file)
└── README.md           # This file
```

## 🎨 Customization

### Change Colors
Edit `styles.css` and modify the CSS variables:
```css
:root {
    --primary-color: #d4447e;  /* Main brand color */
    --secondary-color: #ff6b9d; /* Secondary brand color */
}
```

### Update Contact Information
Edit the contact section in `index.html`

### Change Admin Credentials
Edit `admin.js` and modify:
```javascript
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
```

## 📝 Adding Products

1. Go to the admin panel (`admin.html`)
2. Log in with admin credentials
3. Click "Add New Product"
4. Fill in product details:
   - **Name:** Product name
   - **Category:** Men/Women/Kids/Accessories
   - **Price:** In Rupees (₹)
   - **Stock:** Available quantity
   - **Image URL:** Link to product image
   - **Description:** Product details
5. Click "Save Product"

### Where to Get Product Images?
- Upload to a free image hosting service (Imgur, ImgBB, etc.)
- Use product images from your supplier
- Use Unsplash for demo images: `https://images.unsplash.com/`

## 🔒 Security Note
**IMPORTANT:** This website stores data in the browser's localStorage. For a production website:
- Set up a proper backend server
- Use a real database
- Implement secure authentication
- Use HTTPS

## 🌐 Deployment Options

### Option 1: Simple HTTP Server
```bash
python3 -m http.server 8000
# Visit: http://localhost:8000
```

### Option 2: Deploy to Hosting
Upload all files to:
- GitHub Pages
- Netlify
- Vercel
- Any web hosting service

## 📱 Mobile Features
- Touch-friendly navigation
- Responsive product grid
- Mobile menu
- Optimized images
- Fast loading

## 🎯 Browser Support
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

## 💡 Tips
1. Keep product images consistent in size
2. Write clear product descriptions
3. Update stock quantities regularly
4. Use high-quality images
5. Test on mobile devices

## 🆘 Need Help?
If you need to modify anything or add features, the code is well-commented and easy to understand.

---

**Made with ❤️ for Rose Collection, Khandwa**
