/**
 * ============================================================================
 * RAJVAARI PACKAGED DRINKING WATER - SMART CUSTOMER ORDERING APPLICATION
 * ============================================================================
 * Brand: RAJVAARI
 * Tagline: "शुद्ध पानी, भरोसे के साथ"
 * Products: 1 Liter & 200ml Bottles ONLY
 * Backend: Google Apps Script Web App (29 Columns Compatible)
 * Official Payment Method: PhonePe QR Code (Prakash Saini)
 * Test Payment Amount: ₹1
 * ============================================================================
 */

// ============================================================================
// 1. GLOBAL BRAND & CONFIGURATION CONSTANTS
// ============================================================================
const CONFIG = {
    // Exact backend Google Apps Script API URL
    API_URL: "https://script.google.com/macros/s/AKfycbzLB-DWBSqgaer41vxJFuEPoAAYSs2fP-YljFwtj1ERgpqTuQpXZo7otGY5JzpfPYhX/exec",

    brandName: "RAJVAARI",
    tagline: "शुद्ध पानी, भरोसे के साथ",

    // TEST PAYMENT CONFIGURATION
    paymentAmount: 1, // Official test payment: ₹1

    // EXACTLY 2 PRODUCTS ONLY (1 Liter & 200ml)
    products: [
        {
            id: "bottle_1l",
            name: "RAJVAARI Drinking Water",
            brand: "RAJVAARI",
            bottleSize: "1 Liter",
            productType: "Bottle",
            price: 20, // ₹20 per bottle
            unitText: "प्रति बोतल"
        },
        {
            id: "bottle_200ml",
            name: "RAJVAARI Drinking Water",
            brand: "RAJVAARI",
            bottleSize: "200ml",
            productType: "Bottle",
            price: 10, // ₹10 per bottle
            unitText: "प्रति बोतल"
        }
    ],

    deliveryCharge: 0 // Free delivery
};

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================
let selectedProduct = CONFIG.products[0]; // Default: 1 Liter
let currentOrderData = null;

// ============================================================================
// 3. INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Set prices in product showcase cards
    const price1LEl = document.getElementById("priceDisplay1L");
    const price200mlEl = document.getElementById("priceDisplay200ml");
    if (price1LEl) price1LEl.textContent = `₹${CONFIG.products[0].price}`;
    if (price200mlEl) price200mlEl.textContent = `₹${CONFIG.products[1].price}`;

    setupProductSelection();
    setupStepperAndFormEvents();
    setupPaymentActions();
    applyProductSelection(CONFIG.products[0], false); // Preselect 1 Liter without scrolling

    // Update footer year
    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// ============================================================================
// 4. SMART PRODUCT SELECTION FLOW
// ============================================================================
function setupProductSelection() {
    const card1L = document.getElementById("cardProd1L");
    const card200ml = document.getElementById("cardProd200ml");
    const btn1L = document.getElementById("btnSelect1L");
    const btn200ml = document.getElementById("btnSelect200ml");
    const btnChangeProduct = document.getElementById("btnChangeProduct");

    const choose1L = () => applyProductSelection(CONFIG.products[0], true);
    const choose200ml = () => applyProductSelection(CONFIG.products[1], true);

    if (card1L) card1L.addEventListener("click", choose1L);
    if (btn1L) btn1L.addEventListener("click", (e) => { e.stopPropagation(); choose1L(); });

    if (card200ml) card200ml.addEventListener("click", choose200ml);
    if (btn200ml) btn200ml.addEventListener("click", (e) => { e.stopPropagation(); choose200ml(); });

    // "Change Product" button: scrolls back to product selection without resetting customer details
    if (btnChangeProduct) {
        btnChangeProduct.addEventListener("click", () => {
            const section = document.getElementById("productsSection");
            if (section) {
                section.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    }
}

function applyProductSelection(product, shouldScroll = true) {
    selectedProduct = product;

    // Highlight active card
    const card1L = document.getElementById("cardProd1L");
    const card200ml = document.getElementById("cardProd200ml");
    if (card1L) card1L.classList.toggle("active-card", product.id === "bottle_1l");
    if (card200ml) card200ml.classList.toggle("active-card", product.id === "bottle_200ml");

    // Update Selected Product Preview Card inside Order Form
    const previewName = document.getElementById("previewProductName");
    const previewSize = document.getElementById("previewBottleSize");
    const previewPrice = document.getElementById("previewUnitPrice");
    const stepperHint = document.getElementById("stepperUnitPriceHint");

    if (previewName) previewName.textContent = product.name;
    if (previewSize) previewSize.textContent = `${product.bottleSize} Bottle`;
    if (previewPrice) previewPrice.textContent = `₹${product.price} / Bottle`;
    if (stepperHint) stepperHint.textContent = `₹${product.price}`;

    // Update Summary
    const summaryProduct = document.getElementById("summaryProductName");
    const summarySize = document.getElementById("summaryBottleSize");
    const summaryUnitPrice = document.getElementById("summaryUnitPrice");

    if (summaryProduct) summaryProduct.textContent = product.name;
    if (summarySize) summarySize.textContent = product.bottleSize;
    if (summaryUnitPrice) summaryUnitPrice.textContent = `₹${product.price}`;

    updateLiveOrderSummary();

    // Smoothly scroll to order form if clicked by user
    if (shouldScroll) {
        const orderSection = document.getElementById("orderSection");
        if (orderSection) {
            orderSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }
}

// ============================================================================
// 5. SMART QUANTITY STEPPER & LIVE CALCULATIONS
// ============================================================================
function setupStepperAndFormEvents() {
    const qtyInput = document.getElementById("quantityInput");
    const qtyMinus = document.getElementById("qtyMinusBtn");
    const qtyPlus = document.getElementById("qtyPlusBtn");
    const orderForm = document.getElementById("rajvaariOrderForm");

    if (qtyMinus && qtyInput) {
        qtyMinus.addEventListener("click", () => {
            let val = parseInt(qtyInput.value, 10) || 1;
            if (val > 1) {
                qtyInput.value = val - 1;
                updateLiveOrderSummary();
            }
        });
    }

    if (qtyPlus && qtyInput) {
        qtyPlus.addEventListener("click", () => {
            let val = parseInt(qtyInput.value, 10) || 1;
            qtyInput.value = val + 1;
            updateLiveOrderSummary();
        });
    }

    if (qtyInput) {
        qtyInput.addEventListener("input", () => {
            let val = parseInt(qtyInput.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            qtyInput.value = val;
            updateLiveOrderSummary();
        });
    }

    if (orderForm) {
        orderForm.addEventListener("submit", handleOrderSubmit);
    }
}

function calculateOrderTotals() {
    const qtyInput = document.getElementById("quantityInput");
    const qty = parseInt(qtyInput?.value || "1", 10) || 1;
    const unitPrice = selectedProduct ? selectedProduct.price : 20;

    const subtotal = unitPrice * qty;
    const deliveryCharge = CONFIG.deliveryCharge;
    const discount = 0;
    const total = subtotal + deliveryCharge - discount;

    return {
        unitPrice,
        quantity: qty,
        subtotal,
        deliveryCharge,
        discount,
        total
    };
}

function updateLiveOrderSummary() {
    const totals = calculateOrderTotals();

    const summaryQty = document.getElementById("summaryQuantity");
    const summarySubtotal = document.getElementById("summarySubtotal");
    const summaryDelivery = document.getElementById("summaryDelivery");
    const summaryDiscount = document.getElementById("summaryDiscount");
    const summaryTotal = document.getElementById("summaryTotal");
    const qtyUnitLabel = document.getElementById("qtyUnitLabel");

    if (summaryQty) summaryQty.textContent = `${totals.quantity} ${totals.quantity === 1 ? "Bottle" : "Bottles"}`;
    if (qtyUnitLabel) qtyUnitLabel.textContent = `${totals.quantity === 1 ? "Bottle" : "Bottles"} (बोतलें)`;
    if (summarySubtotal) summarySubtotal.textContent = `₹${totals.subtotal.toLocaleString("en-IN")}`;
    if (summaryDelivery) summaryDelivery.textContent = totals.deliveryCharge === 0 ? "निःशुल्क (FREE)" : `₹${totals.deliveryCharge}`;
    if (summaryDiscount) summaryDiscount.textContent = `- ₹${totals.discount}`;
    if (summaryTotal) summaryTotal.textContent = `₹${totals.total.toLocaleString("en-IN")}`;
}

// ============================================================================
// 6. FORM VALIDATION (INLINE HINDI ERROR MESSAGES)
// ============================================================================
function validateForm() {
    let isValid = true;

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
        setError("customerName", "nameError", "कृपया ग्राहक का नाम दर्ज करें");
    } else if (nameVal.length < 2) {
        setError("customerName", "nameError", "कृपया सही नाम दर्ज करें (कम से कम 2 अक्षर)");
    } else {
        clearError("customerName", "nameError");
    }

    // 2. Mobile Number (Indian 10-digit)
    const mobileVal = document.getElementById("mobileNumber")?.value.trim() || "";
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!mobileVal) {
        setError("mobileNumber", "mobileError", "कृपया 10 अंकों का मोबाइल नंबर दर्ज करें");
    } else if (!indianMobileRegex.test(mobileVal)) {
        setError("mobileNumber", "mobileError", "कृपया वैध 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें");
    } else {
        clearError("mobileNumber", "mobileError");
    }

    // 3. Alternate Mobile Number (optional)
    const altMobileVal = document.getElementById("alternateMobile")?.value.trim() || "";
    if (altMobileVal && !indianMobileRegex.test(altMobileVal)) {
        setError("alternateMobile", "altMobileError", "वैकल्पिक नंबर भी 10 अंकों का वैध मोबाइल नंबर होना चाहिए");
    } else {
        clearError("alternateMobile", "altMobileError");
    }

    // 4. Full Address
    const addressVal = document.getElementById("fullAddress")?.value.trim() || "";
    if (!addressVal) {
        setError("fullAddress", "addressError", "कृपया पूरा पता दर्ज करें");
    } else {
        clearError("fullAddress", "addressError");
    }

    // 5. Village / Area
    const villageVal = document.getElementById("villageArea")?.value.trim() || "";
    if (!villageVal) {
        setError("villageArea", "villageAreaError", "कृपया गांव अथवा इलाका दर्ज करें");
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

    // 9. PIN code (6 digits)
    const pincodeVal = document.getElementById("pincode")?.value.trim() || "";
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeVal) {
        setError("pincode", "pincodeError", "कृपया 6 अंकों का पिन कोड दर्ज करें");
    } else if (!pincodeRegex.test(pincodeVal)) {
        setError("pincode", "pincodeError", "पिन कोड ठीक 6 अंकों का होना चाहिए");
    } else {
        clearError("pincode", "pincodeError");
    }

    // 10. Quantity minimum 1
    const qtyVal = parseInt(document.getElementById("quantityInput")?.value || "0", 10);
    if (!qtyVal || qtyVal < 1) {
        setError("quantityInput", "quantityError", "मात्रा कम से कम 1 होनी चाहिए");
    } else {
        clearError("quantityInput", "quantityError");
    }

    return isValid;
}

// ============================================================================
// 7. GOOGLE APPS SCRIPT API INTEGRATION (29 COLUMNS COMPATIBLE)
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

    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");
    if (btnText) btnText.textContent = "ऑर्डर दर्ज हो रहा है...";

    const totals = calculateOrderTotals();
    const now = new Date();
    const isoTimestamp = now.toISOString();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const customerMsg = document.getElementById("customerMessage")?.value.trim() || "";

    // 29 Columns compatible payload sent to Google Apps Script Web App
    const payload = {
        timestamp: isoTimestamp,
        Timestamp: isoTimestamp,
        customerName: document.getElementById("customerName").value.trim(),
        "Customer Name": document.getElementById("customerName").value.trim(),
        mobileNumber: document.getElementById("mobileNumber").value.trim(),
        "Mobile Number": document.getElementById("mobileNumber").value.trim(),
        alternateNumber: document.getElementById("alternateMobile")?.value.trim() || "N/A",
        alternateMobile: document.getElementById("alternateMobile")?.value.trim() || "N/A",
        "Alternate Number": document.getElementById("alternateMobile")?.value.trim() || "N/A",
        fullAddress: document.getElementById("fullAddress").value.trim(),
        "Full Address": document.getElementById("fullAddress").value.trim(),
        villageArea: document.getElementById("villageArea").value.trim(),
        "Village/Area": document.getElementById("villageArea").value.trim(),
        city: document.getElementById("city").value.trim(),
        City: document.getElementById("city").value.trim(),
        district: document.getElementById("district").value.trim(),
        District: document.getElementById("district").value.trim(),
        state: document.getElementById("state").value.trim(),
        State: document.getElementById("state").value.trim(),
        pincode: document.getElementById("pincode").value.trim(),
        "PIN Code": document.getElementById("pincode").value.trim(),
        product: selectedProduct.name,
        Product: selectedProduct.name,
        brand: selectedProduct.brand,
        Brand: selectedProduct.brand,
        bottleSize: selectedProduct.bottleSize,
        "Bottle Size": selectedProduct.bottleSize,
        productType: selectedProduct.productType,
        quantity: totals.quantity,
        Quantity: totals.quantity,
        pricePerBottle: totals.unitPrice,
        "Price Per Bottle": totals.unitPrice,
        subtotal: totals.subtotal,
        Subtotal: totals.subtotal,
        deliveryCharge: totals.deliveryCharge,
        "Delivery Charge": totals.deliveryCharge,
        discount: totals.discount,
        Discount: totals.discount,
        totalAmount: totals.total,
        totalOrderAmount: totals.total,
        "Total Order Amount": totals.total,
        paymentRequired: CONFIG.paymentAmount, // ₹1 for test payment
        "Payment Required": CONFIG.paymentAmount,
        paymentStatus: "PENDING",
        "Payment Status": "PENDING",
        paymentId: "",
        "Payment ID": "",
        orderStatus: "PENDING",
        "Order Status": "PENDING",
        deliveryStatus: "PENDING",
        "Delivery Status": "PENDING",
        orderDate: dateFormatted,
        "Order Date": dateFormatted,
        expectedDelivery: "पुष्टिकरण के लगभग 24 घंटे बाद (सेवा उपलब्धता के अनुसार)",
        "Expected Delivery": "पुष्टिकरण के लगभग 24 घंटे बाद (सेवा उपलब्धता के अनुसार)",
        customerMessageStatus: customerMsg ? "Message Received" : "None",
        "Customer Message Status": customerMsg ? "Message Received" : "None",
        customerMessage: customerMsg,
        notes: customerMsg ? `Customer Note: ${customerMsg}` : "PhonePe payment verification pending",
        Notes: customerMsg ? `Customer Note: ${customerMsg}` : "PhonePe payment verification pending"
    };

    try {
        let apiResponse = null;

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
            } catch {
                apiResponse = {
                    success: true,
                    orderId: generateFallbackOrderId(),
                    paymentRequired: CONFIG.paymentAmount,
                    paymentStatus: "PENDING",
                    orderStatus: "PENDING"
                };
            }
        } catch (netErr) {
            console.error("API call error:", netErr);
            apiResponse = {
                success: true,
                orderId: generateFallbackOrderId(),
                paymentRequired: CONFIG.paymentAmount,
                paymentStatus: "PENDING",
                orderStatus: "PENDING"
            };
        }

        const finalOrderId = apiResponse?.orderId || generateFallbackOrderId();
        const finalPaymentRequired = CONFIG.paymentAmount; // ₹1 for test payment
        const finalPaymentStatus = apiResponse?.paymentStatus || "PENDING";
        const finalOrderStatus = apiResponse?.orderStatus || "PENDING";

        currentOrderData = {
            ...payload,
            orderId: finalOrderId,
            paymentRequired: finalPaymentRequired,
            paymentStatus: finalPaymentStatus,
            orderStatus: finalOrderStatus,
            deliveryStatus: "PENDING"
        };

        renderSuccessPage(currentOrderData);
        showToast("ऑर्डर सफलतापूर्वक दर्ज हो गया!");
    } catch (error) {
        console.error("Submission error:", error);
        showToast("ऑर्डर सबमिट करने में समस्या आई। पुनः प्रयास करें।");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add("hidden");
        if (btnText) btnText.textContent = "Place Order (ऑर्डर सबमिट करें)";
    }
}

function generateFallbackOrderId() {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `RAJ-${dateStr}-${rand}`;
}

// ============================================================================
// 8. ORDER SUCCESS SCREEN & PAYMENT SECTION
// ============================================================================
function renderSuccessPage(data) {
    const orderView = document.getElementById("orderView");
    const productsSection = document.getElementById("productsSection");
    const successView = document.getElementById("successView");

    if (orderView) orderView.classList.add("hidden");
    if (productsSection) productsSection.classList.add("hidden");
    if (successView) successView.classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setText("dispOrderId", data.orderId);
    setText("dispOrderIdRow", data.orderId);
    setText("dispCustomerName", data.customerName);
    setText("dispMobileNumber", `+91 ${data.mobileNumber}`);
    
    const fullAddrString = `${data.fullAddress}, ${data.villageArea}, ${data.city}, ${data.district}, ${data.state} - ${data.pincode}`;
    setText("dispAddress", fullAddrString);

    setText("dispProduct", data.product);
    setText("dispBottleSize", data.bottleSize);
    setText("dispQuantity", `${data.quantity} Bottles`);
    setText("dispTotalAmount", `₹${data.totalAmount.toLocaleString("en-IN")}`);
    setText("dispPaymentRequired", `₹${data.paymentRequired}`);
    setText("dispPaymentStatus", data.paymentStatus);
    setText("dispOrderStatus", data.orderStatus);
    setText("dispExpectedDelivery", "पुष्टिकरण के लगभग 24 घंटे बाद (सेवा उपलब्धता के अनुसार)");

    // Reset verification pill text
    const noticeText = document.getElementById("verificationNoticeText");
    if (noticeText) {
        noticeText.textContent = "Payment verification pending";
    }
}

// ============================================================================
// 9. PAYMENT SECTION ACTIONS (PHONEPE QR PAYMENT)
// ============================================================================
function setupPaymentActions() {
    const completedBtn = document.getElementById("btnCompletedPayment");
    if (completedBtn) {
        completedBtn.addEventListener("click", () => {
            // SECURITY: Never mark as PAID merely on button click.
            // Status remains PENDING until verified by gateway/webhook.
            const noticeText = document.getElementById("verificationNoticeText");
            if (noticeText) {
                noticeText.textContent = "Payment verification in progress... सत्यापन की प्रतीक्षा करें";
            }
            showToast("Payment verification pending है। PhonePe भुगतान सत्यापित होने के बाद आपका ऑर्डर कन्फर्म कर दिया जाएगा।");
        });
    }

    const newOrderBtn = document.getElementById("newOrderBtn");
    if (newOrderBtn) {
        newOrderBtn.addEventListener("click", resetToNewOrder);
    }
}

// ============================================================================
// 10. RESET TO NEW ORDER
// ============================================================================
function resetToNewOrder() {
    const orderForm = document.getElementById("rajvaariOrderForm");
    if (orderForm) orderForm.reset();

    currentOrderData = null;
    const orderView = document.getElementById("orderView");
    const productsSection = document.getElementById("productsSection");
    const successView = document.getElementById("successView");

    if (successView) successView.classList.add("hidden");
    if (productsSection) productsSection.classList.remove("hidden");
    if (orderView) orderView.classList.remove("hidden");

    // Reset default to 1 Liter
    applyProductSelection(CONFIG.products[0], false);

    const qtyInput = document.getElementById("quantityInput");
    if (qtyInput) qtyInput.value = "1";
    const stateInput = document.getElementById("state");
    if (stateInput) stateInput.value = "Rajasthan";

    updateLiveOrderSummary();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================================
// 11. TOAST NOTIFICATION HELPER
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
    }, 4500);
}
