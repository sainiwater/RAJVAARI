/**
 * ============================================================================
 * RAJVAARI PACKAGED DRINKING WATER - GOOGLE APPS SCRIPT BACKEND
 * ============================================================================
 * Brand: RAJVAARI
 * Tagline: "शुद्ध पानी, भरोसे के साथ"
 * Features:
 *  1. doPost: Receives order submissions and appends to Sheet (Exact 29 Columns)
 *  2. doGet: Supports live order tracking by Order ID + Mobile Number
 *  3. onEdit: Automatic Admin workflow when Payment Status is changed to PAID:
 *     - Updates Order Status -> CONFIRMED
 *     - Updates Delivery Status -> PROCESSING
 *     - Sets Expected Delivery -> +24 Hours
 *     - Dispatches SMS notification (with duplicate prevention)
 * ============================================================================
 */

// ============================================================================
// 1. BACKEND CONFIGURATION
// ============================================================================
const BACKEND_CONFIG = {
  SHEET_NAME: "Orders", // Name of the sheet tab (or first active tab)
  
  // SMS API CONFIGURATION (Part 18)
  // Set your provider details in Google Apps Script Script Properties or below:
  SMS: {
    PROVIDER: "",   // e.g. "FAST2SMS", "MSG91", "TWILIO" (Leave blank if not connected)
    API_URL: "",    // e.g. "https://www.fast2sms.com/dev/bulkV2"
    API_KEY: "",    // Your SMS Gateway API Key
    SENDER_ID: "RJVARI"
  },

  // EXACT 29 COLUMNS (Part 11)
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
// 2. doPost: ORDER SUBMISSION HANDLER
// ============================================================================
function doPost(e) {
  try {
    const rawData = e.postData ? e.postData.contents : "{}";
    const data = JSON.parse(rawData);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(BACKEND_CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = ss.getSheets()[0];
    }

    // Ensure headers exist
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(BACKEND_CONFIG.COLUMNS);
    }

    // Prepare 29 Columns Row
    const orderId = data.orderId || data["Order ID"] || generateBackendOrderId();
    const now = new Date();
    const timestamp = data.timestamp || data["Timestamp"] || now.toISOString();
    const orderDate = data.orderDate || data["Order Date"] || Utilities.formatDate(now, "Asia/Kolkata", "dd/MM/yyyy");

    const row = [
      orderId,                                                                      // 1. Order ID
      timestamp,                                                                    // 2. Timestamp
      data.customerName || data["Customer Name"] || "",                             // 3. Customer Name
      data.mobileNumber || data["Mobile Number"] || "",                             // 4. Mobile Number
      data.alternateNumber || data["Alternate Number"] || "N/A",                   // 5. Alternate Number
      data.fullAddress || data["Full Address"] || "",                               // 6. Full Address
      data.villageArea || data["Village/Area"] || "N/A",                            // 7. Village/Area
      data.city || data["City"] || "",                                              // 8. City
      data.district || data["District"] || "",                                      // 9. District
      data.state || data["State"] || "Rajasthan",                                   // 10. State
      data.pincode || data["PIN Code"] || "",                                       // 11. PIN Code
      data.product || data["Product"] || "RAJVAARI Drinking Water",                 // 12. Product
      data.brand || data["Brand"] || "RAJVAARI",                                    // 13. Brand
      data.bottleSize || data["Bottle Size"] || "1 Liter",                          // 14. Bottle Size
      Number(data.quantity || data["Quantity"] || 1),                               // 15. Quantity
      Number(data.pricePerBottle || data["Price Per Bottle"] || 20),                // 16. Price Per Bottle
      Number(data.subtotal || data["Subtotal"] || 20),                              // 17. Subtotal
      Number(data.deliveryCharge || data["Delivery Charge"] || 0),                  // 18. Delivery Charge
      Number(data.discount || data["Discount"] || 0),                               // 19. Discount
      Number(data.totalOrderAmount || data["Total Order Amount"] || data.totalAmount || 20), // 20. Total Order Amount
      1,                                                                            // 21. Payment Required (Test: ₹1)
      "PENDING",                                                                    // 22. Payment Status
      "",                                                                           // 23. Payment ID
      "PENDING",                                                                    // 24. Order Status
      "PENDING",                                                                    // 25. Delivery Status
      orderDate,                                                                    // 26. Order Date
      "Pending confirmation",                                                       // 27. Expected Delivery
      "PENDING",                                                                    // 28. Customer Message Status
      data.notes || data["Notes"] || "PhonePe QR payment verification pending"     // 29. Notes
    ];

    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      orderId: orderId,
      message: "Order recorded successfully in Google Sheet"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 3. doGet: ORDER TRACKING QUERY
// ============================================================================
function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action;
    const searchOrderId = (params.orderId || "").trim().toUpperCase();
    const searchMobile = (params.mobileNumber || "").trim();

    if (action === "trackOrder" && searchOrderId && searchMobile) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName(BACKEND_CONFIG.SHEET_NAME) || ss.getSheets()[0];
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "No orders found in sheet"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowOrderId = String(row[0]).trim().toUpperCase();
        const rowMobile = String(row[3]).trim();

        if (rowOrderId === searchOrderId && rowMobile === searchMobile) {
          const orderObj = {
            orderId: row[0],
            customerName: row[2],
            mobileNumber: row[3],
            product: row[11],
            bottleSize: row[13],
            quantity: row[14],
            totalOrderAmount: row[19],
            paymentRequired: row[20],
            paymentStatus: row[21],
            paymentId: row[22],
            orderStatus: row[23],
            deliveryStatus: row[24],
            expectedDelivery: row[26]
          };

          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            order: orderObj
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Order not found"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "active",
      brand: "RAJVAARI",
      service: "Packaged Drinking Water Ordering API"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 4. onEdit: AUTOMATIC ADMIN ACTION WHEN PAYMENT IS MARKED "PAID"
// ============================================================================
function onEdit(e) {
  if (!e || !e.range) return;

  const range = e.range;
  const sheet = range.getSheet();
  const row = range.getRow();
  const col = range.getColumn();

  // Ignore header row
  if (row <= 1) return;

  // Column 22 is "Payment Status"
  if (col === 22) {
    const newStatus = String(range.getValue()).trim().toUpperCase();

    if (newStatus === "PAID") {
      processPaymentConfirmation(sheet, row);
    }
  }
}

/**
 * Handles the PENDING -> PAID transition:
 * 1. Order Status -> CONFIRMED
 * 2. Delivery Status -> PROCESSING
 * 3. Expected Delivery -> Confirmation time + 24 hours
 * 4. SMS sent to customer (Duplicate SMS prevented via Customer Message Status)
 */
function processPaymentConfirmation(sheet, row) {
  // Read existing Customer Message Status (Column 28)
  const currentMsgStatus = String(sheet.getRange(row, 28).getValue()).trim().toUpperCase();

  // PART 19: DUPLICATE PROTECTION - DO NOT SEND AGAIN IF ALREADY SENT
  if (currentMsgStatus === "PAYMENT_CONFIRMATION_SENT") {
    Logger.log("SMS already sent for row " + row + ". Skipping duplicate dispatch.");
    return;
  }

  // 1. Order Status (Col 24) -> CONFIRMED
  sheet.getRange(row, 24).setValue("CONFIRMED");

  // 2. Delivery Status (Col 25) -> PROCESSING
  sheet.getRange(row, 25).setValue("PROCESSING");

  // 3. Expected Delivery (Col 27) -> +24 Hours from now
  const confirmTime = new Date();
  const deliveryTime = new Date(confirmTime.getTime() + (24 * 60 * 60 * 1000));
  const deliveryFormatted = Utilities.formatDate(deliveryTime, "Asia/Kolkata", "dd/MM/yyyy, hh:mm a");
  sheet.getRange(row, 27).setValue(deliveryFormatted + " (Within 24 Hours)");

  // Read Customer Details for SMS
  const orderId = sheet.getRange(row, 1).getValue();
  const customerName = sheet.getRange(row, 3).getValue();
  const mobileNumber = sheet.getRange(row, 4).getValue();

  // PART 17 & 18: SEND SMS OR RECORD LOG
  const smsMessage = "RAJVAARI: नमस्ते " + customerName + ", आपका payment सफलतापूर्वक verify हो गया है। आपका Order ID " + orderId + " है। आपका RAJVAARI water order confirmed है और expected delivery 24 घंटे के अंदर (" + deliveryFormatted + ") होगी। धन्यवाद।";

  const smsResult = dispatchCustomerSms(mobileNumber, smsMessage);

  if (smsResult.success) {
    sheet.getRange(row, 28).setValue("PAYMENT_CONFIRMATION_SENT");
    const existingNotes = sheet.getRange(row, 29).getValue();
    sheet.getRange(row, 29).setValue((existingNotes ? existingNotes + " | " : "") + "Payment verified by Admin. Confirmation SMS sent to " + mobileNumber);
  } else {
    // If SMS provider not yet connected or failed
    sheet.getRange(row, 28).setValue("PAYMENT_CONFIRMATION_SENT"); // Marked sent to prevent loop
    const existingNotes = sheet.getRange(row, 29).getValue();
    sheet.getRange(row, 29).setValue((existingNotes ? existingNotes + " | " : "") + "Admin confirmed payment. SMS status: " + smsResult.reason);
  }
}

/**
 * Dispatches SMS using configured SMS Gateway.
 * If credentials are not set, reports "SMS not configured" without faking it.
 */
function dispatchCustomerSms(mobile, message) {
  const provider = BACKEND_CONFIG.SMS.PROVIDER;
  const apiKey = BACKEND_CONFIG.SMS.API_KEY;
  const apiUrl = BACKEND_CONFIG.SMS.API_URL;

  if (!provider || !apiKey || !apiUrl) {
    Logger.log("SMS Provider credentials not configured in BACKEND_CONFIG.SMS");
    return {
      success: false,
      reason: "SMS not configured (Provider credentials required)"
    };
  }

  try {
    // Standard SMS Provider HTTP Call Example
    const payload = {
      sender_id: BACKEND_CONFIG.SMS.SENDER_ID,
      message: message,
      numbers: mobile
    };

    const options = {
      method: "post",
      headers: {
        "authorization": apiKey,
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
      return { success: false, reason: "SMS API HTTP Error " + code + ": " + response.getContentText() };
    }
  } catch (err) {
    return { success: false, reason: "SMS Exception: " + err.toString() };
  }
}

function generateBackendOrderId() {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, "Asia/Kolkata", "yyyyMMdd");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return "RAJ-" + dateStr + "-" + rand;
}
