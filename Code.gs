/**
 * Fee reminders + dashboard backend. Runs under the teacher's own Google account.
 * Data: the Google Sheet this script is attached to, tab "Parents".
 * Columns: ID | Parent | Student | Email | WhatsApp | Fee (INR) | Due day | Paid this month | Active | Created | Last reminded
 * Setup: see SETUP.md. Set the dashboard passcode with setAdminPasscode_ (Script Properties key ADMIN_PASSCODE).
 */
var CFG = {
  className: "Soundarya's Dance Class",   // PLACEHOLDER
  defaultFee: 1000,                         // PLACEHOLDER
  defaultDueDay: 20,                        // PLACEHOLDER
  daysBefore: 3,
  upiId: "yourname@upi",                    // PLACEHOLDER
  siteUrl: "https://sriharshakaramchati.com/dance-fee/",
  teacherName: "Maddali Soundarya"
};
var HEAD = ["ID","Parent","Student","Email","WhatsApp","Fee (INR)","Due day","Paid this month","Active","Created","Last reminded"];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName("Parents");
  if (!s) { s = ss.insertSheet("Parents"); s.appendRow(HEAD); s.setFrozenRows(1); }
  return s;
}
function rows_() {
  var v = sheet_().getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) out.push({row: i + 1, id: v[i][0], parent: v[i][1], child: v[i][2], email: v[i][3], whatsapp: String(v[i][4]),
    fee: v[i][5], dueDay: v[i][6], paid: String(v[i][7]).toUpperCase() === "Y", active: String(v[i][8]).toUpperCase() !== "N", lastReminded: v[i][10] ? String(v[i][10]) : ""});
  return out;
}
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function isAdmin_(p) {
  var real = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSCODE");
  return !!real && String(p) === real;
}
function clean_(s, n) { return String(s || "").replace(/^[=+@\-]/, function(m){return "'" + m;}).slice(0, n); }
function validEmail_(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return json_({ok:false, error:"bad request"}); }
  var action = d.action || "signup";
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (action === "signup") {
      var email = String(d.email || "").trim();
      if (!validEmail_(email)) return json_({ok:false, error:"invalid email"});
      addRow_(d.parent, d.child, email, d.whatsapp, CFG.defaultFee, CFG.defaultDueDay);
      return json_({ok:true});
    }
    if (!isAdmin_(d.passcode)) return json_({ok:false, error:"wrong passcode"});
    if (action === "list") return json_({ok:true, rows: rows_(), cfg: CFG});
    if (action === "save") {   // add or update
      var fee = Number(d.fee) || CFG.defaultFee, due = Math.min(28, Math.max(1, Number(d.dueDay) || CFG.defaultDueDay));
      if (d.email && !validEmail_(String(d.email).trim())) return json_({ok:false, error:"invalid email"});
      if (!d.row) { addRow_(d.parent, d.child, d.email, d.whatsapp, fee, due); return json_({ok:true}); }
      var s = sheet_(), r = Number(d.row);
      if (r < 2 || r > s.getLastRow()) return json_({ok:false, error:"bad row"});
      s.getRange(r, 2, 1, 8).setValues([[clean_(d.parent,80), clean_(d.child,80), clean_(d.email,120), clean_(d.whatsapp,20), fee, due, d.paid ? "Y":"N", d.active === false ? "N":"Y"]]);
      return json_({ok:true});
    }
    if (action === "delete") { var rr = Number(d.row); if (rr >= 2 && rr <= sheet_().getLastRow()) sheet_().deleteRow(rr); return json_({ok:true}); }
    if (action === "remind") {  // send now to one parent
      var all = rows_(), hit = all.filter(function(x){return x.row === Number(d.row);})[0];
      if (!hit || !hit.email) return json_({ok:false, error:"no email"});
      sendReminder_(hit); return json_({ok:true});
    }
    return json_({ok:false, error:"unknown action"});
  } finally { lock.releaseLock(); }
}

function addRow_(parent, child, email, wa, fee, due) {
  sheet_().appendRow([Utilities.getUuid().slice(0,8), clean_(parent,80), clean_(child,80), clean_(email,120), clean_(wa,20), fee, due, "N", "Y", new Date(), ""]);
}
function monthName_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM yyyy"); }
function sendReminder_(r) {
  var body = "Hi " + r.parent + ",\n\nA friendly reminder that " + r.child + "'s dance fee for " + monthName_() + " (Rs " + r.fee +
    ") is due by day " + r.dueDay + " of this month.\n\nPay here (QR, UPI and bank details): " + CFG.siteUrl +
    "\nUPI: " + CFG.upiId + "\n\nIf you have already paid, please ignore this message.\n\nThank you,\n" + CFG.teacherName;
  MailApp.sendEmail({to: r.email, subject: CFG.className + ": fee due by day " + r.dueDay + ", " + monthName_(), body: body, name: CFG.teacherName});
  sheet_().getRange(r.row, 11).setValue(new Date());
}

// Daily trigger: remind (dueDay - daysBefore) and on the due day, unpaid active parents only.
function dailyCheck() {
  var today = new Date().getDate();
  if (today === 1) { var s = sheet_(), n = s.getLastRow(); if (n > 1) s.getRange(2, 8, n - 1, 1).setValue("N"); }
  rows_().forEach(function(r) {
    if (!r.active || r.paid || !r.email) return;
    if (today === r.dueDay - CFG.daysBefore || today === r.dueDay) sendReminder_(r);
  });
}
function setup() {   // run once
  ScriptApp.getProjectTriggers().forEach(function(t){ ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("dailyCheck").timeBased().everyDays(1).atHour(9).create();
  sheet_();
}
