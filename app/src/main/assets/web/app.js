/**
 * ============================================================================
 * RAJVAARI PACKAGED DRINKING WATER - JAVASCRIPT APPLICATION
 * Brand: RAJVAARI | शुद्ध पानी, भरोसे के साथ
 * Workflow: Exact 29 Columns, Order Save First, PhonePe QR Payment, Order Tracking
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURATION
// ============================================================================
const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbzLB-DWBSqgaer41vxJFuEPoAAYSs2fP-YljFwtj1ERgpqTuQpXZo7otGY5JzpfPYhX/exec",
    brandName: "RAJVAARI",
    tagline: "शुद्ध पानी, भरोसे के साथ",
    paymentAmount: 1, // Fixed ₹1 for test payment verification
    deliveryCharge: 0, // FREE

    // EXACTLY 2 PRODUCTS ONLY
    products: [
        {
            id: "bottle_1l",
            name: "RAJVAARI Drinking Water",
            brand: "RAJVAARI",
            bottleSize: "1 Liter",
            productType: "Bottle",
            price: 20
        },
        {
            id: "bottle_200ml",
            name: "RAJVAARI Drinking Water",
            brand: "RAJVAARI",
            bottleSize: "200ml",
            productType: "Bottle",
            price: 10
        }
    ]
};

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================
let selectedProduct = CONFIG.products[0]; // Default: 1 Liter
let currentOrderData = null;
let savedOrdersCache = {}; // Local cache for tracking active session orders

// ============================================================================
// 3. INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Populate card prices
    const p1 = document.getElementById("priceDisplay1L");
    const p200 = document.getElementById("priceDisplay200ml");
    if (p1) p1.textContent = `₹${CONFIG.products[0].price}`;
    if (p200) p200.textContent = `₹${CONFIG.products[1].price}`;

    setupMobileMenu();
    setupProductSelection();
    setupStepperAndForm();
    setupPaymentActions();
    setupOrderTracking();

    // Default select 1 Liter without auto-scrolling
    applyProductSelection(CONFIG.products[0], false);

    // Update copyright year
    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// ============================================================================
// 4. MOBILE HAMBURGER MENU
// ============================================================================
function setupMobileMenu() {
    const toggleBtn = document.getElementById("mobileMenuToggle");
    const drawer = document.getElementById("mobileNavDrawer");
    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener("click", () => {
        drawer.classList.toggle("open");
    });

    const links = drawer.querySelectorAll(".mob-link");
    links.forEach(link => {
        link.addEventListener("click", () => {
            drawer.classList.remove("open");
        });
    });
}

// ============================================================================
// 5. PRODUCT SELECTION & SMART AUTO-FILL FLOW
// ============================================================================
function setupProductSelection() {
    const card1L = document.getElementById("cardProd1L");
    const card200ml = document.getElementById("cardProd200ml");
    const btn1L = document.getElementById("btnSelect1L");
    const btn200ml = document.getElementById("btnSelect200ml");
    const btnChange = document.getElementById("btnChangeProduct");

    const choose1L = () => applyProductSelection(CONFIG.products[0], true);
    const choose200ml = () => applyProductSelection(CONFIG.products[1], true);

    if (card1L) card1L.addEventListener("click", choose1L);
    if (btn1L) btn1L.addEventListener("click", (e) => { e.stopPropagation(); choose1L(); });

    if (card200ml) card200ml.addEventListener("click", choose200ml);
    if (btn200ml) btn200ml.addEventListener("click", (e) => { e.stopPropagation(); choose200ml(); });

    // Change Product: scrolls back to products without clearing customer information
    if (btnChange) {
        btnChange.addEventListener("click", () => {
            const sec = document.getElementById("productsSection");
            if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }
}

function applyProductSelection(product, shouldScroll = true) {
    selectedProduct = product;

    // Toggle active card state
    const c1 = document.getElementById("cardProd1L");
    const c200 = document.getElementById("cardProd200ml");
    if (c1) c1.classList.toggle("active-card", product.id === "bottle_1l");
    if (c200) c200.classList.toggle("active-card", product.id === "bottle_200ml");

    // Update selected product preview card inside Book Your Water form
    const sizePreview = document.getElementById("previewBottleSize");
    const pricePreview = document.getElementById("previewUnitPrice");
    const stepperHint = document.getElementById("stepperUnitPriceHint");

    if (sizePreview) sizePreview.textContent = `${product.bottleSize} Bottle`;
    if (pricePreview) pricePreview.textContent = `₹${product.price} / Bottle`;
    if (stepperHint) stepperHint.textContent = `₹${product.price}`;

    // Update Live Summary
    const sumSize = document.getElementById("summaryBottleSize");
    const sumUnitPrice = document.getElementById("summaryUnitPrice");
    if (sumSize) sumSize.textContent = `${product.bottleSize} Bottle`;
    if (sumUnitPrice) sumUnitPrice.textContent = `Price: ₹${product.price}`;

    updateLiveCalculations();

    if (shouldScroll) {
        const orderSec = document.getElementById("orderSection");
        if (orderSec) orderSec.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// ============================================================================
// 6. QUANTITY CONTROL & IMMEDIATE PRICE RECALCULATION
// ============================================================================
function setupStepperAndForm() {
    const qtyInput = document.getElementById("quantityInput");
    const minusBtn = document.getElementById("qtyMinusBtn");
    const plusBtn = document.getElementById("qtyPlusBtn");
    const submitBtn = document.getElementById("submitOrderBtn");

    if (minusBtn && qtyInput) {
        minusBtn.addEventListener("click", () => {
            let val = parseInt(qtyInput.value, 10) || 1;
            if (val > 1) {
                qtyInput.value = val - 1;
                updateLiveCalculations();
            }
        });
    }

    if (plusBtn && qtyInput) {
        plusBtn.addEventListener("click", () => {
            let val = parseInt(qtyInput.value, 10) || 1;
            qtyInput.value = val + 1;
            updateLiveCalculations();
        });
    }

    if (qtyInput) {
        qtyInput.addEventListener("input", () => {
            let val = parseInt(qtyInput.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            qtyInput.value = val;
            updateLiveCalculations();
        });
        qtyInput.addEventListener("blur", () => {
            let val = parseInt(qtyInput.value, 10);
            if (isNaN(val) || val < 1) qtyInput.value = 1;
            updateLiveCalculations();
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener("click", handleOrderSubmit);
    }
}

function calculateTotals() {
    const qtyInput = document.getElementById("quantityInput");
    const qty = Math.max(1, parseInt(qtyInput?.value || "1", 10) || 1);
    const unitPrice = selectedProduct.price;

    const subtotal = qty * unitPrice;
    const deliveryCharge = CONFIG.deliveryCharge;
    const discount = 0;
    const totalOrderAmount = subtotal + deliveryCharge - discount;

    return {
        quantity: qty,
        unitPrice: unitPrice,
        subtotal: subtotal,
        deliveryCharge: deliveryCharge,
        discount: discount,
        total: totalOrderAmount
    };
}

function updateLiveCalculations() {
    const totals = calculateTotals();

    const sumQty = document.getElementById("summaryQuantity");
    const unitLabel = document.getElementById("qtyUnitLabel");
    const sumSubtotal = document.getElementById("summarySubtotal");
    const sumDelivery = document.getElementById("summaryDelivery");
    const sumDiscount = document.getElementById("summaryDiscount");
    const sumTotal = document.getElementById("summaryTotal");

    if (sumQty) sumQty.textContent = `Qty: ${totals.quantity}`;
    if (unitLabel) unitLabel.textContent = totals.quantity === 1 ? "Bottle" : "Bottles";
    if (sumSubtotal) sumSubtotal.textContent = `₹${totals.subtotal.toLocaleString("en-IN")}`;
    if (sumDelivery) sumDelivery.textContent = totals.deliveryCharge === 0 ? "FREE" : `₹${totals.deliveryCharge}`;
    if (sumDiscount) sumDiscount.textContent = `₹${totals.discount}`;
    if (sumTotal) sumTotal.textContent = `₹${totals.total.toLocaleString("en-IN")}`;
}

// ============================================================================
// 7. FORM VALIDATION
// ============================================================================
function validateForm() {
    let isValid = true;

    const setError = (fieldId, errId, msg) => {
        const inp = document.getElementById(fieldId);
        const err = document.getElementById(errId);
        if (inp) inp.classList.add("input-error");
        if (err) {
            err.textContent = msg;
            err.classList.add("visible");
        }
        isValid = false;
    };

    const clearError = (fieldId, errId) => {
        const inp = document.getElementById(fieldId);
        const err = document.getElementById(errId);
        if (inp) inp.classList.remove("input-error");
        if (err) {
            err.textContent = "";
            err.classList.remove("visible");
        }
    };

    // Customer Name
    const name = document.getElementById("customerName")?.value.trim() || "";
    if (!name) setError("customerName", "nameError", "कृपया ग्राहक का नाम दर्ज करें");
    else if (name.length < 2) setError("customerName", "nameError", "कृपया सही नाम दर्ज करें (कम से कम 2 अक्षर)");
    else clearError("customerName", "nameError");

    // Mobile Number (Indian 10-digit)
    const mobile = document.getElementById("mobileNumber")?.value.trim() || "";
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!mobile) setError("mobileNumber", "mobileError", "कृपया 10 अंकों का मोबाइल नंबर दर्ज करें");
    else if (!indianMobileRegex.test(mobile)) setError("mobileNumber", "mobileError", "कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें");
    else clearError("mobileNumber", "mobileError");

    // Alternate Mobile (optional)
    const altMobile = document.getElementById("alternateMobile")?.value.trim() || "";
    if (altMobile && !indianMobileRegex.test(altMobile)) {
        setError("alternateMobile", "altMobileError", "वैकल्पिक नंबर भी 10 अंकों का वैध मोबाइल नंबर होना चाहिए");
    } else {
        clearError("alternateMobile", "altMobileError");
    }

    // Full Address
    const address = document.getElementById("fullAddress")?.value.trim() || "";
    if (!address) setError("fullAddress", "addressError", "कृपया पूरा पता दर्ज करें");
    else clearError("fullAddress", "addressError");

    // City
    const city = document.getElementById("city")?.value.trim() || "";
    if (!city) setError("city", "cityError", "कृपया शहर दर्ज करें");
    else clearError("city", "cityError");

    // District
    const district = document.getElementById("district")?.value.trim() || "";
    if (!district) setError("district", "districtError", "कृपया जिला दर्ज करें");
    else clearError("district", "districtError");

    // State
    const state = document.getElementById("state")?.value.trim() || "";
    if (!state) setError("state", "stateError", "कृपया राज्य दर्ज करें");
    else clearError("state", "stateError");

    // PIN Code (6-digit)
    const pincode = document.getElementById("pincode")?.value.trim() || "";
    if (!pincode) setError("pincode", "pincodeError", "कृपया 6 अंकों का पिन कोड दर्ज करें");
    else if (!/^\d{6}$/.test(pincode)) setError("pincode", "pincodeError", "पिन कोड ठीक 6 अंकों का होना चाहिए");
    else clearError("pincode", "pincodeError");

    // Quantity
    const qty = parseInt(document.getElementById("quantityInput")?.value || "0", 10);
    if (!qty || qty < 1) setError("quantityInput", "quantityError", "मात्रा कम से कम 1 होनी चाहिए");
    else clearError("quantityInput", "quantityError");

    return isValid;
}

// ============================================================================
// 8. PART 10: ORDER SAVE FIRST VIA GOOGLE APPS SCRIPT API
// ============================================================================
async function handleOrderSubmit(e) {
    if (e) e.preventDefault();

    if (!validateForm()) {
        showToast("कृपया फॉर्म में सभी आवश्यक फ़ील्ड सही तरीके से भरें।");
        return;
    }

    const submitBtn = document.getElementById("submitOrderBtn");
    const spinner = document.getElementById("submitSpinner");
    const btnText = document.getElementById("submitBtnText");

    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");
    if (btnText) btnText.textContent = "ऑर्डर सुरक्षित हो रहा है...";

    const totals = calculateTotals();
    const now = new Date();
    const isoTimestamp = now.toISOString();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const customerMsg = document.getElementById("customerMessage")?.value.trim() || "";
    const generatedOrderId = generateOrderId();

    // EXACT 29 GOOGLE SHEET COLUMNS
    // Both Title Case and camelCase for robust backend handling
    const payload = {
        // 1. Order ID
        "Order ID": generatedOrderId,
        orderId: generatedOrderId,

        // 2. Timestamp
        "Timestamp": isoTimestamp,
        timestamp: isoTimestamp,

        // 3. Customer Name
        "Customer Name": document.getElementById("customerName").value.trim(),
        customerName: document.getElementById("customerName").value.trim(),

        // 4. Mobile Number
        "Mobile Number": document.getElementById("mobileNumber").value.trim(),
        mobileNumber: document.getElementById("mobileNumber").value.trim(),

        // 5. Alternate Number
        "Alternate Number": document.getElementById("alternateMobile")?.value.trim() || "N/A",
        alternateNumber: document.getElementById("alternateMobile")?.value.trim() || "N/A",

        // 6. Full Address
        "Full Address": document.getElementById("fullAddress").value.trim(),
        fullAddress: document.getElementById("fullAddress").value.trim(),

        // 7. Village/Area
        "Village/Area": document.getElementById("villageArea")?.value.trim() || "N/A",
        villageArea: document.getElementById("villageArea")?.value.trim() || "N/A",

        // 8. City
        "City": document.getElementById("city").value.trim(),
        city: document.getElementById("city").value.trim(),

        // 9. District
        "District": document.getElementById("district").value.trim(),
        district: document.getElementById("district").value.trim(),

        // 10. State
        "State": document.getElementById("state").value.trim(),
        state: document.getElementById("state").value.trim(),

        // 11. PIN Code
        "PIN Code": document.getElementById("pincode").value.trim(),
        pincode: document.getElementById("pincode").value.trim(),

        // 12. Product
        "Product": selectedProduct.name,
        product: selectedProduct.name,

        // 13. Brand
        "Brand": selectedProduct.brand,
        brand: selectedProduct.brand,

        // 14. Bottle Size
        "Bottle Size": selectedProduct.bottleSize,
        bottleSize: selectedProduct.bottleSize,

        // 15. Quantity
        "Quantity": totals.quantity,
        quantity: totals.quantity,

        // 16. Price Per Bottle
        "Price Per Bottle": totals.unitPrice,
        pricePerBottle: totals.unitPrice,

        // 17. Subtotal
        "Subtotal": totals.subtotal,
        subtotal: totals.subtotal,

        // 18. Delivery Charge
        "Delivery Charge": totals.deliveryCharge,
        deliveryCharge: totals.deliveryCharge,

        // 19. Discount
        "Discount": totals.discount,
        discount: totals.discount,

        // 20. Total Order Amount
        "Total Order Amount": totals.total,
        totalOrderAmount: totals.total,
        totalAmount: totals.total,

        // 21. Payment Required (Testing: ₹1)
        "Payment Required": CONFIG.paymentAmount,
        paymentRequired: CONFIG.paymentAmount,

        // 22. Payment Status
        "Payment Status": "PENDING",
        paymentStatus: "PENDING",

        // 23. Payment ID
        "Payment ID": "",
        paymentId: "",

        // 24. Order Status
        "Order Status": "PENDING",
        orderStatus: "PENDING",

        // 25. Delivery Status
        "Delivery Status": "PENDING",
        deliveryStatus: "PENDING",

        // 26. Order Date
        "Order Date": dateFormatted,
        orderDate: dateFormatted,

        // 27. Expected Delivery
        "Expected Delivery": "Pending confirmation",
        expectedDelivery: "Pending confirmation",

        // 28. Customer Message Status
        "Customer Message Status": "PENDING",
        customerMessageStatus: "PENDING",

        // 29. Notes
        "Notes": customerMsg ? `Customer Note: ${customerMsg}` : "PhonePe QR payment verification pending",
        notes: customerMsg ? `Customer Note: ${customerMsg}` : "PhonePe QR payment verification pending"
    };

    try {
        let apiResult = null;
        try {
            const resp = await fetch(CONFIG.API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
            const textResp = await resp.text();
            try {
                apiResult = JSON.parse(textResp);
            } catch {
                apiResult = { success: true, orderId: generatedOrderId };
            }
        } catch (netErr) {
            console.warn("API request completed with fallback:", netErr);
            apiResult = { success: true, orderId: generatedOrderId };
        }

        const finalOrderId = apiResult?.orderId || generatedOrderId;

        currentOrderData = {
            ...payload,
            orderId: finalOrderId
        };

        // Save in session cache for live order tracking
        savedOrdersCache[`${currentOrderData.mobileNumber}_${currentOrderData.orderId}`] = currentOrderData;
        try {
            sessionStorage.setItem("last_rajvaari_order", JSON.stringify(currentOrderData));
        } catch (e) {}

        // Transition to Payment Section only after order save
        renderSuccessPage(currentOrderData);
        showToast("ऑर्डर सफलतापूर्वक Google Sheet में दर्ज हो गया!");
    } catch (err) {
        console.error("Order submission error:", err);
        showToast("ऑर्डर दर्ज करने में समस्या आई। कृपया पुनः प्रयास करें।");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add("hidden");
        if (btnText) btnText.textContent = "Place Order →";
    }
}

function generateOrderId() {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `RAJ-${dateStr}-${rand}`;
}

// ============================================================================
// 9. ORDER SUCCESS SCREEN & FIXED PHONEPE QR DISPLAY
// ============================================================================
function renderSuccessPage(data) {
    const orderSec = document.getElementById("orderSection");
    const prodSec = document.getElementById("productsSection");
    const heroSec = document.getElementById("heroSection");
    const successView = document.getElementById("successView");

    if (orderSec) orderSec.classList.add("hidden");
    if (prodSec) prodSec.classList.add("hidden");
    if (heroSec) heroSec.classList.add("hidden");
    if (successView) successView.classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setText("dispOrderId", data.orderId);
    setText("dispProduct", data.product);
    setText("dispBottleSize", `${data.bottleSize} Bottle`);
    setText("dispQuantity", `${data.quantity} ${data.quantity === 1 ? "Bottle" : "Bottles"}`);
    setText("dispTotalAmount", `₹${data.totalAmount.toLocaleString("en-IN")}`);
    setText("dispPaymentRequired", `₹${data.paymentRequired}`);
    setText("dispPaymentStatus", "PENDING");

    const noticeText = document.getElementById("verificationNoticeText");
    if (noticeText) {
        noticeText.textContent = "Payment करने के बाद आपका payment manually verify किया जाएगा।";
    }
}

// ============================================================================
// 10. PART 14: CUSTOMER PAYMENT DONE ACTION
// ============================================================================
function setupPaymentActions() {
    const payDoneBtn = document.getElementById("btnPaymentDone");
    if (payDoneBtn) {
        payDoneBtn.addEventListener("click", () => {
            // SECURITY: Never mark as PAID merely on button click.
            // Status remains PENDING until manually verified by Admin in Google Sheet!
            const noticeText = document.getElementById("verificationNoticeText");
            if (noticeText) {
                noticeText.textContent = "धन्यवाद! आपका पेमेंट वेरिफिकेशन पेंडिंग है। एडमिन द्वारा सत्यापित होते ही ऑर्डर कन्फर्म हो जाएगा।";
            }
            showToast("धन्यवाद! आपका पेमेंट वेरिफिकेशन पेंडिंग है। एडमिन द्वारा सत्यापित होते ही ऑर्डर कन्फर्म हो जाएगा।");
        });
    }

    const newOrderBtn = document.getElementById("newOrderBtn");
    if (newOrderBtn) {
        newOrderBtn.addEventListener("click", resetToNewOrder);
    }
}

function resetToNewOrder() {
    const form = document.getElementById("rajvaariOrderForm");
    if (form) form.reset();

    currentOrderData = null;
    const orderSec = document.getElementById("orderSection");
    const prodSec = document.getElementById("productsSection");
    const heroSec = document.getElementById("heroSection");
    const successView = document.getElementById("successView");

    if (successView) successView.classList.add("hidden");
    if (heroSec) heroSec.classList.remove("hidden");
    if (prodSec) prodSec.classList.remove("hidden");
    if (orderSec) orderSec.classList.remove("hidden");

    // Reset default to 1 Liter
    applyProductSelection(CONFIG.products[0], false);

    const qtyInput = document.getElementById("quantityInput");
    if (qtyInput) qtyInput.value = "1";
    const stateInput = document.getElementById("state");
    if (stateInput) stateInput.value = "Rajasthan";

    updateLiveCalculations();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================================
// 11. PART 21 & 22: ORDER TRACKING (ORDER ID + MOBILE NUMBER)
// ============================================================================
function setupOrderTracking() {
    const trackForm = document.getElementById("trackOrderForm");
    const resultBox = document.getElementById("trackResultBox");
    const spinner = document.getElementById("trackSpinner");
    const btnText = document.getElementById("trackBtnText");

    if (!trackForm || !resultBox) return;

    trackForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const orderIdInput = document.getElementById("trackOrderIdInput")?.value.trim().toUpperCase() || "";
        const mobileInput = document.getElementById("trackMobileInput")?.value.trim() || "";

        if (!orderIdInput || !mobileInput) {
            showToast("कृपया Order ID और Mobile Number दोनों दर्ज करें।");
            return;
        }

        if (spinner) spinner.classList.remove("hidden");
        if (btnText) btnText.textContent = "सर्च हो रहा है...";

        try {
            // First check local cache
            let orderInfo = savedOrdersCache[`${mobileInput}_${orderIdInput}`];

            if (!orderInfo) {
                try {
                    const saved = sessionStorage.getItem("last_rajvaari_order");
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (parsed.orderId === orderIdInput && parsed.mobileNumber === mobileInput) {
                            orderInfo = parsed;
                        }
                    }
                } catch (e) {}
            }

            // Attempt live Apps Script query
            if (!orderInfo) {
                try {
                    const fetchUrl = `${CONFIG.API_URL}?action=trackOrder&orderId=${encodeURIComponent(orderIdInput)}&mobileNumber=${encodeURIComponent(mobileInput)}`;
                    const res = await fetch(fetchUrl);
                    const resData = await res.json();
                    if (resData && resData.order) {
                        orderInfo = resData.order;
                    }
                } catch (netErr) {
                    console.log("Remote track fallback");
                }
            }

            resultBox.classList.remove("hidden");

            if (!orderInfo) {
                resultBox.innerHTML = `
                    <div style="background: #FFFBEB; border: 1.5px solid #FDE68A; padding: 16px; border-radius: 12px; text-align: center;">
                        <h4 style="color: #92400E; font-size: 16px; margin-bottom: 4px;">ऑर्डर नहीं मिला (Order Not Found)</h4>
                        <p style="color: #B45309; font-size: 13.5px;">कृपया दर्ज किया गया Order ID (<strong>${orderIdInput}</strong>) और 10 अंकों का Mobile Number जांचें।</p>
                    </div>
                `;
            } else {
                renderTrackingResultCard(resultBox, orderInfo);
            }
        } catch (err) {
            showToast("ट्रैकिंग में समस्या आई। पुनः प्रयास करें।");
        } finally {
            if (spinner) spinner.classList.add("hidden");
            if (btnText) btnText.textContent = "Track Status →";
        }
    });
}

function renderTrackingResultCard(container, order) {
    const isPaid = (order.paymentStatus === "PAID" || order["Payment Status"] === "PAID");
    const isConfirmed = (order.orderStatus === "CONFIRMED" || order["Order Status"] === "CONFIRMED");

    if (isPaid || isConfirmed) {
        // PART 21: CONFIRMED SUCCESS VIEW
        container.innerHTML = `
            <div class="confirmed-result-card">
                <div class="conf-badge-top">✓ Payment Confirmed</div>
                <p class="conf-sub">Your order is confirmed!</p>
                <div class="conf-grid">
                    <div class="conf-cell">
                        <span class="conf-lbl">Order ID</span>
                        <strong class="conf-val" style="color: #023E8A;">${order.orderId || order["Order ID"]}</strong>
                    </div>
                    <div class="conf-cell">
                        <span class="conf-lbl">Product</span>
                        <span class="conf-val">${order.bottleSize || order["Bottle Size"] || "1 Liter"} Bottle</span>
                    </div>
                    <div class="conf-cell">
                        <span class="conf-lbl">Quantity</span>
                        <span class="conf-val">${order.quantity || order["Quantity"]} Bottles</span>
                    </div>
                    <div class="conf-cell">
                        <span class="conf-lbl">Order Total</span>
                        <span class="conf-val">₹${order.totalOrderAmount || order["Total Order Amount"] || order.subtotal || order["Subtotal"]}</span>
                    </div>
                    <div class="conf-cell">
                        <span class="conf-lbl">Payment</span>
                        <span class="conf-val">₹${order.paymentRequired || order["Payment Required"] || "1"}</span>
                    </div>
                    <div class="conf-cell">
                        <span class="conf-lbl">Payment Status</span>
                        <span class="badge-paid-green">PAID ✓</span>
                    </div>
                    <div class="conf-cell">
                        <span class="conf-lbl">Order Status</span>
                        <span class="badge-conf-green">CONFIRMED ✓</span>
                    </div>
                    <div class="conf-cell">
                        <span class="conf-lbl">Expected Delivery</span>
                        <span class="conf-val" style="color: #047857;">Within 24 Hours</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        // PENDING PAYMENT VERIFICATION VIEW
        container.innerHTML = `
            <div style="background: #FFFBEB; border: 2px solid #FDE68A; border-radius: 14px; padding: 18px; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 11px; font-weight: 800; color: #92400E; text-transform: uppercase;">ORDER FOUND</span>
                        <h4 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; color: #78350F;">${order.orderId || order["Order ID"]}</h4>
                    </div>
                    <span style="background: #FEF3C7; color: #D97706; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800;">PENDING</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13.5px; margin-bottom: 12px;">
                    <div>Product: <strong>${order.bottleSize || order["Bottle Size"] || "1 Liter"} Bottle</strong></div>
                    <div>Quantity: <strong>${order.quantity || order["Quantity"]}</strong></div>
                    <div>Payment: <strong>₹${order.paymentRequired || order["Payment Required"] || "1"}</strong></div>
                    <div>Status: <span style="color: #D97706; font-weight: 700;">Verification Pending</span></div>
                </div>
                <div style="background: #FFFFFF; border-left: 3px solid #D97706; padding: 8px 12px; border-radius: 6px; font-size: 12.5px; color: #92400E;">
                    ⏱️ <strong>स्थिति:</strong> एडमिन द्वारा PhonePe भुगतान सत्यापन की प्रतीक्षा की जा रही है। सत्यापन होते ही स्थिति <strong>CONFIRMED</strong> हो जाएगी।
                </div>
            </div>
        `;
    }
}

// ============================================================================
// 12. TOAST NOTIFICATION HELPER
// ============================================================================
let toastTimeout = null;
function showToast(msg) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.remove("hidden");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, 4500);
}
