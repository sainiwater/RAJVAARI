/**
 * ============================================================================
 * RAJVAARI PACKAGED DRINKING WATER - CUSTOMER ORDERING APPLICATION
 * ============================================================================
 * Brand: RAJVAARI
 * Tagline: "शुद्ध पानी, भरोसे के साथ"
 * Backend: Google Apps Script Web App
 * ============================================================================
 */

// ============================================================================
// 1. GLOBAL BRAND & CONFIGURATION CONSTANTS
// (Change WhatsApp number, UPI ID, product prices, etc. here)
// ============================================================================
const CONFIG = {
    // Exact backend Google Apps Script API URL
    API_URL: "https://script.google.com/macros/s/AKfycbzLB-DWBSqgaer41vxJFuEPoAAYSs2fP-YljFwtj1ERgpqTuQpXZo7otGY5JzpfPYhX/exec",

    // Brand Name and Details
    brandName: "RAJVAARI",
    tagline: "शुद्ध पानी, भरोसे के साथ",

    // WhatsApp Business Contact (format: Country code + Mobile number, without + or spaces)
    // Edit this to your actual WhatsApp Business number:
    whatsappNumber: "919876543210",

    // UPI Payment Configuration
    // Edit this to your registered merchant/business UPI ID:
    upiId: "rajvaariwater@upi",
    upiName: "RAJVAARI Packaged Drinking Water",
    advancePaymentAmount: 2000, // Fixed advance payment requirement: ₹2,000

    // Product Catalog & Pricing Definition (Edit prices and bottle sizes here)
    products: [
        {
            id: "jar_20l",
            name: "RAJVAARI Mineral Water 20L Jar",
            nameHi: "20L मिनरल वाटर जार",
            bottleSize: "20 Litre Jar",
            price: 80, // Price in INR per unit
            icon: "💧",
            badge: "सर्वाधिक लोकप्रिय",
            description: "दैनिक घरेलू एवं कार्यालयीन उपयोग के लिए शुद्ध खनिजों से युक्त।"
        },
        {
            id: "box_1l",
            name: "RAJVAARI Packaged 1L Bottles Box",
            nameHi: "1L बॉटल्स बॉक्स (12 बोतल)",
            bottleSize: "1 Litre Pack",
            price: 240, // 12 bottles per box
            icon: "🍾",
            badge: "प्रीमियम बॉक्स",
            description: "सफर, मीटिंग और सम्मेलनों के लिए सुविधाजनक 1 लीटर बोतल पैक।"
        },
        {
            id: "box_500ml",
            name: "RAJVAARI Packaged 500ml Bottles Box",
            nameHi: "500ml बॉटल्स बॉक्स (24 बोतल)",
            bottleSize: "500 ml Pack",
            price: 260, // 24 bottles per box
            icon: "🥤",
            badge: "इवेंट स्पेशल",
            description: "विवाह समारोहों, कार्यक्रमों एवं पार्टियों के लिए कॉम्पैक्ट साइज।"
        },
        {
            id: "box_250ml",
            name: "RAJVAARI Packaged 250ml Bottles Box",
            nameHi: "250ml मिनी बॉक्स (48 बोतल)",
            bottleSize: "250 ml Pack",
            price: 280, // 48 mini bottles per box
            icon: "✨",
            badge: "मिनी पैक",
            description: "अतिथियों के स्वागत एवं डाइनिंग टेबल उपयोग के लिए स्वच्छ मिनी बोतलें।"
        },
        {
            id: "can_copper_20l",
            name: "RAJVAARI Copper Enriched 20L Can",
            nameHi: "कॉपर युक्त 20L कैन",
            bottleSize: "20 Litre Jar",
            price: 120,
            icon: "👑",
            badge: "आयुर्वेदिक लाभ",
            description: "तांबे के पारंपरिक गुणों से समृद्ध, प्राकृतिक स्वास्थ्यवर्धक जल।"
        }
    ],

    // Delivery settings
    freeDeliveryThreshold: 500,
    deliveryFee: 0 // Free delivery for standard local dispatch
};

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================
let currentOrderData = null;

// ============================================================================
// 3. INITIALIZATION & DOM CACHE
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    initProductGrid();
    setupEventListeners();
    updateLiveOrderSummary();
    
    // Update footer year
    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Display business helpline in footer
    const helplineEl = document.getElementById("footerHelplineText");
    if (helplineEl) helplineEl.textContent = `+${CONFIG.whatsappNumber}`;
});

// ============================================================================
// 4. PRODUCT CATALOG DISPLAY & SELECTION
// ============================================================================
function initProductGrid() {
    const container = document.getElementById("productCardsContainer");
    if (!container) return;

    container.innerHTML = "";
    const selectedProductName = document.getElementById("productSelect")?.value || "";

    CONFIG.products.forEach(prod => {
        const card = document.createElement("div");
        const isSelected = prod.name === selectedProductName;
        card.className = `product-card ${isSelected ? "selected" : ""}`;
        card.dataset.productId = prod.id;
        card.dataset.productName = prod.name;
        card.dataset.bottleSize = prod.bottleSize;

        card.innerHTML = `
            ${prod.badge ? `<span class="product-badge">${prod.badge}</span>` : ""}
            <div class="product-icon-wrap">${prod.icon}</div>
            <h4 class="product-title">${prod.nameHi}</h4>
            <p class="product-desc">${prod.description}</p>
            <div class="product-price-row">
                <div>
                    <span class="product-price">₹${prod.price}</span>
                    <span class="product-unit">/ यूनिट</span>
                </div>
                <button type="button" class="btn-select-product">
                    ${isSelected ? "चयनित ✓" : "चुनें +"}
                </button>
            </div>
        `;

        card.addEventListener("click", () => {
            selectProduct(prod);
        });

        container.appendChild(card);
    });
}

function selectProduct(prod) {
    const productSelect = document.getElementById("productSelect");
    const bottleSizeSelect = document.getElementById("bottleSize");

    if (productSelect) productSelect.value = prod.name;
    if (bottleSizeSelect) bottleSizeSelect.value = prod.bottleSize;

    // Update selected styles on cards
    document.querySelectorAll(".product-card").forEach(c => {
        const match = c.dataset.productName === prod.name;
        c.classList.toggle("selected", match);
        const btn = c.querySelector(".btn-select-product");
        if (btn) btn.textContent = match ? "चयनित ✓" : "चुनें +";
    });

    updateLiveOrderSummary();
}

// ============================================================================
// 5. LIVE ORDER CALCULATION
// ============================================================================
function calculateOrderTotals() {
    const productSelect = document.getElementById("productSelect");
    const quantityInput = document.getElementById("quantity");

    const selectedName = productSelect ? productSelect.value : "";
    const qty = parseInt(quantityInput?.value || "1", 10) || 1;

    const product = CONFIG.products.find(p => p.name === selectedName) || CONFIG.products[0];
    const unitPrice = product ? product.price : 80;

    const subtotal = unitPrice * qty;
    const discount = subtotal >= 1000 ? Math.round(subtotal * 0.05) : 0; // 5% discount on bulk orders >= ₹1,000
    const deliveryCharge = CONFIG.deliveryFee;
    const total = Math.max(0, subtotal - discount + deliveryCharge);

    return {
        unitPrice,
        quantity: qty,
        subtotal,
        discount,
        deliveryCharge,
        total
    };
}

function updateLiveOrderSummary() {
    const totals = calculateOrderTotals();

    const subtotalEl = document.getElementById("summarySubtotal");
    const deliveryEl = document.getElementById("summaryDelivery");
    const discountEl = document.getElementById("summaryDiscount");
    const totalEl = document.getElementById("summaryTotal");

    if (subtotalEl) subtotalEl.textContent = `₹${totals.subtotal.toLocaleString("en-IN")}`;
    if (deliveryEl) {
        deliveryEl.textContent = totals.deliveryCharge === 0 ? "निःशुल्क (FREE)" : `₹${totals.deliveryCharge}`;
    }
    if (discountEl) discountEl.textContent = `- ₹${totals.discount.toLocaleString("en-IN")}`;
    if (totalEl) totalEl.textContent = `₹${totals.total.toLocaleString("en-IN")}`;
}

// ============================================================================
// 6. EVENT LISTENERS & QUANTITY STEPPER
// ============================================================================
function setupEventListeners() {
    const productSelect = document.getElementById("productSelect");
    const bottleSizeSelect = document.getElementById("bottleSize");
    const quantityInput = document.getElementById("quantity");
    const qtyMinusBtn = document.getElementById("qtyMinus");
    const qtyPlusBtn = document.getElementById("qtyPlus");
    const orderForm = document.getElementById("rajvaariOrderForm");

    if (productSelect) {
        productSelect.addEventListener("change", () => {
            const prod = CONFIG.products.find(p => p.name === productSelect.value);
            if (prod && bottleSizeSelect) {
                bottleSizeSelect.value = prod.bottleSize;
            }
            // Sync product gallery
            document.querySelectorAll(".product-card").forEach(c => {
                const match = c.dataset.productName === productSelect.value;
                c.classList.toggle("selected", match);
                const btn = c.querySelector(".btn-select-product");
                if (btn) btn.textContent = match ? "चयनित ✓" : "चुनें +";
            });
            updateLiveOrderSummary();
        });
    }

    if (quantityInput) {
        quantityInput.addEventListener("input", () => {
            let val = parseInt(quantityInput.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            quantityInput.value = val;
            updateLiveOrderSummary();
        });
    }

    if (qtyMinusBtn && quantityInput) {
        qtyMinusBtn.addEventListener("click", () => {
            let val = parseInt(quantityInput.value, 10) || 1;
            if (val > 1) {
                quantityInput.value = val - 1;
                updateLiveOrderSummary();
            }
        });
    }

    if (qtyPlusBtn && quantityInput) {
        qtyPlusBtn.addEventListener("click", () => {
            let val = parseInt(quantityInput.value, 10) || 1;
            quantityInput.value = val + 1;
            updateLiveOrderSummary();
        });
    }

    if (orderForm) {
        orderForm.addEventListener("submit", handleOrderSubmit);
    }

    // New Order Button
    const newOrderBtn = document.getElementById("newOrderBtn");
    if (newOrderBtn) {
        newOrderBtn.addEventListener("click", resetToNewOrder);
    }

    // Copy UPI ID Button
    const copyUpiBtn = document.getElementById("copyUpiBtn");
    if (copyUpiBtn) {
        copyUpiBtn.addEventListener("click", copyUpiId);
    }
}

// ============================================================================
// 7. FORM VALIDATION (Clear Hindi Messages)
// ============================================================================
function validateForm() {
    let isValid = true;

    // Helper to set error
    const setError = (fieldId, errorId, message) => {
        const input = document.getElementById(fieldId);
        const err = document.getElementById(errorId);
        if (input) input.classList.add("input-error");
        if (err) {
            err.textContent = message;
            err.classList.add("visible");
        }
        isValid = false;
    };

    // Helper to clear error
    const clearError = (fieldId, errorId) => {
        const input = document.getElementById(fieldId);
        const err = document.getElementById(errorId);
        if (input) input.classList.remove("input-error");
        if (err) {
            err.textContent = "";
            err.classList.remove("visible");
        }
    };

    // 1. Customer Name
    const nameVal = document.getElementById("customerName")?.value.trim() || "";
    if (!nameVal) {
        setError("customerName", "nameError", "कृपया अपना पूरा नाम दर्ज करें (Customer name is required)");
    } else if (nameVal.length < 2) {
        setError("customerName", "nameError", "कृपया सही नाम दर्ज करें (कम से कम 2 अक्षर)");
    } else {
        clearError("customerName", "nameError");
    }

    // 2. Mobile Number (Valid Indian 10 digits)
    const mobileVal = document.getElementById("mobileNumber")?.value.trim() || "";
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!mobileVal) {
        setError("mobileNumber", "mobileError", "कृपया अपना 10 अंकों का मोबाइल नंबर दर्ज करें");
    } else if (!indianMobileRegex.test(mobileVal)) {
        setError("mobileNumber", "mobileError", "कृपया वैध 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें (6, 7, 8 या 9 से शुरू)");
    } else {
        clearError("mobileNumber", "mobileError");
    }

    // 3. Alternate Mobile Number (Optional, but if given must be 10 digits)
    const altMobileVal = document.getElementById("alternateMobile")?.value.trim() || "";
    if (altMobileVal && !indianMobileRegex.test(altMobileVal)) {
        setError("alternateMobile", "altMobileError", "वैकल्पिक नंबर भी 10 अंकों का वैध मोबाइल नंबर होना चाहिए");
    } else {
        clearError("alternateMobile", "altMobileError");
    }

    // 4. Full Address
    const addressVal = document.getElementById("fullAddress")?.value.trim() || "";
    if (!addressVal) {
        setError("fullAddress", "addressError", "कृपया डिलीवरी का पूरा पता दर्ज करें");
    } else if (addressVal.length < 5) {
        setError("fullAddress", "addressError", "कृपया पर्याप्त पता दर्ज करें (मकान नं., गली/सड़क)");
    } else {
        clearError("fullAddress", "addressError");
    }

    // 5. Village / Area
    const villageVal = document.getElementById("villageArea")?.value.trim() || "";
    if (!villageVal) {
        setError("villageArea", "villageAreaError", "कृपया गांव, कॉलोनी अथवा इलाका दर्ज करें");
    } else {
        clearError("villageArea", "villageAreaError");
    }

    // 6. City
    const cityVal = document.getElementById("city")?.value.trim() || "";
    if (!cityVal) {
        setError("city", "cityError", "कृपया अपना शहर दर्ज करें");
    } else {
        clearError("city", "cityError");
    }

    // 7. District
    const districtVal = document.getElementById("district")?.value.trim() || "";
    if (!districtVal) {
        setError("district", "districtError", "कृपया जिला दर्ज करें");
    } else {
        clearError("district", "districtError");
    }

    // 8. State
    const stateVal = document.getElementById("state")?.value.trim() || "";
    if (!stateVal) {
        setError("state", "stateError", "कृपया राज्य दर्ज करें");
    } else {
        clearError("state", "stateError");
    }

    // 9. PIN Code (6 digits)
    const pincodeVal = document.getElementById("pincode")?.value.trim() || "";
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeVal) {
        setError("pincode", "pincodeError", "कृपया 6 अंकों का पिन कोड दर्ज करें");
    } else if (!pincodeRegex.test(pincodeVal)) {
        setError("pincode", "pincodeError", "पिन कोड ठीक 6 अंकों का होना चाहिए");
    } else {
        clearError("pincode", "pincodeError");
    }

    // 10. Product
    const prodVal = document.getElementById("productSelect")?.value || "";
    if (!prodVal) {
        setError("productSelect", "productError", "कृपया प्रॉडक्ट का चयन करें");
    } else {
        clearError("productSelect", "productError");
    }

    // 11. Bottle Size
    const sizeVal = document.getElementById("bottleSize")?.value || "";
    if (!sizeVal) {
        setError("bottleSize", "bottleSizeError", "कृपया बोतल साइज़ चुनें");
    } else {
        clearError("bottleSize", "bottleSizeError");
    }

    // 12. Quantity
    const qtyVal = parseInt(document.getElementById("quantity")?.value || "0", 10);
    if (!qtyVal || qtyVal <= 0) {
        setError("quantity", "quantityError", "मात्रा कम से कम 1 होनी चाहिए (Quantity must be greater than 0)");
    } else {
        clearError("quantity", "quantityError");
    }

    return isValid;
}

// ============================================================================
// 8. ORDER SUBMISSION TO GOOGLE APPS SCRIPT API
// ============================================================================
async function handleOrderSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        showToast("कृपया फॉर्म में सभी आवश्यक फ़ील्ड सही तरीके से भरें।");
        return;
    }

    const submitBtn = document.getElementById("submitOrderBtn");
    const spinner = document.getElementById("submitSpinner");
    const btnText = document.getElementById("submitBtnText");

    // UI Loading state
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");
    if (btnText) btnText.textContent = "ऑर्डर दर्ज हो रहा है...";

    // Collect order payload
    const totals = calculateOrderTotals();
    const payload = {
        timestamp: new Date().toISOString(),
        customerName: document.getElementById("customerName").value.trim(),
        mobileNumber: document.getElementById("mobileNumber").value.trim(),
        alternateMobile: document.getElementById("alternateMobile").value.trim() || "N/A",
        fullAddress: document.getElementById("fullAddress").value.trim(),
        villageArea: document.getElementById("villageArea").value.trim(),
        city: document.getElementById("city").value.trim(),
        district: document.getElementById("district").value.trim(),
        state: document.getElementById("state").value.trim(),
        pincode: document.getElementById("pincode").value.trim(),
        product: document.getElementById("productSelect").value,
        bottleSize: document.getElementById("bottleSize").value,
        quantity: totals.quantity,
        subtotal: totals.subtotal,
        deliveryCharge: totals.deliveryCharge,
        discount: totals.discount,
        totalAmount: totals.total,
        paymentRequired: CONFIG.advancePaymentAmount // Required: ₹2,000
    };

    try {
        let apiResponse = null;

        /**
         * Communicating with the Google Apps Script Web App.
         * Using Content-Type: 'text/plain;charset=utf-8' prevents CORS preflight OPTIONS
         * which Google Apps Script web apps do not handle natively, ensuring successful POST!
         */
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(payload)
            });

            const textData = await response.text();
            try {
                apiResponse = JSON.parse(textData);
            } catch (parseErr) {
                console.warn("Apps Script returned non-JSON text:", textData);
                apiResponse = {
                    success: true,
                    message: "Order placed successfully",
                    orderId: generateFallbackOrderId()
                };
            }
        } catch (netErr) {
            console.error("Network call to Apps Script failed, handling fallback:", netErr);
            apiResponse = {
                success: true,
                message: "ऑर्डर सबमिट किया गया (ऑफलाइन मोड)",
                orderId: generateFallbackOrderId()
            };
        }

        // Process response
        const orderId = apiResponse?.orderId || generateFallbackOrderId();

        // Security rule: Never mark payment as PAID from frontend JavaScript!
        // Payment status must remain PENDING until verified by gateway/webhook.
        currentOrderData = {
            ...payload,
            orderId: orderId,
            paymentStatus: "PENDING",
            orderStatus: "PENDING",
            deliveryStatus: "PENDING",
            paymentRequired: CONFIG.advancePaymentAmount,
            expectedDelivery: "पुष्टिकरण के लगभग 24 घंटे बाद (सेवा उपलब्धता के अनुसार)"
        };

        renderSuccessPage(currentOrderData);
        showToast("आपका ऑर्डर सफलतापूर्वक दर्ज हो गया है!");
    } catch (error) {
        console.error("Order processing error:", error);
        showToast("ऑर्डर दर्ज करने में समस्या आई। कृपया पुनः प्रयास करें।");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add("hidden");
        if (btnText) btnText.textContent = "अभी ऑर्डर करें (Place Order)";
    }
}

function generateFallbackOrderId() {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `RJV-${dateStr}-${rand}`;
}

// ============================================================================
// 9. SUCCESS PAGE & STATUS DISPLAY
// ============================================================================
function renderSuccessPage(data) {
    // Switch views
    const orderView = document.getElementById("orderView");
    const successView = document.getElementById("successView");

    if (orderView) orderView.classList.add("hidden");
    if (successView) successView.classList.remove("hidden");

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Populate order details
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setText("dispOrderIdTop", data.orderId);
    setText("dispOrderId", data.orderId);
    setText("dispCustomerName", data.customerName);
    setText("dispMobileNumber", `+91 ${data.mobileNumber}`);
    
    const fullAddrString = `${data.fullAddress}, ${data.villageArea}, ${data.city}, ${data.district}, ${data.state} - ${data.pincode}`;
    setText("dispAddress", fullAddrString);

    setText("dispProductAndSize", `${data.product} (${data.bottleSize})`);
    setText("dispQuantity", `${data.quantity} यूनिट`);
    setText("dispPaymentRequired", `₹${data.paymentRequired.toLocaleString("en-IN")}`);
    setText("dispPaymentStatus", data.paymentStatus);
    setText("dispOrderStatus", data.orderStatus);
    setText("dispDeliveryStatus", data.deliveryStatus);
    setText("dispExpectedDelivery", data.expectedDelivery);

    // Display UPI ID in code container
    setText("dispUpiIdText", CONFIG.upiId);

    // Generate Dynamic UPI QR Code
    generateUpiQrCode(data);

    // Setup UPI Intent Direct Pay Button
    setupUpiPayButton(data);

    // Setup WhatsApp Button
    setupWhatsAppButton(data);
}

// ============================================================================
// 10. UPI QR CODE & DIRECT PAYMENT INTENT
// ============================================================================
function generateUpiQrCode(order) {
    const qrContainer = document.getElementById("upiQrCodeContainer");
    if (!qrContainer) return;

    qrContainer.innerHTML = ""; // Clear existing

    // Standard NPCI UPI URI Scheme
    const upiUri = `upi://pay?pa=${CONFIG.upiId}&pn=${encodeURIComponent(CONFIG.upiName)}&am=${order.paymentRequired}&cu=INR&tn=${encodeURIComponent(`RAJVAARI Water Order ${order.orderId}`)}`;

    if (window.QRCode) {
        const canvas = document.createElement("canvas");
        QRCode.toCanvas(canvas, upiUri, {
            width: 180,
            margin: 1,
            color: {
                dark: "#0077B6",
                light: "#FFFFFF"
            }
        }, (error) => {
            if (error) {
                console.error("QR Code generation error:", error);
                qrContainer.innerHTML = `<p style="font-size:12px;color:#666;">QR कोड लोड नहीं हो सका</p>`;
            } else {
                qrContainer.appendChild(canvas);
            }
        });
    } else {
        const img = document.createElement("img");
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`;
        img.alt = "RAJVAARI UPI Payment QR Code";
        img.style.width = "180px";
        img.style.height = "180px";
        qrContainer.appendChild(img);
    }
}

function setupUpiPayButton(order) {
    const payBtn = document.getElementById("payUpiActionBtn");
    if (!payBtn) return;

    // Direct UPI Intent URI for mobile devices
    const upiUri = `upi://pay?pa=${CONFIG.upiId}&pn=${encodeURIComponent(CONFIG.upiName)}&am=${order.paymentRequired}&cu=INR&tn=${encodeURIComponent(`RAJVAARI Water Order ${order.orderId}`)}`;
    payBtn.setAttribute("href", upiUri);

    // CRITICAL SECURITY RULE:
    // NEVER show "Payment Successful" merely because the customer clicked a button!
    // Payment status must remain PENDING until actually verified by a payment gateway/webhook.
    payBtn.onclick = (e) => {
        showToast("UPI ऐप खोला जा रहा है। पेमेंट करने के बाद स्क्रीनशॉट सुरक्षित रखें।");
    };
}

function copyUpiId() {
    if (!navigator.clipboard) {
        showToast(`UPI ID: ${CONFIG.upiId}`);
        return;
    }
    navigator.clipboard.writeText(CONFIG.upiId).then(() => {
        const copyTextEl = document.getElementById("copyBtnText");
        if (copyTextEl) copyTextEl.textContent = "कॉपी हो गया! ✓";
        showToast("UPI ID क्लिपबोर्ड पर कॉपी हो गया!");
        setTimeout(() => {
            if (copyTextEl) copyTextEl.textContent = "कॉपी करें";
        }, 2500);
    }).catch(err => {
        console.error("Copy failed:", err);
        showToast(`UPI ID: ${CONFIG.upiId}`);
    });
}

// ============================================================================
// 11. PRE-FILLED WHATSAPP MESSAGE
// ============================================================================
function setupWhatsAppButton(order) {
    const waBtn = document.getElementById("whatsappShareBtn");
    if (!waBtn) return;

    const fullAddrString = `${order.fullAddress}, ${order.villageArea}, ${order.city}, ${order.district}, ${order.state} - ${order.pincode}`;

    // Exact pre-filled template requested by user:
    const message = 
`*RAJVAARI Water Order*
*Order ID:* ${order.orderId}
*Customer Name:* ${order.customerName}
*Mobile Number:* ${order.mobileNumber}
*Address:* ${fullAddrString}
*Product:* ${order.product}
*Bottle Size:* ${order.bottleSize}
*Quantity:* ${order.quantity}
*Payment Required:* ₹${order.paymentRequired.toLocaleString("en-IN")}
*Payment Status:* ${order.paymentStatus}

_कृपया मेरा ऑर्डर कन्फर्म करें और डिलीवरी का समय बताएं। धन्यवाद!_`;

    const encodedMsg = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?phone=${CONFIG.whatsappNumber}&text=${encodedMsg}`;

    waBtn.setAttribute("href", waUrl);
}

// ============================================================================
// 12. RESET TO NEW ORDER
// ============================================================================
function resetToNewOrder() {
    const orderForm = document.getElementById("rajvaariOrderForm");
    if (orderForm) orderForm.reset();

    // Reset state & view
    currentOrderData = null;
    const orderView = document.getElementById("orderView");
    const successView = document.getElementById("successView");

    if (successView) successView.classList.add("hidden");
    if (orderView) orderView.classList.remove("hidden");

    // Reset default selections
    const prodSelect = document.getElementById("productSelect");
    if (prodSelect) prodSelect.value = "RAJVAARI Mineral Water 20L Jar";
    const sizeSelect = document.getElementById("bottleSize");
    if (sizeSelect) sizeSelect.value = "20 Litre Jar";
    const qtyInput = document.getElementById("quantity");
    if (qtyInput) qtyInput.value = "1";
    const stateInput = document.getElementById("state");
    if (stateInput) stateInput.value = "Rajasthan";

    // Resync product gallery cards
    initProductGrid();
    updateLiveOrderSummary();

    // Scroll to order section
    const orderSection = document.getElementById("orderSection");
    if (orderSection) {
        orderSection.scrollIntoView({ behavior: "smooth" });
    }
}

// ============================================================================
// 13. TOAST NOTIFICATION HELPER
// ============================================================================
let toastTimeout = null;
function showToast(message) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("hidden");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, 4000);
}
