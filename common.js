/* BHB International — Shared helpers (Philippine Time) */
var BHB = {
  COMPANY: "BHB International",
  USER_KEY: "bhb_user_profile_v1",
  DTR_KEY: "bhb_dtr_records_v1",
  TASK_KEY: "bhb_task_records_v1",
  EMP_KEY: "bhb_employees_v1",
  LATE_THRESHOLD: "08:15",
  TZ: "Asia/Manila"
};

function pad(n) {
  return String(n).padStart(2, "0");
}

/** Current date/time parts in Philippine Standard Time */
function phNowParts() {
  var fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BHB.TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "long"
  });
  var parts = {};
  fmt.formatToParts(new Date()).forEach(function (p) {
    if (p.type !== "literal") parts[p.type] = p.value;
  });
  // hour12:false can still give 24 as midnight in some engines — normalize
  if (parts.hour === "24") parts.hour = "00";
  return parts;
}

function todayISO() {
  var p = phNowParts();
  return p.year + "-" + p.month + "-" + p.day;
}

/** Live clock — 12-hour with AM/PM (e.g. 2:18:00 PM) */
function nowTime() {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: BHB.TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

/** HH:mm 24h for DTR storage & late checks (e.g. 14:18) */
function nowTimeHM() {
  var p = phNowParts();
  return p.hour + ":" + p.minute;
}

/** Format stored HH:mm (24h) to 12h display e.g. 2:18 PM */
function formatTime12(hm) {
  if (!hm) return "—";
  var parts = hm.split(":");
  var h = parseInt(parts[0], 10);
  var m = parts[1] || "00";
  var ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return h + ":" + m + " " + ampm;
}

function phDateLong() {
  return new Date().toLocaleDateString("en-US", {
    timeZone: BHB.TZ,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function phDateShort() {
  return new Date().toLocaleDateString("en-US", {
    timeZone: BHB.TZ,
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function generateId(prefix) {
  return (prefix || "id") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

function showToast(msg, type) {
  type = type || "dark";
  var $t = $("#appToast");
  $t.removeClass("text-bg-dark text-bg-success text-bg-danger text-bg-warning")
    .addClass("text-bg-" + type);
  $("#toastMessage").text(msg);
  bootstrap.Toast.getOrCreateInstance($t[0]).show();
}

function loadUser() {
  try {
    var raw = localStorage.getItem(BHB.USER_KEY);
    if (raw) {
      var u = JSON.parse(raw);
      if (u.name) $("#sidebarUserName").text(u.name);
    }
  } catch (e) {}
}

function saveEmployeeName(name) {
  name = (name || "").trim();
  if (!name) return;
  try {
    var list = JSON.parse(localStorage.getItem(BHB.EMP_KEY) || "[]");
    if (list.indexOf(name) === -1) {
      list.unshift(name);
      if (list.length > 50) list = list.slice(0, 50);
      localStorage.setItem(BHB.EMP_KEY, JSON.stringify(list));
    }
    localStorage.setItem(BHB.USER_KEY, JSON.stringify({ name: name }));
    $("#sidebarUserName").text(name);
  } catch (e) {}
}

function getEmployeeList() {
  try {
    return JSON.parse(localStorage.getItem(BHB.EMP_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function initSidebar() {
  $("#sidebarToggle, #sidebarOverlay").on("click", function () {
    $("#sidebar").toggleClass("show");
    $("#sidebarOverlay").toggleClass("show");
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
