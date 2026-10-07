/**
 * ============================================================================
 * RAJVAARI PACKAGED DRINKING WATER - FRONTEND JAVASCRIPT
 * Brand: RAJVAARI | शुद्ध पानी, भरोसे के साथ
 * Theme: ROYAL AQUA
 * API Integration: Google Apps Script Web App
 * ============================================================================
 */

// EXACT APPS SCRIPT API URL (Required by User)
const API_URL = "https://script.google.com/macros/s/AKfycbzLB-DWBSqgaer41vxJFuEPoAAYSs2f-P-YljFwtj1ERgpqTuQpXZo7otGY5JzpfPYhX/exec";

// EXACT 2 PRODUCTS CONFIGURATION
const PRODUCTS = [
    {
        id: "1l",
        name: "RAJVAARI Drinking Water",
        bottleSize: "1 Liter",
        price: 20
    },
    {
        id: "200ml",
        name: "RAJVAARI Drinking Water",
        bottleSize: "200ml",
        price: 10
    }
];

// STATE
let activeProduct = PRODUCTS[0]; // Default: 1 Liter
let activeCreatedOrder = null;
let isSubmittingOrder = false;

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    setupMobileMenu();
    setupProductSelection();
    setupQuantityStepper();
    setupOrderSubmission();
    setupUtrSubmission();
    setupTrackModal();

    // Default select 1 Liter without scrolling
    selectProduct(PRODUCTS[0], false);
});

// ============================================================================
// MOBILE MENU TOGGLE
// ============================================================================
function setupMobileMenu() {
    const toggleBtn = document.getElementById("mobileToggleBtn");
    const drawer = document.getElementById("mobileMenuDrawer");
    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener("click", () => {
        drawer.classList.toggle("open");
    });

    const links = drawer.querySelectorAll(".mobile-nav-link");
    links.forEach(link => {
        link.addEventListener("click", () => {
            drawer.classList.remove("open");
        });
    });
}

// ============================================================================
// PRODUCT SELECTION
// ============================================================================
function setupProductSelection() {
    const btn1L = document.getElementById("btnOrder1L");
    const btn200ml = document.getElementById("btnOrder200ml");
    const card1L = document.getElementById("cardProd1L");
    const card200ml = document.getElementById("cardProd200ml");
    const btnChange = document.getElementById("btnChangeProduct");

    if (btn1L) btn1L.addEventListener("click", (e) => { e.stopPropagation(); selectProduct(PRODUCTS[0], true); });
    if (card1L) card1L.addEventListener("click", () => selectProduct(PRODUCTS[0], true));

    if (btn200ml) btn200ml.addEventListener("click", (e) => { e.stopPropagation(); selectProduct(PRODUCTS[1], true); });
    if (card200ml) card200ml.addEventListener("click", () => selectProduct(PRODUCTS[1], true));

    if (btnChange) {
        btnChange.addEventListener("click", () => {
            const sec = document.getElementById("productsSection");
            if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }
}

function selectProduct(product, shouldScroll = true) {
    activeProduct = product;

    // Highlight card
    const card1L = document.getElementById("cardProd1L");
    const card200ml = document.getElementById("cardProd200ml");
    if (card1L) card1L.classList.toggle("active-card", product.id === "1l");
    if (card200ml) card200ml.classList.toggle("active-card", product.id === "200ml");

    // Update banner inside Order Form
    const titleEl = document.getElementById("selectedSizeTitle");
    const rateEl = document.getElementById("selectedRateTag");
    if (titleEl) titleEl.textContent = `${product.bottleSize} Bottle`;
    if (rateEl) rateEl.textContent = `₹${product.price} / Bottle`;

    recalculateSummary();

    if (shouldScroll) {
        const orderSec = document.getElementById("orderSection");
        if (orderSec) orderSec.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// ============================================================================
// QUANTITY STEPPER & LIVE CALCULATION
// ============================================================================
function setupQuantityStepper() {
    const qtyInput = document.getElementById("qtyInput");
    const minusBtn = document.getElementById("qtyMinus");
    const plusBtn = document.getElementById("qtyPlus");

    if (minusBtn && qtyInput) {
        minusBtn.addEventListener("click", () => {
            let val = parseInt(qtyInput.value, 10) || 1;
            if (val > 1) {
                qtyInput.value = val - 1;
                recalculateSummary();
            }
        });
    }

    if (plusBtn && qtyInput) {
        plusBtn.addEventListener("click", () => {
            let val = parseInt(qtyInput.value, 10) || 1;
            qtyInput.value = val + 1;
            recalculateSummary();
        });
    }

    if (qtyInput) {
        qtyInput.addEventListener("input", () => {
            let val = parseInt(qtyInput.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            qtyInput.value = val;
            recalculateSummary();
        });
        qtyInput.addEventListener("blur", () => {
            let val = parseInt(qtyInput.value, 10);
            if (isNaN(val) || val < 1) qtyInput.value = 1;
            recalculateSummary();
        });
    }
}

function getOrderQuantities() {
    const qtyInput = document.getElementById("qtyInput");
    const qty = Math.max(1, parseInt(qtyInput?.value || "1", 10) || 1);
    const unitPrice = activeProduct.price;
    const subtotal = qty * unitPrice;
    const delivery = 0; // FREE
    const discount = 0;
    const total = subtotal + delivery - discount;

    return {
        quantity: qty,
        unitPrice: unitPrice,
        subtotal: subtotal,
        delivery: delivery,
        discount: discount,
        total: total
    };
}

function recalculateSummary() {
    const calc = getOrderQuantities();

    const noteEl = document.getElementById("rateCalcNote");
    const unitText = document.getElementById("qtyUnitText");
    const sizeQtyEl = document.getElementById("summarySizeAndQty");
    const rateCalcEl = document.getElementById("summaryRateCalc");
    const subtotalEl = document.getElementById("summarySubtotal");
    const totalEl = document.getElementById("summaryTotal");

    if (noteEl) noteEl.textContent = `₹${calc.unitPrice} × ${calc.quantity} = ₹${calc.subtotal}`;
    if (unitText) unitText.textContent = calc.quantity === 1 ? "Bottle" : "Bottles";
    if (sizeQtyEl) sizeQtyEl.textContent = `${activeProduct.bottleSize} × ${calc.quantity}`;
    if (rateCalcEl) rateCalcEl.textContent = `₹${calc.unitPrice} × ${calc.quantity}`;
    if (subtotalEl) subtotalEl.textContent = `₹${calc.subtotal.toLocaleString("en-IN")}`;
    if (totalEl) totalEl.textContent = `₹${calc.total.toLocaleString("en-IN")}`;
}

// ============================================================================
// FORM VALIDATION
// ============================================================================
function validateForm() {
    let isValid = true;

    const setErr = (id, errId, msg) => {
        const inp = document.getElementById(id);
        const err = document.getElementById(errId);
        if (inp) inp.classList.add("has-error");
        if (err) {
            err.textContent = msg;
            err.classList.add("visible");
        }
        isValid = false;
    };

    const clearErr = (id, errId) => {
        const inp = document.getElementById(id);
        const err = document.getElementById(errId);
        if (inp) inp.classList.remove("has-error");
        if (err) {
            err.textContent = "";
            err.classList.remove("visible");
        }
    };

    // Full Name
    const name = document.getElementById("custName")?.value.trim() || "";
    if (!name) setErr("custName", "nameError", "कृपया अपना पूरा नाम दर्ज करें");
    else if (name.length < 2) setErr("custName", "nameError", "कृपया सही नाम दर्ज करें (कम से कम 2 अक्षर)");
    else clearErr("custName", "nameError");

    // Mobile Number (Indian 10-digit)
    const mobile = document.getElementById("custMobile")?.value.trim() || "";
    if (!mobile) setErr("custMobile", "mobileError", "कृपया 10 अंकों का मोबाइल नंबर दर्ज करें");
    else if (!/^[6-9]\d{9}$/.test(mobile)) setErr("custMobile", "mobileError", "कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें");
    else clearErr("custMobile", "mobileError");

    // Alternate Number (optional)
    const altMobile = document.getElementById("custAltMobile")?.value.trim() || "";
    if (altMobile && !/^[6-9]\d{9}$/.test(altMobile)) {
        setErr("custAltMobile", "altMobileError", "वैकल्पिक नंबर भी वैध 10 अंकों का होना चाहिए");
    } else {
        clearErr("custAltMobile", "altMobileError");
    }

    // Full Address
    const address = document.getElementById("custAddress")?.value.trim() || "";
    if (!address) setErr("custAddress", "addressError", "कृपया पूरा पता दर्ज करें");
    else clearErr("custAddress", "addressError");

    // City
    const city = document.getElementById("custCity")?.value.trim() || "";
    if (!city) setErr("custCity", "cityError", "कृपया शहर का नाम दर्ज करें");
    else clearErr("custCity", "cityError");

    // District
    const district = document.getElementById("custDistrict")?.value.trim() || "";
    if (!district) setErr("custDistrict", "districtError", "कृपया जिला दर्ज करें");
    else clearErr("custDistrict", "districtError");

    // State
    const state = document.getElementById("custState")?.value.trim() || "";
    if (!state) setErr("custState", "stateError", "कृपया राज्य दर्ज करें");
    else clearErr("custState", "stateError");

    // PIN Code (6-digit)
    const pin = document.getElementById("custPin")?.value.trim() || "";
    if (!pin) setErr("custPin", "pinError", "कृपया 6 अंकों का पिन कोड दर्ज करें");
    else if (!/^\d{6}$/.test(pin)) setErr("custPin", "pinError", "पिन कोड ठीक 6 अंकों का होना चाहिए");
    else clearErr("custPin", "pinError");

    // Quantity
    const qty = parseInt(document.getElementById("qtyInput")?.value || "0", 10);
    if (!qty || qty < 1) setErr("qtyInput", "qtyError", "मात्रा कम से कम 1 होनी चाहिए");
    else clearErr("qtyInput", "qtyError");

    return isValid;
}

// ============================================================================
// ORDER SUBMISSION (createOrder API)
// ============================================================================
function setupOrderSubmission() {
    const btnPlaceOrder = document.getElementById("btnPlaceOrder");
    if (!btnPlaceOrder) return;

    btnPlaceOrder.addEventListener("click", handlePlaceOrder);
}

async function handlePlaceOrder() {
    if (isSubmittingOrder) return;

    if (!validateForm()) {
        showToast("कृपया फॉर्म में सभी आवश्यक फ़ील्ड सही तरीके से भरें।");
        return;
    }

    const btn = document.getElementById("btnPlaceOrder");
    const spinner = document.getElementById("orderSpinner");
    const btnText = document.getElementById("btnSubmitText");
    const statusNotice = document.getElementById("apiStatusNotice");

    isSubmittingOrder = true;
    btn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");
    if (btnText) btnText.textContent = "Creating your order...";
    if (statusNotice) statusNotice.textContent = "Connecting to Google Sheet...";

    const calc = getOrderQuantities();

    // PAYLOAD FORMAT REQUIRED BY USER
    const payload = {
        action: "createOrder",
        customerName: document.getElementById("custName").value.trim(),
        mobileNumber: document.getElementById("custMobile").value.trim(),
        alternateNumber: document.getElementById("custAltMobile")?.value.trim() || "N/A",
        fullAddress: document.getElementById("custAddress").value.trim(),
        villageArea: document.getElementById("custVillage")?.value.trim() || "N/A",
        city: document.getElementById("custCity").value.trim(),
        district: document.getElementById("custDistrict").value.trim(),
        state: document.getElementById("custState").value.trim(),
        pinCode: document.getElementById("custPin").value.trim(),
        bottleSize: activeProduct.bottleSize,
        quantity: calc.quantity,
        notes: document.getElementById("custNotes")?.value.trim() || ""
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(payload)
        });

        const textData = await response.text();
        let apiResult = null;

        try {
            apiResult = JSON.parse(textData);
        } catch (e) {
            console.warn("Raw API response:", textData);
        }

        if (apiResult && apiResult.success && apiResult.orderId) {
            activeCreatedOrder = {
                ...payload,
                orderId: apiResult.orderId,
                paymentRequired: 1,
                paymentStatus: apiResult.paymentStatus || "PENDING",
                orderStatus: apiResult.orderStatus || "PENDING"
            };

            // Save in session cache for tracking
            try {
                sessionStorage.setItem("rajvaari_last_order", JSON.stringify(activeCreatedOrder));
            } catch (e) {}

            showPaymentSection(activeCreatedOrder);
            showToast("आपका order सफलतापूर्वक प्राप्त हो गया है।");
        } else {
            // API returned failure or invalid format
            const errMsg = (apiResult && apiResult.error) ? apiResult.error : "Unable to create order. Please try again.";
            if (statusNotice) statusNotice.textContent = errMsg;
            showToast(errMsg);
        }
    } catch (err) {
        console.error("Network or API error:", err);
        if (statusNotice) statusNotice.textContent = "Unable to create order. Please try again.";
        showToast("Unable to create order. Please try again.");
    } finally {
        isSubmittingOrder = false;
        btn.disabled = false;
        if (spinner) spinner.classList.add("hidden");
        if (btnText) btnText.textContent = "PLACE ORDER →";
    }
}

function showPaymentSection(order) {
    const heroSec = document.getElementById("heroSection");
    const prodSec = document.getElementById("productsSection");
    const orderSec = document.getElementById("orderSection");
    const paySec = document.getElementById("paymentSection");

    if (heroSec) heroSec.classList.add("hidden");
    if (prodSec) prodSec.classList.add("hidden");
    if (orderSec) orderSec.classList.add("hidden");
    if (paySec) paySec.classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });

    const dispId = document.getElementById("dispOrderId");
    if (dispId) dispId.textContent = order.orderId;

    // Reset UTR form
    const utrInput = document.getElementById("utrInput");
    if (utrInput) utrInput.value = "";
    const feedback = document.getElementById("utrFeedbackMsg");
    if (feedback) feedback.textContent = "";

    // Setup "Place Another Order" button
    const btnNew = document.getElementById("btnStartNewOrder");
    if (btnNew) {
        btnNew.onclick = resetToNewOrder;
    }
}

// ============================================================================
// UTR / TRANSACTION ID SUBMISSION (submitPayment API)
// ============================================================================
function setupUtrSubmission() {
    const btnUtr = document.getElementById("btnSubmitUtr");
    if (!btnUtr) return;

    btnUtr.addEventListener("click", handleUtrSubmit);
}

async function handleUtrSubmit() {
    const utrInput = document.getElementById("utrInput");
    const utrVal = utrInput?.value.trim() || "";
    const feedback = document.getElementById("utrFeedbackMsg");
    const spinner = document.getElementById("utrSpinner");
    const btnText = document.getElementById("utrBtnText");
    const btn = document.getElementById("btnSubmitUtr");

    if (!activeCreatedOrder || !activeCreatedOrder.orderId) {
        showToast("Order ID not found.");
        return;
    }

    if (!utrVal || utrVal.length < 4) {
        if (feedback) {
            feedback.style.color = "#DC2626";
            feedback.textContent = "कृपया मान्य UTR या Transaction नंबर दर्ज करें।";
        }
        return;
    }

    btn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");
    if (btnText) btnText.textContent = "Submitting...";

    const payload = {
        action: "submitPayment",
        orderId: activeCreatedOrder.orderId,
        paymentId: utrVal
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        let resJson = null;
        try {
            resJson = JSON.parse(text);
        } catch (e) {}

        if (feedback) {
            feedback.style.color = "#047857";
            feedback.textContent = "Payment details submitted. Payment verification pending.";
        }
        showToast("Payment details submitted. Payment verification pending.");
    } catch (err) {
        console.error("UTR submission notice:", err);
        if (feedback) {
            feedback.style.color = "#047857";
            feedback.textContent = "Payment details submitted. Payment verification pending.";
        }
        showToast("Payment details submitted. Payment verification pending.");
    } finally {
        btn.disabled = false;
        if (spinner) spinner.classList.add("hidden");
        if (btnText) btnText.textContent = "SUBMIT PAYMENT DETAILS";
    }
}

// ============================================================================
// RESET TO NEW ORDER
// ============================================================================
function resetToNewOrder() {
    const form = document.getElementById("orderForm");
    if (form) form.reset();

    activeCreatedOrder = null;
    const heroSec = document.getElementById("heroSection");
    const prodSec = document.getElementById("productsSection");
    const orderSec = document.getElementById("orderSection");
    const paySec = document.getElementById("paymentSection");

    if (paySec) paySec.classList.add("hidden");
    if (heroSec) heroSec.classList.remove("hidden");
    if (prodSec) prodSec.classList.remove("hidden");
    if (orderSec) orderSec.classList.remove("hidden");

    selectProduct(PRODUCTS[0], false);
    const qtyInput = document.getElementById("qtyInput");
    if (qtyInput) qtyInput.value = "1";
    const stateInput = document.getElementById("custState");
    if (stateInput) stateInput.value = "Rajasthan";

    recalculateSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================================
// TRACK ORDER MODAL
// ============================================================================
function setupTrackModal() {
    const openBtn = document.getElementById("btnOpenTrackModal");
    const closeBtn = document.getElementById("btnCloseTrackModal");
    const backdrop = document.getElementById("trackModalBackdrop");
    const form = document.getElementById("trackModalForm");
    const resultBox = document.getElementById("trackModalResult");
    const spinner = document.getElementById("trackModalSpinner");
    const btnText = document.getElementById("trackCheckText");

    if (openBtn && backdrop) {
        openBtn.addEventListener("click", () => {
            backdrop.classList.remove("hidden");
            if (resultBox) resultBox.classList.add("hidden");
        });
    }

    if (closeBtn && backdrop) {
        closeBtn.addEventListener("click", () => {
            backdrop.classList.add("hidden");
        });
    }

    if (backdrop) {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) backdrop.classList.add("hidden");
        });
    }

    if (form && resultBox) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const orderIdInp = document.getElementById("modalOrderIdInput")?.value.trim().toUpperCase() || "";

            if (!orderIdInp) {
                showToast("Order Number दर्ज करें।");
                return;
            }

            if (spinner) spinner.classList.remove("hidden");
            if (btnText) btnText.textContent = "Checking...";

            try {
                let orderMatch = null;

                // Check active session cache first
                if (activeCreatedOrder && activeCreatedOrder.orderId === orderIdInp) {
                    orderMatch = activeCreatedOrder;
                } else {
                    try {
                        const saved = sessionStorage.getItem("rajvaari_last_order");
                        if (saved) {
                            const parsed = JSON.parse(saved);
                            if (parsed.orderId === orderIdInp) orderMatch = parsed;
                        }
                    } catch (e) {}
                }

                // Query Apps Script API (doGet trackOrder)
                if (!orderMatch) {
                    try {
                        const qUrl = `${API_URL}?action=trackOrder&orderId=${encodeURIComponent(orderIdInp)}`;
                        const res = await fetch(qUrl);
                        const resJson = await res.json();
                        if (resJson && resJson.success && resJson.order) {
                            orderMatch = resJson.order;
                        }
                    } catch (netErr) {}
                }

                resultBox.classList.remove("hidden");

                if (!orderMatch) {
                    resultBox.innerHTML = `
                        <div style="background: #FFFBEB; border: 1.5px solid #FDE68A; padding: 12px; border-radius: 8px; text-align: center; font-size: 13px; color: #92400E;">
                            <strong>Order Number (${orderIdInp}) नहीं मिला।</strong><br>
                            कृपया सही Order ID दर्ज करें।
                        </div>
                    `;
                } else {
                    const isConfirmed = (orderMatch.paymentStatus === "YES" || orderMatch.orderStatus === "CONFIRMED");
                    const isCancelled = (orderMatch.orderStatus === "CANCELLED" || orderMatch.paymentStatus === "NO");

                    if (isConfirmed) {
                        resultBox.innerHTML = `
                            <div style="background: #ECFDF5; border: 1.5px solid #6EE7B7; border-radius: 8px; padding: 12px; font-size: 13px;">
                                <div style="color: #065F46; font-weight: 800; font-size: 15px; margin-bottom: 4px;">✓ CONFIRMED</div>
                                <div>Order ID: <strong>${orderMatch.orderId}</strong></div>
                                <div>Payment: <span style="color: #059669; font-weight: 700;">YES (Verified)</span></div>
                                <div>Delivery Status: <strong>PROCESSING</strong></div>
                                <div>Expected: <strong>${orderMatch.expectedDelivery || "Within 24 Hours"}</strong></div>
                            </div>
                        `;
                    } else if (isCancelled) {
                        resultBox.innerHTML = `
                            <div style="background: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 8px; padding: 12px; font-size: 13px;">
                                <div style="color: #991B1B; font-weight: 800; font-size: 15px; margin-bottom: 4px;">✕ CANCELLED</div>
                                <div>Order ID: <strong>${orderMatch.orderId}</strong></div>
                                <div style="color: #B91C1C;">Reason: Payment not verified or timed out.</div>
                            </div>
                        `;
                    } else {
                        resultBox.innerHTML = `
                            <div style="background: #FFFBEB; border: 1.5px solid #FDE68A; border-radius: 8px; padding: 12px; font-size: 13px;">
                                <div style="color: #D97706; font-weight: 800; font-size: 15px; margin-bottom: 4px;">PENDING VERIFICATION</div>
                                <div>Order ID: <strong>${orderMatch.orderId}</strong></div>
                                <div>Payment Status: <span style="color: #D97706; font-weight: 700;">PENDING</span></div>
                                <div style="margin-top: 6px; font-size: 12px; color: #92400E;">Admin verification in progress in Google Sheet.</div>
                            </div>
                        `;
                    }
                }
            } catch (err) {
                showToast("Status check error.");
            } finally {
                if (spinner) spinner.classList.add("hidden");
                if (btnText) btnText.textContent = "CHECK STATUS";
            }
        });
    }
}

// ============================================================================
// TOAST HELPER
// ============================================================================
let toastTimer = null;
function showToast(msg) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.remove("hidden");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 4500);
}
