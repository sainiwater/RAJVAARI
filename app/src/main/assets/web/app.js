/**
 * ============================================================================
 * RAJVAARI PACKAGED DRINKING WATER - CORE APPLICATION JAVASCRIPT
 * Brand: RAJVAARI | शुद्ध पानी, भरोसे के साथ
 * Products: 1 Liter (₹20), 200ml (₹10) ONLY
 * Backend: Google Apps Script Web App (Spreadsheet: RAJVAARI WATER ORDERS)
 * Auth & Profile: Firebase Auth (Email/Pass) & Firestore (customers/{uid})
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================

// Apps Script Web App API URL (Required by User)
const API_URL = "https://script.google.com/macros/s/AKfycbzqB8l4lH4qd4yJpLzzFOPtW5Ie5bf7GXr7H19S92IitUsOVrTr4uE7GdOlwDQPNxrP/exec";

// Firebase Web Configuration (Provided by User)
const firebaseConfig = {
    apiKey: "AIzaSyDNe055MybU-18pIeqbqiKVX9MHo_8w0w0",
    authDomain: "rajvaari.firebaseapp.com",
    projectId: "rajvaari",
    storageBucket: "rajvaari.firebasestorage.app",
    messagingSenderId: "915835474939",
    appId: "1:915835474939:web:1885189f6faa46b6ecf15e",
    measurementId: "G-7T62ZQ4PX7"
};

// EXACT 2 PRODUCTS ONLY
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

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================
let firebaseAuth = null;
let firestoreDb = null;
let currentUser = null;
let currentCustomerProfile = null;

// Currently selected checkout product (Default: 1 Liter)
let activeProduct = PRODUCTS["1L"];
let activeQuantity = 1;

// Last created order
let activeCreatedOrder = null;

// Is currently submitting order?
let isSubmittingOrder = false;

// Local storage key for fallback / guest caching
const STORAGE_ORDERS_KEY = "rajvaari_customer_orders_v2";
const STORAGE_PROFILE_KEY = "rajvaari_saved_profile_v2";

// ============================================================================
// 3. INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    initFirebase();
    setupNavigation();
    setupProductCards();
    setupCheckoutFormValidation();
    setupQuantitySteppers();
    setupPaymentActions();
    setupAuthModal();
    setupProfileForm();
    setupOrdersView();
    loadCachedProfile();
    renderOrdersList();

    // Default populate 1 Liter product into summary
    updateCheckoutSummary();
    validateOrderForm();
});

// ============================================================================
// 4. FIREBASE INITIALIZATION & AUTH STATE
// ============================================================================
function initFirebase() {
    try {
        if (typeof firebase !== "undefined" && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            firebaseAuth = firebase.auth();
            firestoreDb = firebase.firestore();

            // Set persistence to LOCAL
            firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(e => console.warn(e));

            // Auth state observer
            firebaseAuth.onAuthStateChanged(async (user) => {
                currentUser = user;
                if (user) {
                    onUserSignedIn(user);
                } else {
                    onUserSignedOut();
                }
            });
        } else if (typeof firebase !== "undefined" && firebase.apps.length) {
            firebaseAuth = firebase.auth();
            firestoreDb = firebase.firestore();
        }
    } catch (err) {
        console.warn("Firebase initialization notice:", err);
    }
}

async function onUserSignedIn(user) {
    const accountNameLabel = document.getElementById("accountNameLabel");
    const accountAvatarIcon = document.getElementById("accountAvatarIcon");
    const checkoutUserText = document.getElementById("checkoutUserText");
    const bNavAccountLabel = document.getElementById("bNavAccountLabel");

    // Display Name or Email Prefix
    const displayName = user.displayName || user.email.split("@")[0];
    if (accountNameLabel) accountNameLabel.textContent = displayName;
    if (accountAvatarIcon) accountAvatarIcon.textContent = "✓";
    if (bNavAccountLabel) bNavAccountLabel.textContent = "Account";
    if (checkoutUserText) checkoutUserText.textContent = `Signed in as ${user.email}`;

    // Load customer profile from Firestore: customers/{user.uid}
    await loadCustomerProfileFromFirestore(user.uid, user.email);

    // Sync Firestore Orders for this customer
    await syncCustomerOrdersFromFirestore(user.uid);
}

function onUserSignedOut() {
    currentUser = null;
    currentCustomerProfile = null;

    const accountNameLabel = document.getElementById("accountNameLabel");
    const accountAvatarIcon = document.getElementById("accountAvatarIcon");
    const checkoutUserText = document.getElementById("checkoutUserText");
    const bNavAccountLabel = document.getElementById("bNavAccountLabel");

    if (accountNameLabel) accountNameLabel.textContent = "Login";
    if (accountAvatarIcon) accountAvatarIcon.textContent = "👤";
    if (bNavAccountLabel) bNavAccountLabel.textContent = "Login";
    if (checkoutUserText) checkoutUserText.textContent = "Guest Checkout (Login to save profile)";

    updateProfileViewUI(null);
    renderOrdersList();
}

// ============================================================================
// 5. FIRESTORE PROFILE MANAGEMENT: customers/{firebaseUid}
// ============================================================================
async function loadCustomerProfileFromFirestore(uid, email) {
    if (!firestoreDb) return;

    try {
        const docRef = firestoreDb.collection("customers").doc(uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            currentCustomerProfile = docSnap.data();
            // Update lastLoginAt
            docRef.update({ lastLoginAt: new Date().toISOString() }).catch(() => {});
        } else {
            // New user: Create initial customer profile
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
                profileCreatedAt: new Date().toISOString(),
                profileUpdatedAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                profileStatus: "ACTIVE"
            };

            await docRef.set(currentCustomerProfile);
            showToast("Welcome! Please complete your delivery profile.");
        }

        // Cache locally
        try {
            localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentCustomerProfile));
        } catch (e) {}

        // Apply profile to UI & checkout form
        populateProfileIntoCheckoutForm(currentCustomerProfile);
        updateProfileViewUI(currentCustomerProfile);
    } catch (err) {
        console.error("Firestore customer profile fetch error:", err);
    }
}

function populateProfileIntoCheckoutForm(prof) {
    if (!prof) return;

    const setIfAvailable = (id, val) => {
        const el = document.getElementById(id);
        if (el && val && !el.value.trim()) {
            el.value = val;
        }
    };

    setIfAvailable("custName", prof.name);
    setIfAvailable("custMobile", prof.mobileNumber);
    setIfAvailable("custAltMobile", prof.alternateNumber);
    setIfAvailable("custAddress", prof.fullAddress);
    setIfAvailable("custVillage", prof.villageArea);
    setIfAvailable("custCity", prof.city);
    setIfAvailable("custDistrict", prof.district);
    setIfAvailable("custState", prof.state || "Rajasthan");
    setIfAvailable("custPincode", prof.pinCode);

    validateOrderForm();
}

function updateProfileViewUI(prof) {
    const greeting = document.getElementById("profileGreeting");
    const cidBadge = document.getElementById("profileCustIdBadge");
    const emailBadge = document.getElementById("profileEmailBadge");
    const avatarLetter = document.getElementById("profileAvatarLetter");
    const authPrompt = document.getElementById("profileAuthPrompt");

    if (prof) {
        if (authPrompt) authPrompt.classList.add("hidden");
        if (greeting) greeting.textContent = `Hi, ${prof.name || "Customer"}`;
        if (cidBadge) cidBadge.textContent = `Customer ID: ${prof.customerId || "N/A"}`;
        if (emailBadge) emailBadge.textContent = prof.email || "";
        if (avatarLetter) avatarLetter.textContent = (prof.name ? prof.name.charAt(0).toUpperCase() : "R");

        document.getElementById("profName").value = prof.name || "";
        document.getElementById("profEmail").value = prof.email || "";
        document.getElementById("profMobile").value = prof.mobileNumber || "";
        document.getElementById("profAltMobile").value = prof.alternateNumber || "";
        document.getElementById("profAddress").value = prof.fullAddress || "";
        document.getElementById("profVillage").value = prof.villageArea || "";
        document.getElementById("profCity").value = prof.city || "";
        document.getElementById("profDistrict").value = prof.district || "";
        document.getElementById("profState").value = prof.state || "Rajasthan";
        document.getElementById("profPincode").value = prof.pinCode || "";
    } else {
        if (authPrompt) authPrompt.classList.remove("hidden");
        if (greeting) greeting.textContent = "Hi, Guest";
        if (cidBadge) cidBadge.textContent = "Customer ID: Guest";
        if (emailBadge) emailBadge.textContent = "Not logged in";
        if (avatarLetter) avatarLetter.textContent = "👤";
    }
}

function loadCachedProfile() {
    try {
        const cached = localStorage.getItem(STORAGE_PROFILE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            populateProfileIntoCheckoutForm(data);
            updateProfileViewUI(data);
        }
    } catch (e) {}
}

// ============================================================================
// 6. SPA VIEW NAVIGATION (Tabs / Screens)
// ============================================================================
function setupNavigation() {
    const navTabs = document.querySelectorAll(".nav-tab");
    const bottomNavItems = document.querySelectorAll(".bottom-nav-item");

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

    navTabs.forEach(tab => {
        tab.addEventListener("click", () => switchView(tab.dataset.target));
    });

    bottomNavItems.forEach(bItem => {
        if (bItem.dataset.target) {
            bItem.addEventListener("click", () => switchView(bItem.dataset.target));
        }
    });

    // Brand link clicks -> Home View
    document.getElementById("navBrandBtn")?.addEventListener("click", () => switchView("homeView"));

    // Quick Order Now header button
    document.getElementById("btnHeaderOrderNow")?.addEventListener("click", () => {
        switchView("homeView");
        document.getElementById("orderSection")?.scrollIntoView({ behavior: "smooth" });
    });

    // Hero buttons
    document.getElementById("btnHeroOrder")?.addEventListener("click", () => {
        document.getElementById("productsSection")?.scrollIntoView({ behavior: "smooth" });
    });

    document.getElementById("btnHeroViewOrders")?.addEventListener("click", () => {
        switchView("ordersView");
    });

    // Empty orders go to shop
    document.getElementById("btnEmptyGoShop")?.addEventListener("click", () => {
        switchView("homeView");
        document.getElementById("productsSection")?.scrollIntoView({ behavior: "smooth" });
    });

    // Account pill click -> Profile or Auth Modal
    document.getElementById("btnAccountToggle")?.addEventListener("click", () => {
        if (currentUser) {
            switchView("profileView");
        } else {
            openAuthModal("signin");
        }
    });

    document.getElementById("bNavAccount")?.addEventListener("click", () => {
        if (currentUser) {
            switchView("profileView");
        } else {
            openAuthModal("signin");
        }
    });

    document.getElementById("btnProfileLoginPrompt")?.addEventListener("click", () => {
        openAuthModal("signin");
    });
}

// ============================================================================
// 7. PRODUCT SELECTION & CARD STEPPERS
// ============================================================================
function setupProductCards() {
    // Card 1: 1 Liter Stepper
    const qty1L = document.getElementById("qtyCard1L");
    document.getElementById("btnMinusCard1L")?.addEventListener("click", () => {
        let v = parseInt(qty1L.value, 10) || 1;
        if (v > 1) qty1L.value = v - 1;
    });
    document.getElementById("btnPlusCard1L")?.addEventListener("click", () => {
        let v = parseInt(qty1L.value, 10) || 1;
        qty1L.value = v + 1;
    });

    // Card 2: 200ml Stepper
    const qty200ml = document.getElementById("qtyCard200ml");
    document.getElementById("btnMinusCard200ml")?.addEventListener("click", () => {
        let v = parseInt(qty200ml.value, 10) || 1;
        if (v > 1) qty200ml.value = v - 1;
    });
    document.getElementById("btnPlusCard200ml")?.addEventListener("click", () => {
        let v = parseInt(qty200ml.value, 10) || 1;
        qty200ml.value = v + 1;
    });

    // ORDER NOW Click on Card 1 (1 Liter)
    document.getElementById("btnOrder1L")?.addEventListener("click", () => {
        const q = parseInt(qty1L.value, 10) || 1;
        selectProductAndOpenCheckout(PRODUCTS["1L"], q);
    });

    // ORDER NOW Click on Card 2 (200ml)
    document.getElementById("btnOrder200ml")?.addEventListener("click", () => {
        const q = parseInt(qty200ml.value, 10) || 1;
        selectProductAndOpenCheckout(PRODUCTS["200ml"], q);
    });
}

function selectProductAndOpenCheckout(prod, qty) {
    activeProduct = prod;
    activeQuantity = Math.max(1, qty || 1);

    // Sync input in checkout summary
    const inputCheckoutQty = document.getElementById("inputCheckoutQty");
    if (inputCheckoutQty) inputCheckoutQty.value = activeQuantity;

    // Update Checkout Summary & Calculations
    updateCheckoutSummary();

    // Smooth scroll to order form
    const orderSec = document.getElementById("orderSection");
    if (orderSec) {
        orderSec.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Focus name field if empty
    const custName = document.getElementById("custName");
    if (custName && !custName.value.trim()) {
        setTimeout(() => custName.focus(), 400);
    }

    validateOrderForm();
}

function setupQuantitySteppers() {
    const inputCheckoutQty = document.getElementById("inputCheckoutQty");

    document.getElementById("btnMinusCheckout")?.addEventListener("click", () => {
        let q = parseInt(inputCheckoutQty.value, 10) || 1;
        if (q > 1) {
            activeQuantity = q - 1;
            inputCheckoutQty.value = activeQuantity;
            updateCheckoutSummary();
            validateOrderForm();
        }
    });

    document.getElementById("btnPlusCheckout")?.addEventListener("click", () => {
        let q = parseInt(inputCheckoutQty.value, 10) || 1;
        activeQuantity = q + 1;
        inputCheckoutQty.value = activeQuantity;
        updateCheckoutSummary();
        validateOrderForm();
    });

    inputCheckoutQty?.addEventListener("input", () => {
        let q = parseInt(inputCheckoutQty.value, 10);
        if (isNaN(q) || q < 1) q = 1;
        activeQuantity = q;
        updateCheckoutSummary();
        validateOrderForm();
    });
}

function updateCheckoutSummary() {
    const dispBottleSize = document.getElementById("dispBottleSize");
    const dispPricePerBottle = document.getElementById("dispPricePerBottle");
    const sumPricePerBottle = document.getElementById("sumPricePerBottle");
    const sumQuantity = document.getElementById("sumQuantity");
    const sumSubtotal = document.getElementById("sumSubtotal");
    const sumTotalOrderAmount = document.getElementById("sumTotalOrderAmount");
    const btnPlaceOrderText = document.getElementById("btnPlaceOrderText");

    const price = activeProduct.price;
    const subtotal = price * activeQuantity;
    const delivery = 0;
    const discount = 0;
    const total = subtotal + delivery - discount;

    if (dispBottleSize) dispBottleSize.textContent = activeProduct.bottleSize;
    if (dispPricePerBottle) dispPricePerBottle.textContent = `₹${price}`;
    if (sumPricePerBottle) sumPricePerBottle.textContent = `₹${price}`;
    if (sumQuantity) sumQuantity.textContent = activeQuantity;
    if (sumSubtotal) sumSubtotal.textContent = `₹${subtotal}`;
    if (sumTotalOrderAmount) sumTotalOrderAmount.textContent = `₹${total}`;
    if (btnPlaceOrderText) btnPlaceOrderText.textContent = `PLACE ORDER (₹${total}) →`;
}

// ============================================================================
// 8. ORDER FORM STRICT VALIDATION
// ============================================================================
function setupCheckoutFormValidation() {
    const fieldsToValidate = [
        "custName",
        "custMobile",
        "custAltMobile",
        "custAddress",
        "custVillage",
        "custCity",
        "custDistrict",
        "custState",
        "custPincode"
    ];

    fieldsToValidate.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (!el) return;

        el.addEventListener("input", () => {
            validateSingleField(fieldId);
            validateOrderForm();
        });

        el.addEventListener("blur", () => {
            validateSingleField(fieldId, true);
            validateOrderForm();
        });
    });

    // Place Order Button click
    document.getElementById("btnPlaceOrder")?.addEventListener("click", handlePlaceOrder);
}

function validateSingleField(fieldId, showErrors = false) {
    const el = document.getElementById(fieldId);
    if (!el) return false;

    const val = el.value.trim();
    const group = el.closest(".form-group");
    let isValid = true;
    let customError = "";

    switch (fieldId) {
        case "custName":
            // Text only, min 2 chars, letters & spaces only
            if (!val) {
                isValid = false;
                customError = "Please enter your name";
            } else if (val.length < 2) {
                isValid = false;
                customError = "Name must be at least 2 characters";
            } else if (!/^[a-zA-Z\s]{2,50}$/.test(val)) {
                isValid = false;
                customError = "Please enter valid letters only";
            }
            break;

        case "custMobile":
            // Exactly 10 digits Indian mobile
            if (!val) {
                isValid = false;
                customError = "Please enter your mobile number";
            } else if (!/^[6-9]\d{9}$/.test(val)) {
                isValid = false;
                customError = "Mobile number must be 10 digits";
            }
            break;

        case "custAltMobile":
            // Optional; if entered must be 10 digits
            if (val && !/^[6-9]\d{9}$/.test(val)) {
                isValid = false;
                customError = "Alternate number must be 10 digits";
            }
            break;

        case "custAddress":
            if (!val) {
                isValid = false;
                customError = "Please enter your full address";
            } else if (val.length < 5) {
                isValid = false;
                customError = "Address must be at least 5 characters";
            }
            break;

        case "custVillage":
            if (!val) {
                isValid = false;
                customError = "Please enter village / area";
            }
            break;

        case "custCity":
            if (!val) {
                isValid = false;
                customError = "Please enter city";
            }
            break;

        case "custDistrict":
            if (!val) {
                isValid = false;
                customError = "Please enter district";
            }
            break;

        case "custState":
            if (!val) {
                isValid = false;
                customError = "Please enter state";
            }
            break;

        case "custPincode":
            if (!val) {
                isValid = false;
                customError = "Please enter PIN code";
            } else if (!/^\d{6}$/.test(val)) {
                isValid = false;
                customError = "PIN code must be 6 digits";
            }
            break;
    }

    if (group) {
        const errEl = group.querySelector(".field-error-msg");
        if (errEl && customError) errEl.textContent = customError;

        if (!isValid && showErrors) {
            group.classList.add("has-error");
            el.classList.add("is-invalid");
        } else if (isValid) {
            group.classList.remove("has-error");
            el.classList.remove("is-invalid");
        }
    }

    return isValid;
}

function validateOrderForm() {
    const custName = document.getElementById("custName")?.value.trim() || "";
    const custMobile = document.getElementById("custMobile")?.value.trim() || "";
    const custAltMobile = document.getElementById("custAltMobile")?.value.trim() || "";
    const custAddress = document.getElementById("custAddress")?.value.trim() || "";
    const custVillage = document.getElementById("custVillage")?.value.trim() || "";
    const custCity = document.getElementById("custCity")?.value.trim() || "";
    const custDistrict = document.getElementById("custDistrict")?.value.trim() || "";
    const custState = document.getElementById("custState")?.value.trim() || "";
    const custPincode = document.getElementById("custPincode")?.value.trim() || "";

    const isNameValid = /^[a-zA-Z\s]{2,50}$/.test(custName);
    const isMobileValid = /^[6-9]\d{9}$/.test(custMobile);
    const isAltValid = !custAltMobile || /^[6-9]\d{9}$/.test(custAltMobile);
    const isAddressValid = custAddress.length >= 5;
    const isVillageValid = custVillage.length >= 2;
    const isCityValid = custCity.length >= 2;
    const isDistrictValid = custDistrict.length >= 2;
    const isStateValid = custState.length >= 2;
    const isPinValid = /^\d{6}$/.test(custPincode);
    const isQtyValid = Number.isInteger(activeQuantity) && activeQuantity >= 1;

    const allValid = isNameValid &&
                     isMobileValid &&
                     isAltValid &&
                     isAddressValid &&
                     isVillageValid &&
                     isCityValid &&
                     isDistrictValid &&
                     isStateValid &&
                     isPinValid &&
                     isQtyValid;

    const btnPlaceOrder = document.getElementById("btnPlaceOrder");
    const validationNotice = document.getElementById("validationNotice");

    if (btnPlaceOrder) {
        btnPlaceOrder.disabled = !allValid || isSubmittingOrder;
    }

    if (validationNotice) {
        if (allValid) {
            validationNotice.textContent = "✓ All delivery details verified. Ready to place order!";
            validationNotice.classList.add("all-valid");
        } else {
            validationNotice.textContent = "⚠️ Please complete all required fields above to enable order submission.";
            validationNotice.classList.remove("all-valid");
        }
    }

    return allValid;
}

// ============================================================================
// 9. ORDER CREATION VIA GOOGLE APPS SCRIPT API (Exact 31 Columns Structure)
// ============================================================================
async function handlePlaceOrder() {
    if (isSubmittingOrder) return;

    // Run full validation check
    const isValid = validateOrderForm();
    if (!isValid) {
        // Trigger error UI on all invalid fields
        [
            "custName", "custMobile", "custAltMobile", "custAddress",
            "custVillage", "custCity", "custDistrict", "custState", "custPincode"
        ].forEach(f => validateSingleField(f, true));
        showToast("Please fill all required fields correctly.");
        return;
    }

    isSubmittingOrder = true;
    const btnPlaceOrder = document.getElementById("btnPlaceOrder");
    const orderSpinner = document.getElementById("orderSpinner");
    const btnPlaceOrderText = document.getElementById("btnPlaceOrderText");

    btnPlaceOrder.disabled = true;
    if (orderSpinner) orderSpinner.classList.remove("hidden");
    if (btnPlaceOrderText) btnPlaceOrderText.textContent = "Creating Order...";

    // Gather Order Values
    const custName = document.getElementById("custName").value.trim();
    const custMobile = document.getElementById("custMobile").value.trim();
    const custAltMobile = document.getElementById("custAltMobile")?.value.trim() || "";
    const custAddress = document.getElementById("custAddress").value.trim();
    const custVillage = document.getElementById("custVillage").value.trim();
    const custCity = document.getElementById("custCity").value.trim();
    const custDistrict = document.getElementById("custDistrict").value.trim();
    const custState = document.getElementById("custState").value.trim();
    const custPincode = document.getElementById("custPincode").value.trim();
    const custMessage = document.getElementById("custMessage")?.value.trim() || "";

    const price = activeProduct.price;
    const subtotal = price * activeQuantity;
    const totalOrderAmount = subtotal;

    const firebaseUid = currentUser ? currentUser.uid : "";
    const customerId = (currentCustomerProfile && currentCustomerProfile.customerId) ? currentCustomerProfile.customerId : "GUEST";

    // PAYLOAD WITH EXACT FIELDS EXPECTED BY APPS SCRIPT & GOOGLE SHEET
    const payload = {
        action: "createOrder",
        customerName: custName,
        mobile: custMobile,
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
        deliveryCharge: 0,
        discount: 0,
        totalOrderAmount: totalOrderAmount,
        notes: custMessage,
        customerMessage: custMessage,
        firebaseUid: firebaseUid,
        customerId: customerId
    };

    try {
        // Send JSON using POST to Apps Script URL with text/plain to avoid preflight issues
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
            console.error("Invalid JSON from API:", textResponse);
            throw new Error("Invalid response received from RAJVAARI API");
        }

        if (!result.success || !result.orderId) {
            throw new Error(result.error || result.message || "Unable to create order. Please try again.");
        }

        // Order successfully created!
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
            totalOrderAmount: totalOrderAmount,
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

        // Save order in Firestore & Local Storage
        await saveOrderRecord(activeCreatedOrder);

        // Also update / save customer profile if logged in
        if (currentUser && firestoreDb) {
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

        // Reveal Payment Section
        revealPaymentSection(activeCreatedOrder);
        showToast("✓ Order received and saved to Google Sheet!");
    } catch (err) {
        console.error("Order creation failed:", err);
        showToast(err.message || "Unable to create order. Please try again.");
    } finally {
        isSubmittingOrder = false;
        btnPlaceOrder.disabled = false;
        if (orderSpinner) orderSpinner.classList.add("hidden");
        updateCheckoutSummary();
    }
}

// ============================================================================
// 10. REVEAL PAYMENT SECTION (₹1 PhonePe QR)
// ============================================================================
function revealPaymentSection(order) {
    const paymentSection = document.getElementById("paymentSection");
    const orderSection = document.getElementById("orderSection");
    const heroSection = document.getElementById("heroSection");
    const productsSection = document.getElementById("productsSection");

    if (heroSection) heroSection.classList.add("hidden");
    if (productsSection) productsSection.classList.add("hidden");
    if (orderSection) orderSection.classList.add("hidden");
    if (paymentSection) paymentSection.classList.remove("hidden");

    // Populate order ID
    const dispCreatedOrderId = document.getElementById("dispCreatedOrderId");
    if (dispCreatedOrderId) dispCreatedOrderId.textContent = order.orderId;

    // Reset UTR form
    const utrInput = document.getElementById("utrInput");
    if (utrInput) utrInput.value = "";
    const utrFeedbackMsg = document.getElementById("utrFeedbackMsg");
    if (utrFeedbackMsg) utrFeedbackMsg.textContent = "";

    paymentSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupPaymentActions() {
    // Submit UTR
    document.getElementById("btnSubmitUtr")?.addEventListener("click", handleUtrSubmission);

    // Place another order
    document.getElementById("btnPlaceAnotherOrder")?.addEventListener("click", () => {
        resetToNewOrder();
    });

    // View in My Orders
    document.getElementById("btnViewMyOrdersFromPay")?.addEventListener("click", () => {
        document.getElementById("tabOrders")?.click();
    });
}

async function handleUtrSubmission() {
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
            feedback.textContent = "कृपया मान्य 12-अंकों का UTR / Transaction ID दर्ज करें।";
        }
        return;
    }

    btn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");
    if (btnText) btnText.textContent = "Submitting...";

    try {
        // Send submitPayment to Apps Script
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "submitPayment",
                orderId: activeCreatedOrder.orderId,
                paymentId: utrVal
            })
        });

        // Update local order
        activeCreatedOrder.paymentId = utrVal;
        await updateOrderInStorage(activeCreatedOrder);

        if (feedback) {
            feedback.style.color = "#059669";
            feedback.textContent = "Payment details submitted. Payment Status remains PENDING until admin verification in Google Sheet.";
        }
        showToast("Payment details submitted successfully!");
    } catch (err) {
        console.error("UTR submission error:", err);
        // Save locally anyway
        activeCreatedOrder.paymentId = utrVal;
        await updateOrderInStorage(activeCreatedOrder);
        if (feedback) {
            feedback.style.color = "#059669";
            feedback.textContent = "Payment ID recorded. Verification pending.";
        }
    } finally {
        btn.disabled = false;
        if (spinner) spinner.classList.add("hidden");
        if (btnText) btnText.textContent = "SUBMIT PAYMENT DETAILS";
    }
}

function resetToNewOrder() {
    document.getElementById("paymentSection")?.classList.add("hidden");
    document.getElementById("heroSection")?.classList.remove("hidden");
    document.getElementById("productsSection")?.classList.remove("hidden");
    document.getElementById("orderSection")?.classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================================
// 11. ORDERS MANAGEMENT (Firestore & Local Storage Sync)
// ============================================================================
async function saveOrderRecord(order) {
    // 1. Save in Local Storage
    const existingOrders = getStoredOrders();
    const updated = [order, ...existingOrders.filter(o => o.orderId !== order.orderId)];
    try {
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated));
    } catch (e) {}

    // 2. Save in Firestore if authenticated
    if (currentUser && firestoreDb) {
        try {
            await firestoreDb.collection("customers")
                .doc(currentUser.uid)
                .collection("orders")
                .doc(order.orderId)
                .set(order);
        } catch (fsErr) {
            console.warn("Firestore order save notice:", fsErr);
        }
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
            .get();

        const fsOrders = [];
        snapshot.forEach(doc => fsOrders.push(doc.data()));

        if (fsOrders.length > 0) {
            // Merge with local orders
            const localOrders = getStoredOrders();
            const map = new Map();
            fsOrders.forEach(o => map.set(o.orderId, o));
            localOrders.forEach(o => { if (!map.has(o.orderId)) map.set(o.orderId, o); });

            const merged = Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(merged));
            renderOrdersList();
        }
    } catch (err) {
        console.warn("Firestore orders sync error:", err);
    }
}

function setupOrdersView() {
    // Refresh button
    document.getElementById("btnRefreshOrders")?.addEventListener("click", async () => {
        const btn = document.getElementById("btnRefreshOrders");
        btn.textContent = "Refreshing...";
        await checkOrdersLatestStatus();
        btn.textContent = "🔄 Refresh Status";
    });

    // Order ID manual lookup
    document.getElementById("btnLookupOrder")?.addEventListener("click", async () => {
        const inp = document.getElementById("inputTrackOrderId");
        const orderId = inp?.value.trim().toUpperCase();
        const feedback = document.getElementById("lookupFeedback");
        const spinner = document.getElementById("lookupSpinner");

        if (!orderId) {
            if (feedback) {
                feedback.style.color = "#DC2626";
                feedback.textContent = "Please enter an Order ID";
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
                    feedback.textContent = `Order ${orderId} found! Status: ${data.order.orderStatus}`;
                }
                // Update local storage
                await updateOrderInStorage(data.order);
                openOrderDetailModal(data.order);
            } else {
                if (feedback) {
                    feedback.style.color = "#DC2626";
                    feedback.textContent = "Order ID not found in Google Sheet";
                }
            }
        } catch (err) {
            if (feedback) {
                feedback.style.color = "#DC2626";
                feedback.textContent = "Status check network error";
            }
        } finally {
            if (spinner) spinner.classList.add("hidden");
        }
    });

    // Close detail modal
    document.getElementById("btnOrderDetailClose")?.addEventListener("click", () => {
        document.getElementById("orderDetailModal")?.classList.add("hidden");
    });
}

function renderOrdersList() {
    const container = document.getElementById("ordersListContainer");
    const emptyCard = document.getElementById("emptyOrdersCard");
    const navBadge = document.getElementById("navOrdersBadge");

    if (!container) return;

    let orders = getStoredOrders();

    // If logged in, filter only this user's orders (if user has orders with matching uid or phone)
    if (currentUser) {
        orders = orders.filter(o => !o.firebaseUid || o.firebaseUid === currentUser.uid || (currentCustomerProfile && o.mobileNumber === currentCustomerProfile.mobileNumber));
    }

    if (navBadge) {
        if (orders.length > 0) {
            navBadge.textContent = orders.length;
            navBadge.classList.remove("hidden");
        } else {
            navBadge.classList.add("hidden");
        }
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
        const isPaid = (o.paymentStatus === "YES");
        if (isPaid && !hasVerifiedOrder) {
            hasVerifiedOrder = true;
            verifiedOrderId = o.orderId;
        }

        const dateStr = o.orderDate || (o.timestamp ? new Date(o.timestamp).toLocaleDateString("en-IN") : "");

        const payClass = (o.paymentStatus === "YES") ? "st-yes" : ((o.paymentStatus === "NO") ? "st-no" : "st-pending");
        const orderClass = (o.orderStatus === "CONFIRMED") ? "st-confirmed" : ((o.orderStatus === "CANCELLED") ? "st-cancelled" : "st-pending");
        const delivClass = (o.deliveryStatus === "DELIVERED") ? "st-delivered" : ((o.deliveryStatus === "OUT FOR DELIVERY") ? "st-outfordelivery" : ((o.deliveryStatus === "CANCELLED") ? "st-cancelled" : "st-processing"));

        return `
            <div class="order-history-card" onclick="window.rajvaariViewOrder('${o.orderId}')">
                <div class="order-card-header">
                    <span class="order-id-pill">📦 ${o.orderId}</span>
                    <span class="order-timestamp">${dateStr}</span>
                </div>

                <div class="order-card-body">
                    <div>
                        <div class="order-prod-title">RAJVAARI Drinking Water</div>
                        <div class="order-prod-meta">Bottle Size: <strong>${o.bottleSize}</strong> • Quantity: <strong>${o.quantity}</strong></div>
                    </div>
                    <div class="order-price-wrap">
                        <div class="order-total-num">₹${o.totalOrderAmount}</div>
                        <div style="font-size: 11.5px; color: #64748B;">Verification: ₹${o.paymentRequired || 1}</div>
                    </div>
                </div>

                <div class="order-status-badges-row">
                    <span class="badge-status ${payClass}">Payment: ${o.paymentStatus || "PENDING"}</span>
                    <span class="badge-status ${orderClass}">Order: ${o.orderStatus || "PENDING"}</span>
                    <span class="badge-status ${delivClass}">Delivery: ${o.deliveryStatus || "PROCESSING"}</span>
                </div>

                <div class="order-card-footer">
                    <span>Expected: <strong>${o.expectedDelivery || "Within 24 Hours"}</strong></span>
                    <button type="button" class="btn-view-details-inline">View Details →</button>
                </div>
            </div>
        `;
    }).join("");

    // Show verified alert banner if any order has Payment: YES
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

// Global hook for card click
window.rajvaariViewOrder = function(orderId) {
    const orders = getStoredOrders();
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
        openOrderDetailModal(order);
    }
};

function openOrderDetailModal(order) {
    const modal = document.getElementById("orderDetailModal");
    const content = document.getElementById("orderDetailContent");
    if (!modal || !content) return;

    const isPaid = (order.paymentStatus === "YES");

    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 18px;">
            <span style="font-size: 32px;">💧</span>
            <h3 style="font-family: var(--font-heading); font-size: 22px; font-weight: 800; color: var(--royal-deep);">${order.orderId}</h3>
            <p style="font-size: 13px; color: #64748B;">Order Date: ${order.orderDate || new Date().toLocaleDateString("en-IN")}</p>
        </div>

        ${isPaid ? `
            <div style="background: #ECFDF5; border: 1.5px solid #6EE7B7; border-radius: 12px; padding: 14px; margin-bottom: 18px;">
                <div style="color: #065F46; font-weight: 800; font-size: 16px;">✓ Order Confirmed</div>
                <div style="font-size: 13.5px; color: #047857; margin-top: 2px;">Payment Verified by Admin in Google Sheet.</div>
                <div style="font-size: 13px; font-weight: 700; color: #065F46; margin-top: 6px;">Expected delivery within 24 hours</div>
            </div>
        ` : `
            <div style="background: #FFFBEB; border: 1.5px solid #FCD34D; border-radius: 12px; padding: 14px; margin-bottom: 18px;">
                <div style="color: #92400E; font-weight: 800; font-size: 15px;">⏱️ Verification Pending</div>
                <div style="font-size: 13px; color: #78350F; margin-top: 2px;">Admin will verify the ₹1 payment in Google Sheet (PENDING → YES).</div>
            </div>
        `}

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; margin-bottom: 16px; font-size: 13.5px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748B;">Product:</span>
                <strong>${order.product}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748B;">Bottle Size:</span>
                <strong>${order.bottleSize}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748B;">Quantity:</span>
                <strong>${order.quantity} Bottles</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748B;">Total Amount:</span>
                <strong style="color: var(--royal-blue); font-size: 16px;">₹${order.totalOrderAmount}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748B;">UTR / Payment ID:</span>
                <span>${order.paymentId || "Not submitted"}</span>
            </div>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; margin-bottom: 18px; font-size: 13px;">
            <div style="font-weight: 700; color: var(--royal-deep); margin-bottom: 4px;">Delivery Address:</div>
            <div>${order.customerName} (${order.mobileNumber})</div>
            <div>${order.fullAddress}, ${order.villageArea || ""}</div>
            <div>${order.city}, ${order.district}, ${order.state} - ${order.pinCode}</div>
            ${order.notes ? `<div style="margin-top: 6px; color: #64748B;"><strong>Note:</strong> ${order.notes}</div>` : ""}
        </div>

        <button type="button" class="btn-auth-primary" onclick="document.getElementById('orderDetailModal').classList.add('hidden')">
            Close
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
                // Check if payment was verified (YES)
                if (data.order.paymentStatus === "YES" && ord.paymentStatus !== "YES") {
                    showToast(`🎉 Order ${ord.orderId} Payment Verified! Expected delivery within 24 hours.`);
                }
                await updateOrderInStorage(data.order);
                updatedCount++;
            }
        } catch (e) {}
    }

    if (updatedCount > 0) {
        renderOrdersList();
    }
}

// ============================================================================
// 12. CUSTOMER PROFILE FORM (Editing & Saving to Firestore)
// ============================================================================
function setupProfileForm() {
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
            showToast("✓ Profile saved successfully!");
        } catch (err) {
            console.error("Profile save error:", err);
            showToast("Failed to save profile. Please check connection.");
        } finally {
            btn.disabled = false;
            if (spinner) spinner.classList.add("hidden");
            if (btnText) btnText.textContent = "💾 Save Profile";
        }
    });

    // Logout
    document.getElementById("btnLogout")?.addEventListener("click", async () => {
        if (firebaseAuth) {
            await firebaseAuth.signOut();
            showToast("Signed out successfully.");
        }
    });
}

async function saveCustomerProfileToFirestore(fields) {
    if (!currentUser || !firestoreDb) {
        // Save locally for guest
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

    populateProfileIntoCheckoutForm(updated);
    updateProfileViewUI(updated);
}

// ============================================================================
// 13. AUTHENTICATION MODAL (Email + Password Firebase Auth)
// ============================================================================
function setupAuthModal() {
    const modal = document.getElementById("authModal");
    const btnClose = document.getElementById("btnAuthClose");
    const btnTabSignIn = document.getElementById("btnTabSignIn");
    const btnTabSignUp = document.getElementById("btnTabSignUp");
    const signInForm = document.getElementById("signInForm");
    const signUpForm = document.getElementById("signUpForm");

    btnClose?.addEventListener("click", () => modal.classList.add("hidden"));

    // Modal background click
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

    // SUBMIT SIGN IN
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
            showToast("Signed in successfully!");
        } catch (err) {
            console.error("Sign in failed:", err);
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

    // SUBMIT CREATE ACCOUNT
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

            // Create initial Firestore Profile
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
                profileCreatedAt: new Date().toISOString(),
                profileUpdatedAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                profileStatus: "ACTIVE"
            };

            if (firestoreDb) {
                await firestoreDb.collection("customers").doc(cred.user.uid).set(prof);
            }

            modal.classList.add("hidden");
            showToast("Account created successfully!");
        } catch (err) {
            console.error("Account creation failed:", err);
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
// 14. TOAST NOTIFICATION UTILITY
// ============================================================================
let toastTimeout = null;
function showToast(msg) {
    const box = document.getElementById("toastBox");
    if (!box) return;

    box.textContent = msg;
    box.classList.remove("hidden");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        box.classList.add("hidden");
    }, 4000);
}
