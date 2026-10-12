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
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ລະບົບ POS ຂາຍເຄື່ອງ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
    var fnName = body.fn;
    var args = body.args || [];
    var fn = API_ALLOWED_FNS_[fnName];
    if (!fn) throw new Error('ບໍ່ຮູ້ຈັກຄຳສັ່ງ: ' + fnName);
    var result = fn.apply(null, args);
    out = { ok: true, result: result };
  } catch (err) {
    out = { ok: false, error: (err && err.message) ? err.message : String(err) };
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

  for (var k = 0; k < rows.length; k++) {
    adjustStock_(stockSheet, sale.branchId, rows[k][1], -(Number(rows[k][3]) || 0));
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
  for (var i = 1; i < itemVals.length; i++) {
    if (String(itemVals[i][0]) === String(saleId)) {
      adjustStock_(stockSheet, branchId, itemVals[i][1], Number(itemVals[i][3]) || 0);
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
