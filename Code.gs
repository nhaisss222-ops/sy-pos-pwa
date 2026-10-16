/**
 * ລະບົບ POS ຂາຍເຄື່ອງ (ຮອງຮັບຫຼາຍຮ້ານ/ຫຼາຍສາຂາ) – Google Apps Script web app
 * ບັນທຶກຂໍ້ມູນລົງ Google Sheet ໂດຍກົງ
 */
var SHEET_ID = '1FlAH3B_g-vibaboYg3EN86xgTw073D8ahhqCgDuMEDk';

var SH_SHOP = 'Shops';
var SH_BRANCH = 'Branches';
var SH_PRODUCT = 'Products';
var SH_CATEGORY = 'Categories';
var SH_STOCK = 'Stock';
var SH_SALE = 'Sales';
var SH_SALEITEM = 'SaleItems';
var SH_EXPENSE = 'Expenses';
var SH_INCOME = 'Incomes';
var SH_CLOSING = 'Closings';
var SH_EMPLOYEE = 'Employees';
var SH_HELDBILL = 'HeldBills';
var SH_STOCKIN = 'StockIns';

var HEAD_SHOP = ['ID', 'Name'];
var HEAD_BRANCH = ['ID', 'ShopID', 'Name'];
var HEAD_PRODUCT = ['ID', 'ShopID', 'Name', 'Category', 'Price', 'Unit', 'MinStock', 'Active', 'Image'];
var HEAD_CATEGORY = ['ID', 'ShopID', 'Name'];
var HEAD_STOCK = ['BranchID', 'ProductID', 'Qty'];
var HEAD_SALE = ['ID', 'DateTime', 'BranchID', 'PaymentType', 'Total', 'Note', 'EmployeeID', 'CashAmount', 'TransferAmount', 'Discount'];
var HEAD_EMPLOYEE = ['ID', 'ShopID', 'Name'];
var HEAD_SALEITEM = ['SaleID', 'ProductID', 'ProductName', 'Qty', 'UnitPrice', 'LineTotal'];
var HEAD_EXPENSE = ['ID', 'Date', 'BranchID', 'Category', 'Item', 'Amount', 'Note', 'PaymentType'];
var HEAD_INCOME = ['ID', 'Date', 'BranchID', 'Category', 'Item', 'Amount', 'PaymentType', 'Note'];
var HEAD_CLOSING = ['ID', 'Date', 'BranchID', 'Cash', 'Transfer', 'Note', 'ClosedAt'];
var HEAD_HELDBILL = ['ID', 'DateTime', 'BranchID', 'CustomerName', 'ItemsJSON', 'Total', 'Note'];
var HEAD_STOCKIN = ['ID', 'Date', 'BranchID', 'ProductID', 'ProductName', 'Qty', 'Note'];

var CATEGORIES = ['ຄ່າເຊົ່າ', 'ຄ່ານ້ຳ', 'ຄ່ານ້ຳກ້ອນ', 'ຄ່າໄຟ', 'ຄ່າແຮງງານ / ເງິນເດືອນ', 'ຄ່າຂົນສົ່ງ / ຊື້ສິນຄ້າເພີ່ມ', 'ຄ່າອຸປະກອນ', 'ຖອນເງິນຈາກບັນຊີ', 'ລາຍຈ່າຍອື່ນໆ'];
var INCOME_CATEGORIES = ['ລາຍຮັບອື່ນໆ', 'ເພີ່ມທຶນ/ນຳເງິນເຂົ້າ', 'ໜີ້ສິນ (ຮັບເງິນຄືນ)', 'ດອກເບ້ຍ/ຜົນຕອບແທນ', 'ຂາຍຊັບສິນ/ອຸປະກອນເກົ່າ'];

/* ---------- web app ---------- */
/* ໜ້າ Apps Script ເດີມ (HtmlService) ຖືກປິດແລ້ວ ເພາະມັນເອີ້ນຟັງຊັນໂດຍກົງຜ່ານ google.script.run ໂດຍບໍ່ຜ່ານການລັອກອິນ.
   ໃຊ້ແອັບ PWA ແທນ: https://nhaisss222-ops.github.io/sy-pos-pwa/ */
function doGet() {
  return ContentService.createTextOutput('ກະລຸນາໃຊ້ແອັບ: https://nhaisss222-ops.github.io/sy-pos-pwa/')
    .setMimeType(ContentService.MimeType.TEXT);
}

/* ---------- JSON API (ສຳລັບ frontend ພາຍນອກ/PWA ເອີ້ນຜ່ານ fetch) ---------- */
var API_ALLOWED_FNS_ = {
  getBootstrap: getBootstrap,
  recordSale: recordSale,
  voidSale: voidSale,
  getRecentData: getRecentData,
  getMonthData: getMonthData,
  saveProduct: saveProduct,
  setProductActive: setProductActive,
  setStock: setStock,
  addShop: addShop,
  renameShop: renameShop,
  addBranch: addBranch,
  renameBranch: renameBranch,
  addCategory: addCategory,
  renameCategory: renameCategory,
  addEmployee: addEmployee,
  renameEmployee: renameEmployee,
  addExpense: addExpense,
  deleteExpense: deleteExpense,
  addIncome: addIncome,
  deleteIncome: deleteIncome,
  closeDay: closeDay,
  holdBill: holdBill,
  getHeldBills: getHeldBills,
  deleteHeldBill: deleteHeldBill,
  addStockIn: addStockIn
};

function doPost(e) {
  var out;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = { ok: true, result: handleApi_(body.fn, body.args || [], body.token) };
  } catch (err) {
    out = { ok: false, error: (err && err.message) ? err.message : String(err) };
    if (err && err.isAuth) out.auth = true;
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/** ແລ່ນຄັ້ງດຽວນຳກັນ ເພື່ອສ້າງ sheet ທັງໝົດລ່ວງໜ້າ (ບໍ່ບັງຄັບ, getBootstrap ກໍ່ສ້າງໃຫ້ອັດຕະໂນມັດຢູ່ແລ້ວ) */
function setup() {
  getBootstrap();
  return 'ຕັ້ງຄ່າສຳເລັດແລ້ວ';
}

/* ---------- sheet helpers ---------- */
var _ssCache_ = null;
function ss_() {
  if (!_ssCache_) _ssCache_ = SpreadsheetApp.openById(SHEET_ID);
  return _ssCache_;
}

function sh_(name, headers) {
  var ss = ss_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function newId_() { return Utilities.getUuid().split('-').join('').substring(0, 12); }

/** Sales sheet ອາດຖືກສ້າງຕັ້ງແຕ່ກ່ອນມີຖັນ EmployeeID — ເພີ່ມຖັນນີ້ໃຫ້ອັດຕະໂນມັດຖ້າຍັງບໍ່ມີ (ບໍ່ກະທົບຂໍ້ມູນເກົ່າ) */
function saleSheet_() {
  var sheet = sh_(SH_SALE, HEAD_SALE);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headerRow.indexOf('EmployeeID') === -1) {
    headerRow.push('EmployeeID');
    sheet.getRange(1, headerRow.length).setValue('EmployeeID');
  }
  if (headerRow.indexOf('CashAmount') === -1) {
    headerRow.push('CashAmount');
    sheet.getRange(1, headerRow.length).setValue('CashAmount');
  }
  if (headerRow.indexOf('TransferAmount') === -1) {
    headerRow.push('TransferAmount');
    sheet.getRange(1, headerRow.length).setValue('TransferAmount');
  }
  if (headerRow.indexOf('Discount') === -1) {
    headerRow.push('Discount');
    sheet.getRange(1, headerRow.length).setValue('Discount');
  }
  return sheet;
}

/** Expenses sheet ອາດຖືກສ້າງຕັ້ງແຕ່ກ່ອນມີຖັນ PaymentType — ເພີ່ມຖັນນີ້ໃຫ້ອັດຕະໂນມັດຖ້າຍັງບໍ່ມີ (ບໍ່ກະທົບຂໍ້ມູນເກົ່າ) */
function expenseSheet_() {
  var sheet = sh_(SH_EXPENSE, HEAD_EXPENSE);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headerRow.indexOf('PaymentType') === -1) {
    sheet.getRange(1, headerRow.length + 1).setValue('PaymentType');
  }
  return sheet;
}

function tz_() { return Session.getScriptTimeZone() || 'Asia/Vientiane'; }

function fmtDate_(d) {
  if (!(d instanceof Date)) d = new Date(d);
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
}

function fmtTime_(d) {
  if (!(d instanceof Date)) d = new Date(d);
  return Utilities.formatDate(d, tz_(), 'HH:mm');
}

function readAll_(sheet) {
  var vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return [];
  var headers = vals[0];
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    var row = vals[i];
    if (row[0] === '' || row[0] === null) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = row[j];
    out.push(obj);
  }
  return out;
}

function findRowIndex_(sheet, idColIdx, id) {
  var vals = sheet.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][idColIdx]) === String(id)) return i + 1;
  }
  return -1;
}

/* ---------- bootstrap (ໂຫຼດຂໍ້ມູນເທື່ອດຽວຕອນເປີດແອັບ) ---------- */
function getBootstrap() {
  var shopSheet = sh_(SH_SHOP, HEAD_SHOP);
  var branchSheet = sh_(SH_BRANCH, HEAD_BRANCH);
  var productSheet = sh_(SH_PRODUCT, HEAD_PRODUCT);
  var categorySheet = sh_(SH_CATEGORY, HEAD_CATEGORY);
  var stockSheet = sh_(SH_STOCK, HEAD_STOCK);
  var employeeSheet = sh_(SH_EMPLOYEE, HEAD_EMPLOYEE);
  saleSheet_();
  sh_(SH_SALEITEM, HEAD_SALEITEM);
  expenseSheet_();
  sh_(SH_INCOME, HEAD_INCOME);

  return {
    shops: readAll_(shopSheet),
    branches: readAll_(branchSheet),
    products: readAll_(productSheet),
    productCategories: readAll_(categorySheet),
    stock: readAll_(stockSheet),
    employees: readAll_(employeeSheet),
    expenseCategories: CATEGORIES,
    incomeCategories: INCOME_CATEGORIES,
    sheetUrl: 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit'
  };
}

/* ---------- ຮ້ານ ---------- */
function addShop(name) {
  name = String(name || '').trim();
  if (!name) throw new Error('ກະລຸນາປ້ອນຊື່ຮ້ານ');
  var sheet = sh_(SH_SHOP, HEAD_SHOP);
  var id = newId_();
  sheet.appendRow([id, name]);
  return { ID: id, Name: name };
}

function renameShop(id, name) {
  name = String(name || '').trim();
  if (!name) throw new Error('ກະລຸນາປ້ອນຊື່ຮ້ານ');
  var sheet = sh_(SH_SHOP, HEAD_SHOP);
  var row = findRowIndex_(sheet, 0, id);
  if (row < 0) throw new Error('ບໍ່ພົບຮ້ານ');
  sheet.getRange(row, 2).setValue(name);
  return true;
}

/* ---------- branches ---------- */
function addBranch(shopId, name) {
  name = String(name || '').trim();
  if (!shopId) throw new Error('ກະລຸນາເລືອກຮ້ານ');
  if (!name) throw new Error('ກະລຸນາປ້ອນຊື່ສາຂາ');
  var sheet = sh_(SH_BRANCH, HEAD_BRANCH);
  var id = newId_();
  sheet.appendRow([id, shopId, name]);
  return { ID: id, ShopID: shopId, Name: name };
}

function renameBranch(id, name) {
  name = String(name || '').trim();
  if (!name) throw new Error('ກະລຸນາປ້ອນຊື່ສາຂາ');
  var sheet = sh_(SH_BRANCH, HEAD_BRANCH);
  var row = findRowIndex_(sheet, 0, id);
  if (row < 0) throw new Error('ບໍ່ພົບສາຂາ');
  sheet.getRange(row, 3).setValue(name);
  return true;
}

/* ---------- ພະນັກງານ ---------- */
function addEmployee(shopId, name) {
  name = String(name || '').trim();
  if (!shopId) throw new Error('ກະລຸນາເລືອກຮ້ານ');
  if (!name) throw new Error('ກະລຸນາປ້ອນຊື່ພະນັກງານ');
  var sheet = sh_(SH_EMPLOYEE, HEAD_EMPLOYEE);
  var id = newId_();
  sheet.appendRow([id, shopId, name]);
  return { ID: id, ShopID: shopId, Name: name };
}

function renameEmployee(id, name) {
  name = String(name || '').trim();
  if (!name) throw new Error('ກະລຸນາປ້ອນຊື່ພະນັກງານ');
  var sheet = sh_(SH_EMPLOYEE, HEAD_EMPLOYEE);
  var row = findRowIndex_(sheet, 0, id);
  if (row < 0) throw new Error('ບໍ່ພົບພະນັກງານ');
  sheet.getRange(row, 3).setValue(name);
  return true;
}

/* ---------- ໝວດສິນຄ້າ ---------- */
function addCategory(shopId, name) {
  name = String(name || '').trim();
  if (!shopId) throw new Error('ກະລຸນາເລືອກຮ້ານ');
  if (!name) throw new Error('ກະລຸນາປ້ອນຊື່ໝວດ');
  var sheet = sh_(SH_CATEGORY, HEAD_CATEGORY);
  var vals = sheet.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][1]) === String(shopId) && String(vals[i][2]).toLowerCase() === name.toLowerCase()) {
      throw new Error('ມີໝວດນີ້ຢູ່ແລ້ວ');
    }
  }
  var id = newId_();
  sheet.appendRow([id, shopId, name]);
  return { ID: id, ShopID: shopId, Name: name };
}

function renameCategory(id, name) {
  name = String(name || '').trim();
  if (!name) throw new Error('ກະລຸນາປ້ອນຊື່ໝວດ');
  var sheet = sh_(SH_CATEGORY, HEAD_CATEGORY);
  var row = findRowIndex_(sheet, 0, id);
  if (row < 0) throw new Error('ບໍ່ພົບໝວດ');
  var shopId = sheet.getRange(row, 2).getValue();
  var oldName = sheet.getRange(row, 3).getValue();
  sheet.getRange(row, 3).setValue(name);

  if (String(oldName) !== name) {
    var productSheet = sh_(SH_PRODUCT, HEAD_PRODUCT);
    var vals = productSheet.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][1]) === String(shopId) && String(vals[i][3]) === String(oldName)) {
        productSheet.getRange(i + 1, 4).setValue(name);
      }
    }
  }
  return true;
}

/* ---------- products ---------- */
function saveProduct(p) {
  if (!p || !p.shopId) throw new Error('ກະລຸນາເລືອກຮ້ານ');
  if (!p || !String(p.name || '').trim()) throw new Error('ກະລຸນາປ້ອນຊື່ສິນຄ້າ');
  var sheet = sh_(SH_PRODUCT, HEAD_PRODUCT);
  var price = Number(p.price) || 0;
  var minStock = Number(p.minStock) || 0;
  if (p.id) {
    var row = findRowIndex_(sheet, 0, p.id);
    if (row < 0) throw new Error('ບໍ່ພົບສິນຄ້າ');
    var image = (p.image === undefined || p.image === null) ? (sheet.getRange(row, 9).getValue() || '') : p.image;
    sheet.getRange(row, 1, 1, 9).setValues([[p.id, p.shopId, p.name, p.category || '', price, p.unit || '', minStock, p.active === false ? 'N' : 'Y', image]]);
    return { id: p.id };
  }
  var id = newId_();
  sheet.appendRow([id, p.shopId, p.name, p.category || '', price, p.unit || '', minStock, 'Y', p.image || '']);
  return { id: id };
}

function setProductActive(id, active) {
  var sheet = sh_(SH_PRODUCT, HEAD_PRODUCT);
  var row = findRowIndex_(sheet, 0, id);
  if (row < 0) throw new Error('ບໍ່ພົບສິນຄ້າ');
  sheet.getRange(row, 8).setValue(active ? 'Y' : 'N');
  return true;
}

/* ---------- stock (ແຍກຕາມສາຂາ) ---------- */
function getStockRow_(sheet, branchId, productId) {
  var vals = sheet.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === String(branchId) && String(vals[i][1]) === String(productId)) return i + 1;
  }
  return -1;
}

function setStock(branchId, productId, qty) {
  var sheet = sh_(SH_STOCK, HEAD_STOCK);
  var row = getStockRow_(sheet, branchId, productId);
  qty = Number(qty) || 0;
  if (row < 0) {
    sheet.appendRow([branchId, productId, qty]);
  } else {
    sheet.getRange(row, 3).setValue(qty);
  }
  return true;
}

function adjustStock_(sheet, branchId, productId, delta) {
  var row = getStockRow_(sheet, branchId, productId);
  if (row < 0) {
    sheet.appendRow([branchId, productId, delta]);
  } else {
    var cur = Number(sheet.getRange(row, 3).getValue()) || 0;
    sheet.getRange(row, 3).setValue(cur + delta);
  }
}

/** ປັບສະຕັອກສະເພາະສິນຄ້າທີ່ມີການນັບສະຕັອກ (ມີແຖວ Stock) ຢູ່ແລ້ວເທົ່ານັ້ນ — ຖ້າບໍ່ມີແຖວ (ບໍ່ໄດ້ຕັ້ງສະຕັອກເລີ່ມຕົ້ນໄວ້) ແມ່ນບໍ່ນັບ, ຂ້າມໄປ ບໍ່ສ້າງແຖວໃໝ່ */
function adjustStockIfTracked_(sheet, branchId, productId, delta) {
  var row = getStockRow_(sheet, branchId, productId);
  if (row < 0) return;
  var cur = Number(sheet.getRange(row, 3).getValue()) || 0;
  sheet.getRange(row, 3).setValue(cur + delta);
}

/** ອ່ານ Stock sheet ຄັ້ງດຽວ ສ້າງເປັນ map (branchId|productId -> {row, qty}) — ໃຊ້ສຳລັບປັບສະຕັອກຫຼາຍລາຍການໃນການຮ້ອງຂໍດຽວ (ເຊັ່ນ ຫຼາຍລາຍການສິນຄ້າໃນ 1 ບິນ) ເພື່ອບໍ່ໃຫ້ອ່ານທັງຊີດຊ້ຳໆຕໍ່ 1 ລາຍການ (ໄວຂຶ້ນຫຼາຍເມື່ອມີຫຼາຍລາຍການ) */
function loadStockMap_(sheet) {
  var vals = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === '' && vals[i][1] === '') continue;
    var key = String(vals[i][0]) + '|' + String(vals[i][1]);
    map[key] = { row: i + 1, qty: Number(vals[i][2]) || 0 };
  }
  return map;
}

/** ປັບສະຕັອກຈາກ map ທີ່ອ່ານໄວ້ລ່ວງໜ້າ (loadStockMap_) — ບໍ່ອ່ານຊີດຊ້ຳ, ຂ້າມຖ້າສິນຄ້ານັ້ນບໍ່ໄດ້ຕິດຕາມສະຕັອກ (ບໍ່ມີແຖວ) */
function applyStockDeltaIfTracked_(sheet, stockMap, branchId, productId, delta) {
  var key = String(branchId) + '|' + String(productId);
  var entry = stockMap[key];
  if (!entry) return;
  entry.qty += delta;
  sheet.getRange(entry.row, 3).setValue(entry.qty);
}

/** ບັນທຶກການເພີ່ມສະຕັອກ (ມີວັນທີ) — ໃຊ້ຕອນເພີ່ມສິນຄ້າໃໝ່ (ສະຕັອກເລີ່ມຕົ້ນ) ຫຼື ຕື່ມສະຕັອກສິນຄ້າເກົ່າ */
function addStockIn(payload) {
  if (!payload || !payload.branchId) throw new Error('ກະລຸນາເລືອກສາຂາ');
  if (!payload.productId) throw new Error('ບໍ່ພົບສິນຄ້າ');
  var qty = Number(payload.qty) || 0;
  if (qty <= 0) throw new Error('ກະລຸນາປ້ອນຈຳນວນສະຕັອກ');
  var sheet = sh_(SH_STOCKIN, HEAD_STOCKIN);
  var id = newId_();
  var date = payload.date ? new Date(payload.date) : new Date();
  sheet.appendRow([id, date, payload.branchId, payload.productId, payload.productName || '', qty, payload.note || '']);
  var stockSheet = sh_(SH_STOCK, HEAD_STOCK);
  adjustStock_(stockSheet, payload.branchId, payload.productId, qty);
  return { id: id, qty: qty };
}

/* ---------- ການຂາຍ (POS) ---------- */
function recordSale(sale) {
  if (!sale || !sale.branchId) throw new Error('ກະລຸນາເລືອກສາຂາ');
  if (!sale.items || !sale.items.length) throw new Error('ບໍ່ມີລາຍການສິນຄ້າ');
  if (sale.paymentType !== 'cash' && sale.paymentType !== 'transfer' && sale.paymentType !== 'split') throw new Error('ກະລຸນາເລືອກປະເພດການຮັບເງິນ');

  var saleSheet = saleSheet_();
  var itemSheet = sh_(SH_SALEITEM, HEAD_SALEITEM);
  var stockSheet = sh_(SH_STOCK, HEAD_STOCK);

  var id = newId_();
  var subtotal = 0;
  var rows = [];
  for (var i = 0; i < sale.items.length; i++) {
    var it = sale.items[i];
    var qty = Number(it.qty) || 0;
    var price = Number(it.price) || 0;
    if (qty <= 0) continue;
    var lineTotal = qty * price;
    subtotal += lineTotal;
    rows.push([id, it.productId, it.name, qty, price, lineTotal]);
  }
  if (!rows.length) throw new Error('ບໍ່ມີລາຍການສິນຄ້າ');

  var discount = Number(sale.discount) || 0;
  if (discount < 0) discount = 0;
  if (discount > subtotal) discount = subtotal;
  var total = subtotal - discount;

  var cashAmount = 0, transferAmount = 0;
  if (sale.paymentType === 'cash') {
    cashAmount = total;
  } else if (sale.paymentType === 'transfer') {
    transferAmount = total;
  } else {
    cashAmount = Number(sale.cashAmount) || 0;
    transferAmount = Number(sale.transferAmount) || 0;
    if (Math.abs((cashAmount + transferAmount) - total) > 1) {
      throw new Error('ຍອດແຍກຈ່າຍ (ສົດ+ໂອນ) ບໍ່ເທົ່າກັບຍອດລວມ');
    }
  }

  saleSheet.appendRow([id, new Date(), sale.branchId, sale.paymentType, total, sale.note || '', sale.employeeId || '', cashAmount, transferAmount, discount]);
  itemSheet.getRange(itemSheet.getLastRow() + 1, 1, rows.length, 6).setValues(rows);

  var stockMap = loadStockMap_(stockSheet);
  for (var k = 0; k < rows.length; k++) {
    applyStockDeltaIfTracked_(stockSheet, stockMap, sale.branchId, rows[k][1], -(Number(rows[k][3]) || 0));
  }

  return { id: id, total: total, subtotal: subtotal, discount: discount };
}

function voidSale(saleId) {
  var saleSheet = saleSheet_();
  var itemSheet = sh_(SH_SALEITEM, HEAD_SALEITEM);
  var stockSheet = sh_(SH_STOCK, HEAD_STOCK);

  var saleRow = findRowIndex_(saleSheet, 0, saleId);
  if (saleRow < 0) throw new Error('ບໍ່ພົບລາຍການຂາຍ');
  var branchId = saleSheet.getRange(saleRow, 3).getValue();

  var itemVals = itemSheet.getDataRange().getValues();
  var rowsToDelete = [];
  var stockMap = loadStockMap_(stockSheet);
  for (var i = 1; i < itemVals.length; i++) {
    if (String(itemVals[i][0]) === String(saleId)) {
      applyStockDeltaIfTracked_(stockSheet, stockMap, branchId, itemVals[i][1], Number(itemVals[i][3]) || 0);
      rowsToDelete.push(i + 1);
    }
  }
  for (var j = rowsToDelete.length - 1; j >= 0; j--) itemSheet.deleteRow(rowsToDelete[j]);
  saleSheet.deleteRow(saleRow);
  return true;
}

/* ---------- ບິນລໍຖ້າ (ບັນທຶກກະຕ່າໄວ້ລໍຖ້າການຊຳລະເງິນ, ບໍ່ແມ່ນລາຍການຂາຍທີ່ສຳເລັດແລ້ວ) ---------- */
function holdBill(payload) {
  if (!payload || !payload.branchId) throw new Error('ກະລຸນາເລືອກສາຂາ');
  if (!payload.items || !payload.items.length) throw new Error('ບໍ່ມີລາຍການສິນຄ້າ');
  var sheet = sh_(SH_HELDBILL, HEAD_HELDBILL);
  var id = newId_();
  var total = 0;
  payload.items.forEach(function (it) {
    total += (Number(it.qty) || 0) * (Number(it.price) || 0);
  });
  sheet.appendRow([id, new Date(), payload.branchId, payload.customerName || '', JSON.stringify(payload.items), total, payload.note || '']);
  return { id: id, total: total };
}

function getHeldBills() {
  var sheet = sh_(SH_HELDBILL, HEAD_HELDBILL);
  var rows = readAll_(sheet);
  rows.forEach(function (r) {
    try { r.Items = JSON.parse(r.ItemsJSON || '[]'); } catch (e) { r.Items = []; }
    delete r.ItemsJSON;
    if (r.DateTime) r.Time = fmtTime_(r.DateTime);
  });
  return rows;
}

function deleteHeldBill(id) {
  var sheet = sh_(SH_HELDBILL, HEAD_HELDBILL);
  var row = findRowIndex_(sheet, 0, id);
  if (row < 0) throw new Error('ບໍ່ພົບບິນລໍຖ້າ');
  sheet.deleteRow(row);
  return true;
}

/* ---------- ລາຍຈ່າຍ ---------- */
function addExpense(e) {
  if (!e || !e.branchId) throw new Error('ກະລຸນາເລືອກສາຂາ');
  if (!Number(e.amount)) throw new Error('ກະລຸນາປ້ອນຈຳນວນເງິນ');
  var sheet = expenseSheet_();
  var id = newId_();
  var amount = Number(e.amount) || 0;
  var date = e.date ? new Date(e.date) : new Date();
  var paymentType = (e.paymentType === 'transfer') ? 'transfer' : 'cash';
  sheet.appendRow([id, date, e.branchId, e.category || '', e.item || '', amount, e.note || '', paymentType]);
  return { id: id };
}

function deleteExpense(id) {
  var sheet = expenseSheet_();
  var row = findRowIndex_(sheet, 0, id);
  if (row < 0) throw new Error('ບໍ່ພົບລາຍຈ່າຍ');
  sheet.deleteRow(row);
  return true;
}

/* ---------- ລາຍຮັບ (ນອກຈາກການຂາຍ, ບັນທຶກເອງ) ---------- */
function addIncome(e) {
  if (!e || !e.branchId) throw new Error('ກະລຸນາເລືອກສາຂາ');
  if (!Number(e.amount)) throw new Error('ກະລຸນາປ້ອນຈຳນວນເງິນ');
  if (e.paymentType !== 'cash' && e.paymentType !== 'transfer') throw new Error('ກະລຸນາເລືອກປະເພດຮັບເງິນ');
  var sheet = sh_(SH_INCOME, HEAD_INCOME);
  var id = newId_();
  var amount = Number(e.amount) || 0;
  var date = e.date ? new Date(e.date) : new Date();
  sheet.appendRow([id, date, e.branchId, e.category || '', e.item || '', amount, e.paymentType, e.note || '']);
  return { id: id };
}

function deleteIncome(id) {
  var sheet = sh_(SH_INCOME, HEAD_INCOME);
  var row = findRowIndex_(sheet, 0, id);
  if (row < 0) throw new Error('ບໍ່ພົບລາຍຮັບ');
  sheet.deleteRow(row);
  return true;
}

/* ---------- ປິດບັນຊີປະຈຳວັນ (Daily closing) ---------- */
function findClosingRow_(sheet, dateStr, branchId) {
  var vals = sheet.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    var rowDate = vals[i][1];
    var rDateStr = rowDate ? fmtDate_(rowDate) : '';
    if (rDateStr === dateStr && String(vals[i][2]) === String(branchId)) return i + 1;
  }
  return -1;
}

/** ບັນທຶກ (ຫຼື ແກ້ໄຂ) ການປິດບັນຊີປະຈຳວັນຂອງສາຂາໃດໜຶ່ງ — ກົດ "ລົງບັນຊີ" ຈຶ່ງເອີ້ນຟັງຊັນນີ້ */
function closeDay(payload) {
  if (!payload || !payload.branchId) throw new Error('ກະລຸນາເລືອກສາຂາ');
  if (!payload.date) throw new Error('ກະລຸນາລະບຸວັນທີ');
  var sheet = sh_(SH_CLOSING, HEAD_CLOSING);
  var cash = Number(payload.cash) || 0;
  var transfer = Number(payload.transfer) || 0;
  var note = payload.note || '';
  var now = new Date();
  var row = findClosingRow_(sheet, payload.date, payload.branchId);
  var id;
  if (row > 0) {
    sheet.getRange(row, 4, 1, 4).setValues([[cash, transfer, note, now]]);
    id = sheet.getRange(row, 1).getValue();
  } else {
    id = newId_();
    sheet.appendRow([id, new Date(payload.date), payload.branchId, cash, transfer, note, now]);
  }
  return { id: id, date: payload.date, branchId: payload.branchId, cash: cash, transfer: transfer, note: note, closedAt: fmtTime_(now) };
}

/* ---------- ລາຍງານ / ສະຫຼຸບ ---------- */
function getRecentData(days) {
  days = Number(days) || 60;
  var since = new Date();
  since.setDate(since.getDate() - days);

  var saleSheet = saleSheet_();
  var itemSheet = sh_(SH_SALEITEM, HEAD_SALEITEM);
  var expenseSheet = expenseSheet_();
  var incomeSheet = sh_(SH_INCOME, HEAD_INCOME);
  var closingSheet = sh_(SH_CLOSING, HEAD_CLOSING);

  var sales = readAll_(saleSheet).filter(function (s) {
    return s.DateTime && new Date(s.DateTime) >= since;
  });
  sales.forEach(function (s) {
    var dt = new Date(s.DateTime);
    s.Date = fmtDate_(dt);
    s.Time = fmtTime_(dt);
  });

  var saleIds = {};
  sales.forEach(function (s) { saleIds[s.ID] = true; });
  var items = readAll_(itemSheet).filter(function (it) { return saleIds[it.SaleID]; });

  var expenses = readAll_(expenseSheet).filter(function (e) {
    return e.Date && new Date(e.Date) >= since;
  });
  expenses.forEach(function (e) { e.Date = fmtDate_(e.Date); });

  var incomes = readAll_(incomeSheet).filter(function (e) {
    return e.Date && new Date(e.Date) >= since;
  });
  incomes.forEach(function (e) { e.Date = fmtDate_(e.Date); });

  var closings = readAll_(closingSheet).filter(function (c) {
    return c.Date && new Date(c.Date) >= since;
  });
  closings.forEach(function (c) {
    c.Date = fmtDate_(c.Date);
    c.ClosedTime = c.ClosedAt ? fmtTime_(c.ClosedAt) : '';
  });

  return { sales: sales, items: items, expenses: expenses, incomes: incomes, closings: closings };
}

/** ຂໍ້ມູນການຂາຍ+ລາຍຈ່າຍສະເພາະເດືອນ-ປີທີ່ລະບຸ (ສຳລັບໜ້າສະຫຼຸບແບບເລືອກເດືອນ) */
function getMonthData(year, month) {
  year = Number(year);
  month = Number(month);
  var start = new Date(year, month - 1, 1);
  var end = new Date(year, month, 1);

  var saleSheet = saleSheet_();
  var itemSheet = sh_(SH_SALEITEM, HEAD_SALEITEM);
  var expenseSheet = expenseSheet_();
  var incomeSheet = sh_(SH_INCOME, HEAD_INCOME);
  var closingSheet = sh_(SH_CLOSING, HEAD_CLOSING);

  var sales = readAll_(saleSheet).filter(function (s) {
    if (!s.DateTime) return false;
    var dt = new Date(s.DateTime);
    return dt >= start && dt < end;
  });
  sales.forEach(function (s) {
    var dt = new Date(s.DateTime);
    s.Date = fmtDate_(dt);
    s.Time = fmtTime_(dt);
  });

  var saleIds = {};
  sales.forEach(function (s) { saleIds[s.ID] = true; });
  var items = readAll_(itemSheet).filter(function (it) { return saleIds[it.SaleID]; });

  var expenses = readAll_(expenseSheet).filter(function (e) {
    if (!e.Date) return false;
    var dt = new Date(e.Date);
    return dt >= start && dt < end;
  });
  expenses.forEach(function (e) { e.Date = fmtDate_(e.Date); });

  var incomes = readAll_(incomeSheet).filter(function (e) {
    if (!e.Date) return false;
    var dt = new Date(e.Date);
    return dt >= start && dt < end;
  });
  incomes.forEach(function (e) { e.Date = fmtDate_(e.Date); });

  var closings = readAll_(closingSheet).filter(function (c) {
    if (!c.Date) return false;
    var dt = new Date(c.Date);
    return dt >= start && dt < end;
  });
  closings.forEach(function (c) {
    c.Date = fmtDate_(c.Date);
    c.ClosedTime = c.ClosedAt ? fmtTime_(c.ClosedAt) : '';
  });

  return { sales: sales, items: items, expenses: expenses, incomes: incomes, closings: closings };
}

/* =====================================================================
 * ລະບົບລັອກອິນ ແລະ ສິດການໃຊ້ງານ
 *  - admin  (ຜູ້ດູແລລະບົບ): ເຫັນ ແລະ ຈັດການທຸກຮ້ານ, ສ້າງຮ້ານໃໝ່ໄດ້
 *  - owner  (ເຈົ້າຂອງຮ້ານ): ຈັດການທຸກຢ່າງພາຍໃນຮ້ານຂອງຕົນ ລວມທັງບັນຊີຜູ້ໃຊ້
 *  - staff  (ພະນັກງານ):   ຂາຍ, ບິນລໍຖ້າ, ບັນທຶກລາຍຮັບ-ລາຍຈ່າຍ, ປິດບັນຊີ, ເບິ່ງສະຫຼຸບ
 *                          ບໍ່ສາມາດແກ້ສິນຄ້າ/ຕັ້ງຄ່າ, ຍົກເລີກບິນ, ຫຼື ລຶບລາຍການຂອງມື້ອື່ນ
 * ທຸກການເອີ້ນ API (ຍົກເວັ້ນ login) ຕ້ອງມີ token, ແລະ ທຸກຂໍ້ມູນຖືກກັ່ນຕອງໃຫ້ເຫັນສະເພາະຮ້ານຂອງຕົນ.
 * ===================================================================== */
var SH_USER = 'Users';
var SH_SESSION = 'Sessions';
var HEAD_USER = ['ID', 'ShopID', 'Username', 'Name', 'Role', 'PasswordHash', 'Salt', 'Active', 'CreatedAt'];
var HEAD_SESSION = ['TokenHash', 'UserID', 'CreatedAt', 'ExpiresAt'];
var SESSION_DAYS_ = 30;
var MAX_LOGIN_FAILS_ = 5;
var LOGIN_LOCK_SECONDS_ = 600;
var ROLES_ = ['admin', 'owner', 'staff'];

function authError_(msg) {
  var e = new Error(msg || 'ກະລຸນາລັອກອິນໃໝ່');
  e.isAuth = true;
  return e;
}

function sha256Hex_(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str), Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

function hashPassword_(password, salt) {
  var h = sha256Hex_(salt + ':' + password);
  for (var i = 0; i < 1000; i++) h = sha256Hex_(h + salt);
  return h;
}

function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).split('-').join('');
}

function cache_() { return CacheService.getScriptCache(); }

function userSheet_() { return sh_(SH_USER, HEAD_USER); }
function sessionSheet_() { return sh_(SH_SESSION, HEAD_SESSION); }

function normUsername_(u) { return String(u || '').trim().toLowerCase(); }

function findUser_(field, value) {
  var users = readAll_(userSheet_());
  for (var i = 0; i < users.length; i++) {
    var v = users[i][field];
    if (field === 'Username' ? normUsername_(v) === normUsername_(value) : String(v) === String(value)) return users[i];
  }
  return null;
}

function isActive_(u) { return String(u.Active) !== 'N'; }

function publicUser_(u) {
  return { id: String(u.ID), shopId: String(u.ShopID), username: String(u.Username), name: String(u.Name || u.Username), role: String(u.Role), active: isActive_(u) };
}

function createSession_(user) {
  var token = newToken_();
  var th = sha256Hex_(token);
  var now = new Date();
  var exp = new Date(now.getTime() + SESSION_DAYS_ * 86400000);
  sessionSheet_().appendRow([th, user.ID, now, exp]);
  cache_().put('sess:' + th, JSON.stringify({ userId: String(user.ID), exp: exp.getTime() }), 21600);
  return token;
}

/** ລຶບ session ທັງໝົດຂອງຜູ້ໃຊ້ (ໃຊ້ຕອນປິດບັນຊີຜູ້ໃຊ້/ປ່ຽນລະຫັດ) ແລະ session ທີ່ໝົດອາຍຸແລ້ວ */
function purgeSessions_(userId) {
  var sheet = sessionSheet_();
  var vals = sheet.getDataRange().getValues();
  var now = Date.now();
  var keys = [];
  for (var i = vals.length - 1; i >= 1; i--) {
    var expired = vals[i][3] && new Date(vals[i][3]).getTime() < now;
    if ((userId && String(vals[i][1]) === String(userId)) || expired) {
      keys.push('sess:' + vals[i][0]);
      sheet.deleteRow(i + 1);
    }
  }
  if (keys.length) cache_().removeAll(keys);
}

function login(username, password) {
  var uname = normUsername_(username);
  if (!uname || !password) throw new Error('ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ');
  var failKey = 'fail:' + uname;
  var fails = Number(cache_().get(failKey)) || 0;
  if (fails >= MAX_LOGIN_FAILS_) throw new Error('ລອງລະຫັດຜິດຫຼາຍເທື່ອ. ກະລຸນາລໍ 10 ນາທີ ແລ້ວລອງໃໝ່');

  var user = findUser_('Username', uname);
  if (!user || !isActive_(user) || hashPassword_(String(password), String(user.Salt)) !== String(user.PasswordHash)) {
    cache_().put(failKey, String(fails + 1), LOGIN_LOCK_SECONDS_);
    throw new Error('ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
  }
  cache_().remove(failKey);
  purgeSessions_(null);
  return { token: createSession_(user), user: publicUser_(user) };
}

function sessionUser_(token) {
  if (!token) throw authError_('ກະລຸນາລັອກອິນ');
  var th = sha256Hex_(token);
  var cached = cache_().get('sess:' + th);
  var sess = cached ? JSON.parse(cached) : null;
  if (!sess) {
    var vals = sessionSheet_().getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][0]) === th) { sess = { userId: String(vals[i][1]), exp: new Date(vals[i][3]).getTime() }; break; }
    }
    if (sess) cache_().put('sess:' + th, JSON.stringify(sess), 21600);
  }
  if (!sess || sess.exp < Date.now()) throw authError_('ໝົດເວລາການລັອກອິນ, ກະລຸນາລັອກອິນໃໝ່');

  var userJson = cache_().get('user:' + sess.userId);
  var user = userJson ? JSON.parse(userJson) : findUser_('ID', sess.userId);
  if (!user || !isActive_(user)) throw authError_('ບັນຊີນີ້ຖືກປິດການໃຊ້ງານແລ້ວ');
  if (!userJson) cache_().put('user:' + sess.userId, JSON.stringify(user), 300);
  return user;
}

function logout_(token) {
  if (!token) return true;
  var th = sha256Hex_(token);
  var sheet = sessionSheet_();
  var row = findRowIndex_(sheet, 0, th);
  if (row > 0) sheet.deleteRow(row);
  cache_().remove('sess:' + th);
  return true;
}

/* ---------- ສ້າງບັນຊີຜູ້ດູແລລະບົບຄັ້ງທຳອິດ (ເຮັດໄດ້ສະເພາະຕອນຍັງບໍ່ມີຜູ້ໃຊ້ຈັກຄົນ) ---------- */
function setupStatus_() {
  return { needsSetup: readAll_(userSheet_()).length === 0 };
}

function setupFirstAdmin_(name, username, password) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (readAll_(userSheet_()).length > 0) throw new Error('ມີຜູ້ດູແລລະບົບແລ້ວ');
    insertUser_({ name: name, username: username, password: password, role: 'admin', shopId: '*' });
  } finally {
    lock.releaseLock();
  }
  return login(username, password);
}

function validateNewUser_(u) {
  var uname = normUsername_(u.username);
  if (!/^[a-z0-9._-]{3,30}$/.test(uname)) throw new Error('ຊື່ຜູ້ໃຊ້ຕ້ອງເປັນຕົວອັກສອນອັງກິດ/ຕົວເລກ 3-30 ຕົວ (a-z, 0-9, . _ -)');
  validatePassword_(u.password);
  if (ROLES_.indexOf(u.role) === -1) throw new Error('ສິດບໍ່ຖືກຕ້ອງ');
  if (findUser_('Username', uname)) throw new Error('ຊື່ຜູ້ໃຊ້ນີ້ມີຄົນໃຊ້ແລ້ວ');
  return uname;
}

function validatePassword_(pw) {
  if (String(pw || '').length < 6) throw new Error('ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວ');
}

function insertUser_(u) {
  var uname = validateNewUser_(u);
  var salt = newToken_().substring(0, 16);
  var id = newId_();
  var name = String(u.name || '').trim() || uname;
  userSheet_().appendRow([id, u.shopId, uname, name, u.role, hashPassword_(String(u.password), salt), salt, 'Y', new Date()]);
  return { id: id, shopId: String(u.shopId), username: uname, name: name, role: u.role, active: true };
}

/* ---------- ຈັດການບັນຊີຜູ້ໃຊ້ (ເອີ້ນຜ່ານ API, ctx = ຜູ້ໃຊ້ທີ່ລັອກອິນຢູ່) ---------- */
function canManageUser_(ctx, target) {
  if (!target) throw new Error('ບໍ່ພົບຜູ້ໃຊ້');
  if (ctx.isAdmin) return;
  if (String(target.Role) === 'admin' || String(target.ShopID) !== ctx.shopId) throw new Error('ບໍ່ມີສິດຈັດການຜູ້ໃຊ້ນີ້');
}

function listUsers_(ctx) {
  requireOwner_(ctx);
  return readAll_(userSheet_())
    .filter(function (u) { return ctx.isAdmin || String(u.ShopID) === ctx.shopId; })
    .map(publicUser_);
}

function addUser_(ctx, u) {
  requireOwner_(ctx);
  u = u || {};
  if (!ctx.isAdmin) {
    if (u.role !== 'owner' && u.role !== 'staff') throw new Error('ສິດບໍ່ຖືກຕ້ອງ');
    u.shopId = ctx.shopId;
  } else if (u.role === 'admin') {
    u.shopId = '*';
  } else if (!findShop_(u.shopId)) {
    throw new Error('ກະລຸນາເລືອກຮ້ານ');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return insertUser_(u); } finally { lock.releaseLock(); }
}

function updateUserRow_(userId, col, value) {
  var sheet = userSheet_();
  var row = findRowIndex_(sheet, 0, userId);
  if (row < 0) throw new Error('ບໍ່ພົບຜູ້ໃຊ້');
  sheet.getRange(row, col).setValue(value);
  cache_().remove('user:' + userId);
}

function resetUserPassword_(ctx, userId, newPassword) {
  requireOwner_(ctx);
  var target = findUser_('ID', userId);
  canManageUser_(ctx, target);
  validatePassword_(newPassword);
  var salt = newToken_().substring(0, 16);
  var sheet = userSheet_();
  var row = findRowIndex_(sheet, 0, userId);
  sheet.getRange(row, 6, 1, 2).setValues([[hashPassword_(String(newPassword), salt), salt]]);
  cache_().remove('user:' + userId);
  if (String(userId) !== ctx.userId) purgeSessions_(userId);
  return true;
}

function setUserActive_(ctx, userId, active) {
  requireOwner_(ctx);
  if (String(userId) === ctx.userId) throw new Error('ບໍ່ສາມາດປິດບັນຊີຂອງຕົນເອງໄດ້');
  canManageUser_(ctx, findUser_('ID', userId));
  updateUserRow_(userId, 8, active ? 'Y' : 'N');
  if (!active) purgeSessions_(userId);
  return true;
}

function changeMyPassword_(ctx, oldPassword, newPassword) {
  var me = findUser_('ID', ctx.userId);
  if (hashPassword_(String(oldPassword || ''), String(me.Salt)) !== String(me.PasswordHash)) throw new Error('ລະຫັດຜ່ານເກົ່າບໍ່ຖືກຕ້ອງ');
  validatePassword_(newPassword);
  var salt = newToken_().substring(0, 16);
  var sheet = userSheet_();
  var row = findRowIndex_(sheet, 0, ctx.userId);
  sheet.getRange(row, 6, 1, 2).setValues([[hashPassword_(String(newPassword), salt), salt]]);
  cache_().remove('user:' + ctx.userId);
  return true;
}

/* ---------- ກວດສິດ ---------- */
function makeCtx_(user) {
  var ctx = { userId: String(user.ID), shopId: String(user.ShopID), role: String(user.Role), isAdmin: String(user.Role) === 'admin', user: user };
  var branchShop = null;
  ctx.branchShopMap = function () {
    if (!branchShop) {
      branchShop = {};
      readAll_(sh_(SH_BRANCH, HEAD_BRANCH)).forEach(function (b) { branchShop[String(b.ID)] = String(b.ShopID); });
    }
    return branchShop;
  };
  ctx.canSeeBranch = function (branchId) {
    if (ctx.isAdmin) return true;
    return ctx.branchShopMap()[String(branchId)] === ctx.shopId;
  };
  return ctx;
}

function findShop_(shopId) {
  if (!shopId) return null;
  var shops = readAll_(sh_(SH_SHOP, HEAD_SHOP));
  for (var i = 0; i < shops.length; i++) if (String(shops[i].ID) === String(shopId)) return shops[i];
  return null;
}

function requireOwner_(ctx) {
  if (ctx.role !== 'owner' && !ctx.isAdmin) throw new Error('ສະເພາະເຈົ້າຂອງຮ້ານເທົ່ານັ້ນ');
}

function requireShop_(ctx, shopId) {
  if (!shopId) throw new Error('ກະລຸນາເລືອກຮ້ານ');
  if (!ctx.isAdmin && String(shopId) !== ctx.shopId) throw new Error('ບໍ່ມີສິດເຂົ້າເຖິງຮ້ານນີ້');
}

function requireBranch_(ctx, branchId) {
  if (!branchId) throw new Error('ກະລຸນາເລືອກສາຂາ');
  var shopId = ctx.branchShopMap()[String(branchId)];
  if (shopId === undefined) throw new Error('ບໍ່ພົບສາຂາ');
  requireShop_(ctx, shopId);
}

function findRowObj_(sheetName, headers, id) {
  var sheet = sheetName === SH_EXPENSE ? expenseSheet_() : (sheetName === SH_SALE ? saleSheet_() : sh_(sheetName, headers));
  var rows = readAll_(sheet);
  for (var i = 0; i < rows.length; i++) if (String(rows[i].ID) === String(id)) return rows[i];
  throw new Error('ບໍ່ພົບຂໍ້ມູນ');
}

/** ແຖວທີ່ມີ ShopID (ສາຂາ, ສິນຄ້າ, ໝວດ, ພະນັກງານ) */
function requireRowShop_(ctx, sheetName, headers, id) {
  var row = findRowObj_(sheetName, headers, id);
  requireShop_(ctx, row.ShopID);
  return row;
}

/** ແຖວທີ່ມີ BranchID (ການຂາຍ, ລາຍຈ່າຍ, ລາຍຮັບ, ບິນລໍຖ້າ) */
function requireRowBranch_(ctx, sheetName, headers, id) {
  var row = findRowObj_(sheetName, headers, id);
  requireBranch_(ctx, row.BranchID);
  return row;
}

/** ພະນັກງານລຶບລາຍຮັບ-ລາຍຈ່າຍໄດ້ສະເພາະລາຍການຂອງມື້ນີ້ (ແກ້ພິມຜິດຕອນປິດບັນຊີ) */
function requireTodayUnlessOwner_(ctx, row) {
  if (ctx.role === 'owner' || ctx.isAdmin) return;
  if (!row.Date || fmtDate_(row.Date) !== fmtDate_(new Date())) throw new Error('ພະນັກງານລຶບໄດ້ສະເພາະລາຍການຂອງມື້ນີ້');
}

var API_GUARDS_ = {
  getBootstrap: function () {},
  getRecentData: function () {},
  getMonthData: function () {},
  getHeldBills: function () {},
  recordSale: function (c, a) { requireBranch_(c, a[0] && a[0].branchId); },
  holdBill: function (c, a) { requireBranch_(c, a[0] && a[0].branchId); },
  deleteHeldBill: function (c, a) { requireRowBranch_(c, SH_HELDBILL, HEAD_HELDBILL, a[0]); },
  addExpense: function (c, a) { requireBranch_(c, a[0] && a[0].branchId); },
  addIncome: function (c, a) { requireBranch_(c, a[0] && a[0].branchId); },
  closeDay: function (c, a) { requireBranch_(c, a[0] && a[0].branchId); },
  deleteExpense: function (c, a) { requireTodayUnlessOwner_(c, requireRowBranch_(c, SH_EXPENSE, HEAD_EXPENSE, a[0])); },
  deleteIncome: function (c, a) { requireTodayUnlessOwner_(c, requireRowBranch_(c, SH_INCOME, HEAD_INCOME, a[0])); },
  voidSale: function (c, a) { requireOwner_(c); requireRowBranch_(c, SH_SALE, HEAD_SALE, a[0]); },
  saveProduct: function (c, a) {
    requireOwner_(c);
    var p = a[0] || {};
    requireShop_(c, p.shopId);
    if (p.id) requireRowShop_(c, SH_PRODUCT, HEAD_PRODUCT, p.id);
  },
  setProductActive: function (c, a) { requireOwner_(c); requireRowShop_(c, SH_PRODUCT, HEAD_PRODUCT, a[0]); },
  setStock: function (c, a) { requireOwner_(c); requireBranch_(c, a[0]); requireRowShop_(c, SH_PRODUCT, HEAD_PRODUCT, a[1]); },
  addStockIn: function (c, a) {
    requireOwner_(c);
    var p = a[0] || {};
    requireBranch_(c, p.branchId);
    requireRowShop_(c, SH_PRODUCT, HEAD_PRODUCT, p.productId);
  },
  addShop: function (c) { if (!c.isAdmin) throw new Error('ສະເພາະຜູ້ດູແລລະບົບເທົ່ານັ້ນ'); },
  renameShop: function (c, a) { requireOwner_(c); requireShop_(c, a[0]); },
  addBranch: function (c, a) { requireOwner_(c); requireShop_(c, a[0]); },
  renameBranch: function (c, a) { requireOwner_(c); requireRowShop_(c, SH_BRANCH, HEAD_BRANCH, a[0]); },
  addCategory: function (c, a) { requireOwner_(c); requireShop_(c, a[0]); },
  renameCategory: function (c, a) { requireOwner_(c); requireRowShop_(c, SH_CATEGORY, HEAD_CATEGORY, a[0]); },
  addEmployee: function (c, a) { requireOwner_(c); requireShop_(c, a[0]); },
  renameEmployee: function (c, a) { requireOwner_(c); requireRowShop_(c, SH_EMPLOYEE, HEAD_EMPLOYEE, a[0]); }
};

/* ---------- ກັ່ນຕອງຂໍ້ມູນທີ່ສົ່ງກັບ ໃຫ້ເຫັນສະເພາະຮ້ານຂອງຕົນ ---------- */
function filterReport_(res, ctx) {
  if (ctx.isAdmin) return res;
  var keep = function (r) { return ctx.canSeeBranch(r.BranchID); };
  res.sales = res.sales.filter(keep);
  var ids = {};
  res.sales.forEach(function (s) { ids[s.ID] = true; });
  res.items = res.items.filter(function (it) { return ids[it.SaleID]; });
  res.expenses = res.expenses.filter(keep);
  res.incomes = res.incomes.filter(keep);
  res.closings = res.closings.filter(keep);
  return res;
}

var API_FILTERS_ = {
  getBootstrap: function (res, ctx) {
    res.me = publicUser_(ctx.user);
    if (ctx.isAdmin) return res;
    var mine = function (r) { return String(r.ShopID) === ctx.shopId; };
    res.shops = res.shops.filter(function (s) { return String(s.ID) === ctx.shopId; });
    res.branches = res.branches.filter(mine);
    res.products = res.products.filter(mine);
    res.productCategories = res.productCategories.filter(mine);
    res.employees = res.employees.filter(mine);
    res.stock = res.stock.filter(function (s) { return ctx.canSeeBranch(s.BranchID); });
    delete res.sheetUrl;
    return res;
  },
  getRecentData: filterReport_,
  getMonthData: filterReport_,
  getHeldBills: function (res, ctx) { return res.filter(function (r) { return ctx.canSeeBranch(r.BranchID); }); }
};

var AUTH_FNS_ = {
  listUsers: listUsers_,
  addUser: addUser_,
  resetUserPassword: resetUserPassword_,
  setUserActive: setUserActive_,
  changeMyPassword: changeMyPassword_
};

function handleApi_(fnName, args, token) {
  if (fnName === 'login') return login(args[0], args[1]);
  if (fnName === 'setupStatus') return setupStatus_();
  if (fnName === 'setupFirstAdmin') return setupFirstAdmin_(args[0], args[1], args[2]);

  var user = sessionUser_(token);
  var ctx = makeCtx_(user);
  if (fnName === 'logout') return logout_(token);
  if (fnName === 'me') return publicUser_(user);
  if (AUTH_FNS_[fnName]) return AUTH_FNS_[fnName].apply(null, [ctx].concat(args));

  var fn = API_ALLOWED_FNS_[fnName];
  var guard = API_GUARDS_[fnName];
  if (!fn || !guard) throw new Error('ບໍ່ຮູ້ຈັກຄຳສັ່ງ: ' + fnName);
  guard(ctx, args);
  var result = fn.apply(null, args);
  var filter = API_FILTERS_[fnName];
  return filter ? filter(result, ctx) : result;
}
