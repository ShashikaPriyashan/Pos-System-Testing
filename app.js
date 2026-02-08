// --- 1. Database Initialization ---
const db = new Dexie('KadePOS');
db.version(4).stores({
    products: '++id, name, sku, category',
    inventory: '++id, productId, size, color, quantity, buyingPrice, retailPrice, wholesalePrice',
    sales: '++id, date, customerName, totalAmount, processedBy',
    users: '++id, username, password, role', // Roles: Admin, Staff
    settings: 'id, shopName, shopAddress, shopPhone, logo, theme'
});

// --- 2. State Management ---
const state = {
    currentUser: null,
    cart: [],
    priceMode: 'retail', // 'retail' or 'wholesale'
    currentView: 'dashboard'
};

// --- 3. DOM Elements ---
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// --- 4. Initialization ---
window.addEventListener('DOMContentLoaded', async () => {
    // Icons
    lucide.createIcons();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }

    // PWA Install Prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt(deferredPrompt);
    });

    // Persist Storage
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(persistent => {
            console.log(persistent ? "Storage is persistent" : "Storage is NOT persistent");
        });
    }

    // Check Theme
    await initTheme();

    // Check Auth
    checkAuth();

    // Setup Event Listeners
    setupEventListeners();
});

function showInstallPrompt(prompt) {
    const banner = document.createElement('div');
    banner.className = 'install-prompt bg-blue-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-4';
    banner.innerHTML = `
        <i data-lucide="download" class="w-5 h-5"></i>
        <span class="text-sm font-medium">Install KadePOS as an app</span>
        <button id="install-btn" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-bold hover:bg-gray-100">Install</button>
        <button id="dismiss-install" class="text-white hover:text-gray-200">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    `;
    document.body.appendChild(banner);
    lucide.createIcons();

    document.getElementById('install-btn').addEventListener('click', async () => {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
        banner.remove();
    });

    document.getElementById('dismiss-install').addEventListener('click', () => {
        banner.remove();
    });
}

async function initTheme() {
    // Load from DB settings or LocalStorage fall back
    let setting = await db.settings.get(1);
    if (setting && setting.theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// --- 5. Authentication ---
async function checkAuth() {
    const sessionUser = sessionStorage.getItem('kade_user');
    if (sessionUser) {
        state.currentUser = JSON.parse(sessionUser);
        showApp();
    } else {
        // Check if no users exist (First Run)
        const userCount = await db.users.count();
        if (userCount === 0) {
            // Create Default Admin
            await db.users.add({ username: 'admin', password: '123', role: 'admin' });
            console.log('Default admin created');
        }
        showLogin();
    }
}

function showLogin() {
    $('#login-screen').classList.remove('hidden');
    $('#app-layout').classList.add('hidden');
}

function showApp() {
    $('#login-screen').classList.add('hidden');
    $('#app-layout').classList.remove('hidden');
    $('#current-user-name').textContent = state.currentUser.username;
    $('#current-user-role').textContent = state.currentUser.role.toUpperCase();

    updateUIForRole();

    // Initial Load - If staff, go straight to POS
    if (state.currentUser.role === 'staff') {
        navigateTo('pos');
    } else {
        navigateTo('dashboard');
    }
    updateDashboard(); // Load stats anyway
}

function updateUIForRole() {
    const role = state.currentUser.role;
    const navItems = $$('.nav-item');

    navItems.forEach(item => {
        const target = item.getAttribute('data-target');
        if (role === 'staff') {
            if (target === 'pos') {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        } else {
            item.classList.remove('hidden'); // Admin sees all
        }
    });
}

$('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#username').value;
    const password = $('#password').value;

    const user = await db.users.where({ username: username }).first();

    if (user && user.password === password) {
        state.currentUser = user;
        sessionStorage.setItem('kade_user', JSON.stringify(user));
        $('#login-error').classList.add('hidden');
        showApp();
    } else {
        $('#login-error').textContent = 'Invalid credentials';
        $('#login-error').classList.remove('hidden');
    }
});

function logout() {
    sessionStorage.removeItem('kade_user');
    state.currentUser = null;
    window.location.reload();
}

// --- 6. Navigation ---
function toggleSidebar() {
    const sidebar = $('#sidebar');
    const overlay = $('#sidebar-overlay');

    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');

    // Refresh icons after toggle
    setTimeout(() => lucide.createIcons(), 100);
}

function navigateTo(viewId) {
    // Hide all views
    $$('.view-section').forEach(el => el.classList.add('hidden'));

    // Show target view
    $(`#view-${viewId}`).classList.remove('hidden');
    state.currentView = viewId;

    // Update Page Title
    $('#page-title').textContent = viewId.charAt(0).toUpperCase() + viewId.slice(1);

    // Close mobile sidebar if open
    if (!$('#sidebar').classList.contains('-translate-x-full')) {
        toggleSidebar();
    }

    // Refresh Data for specific views
    if (viewId === 'dashboard') updateDashboard();
    if (viewId === 'pos') initPOS();
    if (viewId === 'inventory') loadInventory();
    if (viewId === 'users') loadUsers();
    if (viewId === 'settings') loadSettings();
}

// --- 7. Theme Logic ---
$('#theme-toggle').addEventListener('click', async () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');

    // Save to DB
    const currentSettings = await db.settings.get(1) || { id: 1 };
    currentSettings.theme = isDark ? 'dark' : 'light';
    await db.settings.put(currentSettings);
});


// --- 8. Inventory Management ---
async function loadInventory() {
    const list = await db.inventory.toArray();
    // Join with product data
    // Optimisation: Load all products into a Map?
    // Determine product info for inventory items
    const products = await db.products.toArray();
    const productMap = new Map(products.map(p => [p.id, p]));

    const tbody = $('#inventory-table-body');
    tbody.innerHTML = '';

    list.forEach(item => {
        const product = productMap.get(item.productId);
        if (!product) return;

        const row = document.createElement('tr');
        row.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
        row.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">${product.name}</td>
            <td class="px-6 py-4">${product.category || '-'}</td>
            <td class="px-6 py-4">${product.sku}</td>
            <td class="px-6 py-4">${item.color || '-'} / ${item.size || '-'}</td>
            <td class="px-6 py-4 text-right ${item.quantity < 5 ? 'text-red-500 font-bold' : ''}">${item.quantity}</td>
            <td class="px-6 py-4 text-right">${item.retailPrice.toFixed(2)}</td>
            <td class="px-6 py-4 text-right">${item.wholesalePrice.toFixed(2)}</td>
            <td class="px-6 py-4 text-center">
                <div class="flex justify-center space-x-2">
                    <button onclick="editInventoryItem(${item.id})" class="text-blue-600 hover:text-blue-900 dark:text-blue-500 dark:hover:text-blue-400">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteInventoryItem(${item.id})" class="text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    lucide.createIcons();
}

$('#add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const inventoryId = parseInt(data.inventoryId);

    // Transaction to add/update product and inventory
    await db.transaction('rw', db.products, db.inventory, async () => {
        if (inventoryId) {
            // EDIT MODE
            const inventoryItem = await db.inventory.get(inventoryId);
            if (!inventoryItem) return;

            // Update associated product
            await db.products.update(inventoryItem.productId, {
                name: data.name,
                sku: data.sku,
                category: data.category
            });

            // Update inventory
            await db.inventory.update(inventoryId, {
                size: data.size,
                color: data.color,
                quantity: parseInt(data.quantity),
                buyingPrice: parseFloat(data.buyingPrice),
                retailPrice: parseFloat(data.retailPrice),
                wholesalePrice: parseFloat(data.wholesalePrice)
            });
            showToast('Product updated successfully!');
        } else {
            // ADD MODE
            let product = await db.products.where('sku').equals(data.sku).first();
            let productId;

            if (!product) {
                productId = await db.products.add({
                    name: data.name,
                    sku: data.sku,
                    category: data.category
                });
            } else {
                productId = product.id;
            }

            await db.inventory.add({
                productId: productId,
                size: data.size,
                color: data.color,
                quantity: parseInt(data.quantity),
                buyingPrice: parseFloat(data.buyingPrice),
                retailPrice: parseFloat(data.retailPrice),
                wholesalePrice: parseFloat(data.wholesalePrice)
            });
            showToast('Product added successfully!');
        }
    });

    closeModal('add-product-modal');
    loadInventory();
});

function openProductModal() {
    // Reset form for "Add" mode
    $('#add-product-modal h3').textContent = 'Add New Product';
    const form = $('#add-product-form');
    form.reset();
    form.inventoryId.value = '';
    openModal('add-product-modal');
}

async function editInventoryItem(id) {
    const item = await db.inventory.get(id);
    if (!item) return;
    const product = await db.products.get(item.productId);
    if (!product) return;

    // Set modal title
    $('#add-product-modal h3').textContent = 'Edit Product';

    // Fill form
    const form = $('#add-product-form');
    form.inventoryId.value = item.id;
    form.name.value = product.name;
    form.category.value = product.category || '';
    form.sku.value = product.sku;
    form.color.value = item.color || '';
    form.size.value = item.size || '';
    form.quantity.value = item.quantity;
    form.buyingPrice.value = item.buyingPrice;
    form.retailPrice.value = item.retailPrice;
    form.wholesalePrice.value = item.wholesalePrice;

    openModal('add-product-modal');
}

async function deleteInventoryItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        await db.inventory.delete(id);
        loadInventory();
        showToast('Item deleted.');
    }
}


// --- 9. POS System ---
async function initPOS() {
    const products = await db.products.toArray();
    const inventory = await db.inventory.toArray();

    // Denormalize for faster search
    const items = inventory.map(inv => {
        const prod = products.find(p => p.id === inv.productId);
        return { ...inv, ...prod, inventoryId: inv.id };
    });

    renderPOSGrid(items);

    // Search function (shared between main and mobile search)
    const performSearch = (query) => {
        const filtered = items.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.sku.toLowerCase().includes(query)
        );
        renderPOSGrid(filtered);
    };

    // Main Search (top of product grid)
    $('#pos-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        performSearch(query);
        // Sync with mobile search
        const mobileSearch = $('#pos-mobile-search');
        if (mobileSearch) mobileSearch.value = e.target.value;
    });

    // Mobile Quick Search (in cart section)
    const mobileSearch = $('#pos-mobile-search');
    if (mobileSearch) {
        mobileSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            performSearch(query);
            // Sync with main search
            $('#pos-search').value = e.target.value;
        });
    }
}

function renderPOSGrid(items) {
    const grid = $('#pos-product-grid');
    grid.innerHTML = '';

    items.forEach(item => {
        const price = state.priceMode === 'retail' ? item.retailPrice : item.wholesalePrice;

        const card = document.createElement('button');
        card.className = 'flex flex-col p-3 md:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all text-left min-h-[120px] active:scale-95';
        card.disabled = item.quantity <= 0;
        card.onclick = () => addToCart(item);

        card.innerHTML = `
            <span class="font-bold text-gray-800 dark:text-white truncate w-full">${item.name}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">${item.category || ''}</span>
            <div class="mt-2 text-xs text-gray-600 dark:text-gray-300">
                <span class="px-1 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">${item.sku}</span>
                <span class="px-1 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">${item.size || '-'}</span>
                <span class="px-1 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">${item.color || '-'}</span>
            </div>
            <div class="mt-auto flex justify-between items-end w-full pt-2">
                <span class="text-green-600 dark:text-green-400 font-bold">Rs. ${price.toFixed(2)}</span>
                <span class="text-xs ${item.quantity > 0 ? 'text-gray-500' : 'text-red-500'}">Qty: ${item.quantity}</span>
            </div>
        `;
        if (item.quantity <= 0) {
            card.classList.add('opacity-50', 'cursor-not-allowed');
        }
        grid.appendChild(card);
    });
}

function setPriceMode(mode) {
    state.priceMode = mode;
    $('#btn-retail').className = mode === 'retail'
        ? 'px-3 py-1 text-sm font-medium rounded-md bg-white dark:bg-gray-600 shadow-sm transition-colors text-gray-800 dark:text-white'
        : 'px-3 py-1 text-sm font-medium rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-500 dark:text-gray-300 transition-colors';

    $('#btn-wholesale').className = mode === 'wholesale'
        ? 'px-3 py-1 text-sm font-medium rounded-md bg-white dark:bg-gray-600 shadow-sm transition-colors text-gray-800 dark:text-white'
        : 'px-3 py-1 text-sm font-medium rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-500 dark:text-gray-300 transition-colors';

    // Refresh Grid to show new prices
    initPOS();
    // Update Cart Prices NOT DONE - assuming cart prices lock on add. 
    // If requirement is dynamic updates, iterate cart.
    // For now, let's keep added items as they were added.
}

function addToCart(item) {
    const price = state.priceMode === 'retail' ? item.retailPrice : item.wholesalePrice;

    const existing = state.cart.find(i => i.inventoryId === item.inventoryId && i.price === price);

    if (existing) {
        if (existing.qty < item.quantity) {
            existing.qty++;
        } else {
            showToast('Not enough stock!', 'error');
            return;
        }
    } else {
        state.cart.push({
            ...item,
            inventoryId: item.inventoryId,
            price: price,
            qty: 1
        });
    }
    renderCart();
}

function renderCart() {
    const list = $('#pos-cart-items');
    list.innerHTML = '';

    let total = 0;

    state.cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-700';
        div.innerHTML = `
            <div class="flex-1 min-w-0 mr-2">
                <p class="text-sm font-medium truncate dark:text-white">${item.name}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    Rs. ${item.price.toFixed(2)} x ${item.qty}
                </p>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold dark:text-gray-200">Rs. ${itemTotal.toFixed(2)}</span>
                <button onclick="removeFromCart(${index})" class="text-red-500 hover:text-red-700">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        list.appendChild(div);
    });

    $('#cart-subtotal').textContent = `Rs. ${total.toFixed(2)}`;
    $('#cart-total').textContent = `Rs. ${total.toFixed(2)}`;

    // Update balance if input exists
    calculateBalance();

    lucide.createIcons();
}

function calculateBalance() {
    const totalText = $('#cart-total').textContent.replace('Rs. ', '');
    const total = parseFloat(totalText) || 0;
    const cashInput = $('#pos-cash-given');

    if (cashInput) {
        const cashGiven = parseFloat(cashInput.value) || 0;
        const balance = cashGiven - total;

        const balanceEl = $('#pos-balance');
        if (balanceEl) {
            balanceEl.textContent = `Rs. ${balance.toFixed(2)}`;
            if (balance < 0) {
                balanceEl.classList.add('text-red-500');
                balanceEl.classList.remove('text-green-500');
            } else {
                balanceEl.classList.add('text-green-500');
                balanceEl.classList.remove('text-red-500');
            }
        }
    }
}


function removeFromCart(index) {
    state.cart.splice(index, 1);
    renderCart();
}

async function processCheckout() {
    if (state.cart.length === 0) {
        showToast('Cart is empty!', 'error');
        return;
    }

    const customerName = $('#pos-customer-name').value || 'Cash Customer';
    const totalAmount = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // Validate Cash
    const cashInput = $('#pos-cash-given');
    const cashGiven = parseFloat(cashInput.value) || 0;

    if (cashGiven < totalAmount && cashInput.value !== '') {
        if (!confirm('Cash given is LESS than total amount. Continue as partial payment/credit?')) {
            return;
        }
    }
    const balance = cashGiven - totalAmount;

    // Save Sale
    const saleId = await db.transaction('rw', db.sales, db.inventory, async () => {
        const id = await db.sales.add({
            date: new Date(),
            customerName,
            totalAmount,
            cashGiven: cashGiven > 0 ? cashGiven : totalAmount,
            balance: cashGiven > 0 ? balance : 0,
            processedBy: state.currentUser.username,
            items: state.cart
        });

        // Update Stock
        for (const item of state.cart) {
            const inv = await db.inventory.get(item.inventoryId);
            if (inv) {
                inv.quantity -= item.qty;
                await db.inventory.put(inv);
            }
        }
        return id;
    });

    // Print Receipt
    printReceipt(saleId, customerName, totalAmount, state.cart, cashGiven > 0 ? cashGiven : totalAmount, cashGiven > 0 ? balance : 0);

    // Clear Cart
    state.cart = [];
    renderCart();
    $('#pos-customer-name').value = '';
    $('#pos-cash-given').value = '';
    $('#pos-balance').textContent = 'Rs. 0.00';
    showToast('Sale completed successfully!');

    // Refresh Inventory if visible
    if (state.currentView === 'inventory') loadInventory();

    // Auto backup check (every 50 sales)
    const salesCount = await db.sales.count();
    if (salesCount % 50 === 0) {
        exportData();
    }
}

async function printReceipt(saleId, customer, total, items, cashGiven, balance) {
    const settings = await db.settings.get(1) || { shopName: 'KadePOS Shop', shopAddress: 'Sri Lanka', shopPhone: '000-0000000' };

    const date = new Date().toLocaleString();

    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                <span>${item.name} (${item.qty})</span>
                <span>${(item.price * item.qty).toFixed(2)}</span>
            </div>
        `;
    });

    const receiptHtml = `
        <div style="font-family: monospace; text-align: center; width: 100%;">
            <h2 style="margin: 0; font-size: 16px; font-weight: bold;">${settings.shopName || 'KadePOS'}</h2>
            <p style="margin: 5px 0; font-size: 12px;">${settings.shopAddress || ''}</p>
            <p style="margin: 0; font-size: 12px;">Tel: ${settings.shopPhone || ''}</p>
            <hr style="border-top: 1px dashed black; margin: 10px 0;">
            <div style="text-align: left; font-size: 12px;">
                <p style="margin: 2px 0;">ID: #${saleId}</p>
                <p style="margin: 2px 0;">Date: ${date}</p>
                <p style="margin: 2px 0;">Customer: ${customer}</p>
            </div>
            <hr style="border-top: 1px dashed black; margin: 10px 0;">
            ${itemsHtml}
            <hr style="border-top: 1px dashed black; margin: 10px 0;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                <span>TOTAL:</span>
                <span>Rs. ${total.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 5px;">
                <span>Cash:</span>
                <span>Rs. ${cashGiven.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span>Balance:</span>
                <span>Rs. ${balance.toFixed(2)}</span>
            </div>
            <p style="margin-top: 20px; font-size: 12px;">Thank you, come again!</p>
        </div>
    `;

    $('#receipt-print-area').innerHTML = receiptHtml;
    window.print();
}

async function shareViaWhatsApp() {
    if (state.cart.length === 0) {
        showToast('Cart is empty!', 'error');
        return;
    }

    const settings = await db.settings.get(1) || { shopName: 'KadePOS Shop', shopPhone: '000-0000000' };
    const customer = $('#pos-customer-name').value || 'Customer';
    const totalAmount = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const date = new Date().toLocaleDateString();

    let message = `*${settings.shopName}*\n\n`;
    message += `Date: ${date}\n`;
    message += `Customer: ${customer}\n`;
    message += `------------------------\n`;

    state.cart.forEach(item => {
        message += `${item.name} x ${item.qty} = ${(item.price * item.qty).toFixed(2)}\n`;
    });

    message += `------------------------\n`;
    message += `*TOTAL: Rs. ${totalAmount.toFixed(2)}*\n\n`;
    message += `Thank you!`;

    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = prompt("Enter customer WhatsApp number (with country code, e.g., 94770000000):");

    if (phoneNumber) {
        window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
    }
}

async function downloadPDF() {
    if (state.cart.length === 0) {
        showToast('Cart is empty!', 'error');
        return;
    }

    if (!window.jspdf) {
        showToast('PDF library not loaded', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // 80mm width, variable height (approx)
    });

    const settings = await db.settings.get(1) || { shopName: 'KadePOS Shop', shopAddress: 'Sri Lanka', shopPhone: '000-0000000' };
    const customer = $('#pos-customer-name').value || 'Customer';
    const totalAmount = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const date = new Date().toLocaleString();

    let y = 10;
    const lineHeight = 5;
    const centerX = 40; // 80mm / 2

    // Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(settings.shopName, centerX, y, { align: 'center' });
    y += lineHeight + 2;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (settings.shopAddress) {
        doc.text(settings.shopAddress, centerX, y, { align: 'center' });
        y += lineHeight;
    }
    if (settings.shopPhone) {
        doc.text(`Tel: ${settings.shopPhone}`, centerX, y, { align: 'center' });
        y += lineHeight + 2;
    }

    doc.text("------------------------------------------", centerX, y, { align: 'center' });
    y += lineHeight;

    // Meta
    doc.setFontSize(9);
    doc.text(`Date: ${date}`, 5, y);
    y += lineHeight;
    doc.text(`Customer: ${customer}`, 5, y);
    y += lineHeight;

    doc.text("------------------------------------------", centerX, y, { align: 'center' });
    y += lineHeight;

    // Items
    state.cart.forEach(item => {
        const lineVal = (item.price * item.qty).toFixed(2);
        // Simple truncation for PDF
        const name = item.name.length > 20 ? item.name.substring(0, 17) + "..." : item.name;

        doc.text(`${name}`, 5, y);
        doc.text(`${item.qty}`, 50, y, { align: 'right' });
        doc.text(`${lineVal}`, 75, y, { align: 'right' });
        y += lineHeight;
    });

    doc.text("------------------------------------------", centerX, y, { align: 'center' });
    y += lineHeight;

    // Totals
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 5, y);
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, 75, y, { align: 'right' });

    y += lineHeight * 2;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you, come again!", centerX, y, { align: 'center' });

    doc.save(`receipt-${Date.now()}.pdf`);
}


// --- 10. User Management ---
async function loadUsers() {
    const currentUser = state.currentUser;
    if (currentUser.role !== 'admin') {
        $('#users-table-body').innerHTML = '<tr><td colspan="3" class="text-center p-4">Access Denied</td></tr>';
        return;
    }

    const users = await db.users.toArray();
    const tbody = $('#users-table-body');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700';
        row.innerHTML = `
            <td class="px-6 py-4 dark:text-white">${user.username}</td>
            <td class="px-6 py-4 dark:text-white uppercase">${user.role}</td>
            <td class="px-6 py-4 text-center">
                ${user.username !== 'admin' ? `
                <button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>` : '<span class="text-gray-400">-</span>'}
            </td>
        `;
        tbody.appendChild(row);
    });
    lucide.createIcons();
}

$('#add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#new-username').value;
    const password = $('#new-password').value;
    const role = $('#new-role').value;

    await db.users.add({ username, password, role });
    closeModal('add-user-modal');
    e.target.reset();
    loadUsers();
    showToast('User added.');
});

async function deleteUser(id) {
    if (confirm('Delete user?')) {
        await db.users.delete(id);
        loadUsers();
    }
}


// --- 11. Settings & Data ---
async function loadSettings() {
    const settings = await db.settings.get(1);
    if (settings) {
        $('#set-shop-name').value = settings.shopName || '';
        $('#set-shop-address').value = settings.shopAddress || '';
        $('#set-shop-phone').value = settings.shopPhone || '';
    }
}

$('#shop-settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        id: 1, // Singleton settings
        shopName: $('#set-shop-name').value,
        shopAddress: $('#set-shop-address').value,
        shopPhone: $('#set-shop-phone').value,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    };
    await db.settings.put(data);
    showToast('Settings saved.');
});

function dailyClose() {
    if (confirm('This will export a backup of the database. Continue?')) {
        exportData();
    }
}

async function exportData() {
    const data = {
        products: await db.products.toArray(),
        inventory: await db.inventory.toArray(),
        sales: await db.sales.toArray(),
        users: await db.users.toArray(), // Careful with passwords in real apps
        settings: await db.settings.toArray()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kadepos_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup downloaded.');
}

async function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);

            await db.transaction('rw', db.products, db.inventory, db.sales, db.users, db.settings, async () => {
                await db.products.clear();
                await db.inventory.clear();
                await db.sales.clear();
                await db.users.clear();
                await db.settings.clear();

                if (data.products) await db.products.bulkAdd(data.products);
                if (data.inventory) await db.inventory.bulkAdd(data.inventory);
                if (data.sales) await db.sales.bulkAdd(data.sales);
                if (data.users) await db.users.bulkAdd(data.users);
                if (data.settings) await db.settings.bulkAdd(data.settings);
            });

            alert('Data imported successfully! The page will reload.');
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Error importing data. Invalid file format.');
        }
    };
    reader.readAsText(file);
}

async function resetDatabase() {
    if (confirm('WARNING: This will delete ALL data. Passwords, sales, products. This cannot be undone. Are you sure?')) {
        await db.delete();
        window.location.reload();
    }
}


// --- 12. Dashboard & Utils ---
async function updateDashboard() {
    // Basic stats logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sales = await db.sales.where('date').aboveOrEqual(today).toArray();
    const totalSales = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const lowStock = await db.inventory.where('quantity').below(5).count();
    const totalProducts = await db.inventory.count();

    $('#dash-total-sales').textContent = `Rs. ${totalSales.toFixed(2)}`;
    $('#dash-order-count').textContent = sales.length;
    $('#dash-low-stock').textContent = lowStock;
    $('#dash-total-products').textContent = totalProducts;

    // Recent Sales
    const recent = await db.sales.reverse().limit(5).toArray();
    const tbody = $('#recent-sales-table-body');
    tbody.innerHTML = '';

    recent.forEach(sale => {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700';
        row.innerHTML = `
            <td class="px-6 py-4">#${sale.id}</td>
            <td class="px-6 py-4">${new Date(sale.date).toLocaleDateString()}</td>
            <td class="px-6 py-4">${sale.customerName}</td>
            <td class="px-6 py-4 font-bold">Rs. ${sale.totalAmount.toFixed(2)}</td>
            <td class="px-6 py-4 text-green-500">Completed</td>
        `;
        tbody.appendChild(row);
    });
}

function refreshData() {
    const view = state.currentView;
    if (view === 'dashboard') updateDashboard();
    if (view === 'inventory') loadInventory();
    if (view === 'pos') initPOS();
}

// Global Modal Functions
window.openModal = (id) => $(`#${id}`).classList.remove('hidden');
window.closeModal = (id) => {
    const modal = $(`#${id}`);
    modal.classList.add('hidden');
    // If modal contains a form, reset it
    const form = modal.querySelector('form');
    if (form) form.reset();
};

// Toast Notification
function showToast(message, type = 'success') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    const color = type === 'error' ? 'bg-red-500' : 'bg-green-500';

    toast.className = `${color} text-white px-6 py-3 rounded shadow-lg toast flex items-center gap-2`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
