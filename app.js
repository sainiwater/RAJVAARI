/**
 * ============================================================================
 * RAJVAARI PACKAGED DRINKING WATER - CORE LOGIC & SYNC ENGINE
 * Brand: RAJVAARI | शुद्ध पानी, भरोसे के साथ
 * Products: 1 Liter (₹20) and 200ml (₹10) ONLY
 * Structure: 2 Views (HOME & PROFILE), Order History Integrated into Home
 * Backend: Google Apps Script Web App (3 Sheets: Orders, Customers, Profile Updates)
 * Auth & Cloud: Firebase Auth (Email/Pass) & Firestore (customers/{uid})
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================

// Google Apps Script Web App Endpoint
const API_URL = "https://script.google.com/macros/s/AKfycbzqB8l4lH4qd4yJpLzzFOPtW5Ie5bf7GXr7H19S92IitUsOVrTr4uE7GdOlwDQPNxrP/exec";

// Firebase Configuration (rajvaari)
const firebaseConfig = {
    apiKey: "AIzaSyDNe055MybU-18pIeqbqiKVX9MHo_8w0w0",
    authDomain: "rajvaari.firebaseapp.com",
    projectId: "rajvaari",
    storageBucket: "rajvaari.firebasestorage.app",
    messagingSenderId: "915835474939",
    appId: "1:915835474939:web:1885189f6faa46b6ecf15e",
    measurementId: "G-7T62ZQ4PX7"
};

// UPI Details
const UPI_ID = "9950906310-2@ybl";
const UPI_PAYEE_NAME = "RAJVAARI WATER";

// STRICTLY 2 PRODUCTS ONLY
const PRODUCTS = {
    "1L": {
        id: "1L",
        product: "RAJVAARI Drinking Water",
        brand: "RAJVAARI",
        bottleSize: "1 Liter",
        price: 20
    },
    "200ml": {
        id: "200ml",
        product: "RAJVAARI Drinking Water",
        brand: "RAJVAARI",
        bottleSize: "200ml",
        price: 10
    }
};

// Storage Keys
const STORAGE_ORDERS_KEY = "rajvaari_customer_orders_v3";
const STORAGE_PROFILE_KEY = "rajvaari_saved_profile_v3";

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================
let firebaseAuth = null;
let firestoreDb = null;
let currentUser = null;
let currentCustomerProfile = null;

// Currently selected product (Default: 1 Liter)
let activeProduct = PRODUCTS["1L"];
let activeQuantity = 1;

// Last created order
let activeCreatedOrder = null;
let isSubmittingOrder = false;

// ============================================================================
// 3. INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    initFirebase();
    setupNavigation();
    setupProductSelection();
    setupQuantitySteppers();
    setupOrderFormValidation();
    setupPaymentActions();
    setupProfileDashboard();
    setupOrderTrackingAndDetails();
    setupAuthModal();
    loadCachedProfile();
    renderOrdersList();

    // Default populate 1 Liter into checkout summary
    updateCheckoutSummary();
    validateOrderForm();
});

// ============================================================================
// 4. FIREBASE INITIALIZATION & AUTH OBSERVER
// ============================================================================
function initFirebase() {
    try {
        if (typeof firebase !== "undefined" && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            firebaseAuth = firebase.auth();
            firestoreDb = firebase.firestore();

            // Set local persistence
            firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(e => console.warn(e));

            // Auth state observer
            firebaseAuth.onAuthStateChanged(async (user) => {
                currentUser = user;
                if (user) {
                    await onUserSignedIn(user);
                } else {
                    onUserSignedOut();
                }
            });
        } else if (typeof firebase !== "undefined" && firebase.apps.length) {
            firebaseAuth = firebase.auth();
            firestoreDb = firebase.firestore();
        }
    } catch (err) {
        console.warn("Firebase initialization note:", err);
    }
}

async function onUserSignedIn(user) {
    const accountNameLabel = document.getElementById("accountNameLabel");
    const accountAvatarIcon = document.getElementById("accountAvatarIcon");
    const checkoutUserText = document.getElementById("checkoutUserText");

    const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "Customer");
    if (accountNameLabel) accountNameLabel.textContent = displayName;
    if (accountAvatarIcon) accountAvatarIcon.textContent = "✓";
    if (checkoutUserText) checkoutUserText.textContent = `Signed In: ${displayName}`;

    // Load customer profile from Firestore & synchronize with Google Sheet
    await loadCustomerProfileFromFirestore(user.uid, user.email);

    // Sync user orders
    await syncCustomerOrdersFromFirestore(user.uid);
}

function onUserSignedOut() {
    currentUser = null;
    currentCustomerProfile = null;

    const accountNameLabel = document.getElementById("accountNameLabel");
    const accountAvatarIcon = document.getElementById("accountAvatarIcon");
    const checkoutUserText = document.getElementById("checkoutUserText");

    if (accountNameLabel) accountNameLabel.textContent = "Login";
    if (accountAvatarIcon) accountAvatarIcon.textContent = "👤";
    if (checkoutUserText) checkoutUserText.textContent = "Guest Checkout";

    updateProfileViewUI(null);
    renderOrdersList();
}

// ============================================================================
// 5. NAVIGATION (HOME & PROFILE ONLY)
// ============================================================================
function setupNavigation() {
    const navTabs = document.querySelectorAll(".nav-link-btn");
    const bottomNavItems = document.querySelectorAll(".mob-nav-btn");

    function switchView(targetViewId) {
        document.querySelectorAll(".view-screen").forEach(view => {
            if (view.id === targetViewId) {
                view.classList.remove("hidden");
                view.classList.add("active");
            } else {
                view.classList.add("hidden");
                view.classList.remove("active");
            }
        });

        // Update Desktop Tabs
        navTabs.forEach(t => {
            t.classList.toggle("active", t.dataset.target === targetViewId);
        });

        // Update Mobile Bottom Nav
        bottomNavItems.forEach(b => {
            if (b.dataset.target) {
                b.classList.toggle("active", b.dataset.target === targetViewId);
            }
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Desktop Tabs
    navTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.target;
            if (target) switchView(target);
        });
    });

    // Mobile Bottom Bar Tabs
    bottomNavItems.forEach(item => {
        if (item.dataset.target) {
            item.addEventListener("click", () => {
                switchView(item.dataset.target);
            });
        }
    });

    // Mobile "Order Now" Bottom Button: Scrolls to Order Section on Home
    document.getElementById("bNavOrder")?.addEventListener("click", () => {
        switchView("homeView");
        setTimeout(() => {
            scrollToOrderSection();
        }, 100);
    });

    // Brand Logo Button: Always Home
    document.getElementById("navBrandBtn")?.addEventListener("click", () => {
        switchView("homeView");
    });

    // Header "Order Water" CTA
    document.getElementById("btnHeaderOrderNow")?.addEventListener("click", () => {
        switchView("homeView");
        setTimeout(() => {
            scrollToOrderSection();
        }, 100);
    });

    // Hero "Order Water Now" CTA
    document.getElementById("btnHeroOrder")?.addEventListener("click", () => {
        scrollToOrderSection();
    });

    // Hero "Track Orders" CTA
    document.getElementById("btnHeroViewOrders")?.addEventListener("click", () => {
        const orderHistoryCard = document.querySelector(".order-history-column");
        if (orderHistoryCard) {
            orderHistoryCard.scrollIntoView({ behavior: "smooth", block: "center" });
            const inp = document.getElementById("inputTrackOrderId");
            if (inp) inp.focus();
        }
    });

    // Account Pill Click: Opens Profile if logged in, or Auth Modal if not
    document.getElementById("btnAccountToggle")?.addEventListener("click", () => {
        if (currentUser) {
            switchView("profileView");
        } else {
            openAuthModal("signin");
        }
    });
}

function scrollToOrderSection() {
    const orderSec = document.getElementById("orderSection");
    if (orderSec) {
        orderSec.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// ============================================================================
// 6. PRODUCT CARDS & SELECTION (1L & 200ml ONLY)
// ============================================================================
function setupProductSelection() {
    const card1L = document.getElementById("cardProduct1L");
    const card200ml = document.getElementById("cardProduct200ml");

    function selectProduct(prodKey) {
        activeProduct = PRODUCTS[prodKey] || PRODUCTS["1L"];

        // Update card visual state
        if (card1L && card200ml) {
            card1L.classList.toggle("active", prodKey === "1L");
            card200ml.classList.toggle("active", prodKey === "200ml");
        }

        // Get quantity from the product card's stepper
        const activeCard = prodKey === "1L" ? card1L : card200ml;
        const qtyInput = activeCard?.querySelector(".input-qty-step");
        if (qtyInput) {
            activeQuantity = parseInt(qtyInput.value, 10) || 1;
        }

        updateCheckoutSummary();
        validateOrderForm();
    }

    // Card Click Selection
    card1L?.addEventListener("click", (e) => {
        if (!e.target.closest(".modern-stepper")) {
            selectProduct("1L");
        }
    });

    card200ml?.addEventListener("click", (e) => {
        if (!e.target.closest(".modern-stepper")) {
            selectProduct("200ml");
        }
    });

    // "Order Now" Buttons on Cards: Auto-select and scroll smoothly to order form
    document.querySelectorAll(".btn-prod-order").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const prodKey = btn.dataset.product;
            selectProduct(prodKey);
            scrollToOrderSection();
            document.getElementById("custName")?.focus();
        });
    });
}

// ============================================================================
// 7. QUANTITY STEPPERS
// ============================================================================
function setupQuantitySteppers() {
    // Steppers inside product cards
    document.querySelectorAll(".modern-stepper").forEach(stepper => {
        const prodFor = stepper.dataset.for;
        const minusBtn = stepper.querySelector(".btn-step-minus");
        const plusBtn = stepper.querySelector(".btn-step-plus");
        const input = stepper.querySelector(".input-qty-step");

        minusBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            let val = parseInt(input.value, 10) || 1;
            if (val > 1) {
                val--;
                input.value = val;
                if (activeProduct.id === prodFor) {
                    activeQuantity = val;
                    updateCheckoutSummary();
                }
            }
        });

        plusBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            let val = parseInt(input.value, 10) || 1;
            if (val < 500) {
                val++;
                input.value = val;
                if (activeProduct.id === prodFor) {
                    activeQuantity = val;
                    updateCheckoutSummary();
                }
            }
        });
    });

    // Stepper in Checkout Summary Panel
    document.getElementById("btnSummaryMinus")?.addEventListener("click", () => {
        if (activeQuantity > 1) {
            activeQuantity--;
            syncCardStepper(activeProduct.id, activeQuantity);
            updateCheckoutSummary();
        }
    });

    document.getElementById("btnSummaryPlus")?.addEventListener("click", () => {
        if (activeQuantity < 500) {
            activeQuantity++;
            syncCardStepper(activeProduct.id, activeQuantity);
            updateCheckoutSummary();
        }
    });
}

function syncCardStepper(prodId, qty) {
    const stepper = document.querySelector(`.modern-stepper[data-for="${prodId}"]`);
    const input = stepper?.querySelector(".input-qty-step");
    if (input) input.value = qty;
}

function updateCheckoutSummary() {
    const badge = document.getElementById("activeProductBadge");
    const title = document.getElementById("activeProductTitle");
    const priceTag = document.getElementById("activeProductPriceTag");

    const sumProd = document.getElementById("summaryProdName");
    const sumSize = document.getElementById("summaryBottleSize");
    const sumPrice = document.getElementById("summaryPrice");
    const sumQtyNum = document.getElementById("summaryQtyNum");
    const sumSubtotal = document.getElementById("summarySubtotal");
    const sumDelivery = document.getElementById("summaryDelivery");
    const sumTotal = document.getElementById("summaryTotal");

    const price = activeProduct.price;
    const subtotal = price * activeQuantity;

    if (badge) badge.textContent = activeProduct.bottleSize;
    if (title) title.textContent = activeProduct.product;
    if (priceTag) priceTag.textContent = `₹${price} / bottle`;

    if (sumProd) sumProd.textContent = activeProduct.product;
    if (sumSize) sumSize.textContent = activeProduct.bottleSize;
    if (sumPrice) sumPrice.textContent = `₹${price}`;
    if (sumQtyNum) sumQtyNum.textContent = activeQuantity;
    if (sumSubtotal) sumSubtotal.textContent = `₹${subtotal}`;
    if (sumDelivery) sumDelivery.textContent = "FREE (₹0)";
    if (sumTotal) sumTotal.textContent = `₹${subtotal}`;
}

// ============================================================================
// 8. CHECKOUT FORM VALIDATION & SUBMISSION
// ============================================================================
function setupOrderFormValidation() {
    const inputs = ["custName", "custMobile", "custAltMobile", "custAddress", "custVillage", "custCity", "custDistrict", "custPincode"];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        el?.addEventListener("input", validateOrderForm);
        el?.addEventListener("blur", validateOrderForm);
    });

    // Place Order Button Click
    document.getElementById("btnPlaceOrder")?.addEventListener("click", handleOrderSubmission);
}

function validateOrderForm() {
    const custName = document.getElementById("custName")?.value.trim() || "";
    const custMobile = document.getElementById("custMobile")?.value.trim() || "";
    const custAltMobile = document.getElementById("custAltMobile")?.value.trim() || "";
    const custAddress = document.getElementById("custAddress")?.value.trim() || "";
    const custVillage = document.getElementById("custVillage")?.value.trim() || "";
    const custCity = document.getElementById("custCity")?.value.trim() || "";
    const custDistrict = document.getElementById("custDistrict")?.value.trim() || "";
    const custPincode = document.getElementById("custPincode")?.value.trim() || "";

    const btnPlaceOrder = document.getElementById("btnPlaceOrder");

    const isNameValid = custName.length >= 2 && !/^\d+$/.test(custName);
    const isMobileValid = /^[6-9]\d{9}$/.test(custMobile);
    const isAltMobileValid = !custAltMobile || /^[6-9]\d{9}$/.test(custAltMobile);
    const isAddressValid = custAddress.length >= 5;
    const isVillageValid = custVillage.length >= 2;
    const isCityValid = custCity.length >= 2;
    const isDistrictValid = custDistrict.length >= 2;
    const isPincodeValid = /^\d{6}$/.test(custPincode);

    // Toggle error labels
    toggleFieldError("custName", "errName", isNameValid);
    toggleFieldError("custMobile", "errMobile", isMobileValid);
    toggleFieldError("custAddress", "errAddress", isAddressValid);
    toggleFieldError("custCity", "errCity", isCityValid);
    toggleFieldError("custPincode", "errPincode", isPincodeValid);

    const isAllValid = isNameValid && isMobileValid && isAltMobileValid && isAddressValid && isVillageValid && isCityValid && isDistrictValid && isPincodeValid && activeQuantity >= 1;

    if (btnPlaceOrder && !isSubmittingOrder) {
        btnPlaceOrder.disabled = !isAllValid;
    }

    return isAllValid;
}

function toggleFieldError(inputId, errorId, isValid) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (!input || !error) return;

    if (input.value.trim().length > 0) {
        if (!isValid) {
            input.classList.add("input-error");
            error.classList.remove("hidden");
        } else {
            input.classList.remove("input-error");
            error.classList.add("hidden");
        }
    } else {
        input.classList.remove("input-error");
        error.classList.add("hidden");
    }
}

// HANDLE ORDER SUBMISSION
async function handleOrderSubmission() {
    if (isSubmittingOrder) return;
    if (!validateOrderForm()) {
        showToast("Please fill all required delivery details correctly.");
        return;
    }

    isSubmittingOrder = true;
    const btnPlaceOrder = document.getElementById("btnPlaceOrder");
    const orderSpinner = document.getElementById("orderSpinner");
    const btnOrderText = document.getElementById("btnOrderText");

    if (btnPlaceOrder) btnPlaceOrder.disabled = true;
    if (orderSpinner) orderSpinner.classList.remove("hidden");
    if (btnOrderText) btnOrderText.textContent = "Creating Order...";

    const custName = document.getElementById("custName").value.trim();
    const custMobile = document.getElementById("custMobile").value.trim();
    const custAltMobile = document.getElementById("custAltMobile")?.value.trim() || "";
    const custAddress = document.getElementById("custAddress").value.trim();
    const custVillage = document.getElementById("custVillage").value.trim();
    const custCity = document.getElementById("custCity").value.trim();
    const custDistrict = document.getElementById("custDistrict").value.trim();
    const custState = document.getElementById("custState")?.value.trim() || "Rajasthan";
    const custPincode = document.getElementById("custPincode").value.trim();
    const custMessage = document.getElementById("custMessage")?.value.trim() || "";

    const price = activeProduct.price;
    const subtotal = price * activeQuantity;

    const firebaseUid = currentUser ? currentUser.uid : "";
    const customerId = (currentCustomerProfile && currentCustomerProfile.customerId) ? currentCustomerProfile.customerId : "";

    const payload = {
        action: "createOrder",
        customerName: custName,
        mobile: custMobile,
        mobileNumber: custMobile,
        alternateNumber: custAltMobile || "",
        fullAddress: custAddress,
        villageArea: custVillage || "",
        city: custCity,
        district: custDistrict || "",
        state: custState || "Rajasthan",
        pinCode: custPincode,
        pincode: custPincode,
        product: activeProduct.product,
        brand: activeProduct.brand,
        bottleSize: activeProduct.bottleSize,
        quantity: activeQuantity,
        pricePerBottle: price,
        subtotal: subtotal,
        deliveryCharge: 0,
        discount: 0,
        totalOrderAmount: subtotal,
        notes: custMessage || "Order created. Verification payment pending.",
        customerMessage: custMessage || "",
        firebaseUID: firebaseUid,
        firebaseUid: firebaseUid,
        customerId: customerId
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(payload)
        });

        const textResponse = await response.text();
        let result;
        try {
            result = JSON.parse(textResponse);
        } catch (jsonErr) {
            console.error("Non-JSON API response:", textResponse);
            throw new Error("Invalid response received from RAJVAARI backend API.");
        }

        if (!result.success || !result.orderId) {
            throw new Error(result.error || result.message || "Unable to create order. Please try again.");
        }

        // Successfully created order!
        activeCreatedOrder = {
            orderId: result.orderId,
            timestamp: new Date().toISOString(),
            orderDate: new Date().toLocaleDateString("en-IN"),
            customerName: custName,
            mobileNumber: custMobile,
            alternateNumber: custAltMobile,
            fullAddress: custAddress,
            villageArea: custVillage,
            city: custCity,
            district: custDistrict,
            state: custState,
            pinCode: custPincode,
            product: activeProduct.product,
            brand: activeProduct.brand,
            bottleSize: activeProduct.bottleSize,
            quantity: activeQuantity,
            pricePerBottle: price,
            subtotal: subtotal,
            totalOrderAmount: subtotal,
            paymentRequired: 1,
            paymentStatus: "PENDING",
            paymentId: "",
            orderStatus: "PENDING",
            deliveryStatus: "PENDING",
            expectedDelivery: "Within 24 Hours",
            notes: custMessage,
            firebaseUid: firebaseUid,
            customerId: customerId
        };

        // Save order in Firestore & LocalStorage
        await saveOrderRecord(activeCreatedOrder);

        // Auto-save delivery profile if logged in
        if (currentUser) {
            saveCustomerProfileToFirestore({
                name: custName,
                mobileNumber: custMobile,
                alternateNumber: custAltMobile,
                fullAddress: custAddress,
                villageArea: custVillage,
                city: custCity,
                district: custDistrict,
                state: custState,
                pinCode: custPincode
            });
        }

        // Reveal Payment Section on Home
        revealPaymentSection(activeCreatedOrder);
        showToast("✓ Order created! Please complete ₹1 verification payment.");
    } catch (err) {
        console.error("Order creation failed:", err);
        showToast(err.message || "Unable to create order. Please try again.");
    } finally {
        isSubmittingOrder = false;
        if (btnPlaceOrder) btnPlaceOrder.disabled = false;
        if (orderSpinner) orderSpinner.classList.add("hidden");
        if (btnOrderText) btnOrderText.textContent = "Place Order →";
        validateOrderForm();
    }
}

// ============================================================================
// 9. PAYMENT SECTION & ACTIONS (₹1 PhonePe QR)
// ============================================================================
function setupPaymentActions() {
    // 1-Click Copy UPI ID
    document.getElementById("btnCopyUpiId")?.addEventListener("click", () => {
        navigator.clipboard.writeText(UPI_ID).then(() => {
            const btn = document.getElementById("btnCopyUpiId");
            if (btn) {
                btn.textContent = "Copied!";
                setTimeout(() => { btn.textContent = "Copy"; }, 2000);
            }
            showToast("✓ UPI ID copied: " + UPI_ID);
        }).catch(() => {
            showToast("UPI ID: " + UPI_ID);
        });
    });

    // UTR Submission Button
    document.getElementById("btnSubmitUtr")?.addEventListener("click", handleUtrSubmission);

    // View My Orders from Payment Card -> Scrolls to Order History Card on Home
    document.getElementById("btnViewMyOrdersFromPay")?.addEventListener("click", () => {
        document.getElementById("paymentSection")?.classList.add("hidden");
        document.getElementById("heroSection")?.classList.remove("hidden");
        document.getElementById("productsSection")?.classList.remove("hidden");
        document.getElementById("orderSection")?.classList.remove("hidden");

        const historyCol = document.querySelector(".order-history-column");
        if (historyCol) {
            historyCol.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });

    // Place Another Order Link
    document.getElementById("btnPlaceAnotherOrder")?.addEventListener("click", () => {
        document.getElementById("paymentSection")?.classList.add("hidden");
        document.getElementById("heroSection")?.classList.remove("hidden");
        document.getElementById("productsSection")?.classList.remove("hidden");
        document.getElementById("orderSection")?.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

function revealPaymentSection(order) {
    const heroSec = document.getElementById("heroSection");
    const prodSec = document.getElementById("productsSection");
    const orderSec = document.getElementById("orderSection");
    const paySec = document.getElementById("paymentSection");

    if (heroSec) heroSec.classList.add("hidden");
    if (prodSec) prodSec.classList.add("hidden");
    if (orderSec) orderSec.classList.add("hidden");
    if (paySec) paySec.classList.remove("hidden");

    const dispCreatedOrderId = document.getElementById("dispCreatedOrderId");
    if (dispCreatedOrderId) dispCreatedOrderId.textContent = order.orderId;

    // Update Direct UPI App link with Order ID in transaction note
    const directLink = document.getElementById("directUpiPayLink");
    if (directLink) {
        directLink.href = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=1&cu=INR&tn=${encodeURIComponent("RAJVAARI Order " + order.orderId)}`;
    }

    paySec?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function handleUtrSubmission() {
    if (!activeCreatedOrder) {
        showToast("No active order to submit payment for.");
        return;
    }

    const utrInput = document.getElementById("utrInput");
    const utrVal = utrInput?.value.trim();
    const feedback = document.getElementById("utrFeedbackMsg");
    const btn = document.getElementById("btnSubmitUtr");
    const spinner = document.getElementById("utrSpinner");
    const btnText = document.getElementById("utrBtnText");

    if (!utrVal || utrVal.length < 8) {
        if (feedback) {
            feedback.style.color = "#DC2626";
            feedback.textContent = "कृपया मान्य UTR / Transaction ID (कम से कम 8 अंक) दर्ज करें।";
        }
        return;
    }

    btn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");
    if (btnText) btnText.textContent = "Submitting...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "submitPayment",
                orderId: activeCreatedOrder.orderId,
                paymentId: utrVal
            })
        });

        activeCreatedOrder.paymentId = utrVal;
        await updateOrderInStorage(activeCreatedOrder);

        if (feedback) {
            feedback.style.color = "#059669";
            feedback.textContent = "Payment details submitted. Payment Status remains PENDING until Admin verifies in Google Sheet.";
        }
        showToast("✓ Payment UTR recorded! Verification pending.");
    } catch (err) {
        console.error("UTR submission error:", err);
        activeCreatedOrder.paymentId = utrVal;
        await updateOrderInStorage(activeCreatedOrder);
        if (feedback) {
            feedback.style.color = "#059669";
            feedback.textContent = "Payment ID saved locally. Verification pending.";
        }
    } finally {
        btn.disabled = false;
        if (spinner) spinner.classList.add("hidden");
        if (btnText) btnText.textContent = "SUBMIT PAYMENT";
    }
}

// ============================================================================
// 10. ORDER HISTORY CARD & TRACKING
// ============================================================================
function setupOrderTrackingAndDetails() {
    // Track Order by ID input
    document.getElementById("btnLookupOrder")?.addEventListener("click", async () => {
        const inp = document.getElementById("inputTrackOrderId");
        const orderId = inp?.value.trim().toUpperCase();
        const feedback = document.getElementById("lookupFeedback");
        const spinner = document.getElementById("lookupSpinner");

        if (!orderId) {
            if (feedback) {
                feedback.style.color = "#DC2626";
                feedback.textContent = "Please enter an Order ID.";
            }
            return;
        }

        if (spinner) spinner.classList.remove("hidden");
        try {
            const res = await fetch(`${API_URL}?action=trackOrder&orderId=${encodeURIComponent(orderId)}`);
            const data = await res.json();

            if (data.success && data.order) {
                if (feedback) {
                    feedback.style.color = "#059669";
                    feedback.textContent = `Found! Status: ${data.order.orderStatus}`;
                }
                await updateOrderInStorage(data.order);
                openOrderDetailModal(data.order);
            } else {
                if (feedback) {
                    feedback.style.color = "#DC2626";
                    feedback.textContent = "Order ID not found in Google Sheet.";
                }
            }
        } catch (err) {
            if (feedback) {
                feedback.style.color = "#DC2626";
                feedback.textContent = "Network check error.";
            }
        } finally {
            if (spinner) spinner.classList.add("hidden");
        }
    });

    // Refresh Orders Status Button
    document.getElementById("btnRefreshOrders")?.addEventListener("click", async () => {
        showToast("Checking latest status from Google Sheet...");
        await checkOrdersLatestStatus();
    });

    // Close detail modal
    document.getElementById("btnOrderDetailClose")?.addEventListener("click", () => {
        document.getElementById("orderDetailModal")?.classList.add("hidden");
    });
}

function renderOrdersList() {
    const container = document.getElementById("ordersListContainer");
    const emptyCard = document.getElementById("emptyOrdersCard");

    if (!container) return;

    let orders = getStoredOrders();

    // Filter for current user if logged in
    if (currentUser) {
        orders = orders.filter(o => !o.firebaseUid || o.firebaseUid === currentUser.uid || (currentCustomerProfile && o.mobileNumber === currentCustomerProfile.mobileNumber));
    }

    if (orders.length === 0) {
        container.innerHTML = "";
        emptyCard?.classList.remove("hidden");
        return;
    }

    emptyCard?.classList.add("hidden");

    let hasVerifiedOrder = false;
    let verifiedOrderId = "";

    container.innerHTML = orders.map(o => {
        if (o.paymentStatus === "YES") {
            hasVerifiedOrder = true;
            verifiedOrderId = o.orderId;
        }

        const dateStr = o.orderDate || (o.timestamp ? new Date(o.timestamp).toLocaleDateString("en-IN") : "");

        const payClass = (o.paymentStatus === "YES") ? "st-yes" : ((o.paymentStatus === "NO") ? "st-no" : "st-pending");
        const orderClass = (o.orderStatus === "CONFIRMED") ? "st-confirmed" : ((o.orderStatus === "CANCELLED") ? "st-cancelled" : "st-pending");
        const delivClass = (o.deliveryStatus === "DELIVERED") ? "st-delivered" : ((o.deliveryStatus === "CANCELLED") ? "st-cancelled" : "st-processing");

        return `
            <div class="order-history-card" onclick="window.rajvaariViewOrder('${o.orderId}')">
                <div class="order-card-header">
                    <span class="order-id-pill">📦 ${o.orderId}</span>
                    <span class="order-timestamp">${dateStr}</span>
                </div>

                <div class="order-card-body">
                    <div>
                        <div class="order-prod-title">RAJVAARI Drinking Water</div>
                        <div class="order-prod-meta">${o.bottleSize} • Qty: <strong>${o.quantity}</strong></div>
                    </div>
                    <div class="order-total-num">₹${o.totalOrderAmount}</div>
                </div>

                <div class="order-status-badges-row">
                    <span class="badge-status ${payClass}">Pay: ${o.paymentStatus || "PENDING"}</span>
                    <span class="badge-status ${orderClass}">Order: ${o.orderStatus || "PENDING"}</span>
                    <span class="badge-status ${delivClass}">Delivery: ${o.deliveryStatus || "PROCESSING"}</span>
                </div>

                <div class="order-card-footer">
                    <span>Expected: <strong>${o.expectedDelivery || "Within 24 Hours"}</strong></span>
                    <span class="btn-view-details-inline">View Details →</span>
                </div>
            </div>
        `;
    }).join("");

    // Show verified alert banner if applicable
    const alertBanner = document.getElementById("orderConfirmedAlert");
    const alertOrderId = document.getElementById("alertOrderId");
    if (alertBanner && alertOrderId) {
        if (hasVerifiedOrder) {
            alertOrderId.textContent = verifiedOrderId;
            alertBanner.classList.remove("hidden");
        } else {
            alertBanner.classList.add("hidden");
        }
    }
}

window.rajvaariViewOrder = function(orderId) {
    const orders = getStoredOrders();
    const order = orders.find(o => o.orderId === orderId);
    if (order) openOrderDetailModal(order);
};

function openOrderDetailModal(order) {
    const modal = document.getElementById("orderDetailModal");
    const content = document.getElementById("orderDetailContent");
    if (!modal || !content) return;

    const payClass = (order.paymentStatus === "YES") ? "st-yes" : ((order.paymentStatus === "NO") ? "st-no" : "st-pending");
    const orderClass = (order.orderStatus === "CONFIRMED") ? "st-confirmed" : ((order.orderStatus === "CANCELLED") ? "st-cancelled" : "st-pending");

    content.innerHTML = `
        <div style="margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: 800; color: var(--emerald-primary); letter-spacing: 1px;">ORDER DETAILS</div>
            <h3 style="font-family: var(--font-heading); font-size: 22px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
                ${order.orderId}
            </h3>
            <div style="font-size: 12px; color: var(--text-dim);">
                Date: ${order.orderDate || new Date(order.timestamp).toLocaleDateString("en-IN")}
            </div>
        </div>

        <div style="background: var(--bg-subtle); border: 1px solid var(--border-card); border-radius: 12px; padding: 14px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13.5px;">
                <span>Product:</span>
                <strong>${order.product || "RAJVAARI Drinking Water"}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13.5px;">
                <span>Bottle Size:</span>
                <strong>${order.bottleSize}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13.5px;">
                <span>Quantity:</span>
                <strong>${order.quantity}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13.5px;">
                <span>Total Amount:</span>
                <strong style="color: var(--emerald-dark); font-size: 16px;">₹${order.totalOrderAmount}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-dim); border-top: 1px solid var(--border-light); padding-top: 6px; margin-top: 6px;">
                <span>Verification Payment:</span>
                <span>₹${order.paymentRequired || 1}</span>
            </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
            <span class="badge-status ${payClass}">Payment: ${order.paymentStatus || "PENDING"}</span>
            <span class="badge-status ${orderClass}">Order: ${order.orderStatus || "PENDING"}</span>
            <span class="badge-status st-processing">Delivery: ${order.deliveryStatus || "PROCESSING"}</span>
        </div>

        <div style="background: #FAFAFA; border: 1px solid var(--border-card); border-radius: 12px; padding: 14px; margin-bottom: 18px; font-size: 13px;">
            <div style="font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Delivery Address:</div>
            <div>${order.customerName} (${order.mobileNumber})</div>
            <div>${order.fullAddress}, ${order.villageArea || ""}</div>
            <div>${order.city}, ${order.district || ""}, ${order.state || "Rajasthan"} - ${order.pinCode}</div>
            ${order.notes ? `<div style="margin-top: 6px; color: var(--text-dim);"><strong>Note:</strong> ${order.notes}</div>` : ""}
            ${order.paymentId ? `<div style="margin-top: 6px; color: #6D28D9;"><strong>UTR:</strong> ${order.paymentId}</div>` : ""}
        </div>

        <button type="button" class="btn-primary-emerald" style="width: 100%; padding: 12px;" onclick="document.getElementById('orderDetailModal').classList.add('hidden')">
            Close Details
        </button>
    `;

    modal.classList.remove("hidden");
}

async function checkOrdersLatestStatus() {
    const orders = getStoredOrders();
    if (!orders.length) return;

    let updatedCount = 0;
    for (const ord of orders.slice(0, 5)) {
        try {
            const res = await fetch(`${API_URL}?action=trackOrder&orderId=${encodeURIComponent(ord.orderId)}`);
            const data = await res.json();
            if (data.success && data.order) {
                if (data.order.paymentStatus === "YES" && ord.paymentStatus !== "YES") {
                    showToast(`🎉 Order ${ord.orderId} Payment Verified! Delivery within 24 hours.`);
                }
                await updateOrderInStorage(data.order);
                updatedCount++;
            }
        } catch (e) {}
    }

    if (updatedCount > 0) renderOrdersList();
}

async function saveOrderRecord(order) {
    const existingOrders = getStoredOrders();
    const updated = [order, ...existingOrders.filter(o => o.orderId !== order.orderId)];
    try {
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated));
    } catch (e) {}

    if (currentUser && firestoreDb) {
        try {
            await firestoreDb.collection("customers")
                .doc(currentUser.uid)
                .collection("orders")
                .doc(order.orderId)
                .set(order);
        } catch (e) {}
    }

    renderOrdersList();
}

async function updateOrderInStorage(order) {
    const existingOrders = getStoredOrders();
    const updated = existingOrders.map(o => o.orderId === order.orderId ? { ...o, ...order } : o);
    try {
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated));
    } catch (e) {}

    if (currentUser && firestoreDb) {
        try {
            await firestoreDb.collection("customers")
                .doc(currentUser.uid)
                .collection("orders")
                .doc(order.orderId)
                .set(order, { merge: true });
        } catch (e) {}
    }

    renderOrdersList();
}

function getStoredOrders() {
    try {
        const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

async function syncCustomerOrdersFromFirestore(uid) {
    if (!firestoreDb) return;
    try {
        const snapshot = await firestoreDb.collection("customers")
            .doc(uid)
            .collection("orders")
            .orderBy("timestamp", "desc")
            .limit(20)
            .get();

        const fsOrders = [];
        snapshot.forEach(doc => fsOrders.push(doc.data()));

        if (fsOrders.length > 0) {
            const local = getStoredOrders();
            const combined = [...fsOrders];
            local.forEach(l => {
                if (!combined.some(c => c.orderId === l.orderId)) combined.push(l);
            });
            localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(combined));
            renderOrdersList();
        }
    } catch (e) {}
}

// ============================================================================
// 11. PROFILE DASHBOARD & GOOGLE SHEET SYNC
// ============================================================================
function setupProfileDashboard() {
    const toggleBtn = document.getElementById("btnToggleEditProfile");
    const editCollapsible = document.getElementById("profileEditCollapsible");
    const cancelBtn = document.getElementById("btnCancelEditProfile");

    // Toggle Collapsible Edit Form
    toggleBtn?.addEventListener("click", () => {
        editCollapsible?.classList.toggle("hidden");
    });

    cancelBtn?.addEventListener("click", () => {
        editCollapsible?.classList.add("hidden");
    });

    // Save Profile Button
    document.getElementById("btnSaveProfile")?.addEventListener("click", async () => {
        const name = document.getElementById("profName").value.trim();
        const mobile = document.getElementById("profMobile").value.trim();
        const altMobile = document.getElementById("profAltMobile").value.trim();
        const address = document.getElementById("profAddress").value.trim();
        const village = document.getElementById("profVillage").value.trim();
        const city = document.getElementById("profCity").value.trim();
        const district = document.getElementById("profDistrict").value.trim();
        const state = document.getElementById("profState").value.trim();
        const pincode = document.getElementById("profPincode").value.trim();

        if (!name) {
            showToast("Please enter your name.");
            return;
        }

        if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
            showToast("Mobile number must be 10 digits.");
            return;
        }

        if (pincode && !/^\d{6}$/.test(pincode)) {
            showToast("PIN code must be 6 digits.");
            return;
        }

        const profileData = {
            name,
            mobileNumber: mobile,
            alternateNumber: altMobile,
            fullAddress: address,
            villageArea: village,
            city,
            district,
            state: state || "Rajasthan",
            pinCode: pincode
        };

        const btn = document.getElementById("btnSaveProfile");
        const spinner = document.getElementById("saveProfileSpinner");
        const btnText = document.getElementById("saveProfileBtnText");

        btn.disabled = true;
        if (spinner) spinner.classList.remove("hidden");
        if (btnText) btnText.textContent = "Saving...";

        try {
            await saveCustomerProfileToFirestore(profileData);
            editCollapsible?.classList.add("hidden");
            showToast("✓ Profile saved and synchronized!");
        } catch (err) {
            console.error("Profile save error:", err);
            showToast("Failed to save profile. Please try again.");
        } finally {
            btn.disabled = false;
            if (spinner) spinner.classList.add("hidden");
            if (btnText) btnText.textContent = "💾 Save Profile";
        }
    });

    // Profile Prompt Login Button
    document.getElementById("btnProfileLoginPrompt")?.addEventListener("click", () => {
        openAuthModal("signin");
    });

    // Logout Button
    document.getElementById("btnLogout")?.addEventListener("click", async () => {
        if (firebaseAuth) {
            await firebaseAuth.signOut();
            showToast("Signed out successfully.");
        }
    });
}

async function loadCustomerProfileFromFirestore(uid, email) {
    if (!firestoreDb) return;
    try {
        const docRef = firestoreDb.collection("customers").doc(uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            currentCustomerProfile = docSnap.data();
            docRef.update({ lastLoginAt: new Date().toISOString() }).catch(() => {});

            // Synchronize with Google Sheet Customers row
            syncCustomerWithAppsScript("updateCustomerProfile", currentCustomerProfile);
        } else {
            const generatedCustId = "CUST-" + Math.floor(100000 + Math.random() * 900000);
            currentCustomerProfile = {
                customerId: generatedCustId,
                firebaseUid: uid,
                email: email,
                name: currentUser.displayName || "",
                mobileNumber: "",
                alternateNumber: "",
                fullAddress: "",
                villageArea: "",
                city: "",
                district: "",
                state: "Rajasthan",
                pinCode: "",
                mobileChangeCount: 0,
                emailChangeCount: 0,
                photoChangeCount: 0,
                profileCreatedAt: new Date().toISOString(),
                profileUpdatedAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                profileStatus: "ACTIVE"
            };

            await docRef.set(currentCustomerProfile);

            // Sync with Apps Script createCustomer
            syncCustomerWithAppsScript("createCustomer", currentCustomerProfile);
        }

        // Cache locally & populate UI
        try {
            localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentCustomerProfile));
        } catch (e) {}

        populateProfileIntoCheckoutForm(currentCustomerProfile);
        updateProfileViewUI(currentCustomerProfile);
    } catch (e) {
        console.warn("Firestore profile load notice:", e);
    }
}

async function saveCustomerProfileToFirestore(fields) {
    if (!currentUser || !firestoreDb) {
        // Guest cache
        const updated = {
            ...(currentCustomerProfile || {}),
            ...fields,
            profileUpdatedAt: new Date().toISOString()
        };
        currentCustomerProfile = updated;
        try {
            localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(updated));
        } catch (e) {}
        populateProfileIntoCheckoutForm(updated);
        updateProfileViewUI(updated);
        return;
    }

    const docRef = firestoreDb.collection("customers").doc(currentUser.uid);
    const updated = {
        ...(currentCustomerProfile || {}),
        ...fields,
        firebaseUid: currentUser.uid,
        email: currentUser.email,
        profileUpdatedAt: new Date().toISOString()
    };

    await docRef.set(updated, { merge: true });
    currentCustomerProfile = updated;

    try {
        localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(updated));
    } catch (e) {}

    // Synchronize with Google Sheet via Apps Script updateCustomerProfile
    syncCustomerWithAppsScript("updateCustomerProfile", updated);

    populateProfileIntoCheckoutForm(updated);
    updateProfileViewUI(updated);
}

// Call Google Apps Script API to synchronize Customers & Profile Updates sheets
async function syncCustomerWithAppsScript(action, profileObj) {
    if (!profileObj) return;
    try {
        const uid = profileObj.firebaseUID || profileObj.firebaseUid || (currentUser ? currentUser.uid : "");
        const cid = profileObj.customerId || "";
        const mob = profileObj.mobile || profileObj.mobileNumber || "";
        const email = profileObj.email || (currentUser ? currentUser.email : "");
        const name = profileObj.name || (currentUser ? currentUser.displayName : "");

        const payload = {
            action: action, // "createCustomer" or "updateCustomerProfile"
            // Support both uppercase and camelCase for Firebase UID & Customer ID
            firebaseUID: uid,
            firebaseUid: uid,
            customerId: cid,
            email: email,
            name: name,
            // Support both mobile and mobileNumber
            mobile: mob,
            mobileNumber: mob,
            alternateNumber: profileObj.alternateNumber || "",
            profilePhotoURL: profileObj.profilePhotoURL || profileObj.profilePhotoUrl || "",
            profilePhotoUrl: profileObj.profilePhotoURL || profileObj.profilePhotoUrl || "",
            fullAddress: profileObj.fullAddress || "",
            villageArea: profileObj.villageArea || "",
            city: profileObj.city || "",
            district: profileObj.district || "",
            state: profileObj.state || "Rajasthan",
            pinCode: profileObj.pinCode || profileObj.pincode || "",
            pincode: profileObj.pinCode || profileObj.pincode || "",
            updatedBy: "CUSTOMER",
            updateReason: "Profile updated via web"
        };

        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        try {
            const data = JSON.parse(text);
            if (data.success && data.customer) {
                // If backend assigned or updated customerId, update local state
                if (data.customer.customerId && (!currentCustomerProfile || !currentCustomerProfile.customerId || currentCustomerProfile.customerId === "GUEST")) {
                    currentCustomerProfile = { ...(currentCustomerProfile || {}), customerId: data.customer.customerId };
                    try { localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentCustomerProfile)); } catch (e) {}
                    updateProfileViewUI(currentCustomerProfile);
                }
            }
        } catch (e) {}
    } catch (err) {
        console.warn("Apps Script customer sync note:", err);
    }
}

function loadCachedProfile() {
    try {
        const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
        if (raw) {
            const prof = JSON.parse(raw);
            currentCustomerProfile = prof;
            populateProfileIntoCheckoutForm(prof);
            updateProfileViewUI(prof);
        }
    } catch (e) {}
}

function populateProfileIntoCheckoutForm(prof) {
    if (!prof) return;
    if (prof.name) document.getElementById("custName").value = prof.name;
    if (prof.mobileNumber) document.getElementById("custMobile").value = prof.mobileNumber;
    if (prof.alternateNumber) document.getElementById("custAltMobile").value = prof.alternateNumber;
    if (prof.fullAddress) document.getElementById("custAddress").value = prof.fullAddress;
    if (prof.villageArea) document.getElementById("custVillage").value = prof.villageArea;
    if (prof.city) document.getElementById("custCity").value = prof.city;
    if (prof.district) document.getElementById("custDistrict").value = prof.district;
    if (prof.state) document.getElementById("custState").value = prof.state;
    if (prof.pinCode) document.getElementById("custPincode").value = prof.pinCode;

    validateOrderForm();
}

function updateProfileViewUI(prof) {
    const avatarLetter = document.getElementById("profileAvatarLetter");
    const greeting = document.getElementById("profileGreeting");
    const cidBadge = document.getElementById("profileCustIdBadge");
    const emailBadge = document.getElementById("profileEmailBadge");
    const authPrompt = document.getElementById("profileAuthPrompt");

    const mobDisplay = document.getElementById("profileMobileDisplay");
    const emailDisplay = document.getElementById("profileEmailDisplay");
    const addrDisplay = document.getElementById("profileAddressDisplay");

    const mobCount = document.getElementById("profileMobileChangeCount");
    const emailCount = document.getElementById("profileEmailChangeCount");

    if (!prof || !currentUser) {
        if (authPrompt) authPrompt.classList.remove("hidden");
        if (greeting) greeting.textContent = "Customer Profile";
        if (avatarLetter) avatarLetter.textContent = "R";
        if (cidBadge) cidBadge.textContent = "Customer ID: GUEST";
        if (emailBadge) emailBadge.textContent = "guest@rajvaari.in";
        if (mobDisplay) mobDisplay.textContent = "Not added";
        if (emailDisplay) emailDisplay.textContent = "guest@rajvaari.in";
        if (addrDisplay) addrDisplay.textContent = "No address saved";
        return;
    }

    if (authPrompt) authPrompt.classList.add("hidden");
    const name = prof.name || (prof.email ? prof.email.split("@")[0] : "Customer");
    if (greeting) greeting.textContent = name;
    if (avatarLetter) avatarLetter.textContent = (name[0] || "R").toUpperCase();
    if (cidBadge) cidBadge.textContent = `Customer ID: ${prof.customerId || "CUST-000000"}`;
    if (emailBadge) emailBadge.textContent = prof.email || "No email";

    if (mobDisplay) mobDisplay.textContent = prof.mobileNumber || "Not added";
    if (emailDisplay) emailDisplay.textContent = prof.email || "Not added";

    let fullAddrStr = [prof.fullAddress, prof.villageArea, prof.city, prof.district, prof.state, prof.pinCode].filter(Boolean).join(", ");
    if (addrDisplay) addrDisplay.textContent = fullAddrStr || "No address saved";

    if (mobCount) mobCount.textContent = `${prof.mobileChangeCount || 0} changes`;
    if (emailCount) emailCount.textContent = `${prof.emailChangeCount || 0} changes`;

    // Populate editable inputs in collapsible
    if (document.getElementById("profName")) document.getElementById("profName").value = prof.name || "";
    if (document.getElementById("profEmail")) document.getElementById("profEmail").value = prof.email || "";
    if (document.getElementById("profMobile")) document.getElementById("profMobile").value = prof.mobileNumber || "";
    if (document.getElementById("profAltMobile")) document.getElementById("profAltMobile").value = prof.alternateNumber || "";
    if (document.getElementById("profAddress")) document.getElementById("profAddress").value = prof.fullAddress || "";
    if (document.getElementById("profVillage")) document.getElementById("profVillage").value = prof.villageArea || "";
    if (document.getElementById("profCity")) document.getElementById("profCity").value = prof.city || "";
    if (document.getElementById("profDistrict")) document.getElementById("profDistrict").value = prof.district || "";
    if (document.getElementById("profState")) document.getElementById("profState").value = prof.state || "Rajasthan";
    if (document.getElementById("profPincode")) document.getElementById("profPincode").value = prof.pinCode || "";
}

// ============================================================================
// 12. AUTHENTICATION MODAL (Email & Password Firebase Auth)
// ============================================================================
function setupAuthModal() {
    const modal = document.getElementById("authModal");
    const btnClose = document.getElementById("btnAuthClose");
    const btnTabSignIn = document.getElementById("btnTabSignIn");
    const btnTabSignUp = document.getElementById("btnTabSignUp");
    const signInForm = document.getElementById("signInForm");
    const signUpForm = document.getElementById("signUpForm");

    btnClose?.addEventListener("click", () => modal.classList.add("hidden"));
    modal?.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.add("hidden");
    });

    btnTabSignIn?.addEventListener("click", () => {
        btnTabSignIn.classList.add("active");
        btnTabSignUp.classList.remove("active");
        signInForm.classList.remove("hidden");
        signUpForm.classList.add("hidden");
    });

    btnTabSignUp?.addEventListener("click", () => {
        btnTabSignUp.classList.add("active");
        btnTabSignIn.classList.remove("active");
        signUpForm.classList.remove("hidden");
        signInForm.classList.add("hidden");
    });

    // Sign In Submit
    document.getElementById("btnSubmitSignIn")?.addEventListener("click", async () => {
        const email = document.getElementById("authLoginEmail").value.trim();
        const pass = document.getElementById("authLoginPass").value;
        const errBox = document.getElementById("authLoginError");
        const spinner = document.getElementById("loginSpinner");
        const btnText = document.getElementById("loginBtnText");
        const btn = document.getElementById("btnSubmitSignIn");

        if (!email || !pass) {
            showAuthError(errBox, "Please enter your email and password.");
            return;
        }

        btn.disabled = true;
        if (spinner) spinner.classList.remove("hidden");
        if (btnText) btnText.textContent = "Signing In...";
        hideAuthError(errBox);

        try {
            await firebaseAuth.signInWithEmailAndPassword(email, pass);
            modal.classList.add("hidden");
            showToast("✓ Signed in successfully!");
        } catch (err) {
            let msg = "Invalid email or password.";
            if (err.code === "auth/user-not-found") msg = "No account found with this email.";
            if (err.code === "auth/wrong-password") msg = "Incorrect password.";
            showAuthError(errBox, msg);
        } finally {
            btn.disabled = false;
            if (spinner) spinner.classList.add("hidden");
            if (btnText) btnText.textContent = "Sign In";
        }
    });

    // Create Account Submit
    document.getElementById("btnSubmitSignUp")?.addEventListener("click", async () => {
        const name = document.getElementById("authRegisterName").value.trim();
        const email = document.getElementById("authRegisterEmail").value.trim();
        const mobile = document.getElementById("authRegisterMobile").value.trim();
        const pass = document.getElementById("authRegisterPass").value;
        const errBox = document.getElementById("authRegisterError");
        const spinner = document.getElementById("registerSpinner");
        const btnText = document.getElementById("registerBtnText");
        const btn = document.getElementById("btnSubmitSignUp");

        if (!name || !email || !mobile || !pass) {
            showAuthError(errBox, "Please fill all fields.");
            return;
        }

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            showAuthError(errBox, "Mobile number must be 10 digits.");
            return;
        }

        if (pass.length < 6) {
            showAuthError(errBox, "Password must be at least 6 characters.");
            return;
        }

        btn.disabled = true;
        if (spinner) spinner.classList.remove("hidden");
        if (btnText) btnText.textContent = "Creating Account...";
        hideAuthError(errBox);

        try {
            const cred = await firebaseAuth.createUserWithEmailAndPassword(email, pass);
            await cred.user.updateProfile({ displayName: name });

            const generatedCustId = "CUST-" + Math.floor(100000 + Math.random() * 900000);
            const prof = {
                customerId: generatedCustId,
                firebaseUid: cred.user.uid,
                email: email,
                name: name,
                mobileNumber: mobile,
                alternateNumber: "",
                fullAddress: "",
                villageArea: "",
                city: "",
                district: "",
                state: "Rajasthan",
                pinCode: "",
                mobileChangeCount: 0,
                emailChangeCount: 0,
                photoChangeCount: 0,
                profileCreatedAt: new Date().toISOString(),
                profileUpdatedAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                profileStatus: "ACTIVE"
            };

            if (firestoreDb) {
                await firestoreDb.collection("customers").doc(cred.user.uid).set(prof);
            }

            // Sync with Google Sheet Customers row
            syncCustomerWithAppsScript("createCustomer", prof);

            modal.classList.add("hidden");
            showToast("✓ Account created successfully!");
        } catch (err) {
            let msg = err.message || "Failed to create account.";
            if (err.code === "auth/email-already-in-use") msg = "This email is already registered.";
            showAuthError(errBox, msg);
        } finally {
            btn.disabled = false;
            if (spinner) spinner.classList.add("hidden");
            if (btnText) btnText.textContent = "Create Account";
        }
    });
}

function openAuthModal(tab = "signin") {
    const modal = document.getElementById("authModal");
    if (!modal) return;
    if (tab === "signin") {
        document.getElementById("btnTabSignIn")?.click();
    } else {
        document.getElementById("btnTabSignUp")?.click();
    }
    modal.classList.remove("hidden");
}

function showAuthError(box, msg) {
    if (!box) return;
    box.textContent = msg;
    box.classList.remove("hidden");
}

function hideAuthError(box) {
    if (!box) return;
    box.textContent = "";
    box.classList.add("hidden");
}

// ============================================================================
// 13. FLOATING TOAST NOTIFICATION UTILITY
// ============================================================================
let toastTimer = null;
function showToast(msg) {
    const box = document.getElementById("toastBox");
    if (!box) return;
    box.textContent = msg;
    box.classList.remove("hidden");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        box.classList.add("hidden");
    }, 4000);
}
