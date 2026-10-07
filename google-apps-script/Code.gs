/**
 * ============================================================================
 * RAJVAARI PACKAGED DRINKING WATER - GOOGLE APPS SCRIPT COMPLETE BACKEND
 * ============================================================================
 * Brand: RAJVAARI
 * Tagline: "शुद्ध पानी, भरोसे के साथ"
 * Spreadsheet: RAJVAARI WATER ORDERS
 * Sheet Tab: Orders
 *
 * EXACT 29 COLUMNS:
 * 1. Order ID
 * 2. Timestamp
 * 3. Customer Name
 * 4. Mobile Number
 * 5. Alternate Number
 * 6. Full Address
 * 7. Village/Area
 * 8. City
 * 9. District
 * 10. State
 * 11. PIN Code
 * 12. Product
 * 13. Brand
 * 14. Bottle Size
 * 15. Quantity
 * 16. Price Per Bottle
 * 17. Subtotal
 * 18. Delivery Charge
 * 19. Discount
 * 20. Total Order Amount
 * 21. Payment Required
 * 22. Payment Status
 * 23. Payment ID
 * 24. Order Status
 * 25. Delivery Status
 * 26. Order Date
 * 27. Expected Delivery
 * 28. Customer Message Status
 * 29. Notes
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================
const SCRIPT_CONFIG = {
  SPREADSHEET_NAME: "RAJVAARI WATER ORDERS",
  SHEET_NAME: "Orders",
  BRAND_NAME: "RAJVAARI",
  PRODUCT_NAME: "RAJVAARI Drinking Water",

  // SMS GATEWAY CREDENTIALS (Configure here or in Script Properties)
  SMS_API_URL: "",     // e.g. "https://www.fast2sms.com/dev/bulkV2" or your SMS gateway URL
  SMS_AUTH_KEY: "",    // Your SMS Provider API Key
  SMS_SENDER_ID: "RJVARI", // Sender ID (Approval based)

  // 29 COLUMNS DEFINITION
  COLUMNS: [
    "Order ID",              // Col 1
    "Timestamp",             // Col 2
    "Customer Name",         // Col 3
    "Mobile Number",         // Col 4
    "Alternate Number",      // Col 5
    "Full Address",          // Col 6
    "Village/Area",          // Col 7
    "City",                  // Col 8
    "District",              // Col 9
    "State",                 // Col 10
    "PIN Code",              // Col 11
    "Product",               // Col 12
    "Brand",                 // Col 13
    "Bottle Size",           // Col 14
    "Quantity",              // Col 15
    "Price Per Bottle",      // Col 16
    "Subtotal",              // Col 17
    "Delivery Charge",       // Col 18
    "Discount",              // Col 19
    "Total Order Amount",    // Col 20
    "Payment Required",      // Col 21
    "Payment Status",        // Col 22
    "Payment ID",            // Col 23
    "Order Status",          // Col 24
    "Delivery Status",       // Col 25
    "Order Date",            // Col 26
    "Expected Delivery",     // Col 27
    "Customer Message Status",// Col 28
    "Notes"                  // Col 29
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

    if (action === "createOrder") {
      return createOrder(data);
    } else if (action === "submitPayment") {
      return submitPayment(data);
    } else {
      return jsonResponse({
        success: false,
        error: "Invalid or missing action"
      });
    }
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Request parsing failed: " + err.toString()
    });
  }
}

// ============================================================================
// 2. doGet(e) - Web App GET Handler (Status / Tracking / Health)
// ============================================================================
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action;

    if (action === "trackOrder") {
      const orderId = (params.orderId || "").trim().toUpperCase();
      if (!orderId) {
        return jsonResponse({ success: false, error: "Order ID required" });
      }

      const sheet = getSheet();
      const rowIndex = findOrderRow(sheet, orderId);

      if (rowIndex === -1) {
        return jsonResponse({ success: false, error: "Order ID not found" });
      }

      const rowValues = sheet.getRange(rowIndex, 1, 1, 29).getValues()[0];
      return jsonResponse({
        success: true,
        order: {
          orderId: rowValues[0],
          timestamp: rowValues[1],
          customerName: rowValues[2],
          mobileNumber: rowValues[3],
          bottleSize: rowValues[13],
          quantity: rowValues[14],
          totalOrderAmount: rowValues[19],
          paymentRequired: rowValues[20],
          paymentStatus: rowValues[21],
          paymentId: rowValues[22],
          orderStatus: rowValues[23],
          deliveryStatus: rowValues[24],
          expectedDelivery: rowValues[26]
        }
      });
    }

    return jsonResponse({
      status: "active",
      brand: SCRIPT_CONFIG.BRAND_NAME,
      service: "Packaged Drinking Water Ordering Backend"
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================================
// 3. createOrder(data) - Immediate Google Sheet Entry
// ============================================================================
function createOrder(data) {
  try {
    const sheet = getSheet();

    // Validate required fields
    if (!data.customerName || !data.mobileNumber || !data.fullAddress || !data.city || !data.pinCode) {
      return jsonResponse({
        success: false,
        error: "Missing required customer or address fields."
      });
    }

    const bottleSize = (data.bottleSize === "200ml") ? "200ml" : "1 Liter";
    const quantity = Math.max(1, parseInt(data.quantity, 10) || 1);

    // Backend calculates price (Never trust frontend price)
    const pricePerBottle = getBottlePrice(bottleSize);
    const subtotal = quantity * pricePerBottle;
    const deliveryCharge = 0; // FREE
    const discount = 0;
    const totalOrderAmount = subtotal + deliveryCharge - discount;

    const orderId = createOrderId();
    const now = new Date();
    const timestamp = Utilities.formatDate(now, "Asia/Kolkata", "yyyy-MM-dd'T'HH:mm:ss'Z'");
    const orderDate = Utilities.formatDate(now, "Asia/Kolkata", "dd/MM/yyyy");

    // Exact 29 Columns Row Assembly
    const row = [
      orderId,                                          // 1. Order ID
      timestamp,                                        // 2. Timestamp
      String(data.customerName).trim(),                 // 3. Customer Name
      String(data.mobileNumber).trim(),                 // 4. Mobile Number
      String(data.alternateNumber || "N/A").trim(),     // 5. Alternate Number
      String(data.fullAddress).trim(),                  // 6. Full Address
      String(data.villageArea || "N/A").trim(),         // 7. Village/Area
      String(data.city).trim(),                         // 8. City
      String(data.district || "").trim(),               // 9. District
      String(data.state || "Rajasthan").trim(),         // 10. State
      String(data.pinCode).trim(),                      // 11. PIN Code
      SCRIPT_CONFIG.PRODUCT_NAME,                       // 12. Product
      SCRIPT_CONFIG.BRAND_NAME,                         // 13. Brand
      bottleSize,                                       // 14. Bottle Size
      quantity,                                         // 15. Quantity
      pricePerBottle,                                   // 16. Price Per Bottle
      subtotal,                                         // 17. Subtotal
      deliveryCharge,                                   // 18. Delivery Charge
      discount,                                         // 19. Discount
      totalOrderAmount,                                 // 20. Total Order Amount
      1,                                                // 21. Payment Required (Test: ₹1)
      "PENDING",                                        // 22. Payment Status
      "",                                               // 23. Payment ID (empty initially)
      "PENDING",                                        // 24. Order Status
      "PENDING",                                        // 25. Delivery Status
      orderDate,                                        // 26. Order Date
      "Pending confirmation",                           // 27. Expected Delivery
      "PENDING",                                        // 28. Customer Message Status
      String(data.notes || "Order created. Verification payment pending.") // 29. Notes
    ];

    sheet.appendRow(row);

    return jsonResponse({
      success: true,
      message: "Order created successfully",
      orderId: orderId,
      paymentRequired: 1,
      paymentStatus: "PENDING",
      orderStatus: "PENDING"
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Order creation failed: " + err.toString()
    });
  }
}

// ============================================================================
// 4. submitPayment(data) - Save UTR / Transaction ID (Status remains PENDING)
// ============================================================================
function submitPayment(data) {
  try {
    const sheet = getSheet();
    const orderId = (data.orderId || "").trim().toUpperCase();
    const paymentId = (data.paymentId || "").trim();

    if (!orderId || !paymentId) {
      return jsonResponse({
        success: false,
        error: "Order ID and Transaction/UTR Number are required."
      });
    }

    const rowIndex = findOrderRow(sheet, orderId);
    if (rowIndex === -1) {
      return jsonResponse({
        success: false,
        error: "Order ID not found: " + orderId
      });
    }

    // Save paymentId into Column 23 (Payment ID)
    sheet.getRange(rowIndex, 23).setValue(paymentId);

    // Payment Status MUST remain PENDING
    sheet.getRange(rowIndex, 22).setValue("PENDING");

    // Append to Notes
    const currentNotes = String(sheet.getRange(rowIndex, 29).getValue() || "");
    const updatedNotes = currentNotes ? currentNotes + " | UTR submitted: " + paymentId : "UTR submitted: " + paymentId;
    sheet.getRange(rowIndex, 29).setValue(updatedNotes);

    return jsonResponse({
      success: true,
      message: "Payment details submitted. Payment verification pending."
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Payment submission failed: " + err.toString()
    });
  }
}

// ============================================================================
// 5. checkPaymentStatus() - Process Admin YES/NO & Expired Orders
// ============================================================================
function checkPaymentStatus() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 29).getValues();

  for (let i = 0; i < data.length; i++) {
    const rowIndex = i + 2;
    const row = data[i];

    const paymentStatus = String(row[21]).trim().toUpperCase(); // Col 22
    const orderStatus = String(row[23]).trim().toUpperCase();   // Col 24
    const msgStatus = String(row[27]).trim().toUpperCase();     // Col 28

    // Case 1: Admin manually changed to YES
    if (paymentStatus === "YES") {
      if (orderStatus !== "CONFIRMED" || msgStatus !== "PAYMENT_CONFIRMATION_SENT") {
        processConfirmedPayment(sheet, rowIndex, row);
      }
    }
    // Case 2: Admin manually changed to NO
    else if (paymentStatus === "NO") {
      if (orderStatus !== "CANCELLED") {
        processRejectedPayment(sheet, rowIndex, row);
      }
    }
  }

  // Also check for 24-hour timeout on PENDING orders
  cancelExpiredOrders();
}

// ============================================================================
// 6. processConfirmedPayment(sheet, rowIndex, rowData)
// ============================================================================
function processConfirmedPayment(sheet, rowIndex, rowData) {
  // DUPLICATE SMS PROTECTION
  const currentMsgStatus = String(sheet.getRange(rowIndex, 28).getValue()).trim().toUpperCase();
  const currentOrderStatus = String(sheet.getRange(rowIndex, 24).getValue()).trim().toUpperCase();

  if (currentOrderStatus === "CONFIRMED" && currentMsgStatus === "PAYMENT_CONFIRMATION_SENT") {
    return; // Already processed, prevent duplicate SMS
  }

  // 1. Payment Status = YES
  sheet.getRange(rowIndex, 22).setValue("YES");

  // 2. Order Status = CONFIRMED
  sheet.getRange(rowIndex, 24).setValue("CONFIRMED");

  // 3. Delivery Status = PROCESSING
  sheet.getRange(rowIndex, 25).setValue("PROCESSING");

  // 4. Expected Delivery = current confirmation time + 24 hours
  const now = new Date();
  const deliveryTime = new Date(now.getTime() + (24 * 60 * 60 * 1000));
  const deliveryFormatted = Utilities.formatDate(deliveryTime, "Asia/Kolkata", "dd/MM/yyyy, hh:mm a");
  sheet.getRange(rowIndex, 27).setValue(deliveryFormatted + " (Within 24 Hours)");

  // Read Customer Details for SMS (Col 1 = Order ID, Col 4 = Mobile)
  const orderId = sheet.getRange(rowIndex, 1).getValue();
  const customerMobile = sheet.getRange(rowIndex, 4).getValue();

  const orderData = {
    orderId: orderId,
    mobileNumber: customerMobile,
    expectedDelivery: deliveryFormatted
  };

  // 5. Send Confirmation SMS
  const smsResult = sendConfirmationSMS(orderData);

  if (smsResult.success) {
    sheet.getRange(rowIndex, 28).setValue("PAYMENT_CONFIRMATION_SENT");
    const notes = String(sheet.getRange(rowIndex, 29).getValue() || "");
    sheet.getRange(rowIndex, 29).setValue((notes ? notes + " | " : "") + "Payment verified by Admin. Confirmation SMS sent.");
  } else {
    // If provider is not configured, still mark CONFIRMED without faking SMS
    sheet.getRange(rowIndex, 28).setValue(smsResult.code || "SMS_NOT_CONFIGURED");
    const notes = String(sheet.getRange(rowIndex, 29).getValue() || "");
    sheet.getRange(rowIndex, 29).setValue((notes ? notes + " | " : "") + (smsResult.reason || "SMS provider not configured"));
  }
}

// ============================================================================
// 7. processRejectedPayment(sheet, rowIndex, rowData)
// ============================================================================
function processRejectedPayment(sheet, rowIndex, rowData) {
  sheet.getRange(rowIndex, 22).setValue("NO");
  sheet.getRange(rowIndex, 24).setValue("CANCELLED");
  sheet.getRange(rowIndex, 25).setValue("CANCELLED");
  sheet.getRange(rowIndex, 28).setValue("PAYMENT_REJECTED");

  const notes = String(sheet.getRange(rowIndex, 29).getValue() || "");
  sheet.getRange(rowIndex, 29).setValue((notes ? notes + " | " : "") + "Payment not verified");
}

// ============================================================================
// 8. sendConfirmationSMS(orderData)
// ============================================================================
function sendConfirmationSMS(orderData) {
  const apiUrl = SCRIPT_CONFIG.SMS_API_URL;
  const authKey = SCRIPT_CONFIG.SMS_AUTH_KEY;
  const senderId = SCRIPT_CONFIG.SMS_SENDER_ID;

  if (!apiUrl || !authKey) {
    return {
      success: false,
      code: "SMS_NOT_CONFIGURED",
      reason: "SMS provider not configured"
    };
  }

  try {
    const mobile = String(orderData.mobileNumber).trim();
    const orderId = orderData.orderId;
    const smsMessage = `RAJVAARI: आपका payment verify हो गया है। Order ID: ${orderId} confirmed है। आपकी delivery 24 घंटे के अंदर होगी। धन्यवाद।`;

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

    if (code >= 200 && code < 300) {
      return { success: true };
    } else {
      return {
        success: false,
        code: "SMS_FAILED",
        reason: "SMS API HTTP Error " + code
      };
    }
  } catch (err) {
    return {
      success: false,
      code: "SMS_FAILED",
      reason: "SMS Exception: " + err.toString()
    };
  }
}

// ============================================================================
// 9. cancelExpiredOrders() - 24 Hours Timeout for PENDING Orders
// ============================================================================
function cancelExpiredOrders() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 29).getValues();
  const now = new Date().getTime();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowIndex = i + 2;

    const paymentStatus = String(row[21]).trim().toUpperCase();
    const orderStatus = String(row[23]).trim().toUpperCase();
    const timestampStr = row[1];

    if (paymentStatus === "PENDING" && orderStatus === "PENDING") {
      let orderTime = new Date(timestampStr).getTime();
      if (isNaN(orderTime)) continue;

      if ((now - orderTime) > TWENTY_FOUR_HOURS_MS) {
        // Cancel order after 24 hours
        sheet.getRange(rowIndex, 22).setValue("NO");
        sheet.getRange(rowIndex, 24).setValue("CANCELLED");
        sheet.getRange(rowIndex, 25).setValue("CANCELLED");
        sheet.getRange(rowIndex, 28).setValue("PAYMENT_EXPIRED");

        const notes = String(row[28] || "");
        sheet.getRange(rowIndex, 29).setValue((notes ? notes + " | " : "") + "Payment not received within 24 hours");
      }
    }
  }
}

// ============================================================================
// 10. findOrderRow(sheet, orderId)
// ============================================================================
function findOrderRow(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const target = String(orderId).trim().toUpperCase();
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim().toUpperCase() === target) {
      return i + 2; // Row number in spreadsheet
    }
  }
  return -1;
}

// ============================================================================
// 11. getSheet()
// ============================================================================
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SCRIPT_CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.getSheets()[0];
  }

  // Ensure header row exists
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SCRIPT_CONFIG.COLUMNS);
  }

  return sheet;
}

// ============================================================================
// 12. getBottlePrice(bottleSize) - Backend Pricing Authority
// ============================================================================
function getBottlePrice(bottleSize) {
  const size = String(bottleSize).toLowerCase();
  if (size.indexOf("200") !== -1) {
    return 10; // ₹10 for 200ml
  }
  return 20; // ₹20 for 1 Liter
}

// ============================================================================
// 13. createOrderId()
// ============================================================================
function createOrderId() {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, "Asia/Kolkata", "yyyyMMdd");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RAJ-${dateStr}-${rand}`;
}

// ============================================================================
// 14. jsonResponse(obj)
// ============================================================================
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// 15. setupTriggers() - Installable Edit Trigger & Time-driven Trigger
// ============================================================================
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let hasEditTrigger = false;
  let hasTimeTrigger = false;

  for (let i = 0; i < triggers.length; i++) {
    const handler = triggers[i].getHandlerFunction();
    if (handler === "onEditInstalled") {
      hasEditTrigger = true;
    }
    if (handler === "checkPaymentStatus") {
      hasTimeTrigger = true;
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!hasEditTrigger) {
    ScriptApp.newTrigger("onEditInstalled")
      .forSpreadsheet(ss)
      .onEdit()
      .create();
    Logger.log("Created installable onEdit trigger.");
  }

  if (!hasTimeTrigger) {
    ScriptApp.newTrigger("checkPaymentStatus")
      .timeBased()
      .everyHours(1)
      .create();
    Logger.log("Created 1-hour time-driven trigger for checkPaymentStatus.");
  }
}

/**
 * Installable Spreadsheet Edit Trigger Handler
 */
function onEditInstalled(e) {
  if (!e || !e.range) return;

  const range = e.range;
  const sheet = range.getSheet();
  const row = range.getRow();
  const col = range.getColumn();

  if (row <= 1) return; // Header row

  // Column 22 is Payment Status
  if (col === 22) {
    const val = String(range.getValue()).trim().toUpperCase();

    if (val === "YES") {
      const rowData = sheet.getRange(row, 1, 1, 29).getValues()[0];
      processConfirmedPayment(sheet, row, rowData);
    } else if (val === "NO") {
      const rowData = sheet.getRange(row, 1, 1, 29).getValues()[0];
      processRejectedPayment(sheet, row, rowData);
    }
  }
}
