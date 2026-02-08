# 🛒 KadePOS - Offline Point of Sale System

> A modern, offline-first POS system for retail and wholesale businesses. Works 100% offline with no backend required!

![PWA](https://img.shields.io/badge/PWA-enabled-blue)
![Offline](https://img.shields.io/badge/Offline-First-green)
![Mobile](https://img.shields.io/badge/Mobile-Responsive-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 💼 Core POS Functionality
- **Real-time POS Terminal** with product search
- **Dual Pricing** (Retail & Wholesale modes)
- **Cart Management** with quantity controls
- **Cash & Balance Calculation** automatic change calculation
- **Receipt Printing** optimized for 80mm thermal printers
- **Digital Receipts** via WhatsApp & PDF download

### 📦 Inventory Management
- Product catalog with variants (size, color)
- Stock tracking with low-stock alerts
- Multi-price support (buying, retail, wholesale)
- Edit & delete inventory items
- SKU-based product lookup

### 📊 Dashboard & Reports
- Today's sales overview
- Recent transactions
- Low stock alerts
- Total products count

### 👥 User Management
- Multi-user support (Admin & Staff roles)
- Staff limited to POS-only access
- Secure session-based authentication

### 🎨 Modern UI/UX
- **Dark Mode** toggle
- **Fully Responsive** (Mobile, Tablet, Desktop)
- **Touch-friendly** interface
- **Smooth animations** and transitions
- **Tailwind CSS** styling

### 📱 Progressive Web App (PWA)
- **Install as native app** on any device
- **Works 100% offline** after first load
- **No app store needed**
- **Persistent data storage**
- **Service Worker caching**

## 🚀 Live Demo

**[Try it now →](https://YOUR-USERNAME.github.io/kadepos/)**

## 📥 Quick Start

### Option 1: Use Directly (No Installation)
1. Download this repository
2. Open `index.html` in any modern browser
3. Login with default credentials:
   - Username: `admin`
   - Password: `123`

### Option 2: Install as Mobile App
1. Visit the live demo on your phone
2. **Android**: Tap "Install" banner or Chrome menu → "Add to Home Screen"
3. **iOS**: Safari Share button → "Add to Home Screen"

### Option 3: Deploy Your Own
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🛠️ Technology Stack

- **HTML5/CSS3/JavaScript** - Core web technologies
- **Tailwind CSS** - Utility-first CSS framework
- **Dexie.js** - IndexedDB wrapper for local database
- **jsPDF** - PDF generation for digital receipts
- **Lucide Icons** - Beautiful icon set
- **Service Workers** - Offline functionality

**Zero dependencies** - No Node.js, no build process, no server required!

## 📖 Usage Guide

### Adding Products
1. Go to **Inventory** page
2. Click **Add Product** button
3. Fill in product details (name, SKU, prices, stock)
4. Click **Save**

### Making a Sale
1. Go to **POS Terminal**
2. Search or click products to add to cart
3. Switch between Retail/Wholesale pricing as needed
4. Enter customer name (optional)
5. Enter cash given
6. Click **Checkout & Print**

### Managing Users
1. Go to **Users** page (Admin only)
2. Click **Add User**
3. Create staff accounts with limited POS access

### Sharing Digital Receipts
After checkout:
- Click **WhatsApp** to send via WhatsApp Web
- Click **PDF** to download a printable PDF

## 📱 Mobile Features

- **Responsive design** adapts to any screen size
- **Touch-optimized** buttons and controls
- **Hamburger menu** for easy navigation on mobile
- **Momentum scrolling** for tables
- **Full-screen modals** on small devices

## 🔒 Data Privacy

- **100% Client-side** - No data leaves your device
- **No backend server** - No cloud dependency
- **No analytics** - Complete privacy
- **Persistent storage** - Data stays on device forever
- Your data, your control!

## ⚙️ Configuration

### Shop Details
Go to **Settings** page to configure:
- Shop name
- Address
- Phone number
- Theme (Dark/Light)

### Default Credentials
**⚠️ IMPORTANT:** Change the default admin password after first login!

Default: `admin` / `123`

To change: Modify the database or add password change feature.

## 📋 Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅      | ✅     |
| Edge    | ✅      | ✅     |
| Safari  | ✅      | ✅     |
| Firefox | ✅      | ✅     |

**Minimum Requirements:**
- IndexedDB support
- Service Worker support (for offline mode)
- ES6+ JavaScript support

## 🔄 Data Management

### Backup Data
- Click **Daily Close** button in header
- Downloads JSON file with all data
- Store backup safely

### Restore Data
- Go to **Settings** page
- Click **Import Backup**
- Select your JSON backup file

### Reset Database
- **Settings** → **Reset Database** (⚠️ Deletes everything!)

## 🐛 Troubleshooting

### Receipt not printing correctly
- Ensure printer is set to 80mm thermal paper
- Check print preview before printing
- Adjust printer margins if needed

### Data not persisting
- Enable persistent storage when prompted
- Check browser privacy settings
- Avoid incognito/private mode

### PWA not installable
- Ensure you're using HTTPS (GitHub Pages provides this)
- Service worker must register successfully
- Check browser console for errors

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

MIT License - feel free to use for commercial purposes!

## 🙏 Acknowledgments

Built with ❤️ for small businesses who need a simple, reliable POS system.

---

**Made with** 💙 **by** [Your Name]

**Need help?** Open an issue or contact [your-email@example.com]
