/**
 * ============================================================================
 * RAJVAARI PACKAGED DRINKING WATER - GOOGLE APPS SCRIPT COMPLETE BACKEND
 * ============================================================================
 * Brand: RAJVAARI
 * Tagline: "शुद्ध पानी, भरोसे के साथ"
 * Spreadsheet ID: 1r5j0FwPOZrkLzrWo6TYr7KV9Vj1VKYc0oVHH8eSB7Sc
 *
 * EXACT 3 SHEETS SPECIFICATION:
 *
 * 1. Orders — EXACT 31 COLUMNS:
 *    Col 1:  Order ID
 *    Col 2:  Timestamp
 *    Col 3:  Customer Name
 *    Col 4:  Mobile Number
 *    Col 5:  Alternate Number
 *    Col 6:  Full Address
 *    Col 7:  Village/Area
 *    Col 8:  City
 *    Col 9:  District
 *    Col 10: State
 *    Col 11: PIN Code
 *    Col 12: Product
 *    Col 13: Brand
 *    Col 14: Bottle Size
 *    Col 15: Quantity
 *    Col 16: Price Per Bottle
 *    Col 17: Subtotal
 *    Col 18: Delivery Charge
 *    Col 19: Discount
 *    Col 20: Total Order Amount
 *    Col 21: Payment Required
 *    Col 22: Payment Status
 *    Col 23: Payment ID
 *    Col 24: Order Status
 *    Col 25: Delivery Status
 *    Col 26: Order Date
 *    Col 27: Expected Delivery
 *    Col 28: Customer Message Status
 *    Col 29: Notes
 *    Col 30: Firebase UID
 *    Col 31: Customer ID
 *
 * 2. Customers — EXACT 21 COLUMNS:
 *    Col 1:  Customer ID
 *    Col 2:  Firebase UID
 *    Col 3:  Mobile Number
 *    Col 4:  Email
 *    Col 5:  Name
 *    Col 6:  Profile Photo URL
 *    Col 7:  Full Address
 *    Col 8:  Village / Area
 *    Col 9:  City
 *    Col 10: District
 *    Col 11: State
 *    Col 12: PIN Code
 *    Col 13: Mobile Change Count
 *    Col 14: Email Change Count
 *    Col 15: Photo Change Count
 *    Col 16: Profile Created At
 *    Col 17: Profile Updated At
 *    Col 18: Last Login At
 *    Col 19: Profile Status
 *    Col 20: Profile Updated By
 *    Col 21: Update Note
 *
 * 3. Profile Updates — EXACT 11 COLUMNS:
 *    Col 1:  Update ID
 *    Col 2:  Date/Time
 *    Col 3:  Customer ID
 *    Col 4:  Firebase UID
 *    Col 5:  Mobile Number
 *    Col 6:  Customer Name
 *    Col 7:  Field Changed
 *    Col 8:  Old Value
 *    Col 9:  New Value
 *    Col 10: Updated By
 *    Col 11: Update Reason
 * ============================================================================
 */

const SCRIPT_CONFIG = {
  SPREADSHEET_ID: "1r5j0FwPOZrkLzrWo6TYr7KV9Vj1VKYc0oVHH8eSB7Sc",
  SHEET_ORDERS: "Orders",
  SHEET_CUSTOMERS: "Customers",
  SHEET_PROFILE_UPDATES: "Profile Updates",

  BRAND_NAME: "RAJVAARI",
  TAGLINE: "शुद्ध पानी, भरोसे के साथ",
  PRODUCT_NAME: "RAJVAARI Drinking Water",

  UPI_ID: "9950906310-2@ybl",
  UPI_PAYEE_NAME: "RAJVAARI WATER",

  // SMS Gateway Credentials (optional)
  SMS_API_URL: "",
  SMS_AUTH_KEY: "",
  SMS_SENDER_ID: "RJVARI",

  // EXACT 31 COLUMNS FOR Orders
  ORDERS_COLUMNS: [
    "Order ID",               // Col 1
    "Timestamp",              // Col 2
    "Customer Name",          // Col 3
    "Mobile Number",          // Col 4
    "Alternate Number",       // Col 5
    "Full Address",           // Col 6
    "Village/Area",           // Col 7
    "City",                   // Col 8
    "District",               // Col 9
    "State",                  // Col 10
    "PIN Code",               // Col 11
    "Product",                // Col 12
    "Brand",                  // Col 13
    "Bottle Size",            // Col 14
    "Quantity",               // Col 15
    "Price Per Bottle",       // Col 16
    "Subtotal",               // Col 17
    "Delivery Charge",        // Col 18
    "Discount",               // Col 19
    "Total Order Amount",     // Col 20
    "Payment Required",       // Col 21
    "Payment Status",         // Col 22
    "Payment ID",             // Col 23
    "Order Status",           // Col 24
    "Delivery Status",        // Col 25
    "Order Date",             // Col 26
    "Expected Delivery",      // Col 27
    "Customer Message Status", // Col 28
    "Notes",                  // Col 29
    "Firebase UID",           // Col 30
    "Customer ID"             // Col 31
  ],

  // EXACT 21 COLUMNS FOR Customers
  CUSTOMERS_COLUMNS: [
    "Customer ID",            // Col 1
    "Firebase UID",           // Col 2
    "Mobile Number",          // Col 3
    "Email",                  // Col 4
    "Name",                   // Col 5
    "Profile Photo URL",      // Col 6
    "Full Address",           // Col 7
    "Village / Area",         // Col 8
    "City",                   // Col 9
    "District",               // Col 10
    "State",                  // Col 11
    "PIN Code",               // Col 12
    "Mobile Change Count",    // Col 13
    "Email Change Count",     // Col 14
    "Photo Change Count",     // Col 15
    "Profile Created At",     // Col 16
    "Profile Updated At",     // Col 17
    "Last Login At",          // Col 18
    "Profile Status",         // Col 19
    "Profile Updated By",     // Col 20
    "Update Note"             // Col 21
  ],

  // EXACT 11 COLUMNS FOR Profile Updates
  PROFILE_UPDATES_COLUMNS: [
    "Update ID",              // Col 1
    "Date/Time",              // Col 2
    "Customer ID",            // Col 3
    "Firebase UID",           // Col 4
    "Mobile Number",          // Col 5
    "Customer Name",          // Col 6
    "Field Changed",          // Col 7
    "Old Value",              // Col 8
    "New Value",              // Col 9
    "Updated By",             // Col 10
    "Update Reason"           // Col 11
  ]
};

// ============================================================================
// 1. doPost(e) - Web App POST Handler
// ============================================================================
function doPost(e) {
  try {
    const raw = e && e.postData ? e.postData.contents : "{}";
    const data = JSON.parse(raw);
    const action = data.action;

    switch (action) {
      case "createOrder":
        return createOrder(data);

      case "submitPayment":
        return submitPayment(data);

      case "createCustomer":
        return createCustomer(data);

      case "updateCustomerProfile":
        return updateCustomerProfile(data);

      case "updateLastLogin":
        return updateCustomerLastLogin(data);

      case "getCustomerOrders":
        return getCustomerOrders(data);

      case "getCustomer":
        return getCustomer(data);

      default:
        return jsonResponse({
          success: false,
          error: "Invalid or unsupported action: " + (action || "none")
        });
    }
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Request processing error: " + err.toString()
    });
  }
}

// ============================================================================
// 2. doGet(e) - Web App GET Handler
// ============================================================================
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action;

    if (action === "trackOrder") {
      return trackOrder(params.orderId);
    } else if (action === "getCustomer") {
      return getCustomer(params);
    } else if (action === "getCustomerOrders") {
      return getCustomerOrders(params);
    }

    return jsonResponse({
      status: "active",
      brand: SCRIPT_CONFIG.BRAND_NAME,
      tagline: SCRIPT_CONFIG.TAGLINE,
      service: "Packaged Drinking Water Ordering Backend",
      sheets: [
        SCRIPT_CONFIG.SHEET_ORDERS,
        SCRIPT_CONFIG.SHEET_CUSTOMERS,
        SCRIPT_CONFIG.SHEET_PROFILE_UPDATES
      ],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================================
// 3. createOrder(data) - Orders Sheet Entry (31 Columns)
// ============================================================================
function createOrder(data) {
  try {
    const sheet = getOrdersSheet();

    // Required fields check
    const customerName = String(data.customerName || "").trim();
    const mobile = String(data.mobileNumber || data.mobile || "").trim();
    const address = String(data.fullAddress || "").trim();
    const city = String(data.city || "").trim();
    const pinCode = String(data.pinCode || "").trim();

    if (!customerName || !mobile || !address || !city || !pinCode) {
      return jsonResponse({
        success: false,
        error: "Missing required order fields: Name, Mobile, Address, City, or PIN code."
      });
    }

    // Only 2 products allowed
    const bottleSize = (String(data.bottleSize).indexOf("200") !== -1) ? "200ml" : "1 Liter";
    const quantity = Math.max(1, parseInt(data.quantity, 10) || 1);

    // Authority Pricing
    const pricePerBottle = (bottleSize === "200ml") ? 10 : 20;
    const subtotal = quantity * pricePerBottle;
    const deliveryCharge = 0;
    const discount = 0;
    const totalOrderAmount = subtotal + deliveryCharge - discount;

    const orderId = createOrderId();
    const now = new Date();
    const timestamp = Utilities.formatDate(now, "Asia/Kolkata", "yyyy-MM-dd'T'HH:mm:ss'Z'");
    const orderDate = Utilities.formatDate(now, "Asia/Kolkata", "dd/MM/yyyy");

    const firebaseUid = String(data.firebaseUid || "").trim();
    const customerId = String(data.customerId || "").trim();
    const notes = String(data.notes || data.customerMessage || "Order created. Verification payment pending.").trim();

    // EXACT 31 COLUMNS
    const row = [
      orderId,                                          // Col 1: Order ID
      timestamp,                                        // Col 2: Timestamp
      customerName,                                     // Col 3: Customer Name
      mobile,                                           // Col 4: Mobile Number
      String(data.alternateNumber || "N/A").trim(),     // Col 5: Alternate Number
      address,                                          // Col 6: Full Address
      String(data.villageArea || "N/A").trim(),         // Col 7: Village/Area
      city,                                             // Col 8: City
      String(data.district || "").trim(),               // Col 9: District
      String(data.state || "Rajasthan").trim(),         // Col 10: State
      pinCode,                                          // Col 11: PIN Code
      SCRIPT_CONFIG.PRODUCT_NAME,                       // Col 12: Product
      SCRIPT_CONFIG.BRAND_NAME,                         // Col 13: Brand
      bottleSize,                                       // Col 14: Bottle Size
      quantity,                                         // Col 15: Quantity
      pricePerBottle,                                   // Col 16: Price Per Bottle
      subtotal,                                         // Col 17: Subtotal
      deliveryCharge,                                   // Col 18: Delivery Charge
      discount,                                         // Col 19: Discount
      totalOrderAmount,                                 // Col 20: Total Order Amount
      1,                                                // Col 21: Payment Required (Verification: ₹1)
      "PENDING",                                        // Col 22: Payment Status
      "",                                               // Col 23: Payment ID (Empty until UTR submitted)
      "PENDING",                                        // Col 24: Order Status
      "PENDING",                                        // Col 25: Delivery Status
      orderDate,                                        // Col 26: Order Date
      "Pending confirmation",                           // Col 27: Expected Delivery
      "PENDING",                                        // Col 28: Customer Message Status
      notes,                                            // Col 29: Notes
      firebaseUid,                                      // Col 30: Firebase UID
      customerId                                        // Col 31: Customer ID
    ];

    sheet.appendRow(row);

    return jsonResponse({
      success: true,
      message: "Order created successfully",
      orderId: orderId,
      paymentRequired: 1,
      paymentStatus: "PENDING",
      orderStatus: "PENDING",
      totalOrderAmount: totalOrderAmount,
      bottleSize: bottleSize,
      quantity: quantity
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Order creation failed: " + err.toString()
    });
  }
}

// ============================================================================
// 4. submitPayment(data) - Record UTR in Orders Sheet
// ============================================================================
function submitPayment(data) {
  try {
    const sheet = getOrdersSheet();
    const orderId = String(data.orderId || "").trim().toUpperCase();
    const paymentId = String(data.paymentId || data.utr || "").trim();

    if (!orderId || !paymentId) {
      return jsonResponse({
        success: false,
        error: "Order ID and Payment ID / UTR Number are required."
      });
    }

    const rowIndex = findRowByColValue(sheet, 1, orderId);
    if (rowIndex === -1) {
      return jsonResponse({
        success: false,
        error: "Order ID not found: " + orderId
      });
    }

    // Col 23: Payment ID
    sheet.getRange(rowIndex, 23).setValue(paymentId);

    // Col 22: Payment Status remains PENDING
    sheet.getRange(rowIndex, 22).setValue("PENDING");

    // Col 29: Notes append
    const currentNotes = String(sheet.getRange(rowIndex, 29).getValue() || "");
    const updatedNotes = currentNotes ? currentNotes + " | UTR submitted: " + paymentId : "UTR submitted: " + paymentId;
    sheet.getRange(rowIndex, 29).setValue(updatedNotes);

    return jsonResponse({
      success: true,
      message: "Payment details submitted. Verification pending by Admin.",
      orderId: orderId,
      paymentId: paymentId,
      paymentStatus: "PENDING"
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Payment submission failed: " + err.toString()
    });
  }
}

// ============================================================================
// 5. createCustomer(data) - Customers Sheet Entry (21 Columns)
// ============================================================================
function createCustomer(data) {
  try {
    const sheet = getCustomersSheet();

    const firebaseUid = String(data.firebaseUid || "").trim();
    let customerId = String(data.customerId || "").trim();
    const email = String(data.email || "").trim();
    const mobile = String(data.mobileNumber || data.mobile || "").trim();
    const name = String(data.name || data.customerName || "").trim();

    if (!firebaseUid && !customerId && !email) {
      return jsonResponse({
        success: false,
        error: "At least Firebase UID, Customer ID, or Email is required to create customer."
      });
    }

    // Check if customer already exists by Firebase UID or Customer ID
    let existingRow = -1;
    if (firebaseUid) {
      existingRow = findRowByColValue(sheet, 2, firebaseUid);
    }
    if (existingRow === -1 && customerId) {
      existingRow = findRowByColValue(sheet, 1, customerId);
    }
    if (existingRow === -1 && email) {
      existingRow = findRowByColValue(sheet, 4, email);
    }

    const now = new Date().toISOString();

    if (existingRow !== -1) {
      // Customer already exists; update last login & return
      sheet.getRange(existingRow, 18).setValue(now);
      const rowData = sheet.getRange(existingRow, 1, 1, 21).getValues()[0];
      return jsonResponse({
        success: true,
        message: "Customer profile already exists. Last login updated.",
        customer: customerRowToObj(rowData)
      });
    }

    // New Customer ID if none provided
    if (!customerId) {
      customerId = "CUST-" + Math.floor(100000 + Math.random() * 900000);
    }

    // EXACT 21 COLUMNS
    const row = [
      customerId,                                       // Col 1: Customer ID
      firebaseUid,                                      // Col 2: Firebase UID
      mobile,                                           // Col 3: Mobile Number
      email,                                            // Col 4: Email
      name,                                             // Col 5: Name
      String(data.profilePhotoUrl || "").trim(),        // Col 6: Profile Photo URL
      String(data.fullAddress || "").trim(),            // Col 7: Full Address
      String(data.villageArea || "").trim(),            // Col 8: Village / Area
      String(data.city || "").trim(),                   // Col 9: City
      String(data.district || "").trim(),               // Col 10: District
      String(data.state || "Rajasthan").trim(),         // Col 11: State
      String(data.pinCode || "").trim(),                // Col 12: PIN Code
      0,                                                // Col 13: Mobile Change Count
      0,                                                // Col 14: Email Change Count
      0,                                                // Col 15: Photo Change Count
      now,                                              // Col 16: Profile Created At
      now,                                              // Col 17: Profile Updated At
      now,                                              // Col 18: Last Login At
      "ACTIVE",                                         // Col 19: Profile Status
      "CUSTOMER",                                       // Col 20: Profile Updated By
      String(data.updateNote || "Initial registration").trim() // Col 21: Update Note
    ];

    sheet.appendRow(row);

    return jsonResponse({
      success: true,
      message: "Customer created successfully in Google Sheet",
      customer: customerRowToObj(row)
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Failed to create customer: " + err.toString()
    });
  }
}

// ============================================================================
// 6. updateCustomerProfile(data) - Customers & Profile Updates Sheet Sync
// ============================================================================
function updateCustomerProfile(data) {
  try {
    const customersSheet = getCustomersSheet();
    const updatesSheet = getProfileUpdatesSheet();

    const firebaseUid = String(data.firebaseUid || "").trim();
    const customerId = String(data.customerId || "").trim();

    if (!firebaseUid && !customerId) {
      return jsonResponse({
        success: false,
        error: "Customer ID or Firebase UID is required to update profile."
      });
    }

    let rowIndex = -1;
    if (customerId) {
      rowIndex = findRowByColValue(customersSheet, 1, customerId);
    }
    if (rowIndex === -1 && firebaseUid) {
      rowIndex = findRowByColValue(customersSheet, 2, firebaseUid);
    }

    if (rowIndex === -1) {
      // If customer doesn't exist in sheet yet, auto-create
      return createCustomer(data);
    }

    const oldRow = customersSheet.getRange(rowIndex, 1, 1, 21).getValues()[0];
    const now = new Date();
    const nowIso = now.toISOString();
    const nowFormatted = Utilities.formatDate(now, "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss");

    const matchedCustId = String(oldRow[0] || customerId);
    const matchedUid = String(oldRow[1] || firebaseUid);
    const currentCustName = String(data.name !== undefined ? data.name : oldRow[4]).trim();
    const currentMobile = String(data.mobileNumber !== undefined ? data.mobileNumber : oldRow[2]).trim();

    let mobileChangeCount = parseInt(oldRow[12], 10) || 0;
    let emailChangeCount = parseInt(oldRow[13], 10) || 0;
    let photoChangeCount = parseInt(oldRow[14], 10) || 0;

    const changedFields = [];

    // Check individual fields for differences
    const fieldsToTrack = [
      { key: "mobileNumber", col: 3, label: "Mobile Number", isCounted: "mobile" },
      { key: "email", col: 4, label: "Email", isCounted: "email" },
      { key: "name", col: 5, label: "Name" },
      { key: "profilePhotoUrl", col: 6, label: "Profile Photo URL", isCounted: "photo" },
      { key: "fullAddress", col: 7, label: "Full Address" },
      { key: "villageArea", col: 8, label: "Village / Area" },
      { key: "city", col: 9, label: "City" },
      { key: "district", col: 10, label: "District" },
      { key: "state", col: 11, label: "State" },
      { key: "pinCode", col: 12, label: "PIN Code" }
    ];

    for (let i = 0; i < fieldsToTrack.length; i++) {
      const f = fieldsToTrack[i];
      if (data[f.key] !== undefined) {
        const newVal = String(data[f.key]).trim();
        const oldVal = String(oldRow[f.col - 1] || "").trim();

        if (newVal !== oldVal) {
          changedFields.push(f.label);

          if (f.isCounted === "mobile") mobileChangeCount++;
          if (f.isCounted === "email") emailChangeCount++;
          if (f.isCounted === "photo") photoChangeCount++;

          // Append audit log to Profile Updates sheet (11 Columns)
          const updateId = "UPD-" + Utilities.formatDate(now, "Asia/Kolkata", "yyyyMMdd") + "-" + Math.floor(1000 + Math.random() * 9000);
          const updateRow = [
            updateId,                                       // Col 1: Update ID
            nowFormatted,                                   // Col 2: Date/Time
            matchedCustId,                                  // Col 3: Customer ID
            matchedUid,                                     // Col 4: Firebase UID
            currentMobile,                                  // Col 5: Mobile Number
            currentCustName,                                // Col 6: Customer Name
            f.label,                                        // Col 7: Field Changed
            oldVal,                                         // Col 8: Old Value
            newVal,                                         // Col 9: New Value
            String(data.updatedBy || "CUSTOMER").trim(),    // Col 10: Updated By
            String(data.updateReason || "Profile update via web").trim() // Col 11: Update Reason
          ];
          updatesSheet.appendRow(updateRow);

          // Update cell in Customers sheet
          customersSheet.getRange(rowIndex, f.col).setValue(newVal);
        }
      }
    }

    // Update Counts & Meta
    customersSheet.getRange(rowIndex, 13).setValue(mobileChangeCount);
    customersSheet.getRange(rowIndex, 14).setValue(emailChangeCount);
    customersSheet.getRange(rowIndex, 15).setValue(photoChangeCount);
    customersSheet.getRange(rowIndex, 17).setValue(nowIso); // Profile Updated At
    customersSheet.getRange(rowIndex, 20).setValue(String(data.updatedBy || "CUSTOMER").trim());
    customersSheet.getRange(rowIndex, 21).setValue("Updated: " + (changedFields.length > 0 ? changedFields.join(", ") : "No changes"));

    const updatedRow = customersSheet.getRange(rowIndex, 1, 1, 21).getValues()[0];

    return jsonResponse({
      success: true,
      message: "Customer profile updated successfully.",
      changedFields: changedFields,
      customer: customerRowToObj(updatedRow)
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Profile update failed: " + err.toString()
    });
  }
}

// ============================================================================
// 7. updateCustomerLastLogin(data) - Update Last Login At
// ============================================================================
function updateCustomerLastLogin(data) {
  try {
    const sheet = getCustomersSheet();
    const firebaseUid = String(data.firebaseUid || "").trim();
    const customerId = String(data.customerId || "").trim();

    let rowIndex = -1;
    if (firebaseUid) rowIndex = findRowByColValue(sheet, 2, firebaseUid);
    if (rowIndex === -1 && customerId) rowIndex = findRowByColValue(sheet, 1, customerId);

    if (rowIndex !== -1) {
      const now = new Date().toISOString();
      sheet.getRange(rowIndex, 18).setValue(now);
      return jsonResponse({ success: true, message: "Last login updated." });
    }

    return jsonResponse({ success: false, message: "Customer not found to update login." });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================================
// 8. getCustomer(params) - Retrieve Customer Record
// ============================================================================
function getCustomer(params) {
  try {
    const sheet = getCustomersSheet();
    const uid = String(params.firebaseUid || "").trim();
    const cid = String(params.customerId || "").trim();
    const email = String(params.email || "").trim();

    let rowIndex = -1;
    if (uid) rowIndex = findRowByColValue(sheet, 2, uid);
    if (rowIndex === -1 && cid) rowIndex = findRowByColValue(sheet, 1, cid);
    if (rowIndex === -1 && email) rowIndex = findRowByColValue(sheet, 4, email);

    if (rowIndex === -1) {
      return jsonResponse({ success: false, error: "Customer not found." });
    }

    const rowData = sheet.getRange(rowIndex, 1, 1, 21).getValues()[0];
    return jsonResponse({
      success: true,
      customer: customerRowToObj(rowData)
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================================
// 9. trackOrder(orderId) - Get Order by Order ID
// ============================================================================
function trackOrder(orderId) {
  const targetId = String(orderId || "").trim().toUpperCase();
  if (!targetId) {
    return jsonResponse({ success: false, error: "Order ID required" });
  }

  const sheet = getOrdersSheet();
  const rowIndex = findRowByColValue(sheet, 1, targetId);

  if (rowIndex === -1) {
    return jsonResponse({ success: false, error: "Order ID not found: " + targetId });
  }

  const r = sheet.getRange(rowIndex, 1, 1, 31).getValues()[0];
  return jsonResponse({
    success: true,
    order: orderRowToObj(r)
  });
}

// ============================================================================
// 10. getCustomerOrders(params) - Get all Orders for a Customer
// ============================================================================
function getCustomerOrders(params) {
  try {
    const sheet = getOrdersSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return jsonResponse({ success: true, orders: [] });
    }

    const uid = String(params.firebaseUid || "").trim();
    const cid = String(params.customerId || "").trim();
    const mobile = String(params.mobileNumber || params.mobile || "").trim();

    const data = sheet.getRange(2, 1, lastRow - 1, 31).getValues();
    const matched = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowUid = String(row[29] || "").trim(); // Col 30
      const rowCid = String(row[30] || "").trim(); // Col 31
      const rowMob = String(row[3] || "").trim();  // Col 4

      let match = false;
      if (uid && rowUid === uid) match = true;
      if (cid && rowCid === cid) match = true;
      if (mobile && rowMob === mobile) match = true;

      if (match) {
        matched.push(orderRowToObj(row));
      }
    }

    return jsonResponse({
      success: true,
      orders: matched
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================================
// 11. checkPaymentStatus() - Process Admin YES/NO in Orders Sheet
// ============================================================================
function checkPaymentStatus() {
  const sheet = getOrdersSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 31).getValues();

  for (let i = 0; i < data.length; i++) {
    const rowIndex = i + 2;
    const row = data[i];

    const paymentStatus = String(row[21]).trim().toUpperCase(); // Col 22
    const orderStatus = String(row[23]).trim().toUpperCase();   // Col 24
    const msgStatus = String(row[27]).trim().toUpperCase();     // Col 28

    if (paymentStatus === "YES") {
      if (orderStatus !== "CONFIRMED" || msgStatus !== "PAYMENT_CONFIRMATION_SENT") {
        processConfirmedPayment(sheet, rowIndex, row);
      }
    } else if (paymentStatus === "NO") {
      if (orderStatus !== "CANCELLED") {
        processRejectedPayment(sheet, rowIndex, row);
      }
    }
  }

  cancelExpiredOrders();
}

function processConfirmedPayment(sheet, rowIndex, rowData) {
  const currentMsgStatus = String(sheet.getRange(rowIndex, 28).getValue()).trim().toUpperCase();
  const currentOrderStatus = String(sheet.getRange(rowIndex, 24).getValue()).trim().toUpperCase();

  if (currentOrderStatus === "CONFIRMED" && currentMsgStatus === "PAYMENT_CONFIRMATION_SENT") {
    return;
  }

  // 1. Payment Status = YES (Col 22)
  sheet.getRange(rowIndex, 22).setValue("YES");

  // 2. Order Status = CONFIRMED (Col 24)
  sheet.getRange(rowIndex, 24).setValue("CONFIRMED");

  // 3. Delivery Status = PROCESSING (Col 25)
  sheet.getRange(rowIndex, 25).setValue("PROCESSING");

  // 4. Expected Delivery = 24 hours (Col 27)
  const now = new Date();
  const deliveryTime = new Date(now.getTime() + (24 * 60 * 60 * 1000));
  const deliveryFormatted = Utilities.formatDate(deliveryTime, "Asia/Kolkata", "dd/MM/yyyy, hh:mm a");
  sheet.getRange(rowIndex, 27).setValue(deliveryFormatted + " (Within 24 Hours)");

  const orderId = sheet.getRange(rowIndex, 1).getValue();
  const customerMobile = sheet.getRange(rowIndex, 4).getValue();

  const orderData = {
    orderId: orderId,
    mobileNumber: customerMobile,
    expectedDelivery: deliveryFormatted
  };

  const smsResult = sendConfirmationSMS(orderData);
  if (smsResult.success) {
    sheet.getRange(rowIndex, 28).setValue("PAYMENT_CONFIRMATION_SENT");
    const notes = String(sheet.getRange(rowIndex, 29).getValue() || "");
    sheet.getRange(rowIndex, 29).setValue((notes ? notes + " | " : "") + "Payment verified by Admin. Confirmation SMS sent.");
  } else {
    sheet.getRange(rowIndex, 28).setValue(smsResult.code || "CONFIRMED_NO_SMS");
    const notes = String(sheet.getRange(rowIndex, 29).getValue() || "");
    sheet.getRange(rowIndex, 29).setValue((notes ? notes + " | " : "") + "Payment verified by Admin.");
  }
}

function processRejectedPayment(sheet, rowIndex, rowData) {
  sheet.getRange(rowIndex, 22).setValue("NO");
  sheet.getRange(rowIndex, 24).setValue("CANCELLED");
  sheet.getRange(rowIndex, 25).setValue("CANCELLED");
  sheet.getRange(rowIndex, 28).setValue("PAYMENT_REJECTED");

  const notes = String(sheet.getRange(rowIndex, 29).getValue() || "");
  sheet.getRange(rowIndex, 29).setValue((notes ? notes + " | " : "") + "Payment verification rejected by Admin.");
}

function sendConfirmationSMS(orderData) {
  const apiUrl = SCRIPT_CONFIG.SMS_API_URL;
  const authKey = SCRIPT_CONFIG.SMS_AUTH_KEY;
  const senderId = SCRIPT_CONFIG.SMS_SENDER_ID;

  if (!apiUrl || !authKey) {
    return { success: false, code: "SMS_NOT_CONFIGURED", reason: "SMS credentials not set" };
  }

  try {
    const mobile = String(orderData.mobileNumber).trim();
    const orderId = orderData.orderId;
    const smsMessage = `RAJVAARI: आपका payment verify हो गया है। Order ID: ${orderId} confirmed है। डिलीवरी 24 घंटे के अंदर होगी। धन्यवाद।`;

    const payload = {
      sender_id: senderId,
      message: smsMessage,
      numbers: mobile
    };

    const options = {
      method: "post",
      headers: {
        "authorization": authKey,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const code = response.getResponseCode();
    return { success: (code >= 200 && code < 300) };
  } catch (err) {
    return { success: false, code: "SMS_EXCEPTION", reason: err.toString() };
  }
}

function cancelExpiredOrders() {
  const sheet = getOrdersSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 31).getValues();
  const now = new Date().getTime();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowIndex = i + 2;

    const paymentStatus = String(row[21]).trim().toUpperCase();
    const orderStatus = String(row[23]).trim().toUpperCase();
    const timestampStr = row[1];

    if (paymentStatus === "PENDING" && orderStatus === "PENDING") {
      const orderTime = new Date(timestampStr).getTime();
      if (!isNaN(orderTime) && (now - orderTime) > TWENTY_FOUR_HOURS_MS) {
        sheet.getRange(rowIndex, 22).setValue("NO");
        sheet.getRange(rowIndex, 24).setValue("CANCELLED");
        sheet.getRange(rowIndex, 25).setValue("CANCELLED");
        sheet.getRange(rowIndex, 28).setValue("PAYMENT_EXPIRED");
        const notes = String(row[28] || "");
        sheet.getRange(rowIndex, 29).setValue((notes ? notes + " | " : "") + "Order expired after 24h pending payment.");
      }
    }
  }
}

// ============================================================================
// 12. SPREADSHEET & SHEET ACCESS HELPERS
// ============================================================================
function getSpreadsheet() {
  try {
    if (SCRIPT_CONFIG.SPREADSHEET_ID) {
      return SpreadsheetApp.openById(SCRIPT_CONFIG.SPREADSHEET_ID);
    }
  } catch (e) {
    Logger.log("Failed opening by ID, using active spreadsheet: " + e.toString());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrdersSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SCRIPT_CONFIG.SHEET_ORDERS);
  if (!sheet) {
    sheet = ss.insertSheet(SCRIPT_CONFIG.SHEET_ORDERS);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SCRIPT_CONFIG.ORDERS_COLUMNS);
  }
  return sheet;
}

function getCustomersSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SCRIPT_CONFIG.SHEET_CUSTOMERS);
  if (!sheet) {
    sheet = ss.insertSheet(SCRIPT_CONFIG.SHEET_CUSTOMERS);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SCRIPT_CONFIG.CUSTOMERS_COLUMNS);
  }
  return sheet;
}

function getProfileUpdatesSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SCRIPT_CONFIG.SHEET_PROFILE_UPDATES);
  if (!sheet) {
    sheet = ss.insertSheet(SCRIPT_CONFIG.SHEET_PROFILE_UPDATES);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SCRIPT_CONFIG.PROFILE_UPDATES_COLUMNS);
  }
  return sheet;
}

function findRowByColValue(sheet, colIndex, targetValue) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const target = String(targetValue).trim().toUpperCase();
  const values = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toUpperCase() === target) {
      return i + 2;
    }
  }
  return -1;
}

function createOrderId() {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, "Asia/Kolkata", "yyyyMMdd");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RAJ-${dateStr}-${rand}`;
}

function orderRowToObj(r) {
  return {
    orderId: r[0],
    timestamp: r[1],
    customerName: r[2],
    mobileNumber: r[3],
    alternateNumber: r[4],
    fullAddress: r[5],
    villageArea: r[6],
    city: r[7],
    district: r[8],
    state: r[9],
    pinCode: r[10],
    product: r[11],
    brand: r[12],
    bottleSize: r[13],
    quantity: r[14],
    pricePerBottle: r[15],
    subtotal: r[16],
    deliveryCharge: r[17],
    discount: r[18],
    totalOrderAmount: r[19],
    paymentRequired: r[20],
    paymentStatus: r[21],
    paymentId: r[22],
    orderStatus: r[23],
    deliveryStatus: r[24],
    orderDate: r[25],
    expectedDelivery: r[26],
    customerMessageStatus: r[27],
    notes: r[28],
    firebaseUid: r[29],
    customerId: r[30]
  };
}

function customerRowToObj(r) {
  return {
    customerId: r[0],
    firebaseUid: r[1],
    mobileNumber: r[2],
    email: r[3],
    name: r[4],
    profilePhotoUrl: r[5],
    fullAddress: r[6],
    villageArea: r[7],
    city: r[8],
    district: r[9],
    state: r[10],
    pinCode: r[11],
    mobileChangeCount: r[12],
    emailChangeCount: r[13],
    photoChangeCount: r[14],
    profileCreatedAt: r[15],
    profileUpdatedAt: r[16],
    lastLoginAt: r[17],
    profileStatus: r[18],
    profileUpdatedBy: r[19],
    updateNote: r[20]
  };
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// 13. TRIGGERS SETUP
// ============================================================================
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let hasEditTrigger = false;
  let hasTimeTrigger = false;

  for (let i = 0; i < triggers.length; i++) {
    const handler = triggers[i].getHandlerFunction();
    if (handler === "onEditInstalled") hasEditTrigger = true;
    if (handler === "checkPaymentStatus") hasTimeTrigger = true;
  }

  const ss = getSpreadsheet();

  if (!hasEditTrigger) {
    ScriptApp.newTrigger("onEditInstalled")
      .forSpreadsheet(ss)
      .onEdit()
      .create();
  }

  if (!hasTimeTrigger) {
    ScriptApp.newTrigger("checkPaymentStatus")
      .timeBased()
      .everyHours(1)
      .create();
  }
}

function onEditInstalled(e) {
  if (!e || !e.range) return;
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== SCRIPT_CONFIG.SHEET_ORDERS) return;

  const row = range.getRow();
  const col = range.getColumn();
  if (row <= 1) return;

  if (col === 22) { // Col 22: Payment Status
    const val = String(range.getValue()).trim().toUpperCase();
    if (val === "YES") {
      const rowData = sheet.getRange(row, 1, 1, 31).getValues()[0];
      processConfirmedPayment(sheet, row, rowData);
    } else if (val === "NO") {
      const rowData = sheet.getRange(row, 1, 1, 31).getValues()[0];
      processRejectedPayment(sheet, row, rowData);
    }
  }
}
