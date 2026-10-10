/**
 * Fee reminders + dashboard backend. Runs under the teacher's own Google account.
 * Data: the Google Sheet this script is attached to, tab "Parents".
 * Columns: ID | Parent | Student | Email | WhatsApp | Fee (INR) | Due day | Status (N pending, C parent says paid, Y confirmed) | Active | Created | Last reminded | Reference
 * Parents sign in with Google (ID token verified server-side). Teacher uses the dashboard passcode (Script Property ADMIN_PASSCODE).
 * Script Property GOOGLE_CLIENT_ID must hold the OAuth Web client ID used by the site.
 * Setup: see SETUP.md. Set the dashboard passcode with setAdminPasscode_ (Script Properties key ADMIN_PASSCODE).
 */
var CFG = {
  className: "Soundarya's Dance Class",   // PLACEHOLDER
  defaultFee: 1000,                         // PLACEHOLDER
  defaultDueDay: 20,                        // PLACEHOLDER
  daysBefore: 3,
  upiId: "yourname@upi",                    // PLACEHOLDER
  siteUrl: "https://sriharshakaramchati.com/soundarya/",
  teacherName: "Maddali Soundarya"
};
var HEAD = ["ID","Parent","Student","Email","WhatsApp","Fee (INR)","Due day","Status","Active","Created","Last reminded","Reference"];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName("Parents");
  if (!s) { s = ss.insertSheet("Parents"); s.appendRow(HEAD); s.setFrozenRows(1); }
  return s;
}
function rows_() {
  var v = sheet_().getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) out.push({row: i + 1, id: v[i][0], parent: v[i][1], child: v[i][2], email: v[i][3], whatsapp: String(v[i][4]),
    fee: v[i][5], dueDay: v[i][6], status: String(v[i][7]).toUpperCase() === "Y" ? "Y" : (String(v[i][7]).toUpperCase() === "C" ? "C" : "N"), reference: String(v[i][11] || ""), active: String(v[i][8]).toUpperCase() !== "N", lastReminded: v[i][10] ? String(v[i][10]) : ""});
  return out;
}
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function isAdmin_(p) {
  var real = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSCODE");
  return !!real && String(p) === real;
}
function clean_(s, n) { return String(s || "").replace(/^[=+@\-]/, function(m){return "'" + m;}).slice(0, n); }
function validEmail_(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }

// Verifies a Google ID token and returns the verified email (lowercase) or "".
function verifyToken_(tok) {
  try {
    var cid = PropertiesService.getScriptProperties().getProperty("GOOGLE_CLIENT_ID");
    if (!cid || !tok) return "";
    var r = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(tok), {muteHttpExceptions: true});
    if (r.getResponseCode() !== 200) return "";
    var t = JSON.parse(r.getContentText());
    if (t.aud !== cid || String(t.email_verified) !== "true" || Number(t.exp) * 1000 < Date.now()) return "";
    return String(t.email).toLowerCase();
  } catch (x) { return ""; }
}
function pub_(r) { return {row: r.row, id: r.id, parent: r.parent, child: r.child, fee: r.fee, dueDay: r.dueDay, status: r.status, active: r.active}; }

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return json_({ok:false, error:"bad request"}); }
  var action = d.action;
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    // ---- Parent actions (Google sign-in) ----
    if (action === "me" || action === "claim" || action === "addChild") {
      var email = verifyToken_(d.idToken);
      if (!email) return json_({ok:false, error:"sign-in expired, please sign in again"});
      var mine = rows_().filter(function(r){ return String(r.email).toLowerCase() === email; });
      if (action === "addChild") {
        if (mine.length >= 6) return json_({ok:false, error:"limit reached"});
        if (!String(d.child || "").trim()) return json_({ok:false, error:"student name needed"});
        addRow_(d.parent, d.child, email, d.whatsapp, CFG.defaultFee, CFG.defaultDueDay);
        mine = rows_().filter(function(r){ return String(r.email).toLowerCase() === email; });
      }
      if (action === "claim") {
        var hit = mine.filter(function(r){ return r.row === Number(d.row); })[0];
        if (!hit) return json_({ok:false, error:"not your account"});
        if (hit.status !== "Y") { sheet_().getRange(hit.row, 8).setValue("C"); sheet_().getRange(hit.row, 12).setValue(clean_(d.reference, 40)); }
        mine = rows_().filter(function(r){ return String(r.email).toLowerCase() === email; });
      }
      return json_({ok:true, email: email, children: mine.map(pub_)});
    }
    // ---- Teacher actions (passcode) ----
    if (!isAdmin_(d.passcode)) return json_({ok:false, error:"wrong passcode"});
    if (action === "list") return json_({ok:true, rows: rows_(), cfg: CFG});
    if (action === "save") {   // add or update
      var fee = Number(d.fee) || CFG.defaultFee, due = Math.min(28, Math.max(1, Number(d.dueDay) || CFG.defaultDueDay));
      if (d.email && !validEmail_(String(d.email).trim())) return json_({ok:false, error:"invalid email"});
      if (!d.row) { addRow_(d.parent, d.child, d.email, d.whatsapp, fee, due); return json_({ok:true}); }
      var s = sheet_(), r = Number(d.row);
      if (r < 2 || r > s.getLastRow()) return json_({ok:false, error:"bad row"});
      var st = (d.status === "Y" || d.status === "C") ? d.status : "N";
      s.getRange(r, 2, 1, 8).setValues([[clean_(d.parent,80), clean_(d.child,80), clean_(String(d.email||"").toLowerCase(),120), clean_(d.whatsapp,20), fee, due, st, d.active === false ? "N":"Y"]]);
      if (st === "N") s.getRange(r, 12).setValue("");
      return json_({ok:true});
    }
    if (action === "delete") { var rr = Number(d.row); if (rr >= 2 && rr <= sheet_().getLastRow()) sheet_().deleteRow(rr); return json_({ok:true}); }
    if (action === "remind") {  // send now to one parent
      var all = rows_(), h2 = all.filter(function(x){return x.row === Number(d.row);})[0];
      if (!h2 || !h2.email) return json_({ok:false, error:"no email"});
      sendReminder_(h2); return json_({ok:true});
    }
    return json_({ok:false, error:"unknown action"});
  } finally { lock.releaseLock(); }
}

function addRow_(parent, child, email, wa, fee, due) {
  sheet_().appendRow([Utilities.getUuid().slice(0,8), clean_(parent,80), clean_(child,80), clean_(String(email||"").toLowerCase(),120), clean_(wa,20), fee, due, "N", "Y", new Date(), "", ""]);
}
function monthName_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM yyyy"); }
function sendReminder_(r) {
  var body = "Hi " + r.parent + ",\n\nA friendly reminder that " + r.child + "'s dance fee for " + monthName_() + " (Rs " + r.fee +
    ") is due by day " + r.dueDay + " of this month.\n\nPay and see your status (sign in with Google): " + CFG.siteUrl +
    "\nUPI: " + CFG.upiId + "\n\nIf you have already paid, please ignore this message.\n\nThank you,\n" + CFG.teacherName;
  MailApp.sendEmail({to: r.email, subject: CFG.className + ": fee due by day " + r.dueDay + ", " + monthName_(), body: body, name: CFG.teacherName});
  sheet_().getRange(r.row, 11).setValue(new Date());
}

// Daily trigger: remind (dueDay - daysBefore) and on the due day, unpaid active parents only.
function dailyCheck() {
  var today = new Date().getDate();
  if (today === 1) { var s = sheet_(), n = s.getLastRow(); if (n > 1) { s.getRange(2, 8, n - 1, 1).setValue("N"); s.getRange(2, 12, n - 1, 1).setValue(""); } }
  rows_().forEach(function(r) {
    if (!r.active || r.status !== "N" || !r.email) return;   // only parents who have not paid or said they paid
    if (today === r.dueDay - CFG.daysBefore || today === r.dueDay) sendReminder_(r);
  });
}
function setup() {   // run once
  ScriptApp.getProjectTriggers().forEach(function(t){ ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("dailyCheck").timeBased().everyDays(1).atHour(9).create();
  sheet_();
}
