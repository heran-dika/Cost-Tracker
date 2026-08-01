// ==== KONFIGURASI ====
// Nggak ada SHEET_ID di sini — script ini nempel langsung di Sheet-nya sendiri
// (getActiveSpreadsheet), jadi otomatis kerja ke Sheet manapun dia di-paste/di-copy.

const DEFAULT_CATEGORIES = ['Bahan Baku', 'Operasional', 'Kemasan', 'Pribadi'];

const TAB_PENGELUARAN = 'Pengeluaran';
const TAB_KATALOG_PRODUK = 'Katalog Produk';
const TAB_KATALOG_TOKO = 'Katalog Toko';

const HEADERS = {
  [TAB_PENGELUARAN]: ['Timestamp', 'Nama', 'Device', 'Jenis', 'ID Toko', 'Toko (raw)', 'Kategori', 'ID Produk', 'Item (raw)', 'Qty', 'Satuan', 'Harga Total', 'Harga per Satuan', 'Foto', 'Status'],
  [TAB_KATALOG_PRODUK]: ['ID Produk', 'Nama Kanonik', 'Satuan Standar', 'Alias', 'Kategori Default'],
  [TAB_KATALOG_TOKO]: ['ID Toko', 'Nama Kanonik Cabang', 'Alias', 'Catatan']
};

// Jalanin fungsi ini SEKALI aja lewat editor Apps Script, buat isi header di 3 tab.
// Pastiin udah isi Script Property "SHEET_ID" dulu (lihat Project Settings) sebelum run ini.
function setupHeaders() {
  const ss = bukaSpreadsheet_();
  Object.keys(HEADERS).forEach(function (tabName) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) sheet = ss.insertSheet(tabName);
    sheet.getRange(1, 1, 1, HEADERS[tabName].length).setValues([HEADERS[tabName]]);
    sheet.setFrozenRows(1);
  });
}

// Dipake semua fungsi lain (bukan getActiveSpreadsheet) biar reliable
// walau dipanggil dari Web App request.
const SHEET_ID = '1qxa_AhYdEUi9v_ItwJ40qZeNFUOA5rkpaPfKBfeLgV4';

function bukaSpreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

// ==== WEB APP ENTRY POINT ====
// Pakai JSONP (bukan fetch biasa) buat manggil dari luar (GitHub Pages),
// karena Apps Script Web App nggak konsisten ngasih header CORS buat POST
// dari domain lain. Tag <script> nggak kena aturan CORS sama sekali.
function doGet(e) {
  if (e.parameter.callback && e.parameter.payload) {
    const body = JSON.parse(e.parameter.payload);
    const result = routeAction(body);
    const jsonp = e.parameter.callback + '(' + JSON.stringify(result) + ')';
    return ContentService.createTextOutput(jsonp).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const result = routeAction(body);
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function routeAction(body) {
  switch (body.action) {
    case 'login':
      return handleLogin(body.nama);
    case 'getKatalog':
      return handleGetKatalog();
    case 'getPengeluaran':
      return handleGetPengeluaran();
    case 'simpanPengeluaran':
      return handleSimpanPengeluaran(body);
    case 'simpanProduk':
      return handleSimpanProduk(body);
    case 'simpanToko':
      return handleSimpanToko(body);
    case 'kelolaAkses':
      return handleKelolaAkses(body);
    case 'getAkses':
      return handleGetAkses(body.nama);
    case 'buatUndangan':
      return handleBuatUndangan(body.nama);
    case 'pakaiUndangan':
      return handlePakaiUndangan(body);
    default:
      return { error: 'Aksi tidak dikenal: ' + body.action };
  }
}

// ==== AKSES (Owner/Staff, disimpan di Script Properties) ====
function handleLogin(nama) {
  const props = PropertiesService.getScriptProperties();
  const namaBersih = (nama || '').trim();
  if (!namaBersih) return { valid: false };

  let allowed = JSON.parse(props.getProperty('ALLOWED_NAMES') || '[]');
  let owner = props.getProperty('OWNER_NAME') || '';

  // Bootstrap: kalau daftar masih kosong, orang pertama yang login otomatis jadi Owner
  if (allowed.length === 0) {
    allowed = [namaBersih];
    owner = namaBersih;
    props.setProperty('ALLOWED_NAMES', JSON.stringify(allowed));
    props.setProperty('OWNER_NAME', owner);
  }

  const valid = allowed.some(function (n) { return n.toLowerCase() === namaBersih.toLowerCase(); });
  return {
    valid: valid,
    nama: namaBersih,
    isOwner: valid && namaBersih.toLowerCase() === owner.toLowerCase(),
    kategoriList: getKategoriList()
  };
}

function handleKelolaAkses(body) {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('OWNER_NAME') || '';
  if ((body.nama || '').trim().toLowerCase() !== owner.toLowerCase()) {
    return { error: 'Cuma Owner yang bisa kelola akses' };
  }

  let allowed = JSON.parse(props.getProperty('ALLOWED_NAMES') || '[]');

  if (body.operation === 'add') {
    const target = (body.targetNama || '').trim();
    if (target && !allowed.some(function (n) { return n.toLowerCase() === target.toLowerCase(); })) {
      allowed.push(target);
    }
  } else if (body.operation === 'remove') {
    const target = (body.targetNama || '').trim().toLowerCase();
    if (target === owner.toLowerCase()) return { error: 'Owner nggak bisa dihapus dari daftar' };
    allowed = allowed.filter(function (n) { return n.toLowerCase() !== target; });
  } else {
    return { error: 'Operasi tidak dikenal' };
  }

  props.setProperty('ALLOWED_NAMES', JSON.stringify(allowed));
  return { success: true, names: allowed, owner: owner };
}

function handleGetAkses(nama) {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('OWNER_NAME') || '';
  if ((nama || '').trim().toLowerCase() !== owner.toLowerCase()) {
    return { error: 'Cuma Owner yang bisa lihat ini' };
  }
  return {
    names: JSON.parse(props.getProperty('ALLOWED_NAMES') || '[]'),
    owner: owner
  };
}

// ==== SIMPAN KE KATALOG (bikin baru / update alias) ====
// Ini yang bikin Katalog Produk & Toko keisi organik dari transaksi yang masuk.
function handleSimpanProduk(body) {
  const namaKanonik = (body.namaKanonik || '').trim();
  if (!namaKanonik) return { error: 'Nama produk kosong' };

  const ss = bukaSpreadsheet_();
  const sheet = ss.getSheetByName(TAB_KATALOG_PRODUK);
  const data = getSheetData(TAB_KATALOG_PRODUK);
  let idProduk = body.idProduk;

  if (idProduk) {
    const idx = data.findIndex(function (r) { return r['ID Produk'] === idProduk; });
    if (idx !== -1) {
      const rowNum = idx + 2;
      const aliasList = (data[idx]['Alias'] || '').split('|').map(function (a) { return a.trim(); }).filter(Boolean);
      if (body.aliasBaru && aliasList.indexOf(body.aliasBaru) === -1) {
        aliasList.push(body.aliasBaru);
        sheet.getRange(rowNum, 4).setValue(aliasList.join(' | '));
      }
      sheet.getRange(rowNum, 2).setValue(namaKanonik);
      return { success: true, idProduk: idProduk };
    }
  }

  idProduk = 'P' + Date.now();
  sheet.appendRow([idProduk, namaKanonik, body.satuan || '', body.aliasBaru || '', body.kategoriDefault || '']);
  return { success: true, idProduk: idProduk };
}

function handleSimpanToko(body) {
  const namaKanonik = (body.namaKanonik || '').trim();
  if (!namaKanonik) return { error: 'Nama toko kosong' };

  const ss = bukaSpreadsheet_();
  const sheet = ss.getSheetByName(TAB_KATALOG_TOKO);
  const data = getSheetData(TAB_KATALOG_TOKO);
  let idToko = body.idToko;

  if (idToko) {
    const idx = data.findIndex(function (r) { return r['ID Toko'] === idToko; });
    if (idx !== -1) {
      const rowNum = idx + 2;
      const aliasList = (data[idx]['Alias'] || '').split('|').map(function (a) { return a.trim(); }).filter(Boolean);
      if (body.aliasBaru && aliasList.indexOf(body.aliasBaru) === -1) {
        aliasList.push(body.aliasBaru);
        sheet.getRange(rowNum, 3).setValue(aliasList.join(' | '));
      }
      sheet.getRange(rowNum, 2).setValue(namaKanonik);
      return { success: true, idToko: idToko };
    }
  }

  idToko = 'T' + Date.now();
  sheet.appendRow([idToko, namaKanonik, body.aliasBaru || '', '']);
  return { success: true, idToko: idToko };
}

// ==== UNDANGAN AKSES ====
function handleBuatUndangan(nama) {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('OWNER_NAME') || '';
  if ((nama || '').trim().toLowerCase() !== owner.toLowerCase()) {
    return { error: 'Cuma Owner yang bisa bikin link undangan' };
  }
  const token = Utilities.getUuid();
  const pending = JSON.parse(props.getProperty('PENDING_INVITES') || '[]');
  pending.push(token);
  props.setProperty('PENDING_INVITES', JSON.stringify(pending));
  return { success: true, token: token };
}

function handlePakaiUndangan(body) {
  const props = PropertiesService.getScriptProperties();
  let pending = JSON.parse(props.getProperty('PENDING_INVITES') || '[]');
  const token = body.token;
  if (pending.indexOf(token) === -1) {
    return { valid: false, error: 'Link undangan nggak valid atau udah dipake' };
  }
  const namaBersih = (body.nama || '').trim();
  if (!namaBersih) return { valid: false, error: 'Nama kosong' };

  let allowed = JSON.parse(props.getProperty('ALLOWED_NAMES') || '[]');
  if (!allowed.some(function (n) { return n.toLowerCase() === namaBersih.toLowerCase(); })) {
    allowed.push(namaBersih);
    props.setProperty('ALLOWED_NAMES', JSON.stringify(allowed));
  }
  pending = pending.filter(function (t) { return t !== token; });
  props.setProperty('PENDING_INVITES', JSON.stringify(pending));

  return { valid: true, nama: namaBersih, isOwner: false, kategoriList: getKategoriList() };
}

// ==== KATALOG & KATEGORI ====
function handleGetKatalog() {
  return {
    produk: getSheetData(TAB_KATALOG_PRODUK),
    toko: getSheetData(TAB_KATALOG_TOKO)
  };
}

// Kategori nggak disimpan di tab terpisah — diturunkan dari nilai unik
// kolom "Kategori" di Tab Pengeluaran, digabung sama default.
function getKategoriList() {
  const rows = getSheetData(TAB_PENGELUARAN);
  const dariData = rows.map(function (r) { return r['Kategori']; }).filter(Boolean);
  const gabungan = DEFAULT_CATEGORIES.concat(dariData);
  return gabungan.filter(function (v, i) { return gabungan.indexOf(v) === i; });
}

// ==== PENGELUARAN ====
function handleGetPengeluaran() {
  return { rows: getSheetData(TAB_PENGELUARAN) };
}

function handleSimpanPengeluaran(data) {
  if (!data.nama || !data.jenis || !data.kategori || !data.hargaTotal) {
    return { error: 'Data belum lengkap: nama, jenis, kategori, dan hargaTotal wajib diisi' };
  }

  const ss = bukaSpreadsheet_();
  const sheet = ss.getSheetByName(TAB_PENGELUARAN);
  const qty = Number(data.qty) || 1;
  const hargaTotal = Number(data.hargaTotal) || 0;
  const hargaPerSatuan = qty > 0 ? hargaTotal / qty : hargaTotal;

  sheet.appendRow([
    new Date(),
    data.nama,
    data.device || '',
    data.jenis,
    data.idToko || '',
    data.tokoRaw || '',
    data.kategori,
    data.idProduk || '',
    data.itemRaw || '',
    qty,
    data.satuan || '',
    hargaTotal,
    hargaPerSatuan,
    data.fotoUrl || '',
    data.status || 'Manual'
  ]);

  return { success: true, hargaPerSatuan: hargaPerSatuan };
}

// ==== HELPER ====
function getSheetData(tabName) {
  const ss = bukaSpreadsheet_();
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(function (row) { return row[0]; })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}
