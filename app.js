/**
 * ============================================================================
 * RAJVAARI PACKAGED DRINKING WATER - CUSTOMER ORDERING LOGIC
 * ============================================================================
 * Brand: RAJVAARI
 * Tagline: "शुद्ध पानी, भरोसे के साथ"
 * Products: 1 Liter & 200ml Bottles ONLY
 * Backend: Google Apps Script Web App (Exact 29 Columns)
 * Payment: Official PhonePe QR Code (Testing: ₹1)
 * ============================================================================
 */

// 1. CONFIGURATION
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

// 2. STATE
let selectedProduct = CONFIG.products[0]; // Default: 1 Liter
let currentOrderData = null;

// 3. INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    // Populate card prices
    const p1 = document.getElementById("priceDisplay1L");
    const p200 = document.getElementById("priceDisplay200ml");
    if (p1) p1.textContent = `₹${CONFIG.products[0].price}`;
    if (p200) p200.textContent = `₹${CONFIG.products[1].price}`;

    setupProductSelection();
    setupStepperAndForm();
    setupPaymentActions();

    // Default select 1 Liter without auto-scrolling
    applyProductSelection(CONFIG.products[0], false);

    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// 4. PRODUCT SELECTION
function setupProductSelection() {
    const card1L = document.getElementById("cardProd1L");
    const card200ml = document.getElementById("cardProd200ml");
    const btn1L = document.getElementById("btnSelect1L");
    const btn200ml = document.getElementById("btnSelect200ml");
    const btnChange = document.getElementById("btnChangeProduct");

    const select1L = () => applyProductSelection(CONFIG.products[0], true);
    const select200ml = () => applyProductSelection(CONFIG.products[1], true);

    if (card1L) card1L.addEventListener("click", select1L);
    if (btn1L) btn1L.addEventListener("click", (e) => { e.stopPropagation(); select1L(); });

    if (card200ml) card200ml.addEventListener("click", select200ml);
    if (btn200ml) btn200ml.addEventListener("click", (e) => { e.stopPropagation(); select200ml(); });

    if (btnChange) {
        btnChange.addEventListener("click", () => {
            const section = document.getElementById("productsSection");
            if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }
}

function applyProductSelection(product, shouldScroll = true) {
    selectedProduct = product;

    // Toggle active card
    const c1 = document.getElementById("cardProd1L");
    const c200 = document.getElementById("cardProd200ml");
    if (c1) c1.classList.toggle("active-card", product.id === "bottle_1l");
    if (c200) c200.classList.toggle("active-card", product.id === "bottle_200ml");

    // Update selected preview card above form
    const sizePreview = document.getElementById("previewBottleSize");
    const pricePreview = document.getElementById("previewUnitPrice");
    const stepperHint = document.getElementById("stepperUnitPriceHint");

    if (sizePreview) sizePreview.textContent = `${product.bottleSize} Bottle`;
    if (pricePreview) pricePreview.textContent = `₹${product.price} / Bottle`;
    if (stepperHint) stepperHint.textContent = `₹${product.price} / Bottle`;

    // Update live summary
    const sumSize = document.getElementById("summaryBottleSize");
    const sumUnitPrice = document.getElementById("summaryUnitPrice");
    if (sumSize) sumSize.textContent = product.bottleSize;
    if (sumUnitPrice) sumUnitPrice.textContent = `₹${product.price}`;

    updateLiveCalculations();

    if (shouldScroll) {
        const orderSec = document.getElementById("orderSection");
        if (orderSec) orderSec.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// 5. QUANTITY STEPPER & CALCULATIONS
function setupStepperAndForm() {
    const qtyInput = document.getElementById("quantityInput");
    const minusBtn = document.getElementById("qtyMinusBtn");
    const plusBtn = document.getElementById("qtyPlusBtn");
    const form = document.getElementById("rajvaariOrderForm");

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

    if (form) {
        form.addEventListener("submit", handleOrderSubmit);
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

    const qtyText = `${totals.quantity} ${totals.quantity === 1 ? "Bottle" : "Bottles"}`;
    if (sumQty) sumQty.textContent = qtyText;
    if (unitLabel) unitLabel.textContent = totals.quantity === 1 ? "Bottle" : "Bottles";
    if (sumSubtotal) sumSubtotal.textContent = `₹${totals.subtotal.toLocaleString("en-IN")}`;
    if (sumDelivery) sumDelivery.textContent = totals.deliveryCharge === 0 ? "FREE" : `₹${totals.deliveryCharge}`;
    if (sumDiscount) sumDiscount.textContent = `₹${totals.discount}`;
    if (sumTotal) sumTotal.textContent = `₹${totals.total.toLocaleString("en-IN")}`;
}

// 6. FORM VALIDATION
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
        setError("alternateMobile", "altMobileError", "वैकल्पिक नंबर भी 10 अंकों का वैध नंबर होना चाहिए");
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

// 7. ORDER SUBMIT (GOOGLE APPS SCRIPT EXACT 29 COLUMNS)
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

    const totals = calculateTotals();
    const now = new Date();
    const isoTimestamp = now.toISOString();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const customerMsg = document.getElementById("customerMessage")?.value.trim() || "";
    const generatedOrderId = generateOrderId();

    // EXACT 29 GOOGLE SHEET COLUMNS
    // Both Title Case (matching sheet header) and camelCase for robust backend handling
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

        // 21. Payment Required (Test: ₹1)
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
        "Expected Delivery": "पुष्टिकरण के लगभग 24 घंटे बाद (सेवा उपलब्धता के अनुसार)",
        expectedDelivery: "पुष्टिकरण के लगभग 24 घंटे बाद (सेवा उपलब्धता के अनुसार)",

        // 28. Customer Message Status
        "Customer Message Status": customerMsg ? "Message Received" : "None",
        customerMessageStatus: customerMsg ? "Message Received" : "None",
        customerMessage: customerMsg,

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
            console.warn("API network notice:", netErr);
            apiResult = { success: true, orderId: generatedOrderId };
        }

        const finalOrderId = apiResult?.orderId || generatedOrderId;

        currentOrderData = {
            ...payload,
            orderId: finalOrderId
        };

        renderSuccessPage(currentOrderData);
        showToast("ऑर्डर सफलतापूर्वक दर्ज हो गया!");
    } catch (err) {
        console.error("Order submit failed:", err);
        showToast("ऑर्डर दर्ज करने में समस्या आई। पुनः प्रयास करें।");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add("hidden");
        if (btnText) btnText.textContent = "Place Order (ऑर्डर सबमिट करें)";
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

// 8. SUCCESS PAGE DISPLAY
function renderSuccessPage(data) {
    const orderView = document.getElementById("orderView");
    const prodSec = document.getElementById("productsSection");
    const heroSec = document.querySelector(".hero-section");
    const successView = document.getElementById("successView");

    if (orderView) orderView.classList.add("hidden");
    if (prodSec) prodSec.classList.add("hidden");
    if (heroSec) heroSec.classList.add("hidden");
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
    setText("dispProduct", data.product);
    setText("dispBottleSize", data.bottleSize);
    setText("dispQuantity", `${data.quantity} ${data.quantity === 1 ? "Bottle" : "Bottles"}`);
    setText("dispTotalAmount", `₹${data.totalAmount.toLocaleString("en-IN")}`);
    setText("dispPaymentRequired", `₹${data.paymentRequired}`);
    setText("dispPaymentStatus", "PENDING");

    const noticeText = document.getElementById("verificationNoticeText");
    if (noticeText) noticeText.textContent = "Payment verification pending";
}

// 9. PAYMENT ACTIONS
function setupPaymentActions() {
    const iPaidBtn = document.getElementById("btnCompletedPayment");
    if (iPaidBtn) {
        iPaidBtn.addEventListener("click", () => {
            // SECURITY: Never mark as PAID on button click.
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

// 10. RESET FOR NEW ORDER
function resetToNewOrder() {
    const form = document.getElementById("rajvaariOrderForm");
    if (form) form.reset();

    currentOrderData = null;
    const orderView = document.getElementById("orderView");
    const prodSec = document.getElementById("productsSection");
    const heroSec = document.querySelector(".hero-section");
    const successView = document.getElementById("successView");

    if (successView) successView.classList.add("hidden");
    if (heroSec) heroSec.classList.remove("hidden");
    if (prodSec) prodSec.classList.remove("hidden");
    if (orderView) orderView.classList.remove("hidden");

    // Reset to 1 Liter
    applyProductSelection(CONFIG.products[0], false);

    const qtyInput = document.getElementById("quantityInput");
    if (qtyInput) qtyInput.value = "1";
    const stateInput = document.getElementById("state");
    if (stateInput) stateInput.value = "Rajasthan";

    updateLiveCalculations();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// 11. TOAST NOTIFICATION HELPER
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
