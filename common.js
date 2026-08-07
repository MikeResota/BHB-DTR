/* BHB International — Shared helpers + Team Sync (Philippine Time) */
var BHB = {
  COMPANY: "BHB International",
  USER_KEY: "bhb_user_profile_v1",
  DTR_KEY: "bhb_dtr_records_v1",
  TASK_KEY: "bhb_task_records_v1",
  EMP_KEY: "bhb_employees_v1",
  SYNC_KEY: "bhb_team_sync_id_v1",
  LATE_THRESHOLD: "08:15",
  TZ: "Asia/Manila",
  /* Free JSON storage (no signup). Everyone with the same Team Sync ID shares data. */
  JSONBLOB_API: "https://jsonblob.com/api/jsonBlob"
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
  if (parts.hour === "24") parts.hour = "00";
  return parts;
}

function todayISO() {
  var p = phNowParts();
  return p.year + "-" + p.month + "-" + p.day;
}

/** Live clock — 12-hour with AM/PM */
function nowTime() {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: BHB.TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

/** HH:mm 24h for DTR storage & late checks */
function nowTimeHM() {
  var p = phNowParts();
  return p.hour + ":" + p.minute;
}

/** Format stored HH:mm (24h) to 12h display */
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
  if (!$t.length) return;
  $t.removeClass("text-bg-dark text-bg-success text-bg-danger text-bg-warning text-bg-info")
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
      if (list.length > 80) list = list.slice(0, 80);
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
  $("#navSettings").on("click", function (e) {
    e.preventDefault();
    openSettingsModal();
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

/* ========== TEAM SYNC (shared data across all users) ========== */

function getTeamSyncId() {
  try {
    return (localStorage.getItem(BHB.SYNC_KEY) || "").trim();
  } catch (e) {
    return "";
  }
}

function setTeamSyncId(id) {
  id = (id || "").trim();
  if (id) localStorage.setItem(BHB.SYNC_KEY, id);
  else localStorage.removeItem(BHB.SYNC_KEY);
}

function getLocalPayload() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    company: BHB.COMPANY,
    dtr: JSON.parse(localStorage.getItem(BHB.DTR_KEY) || "[]"),
    tasks: JSON.parse(localStorage.getItem(BHB.TASK_KEY) || "[]"),
    employees: JSON.parse(localStorage.getItem(BHB.EMP_KEY) || "[]")
  };
}

function applyPayload(data) {
  if (!data || typeof data !== "object") return false;
  try {
    if (Array.isArray(data.dtr)) localStorage.setItem(BHB.DTR_KEY, JSON.stringify(data.dtr));
    if (Array.isArray(data.tasks)) localStorage.setItem(BHB.TASK_KEY, JSON.stringify(data.tasks));
    if (Array.isArray(data.employees)) localStorage.setItem(BHB.EMP_KEY, JSON.stringify(data.employees));
    return true;
  } catch (e) {
    return false;
  }
}

/** Create a brand-new shared team blob. Returns the new ID or null. */
function createTeamBlob(callback) {
  var payload = getLocalPayload();
  fetch(BHB.JSONBLOB_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Create failed");
      var loc = res.headers.get("Location") || res.headers.get("location");
      if (loc) {
        var parts = loc.split("/");
        return parts[parts.length - 1];
      }
      return null;
    })
    .then(function (id) {
      if (id) {
        setTeamSyncId(id);
        if (callback) callback(null, id);
      } else {
        if (callback) callback(new Error("Could not get Team ID"));
      }
    })
    .catch(function (err) {
      if (callback) callback(err);
    });
}

/** Pull latest shared data into localStorage */
function pullTeamData(callback) {
  var id = getTeamSyncId();
  if (!id) {
    if (callback) callback(new Error("No Team Sync ID set"));
    return;
  }
  fetch(BHB.JSONBLOB_API + "/" + id, {
    method: "GET",
    headers: { Accept: "application/json" }
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Pull failed (" + res.status + ")");
      return res.json();
    })
    .then(function (data) {
      applyPayload(data);
      if (callback) callback(null, data);
    })
    .catch(function (err) {
      if (callback) callback(err);
    });
}

/** Push current local data to the shared team blob */
function pushTeamData(callback) {
  var id = getTeamSyncId();
  if (!id) {
    if (callback) callback(new Error("No Team Sync ID set"));
    return;
  }
  var payload = getLocalPayload();
  fetch(BHB.JSONBLOB_API + "/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Push failed (" + res.status + ")");
      return res.json();
    })
    .then(function (data) {
      if (callback) callback(null, data);
    })
    .catch(function (err) {
      if (callback) callback(err);
    });
}

/** Save to localStorage AND push to team if Team Sync ID exists */
function saveAndSync(key, value) {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch (e) {}
  clearTimeout(window._bhbSyncTimer);
  window._bhbSyncTimer = setTimeout(function () {
    if (getTeamSyncId()) {
      pushTeamData(function (err) {
        if (err) console.warn("Team sync push:", err.message);
      });
    }
  }, 800);
}

/* ========== SETTINGS MODAL ========== */

function openSettingsModal() {
  var $m = $("#settingsModal");
  if (!$m.length) return;
  $("#settingsSyncId").val(getTeamSyncId());
  var emp = getEmployeeList();
  $("#settingsEmpCount").text(emp.length);
  try {
    var dtr = JSON.parse(localStorage.getItem(BHB.DTR_KEY) || "[]");
    var tasks = JSON.parse(localStorage.getItem(BHB.TASK_KEY) || "[]");
    $("#settingsDtrCount").text(dtr.length);
    $("#settingsTaskCount").text(tasks.length);
  } catch (e) {
    $("#settingsDtrCount").text("0");
    $("#settingsTaskCount").text("0");
  }
  bootstrap.Modal.getOrCreateInstance($m[0]).show();
}

function exportAllData() {
  var payload = getLocalPayload();
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "BHB_Workforce_Backup_" + todayISO() + ".json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Full backup downloaded.", "success");
}

function importAllData(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data.dtr && !data.tasks) {
        showToast("Invalid backup file.", "danger");
        return;
      }
      if (confirm("Import will replace current local data. Continue?")) {
        applyPayload(data);
        if (getTeamSyncId()) {
          pushTeamData(function (err) {
            if (err) showToast("Imported locally, but team push failed.", "warning");
            else showToast("Data imported and synced to team.", "success");
            setTimeout(function () { location.reload(); }, 900);
          });
        } else {
          showToast("Data imported. Reload page.", "success");
          setTimeout(function () { location.reload(); }, 900);
        }
      }
    } catch (err) {
      showToast("Could not read file.", "danger");
    }
  };
  reader.readAsText(file);
}

function clearAllLocalData() {
  if (!confirm("Delete ALL local DTR, Tasks and employee list on this device?")) return;
  localStorage.removeItem(BHB.DTR_KEY);
  localStorage.removeItem(BHB.TASK_KEY);
  localStorage.removeItem(BHB.EMP_KEY);
  showToast("Local data cleared.", "success");
  setTimeout(function () { location.reload(); }, 800);
}

/* Inject Settings modal HTML once */
function ensureSettingsModal() {
  if ($("#settingsModal").length) return;
  var html =
    '<div class="modal fade" id="settingsModal" tabindex="-1" aria-hidden="true">' +
    '<div class="modal-dialog modal-dialog-centered modal-lg">' +
    '<div class="modal-content">' +
    '<div class="modal-header">' +
    '<h5 class="modal-title"><i class="bi bi-gear me-2"></i>Settings & Team Sync</h5>' +
    '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
    "</div>" +
    '<div class="modal-body">' +
    '<div class="alert alert-info small mb-3">' +
    "<strong>Shared data for the whole team:</strong> Create a Team Sync ID (or paste one shared by your manager). " +
    "Everyone who uses the <em>same</em> ID will see the same Time Records and Tasks — even on different computers and accounts." +
    "</div>" +
    '<div class="mb-3">' +
    '<label class="form-label fw-semibold">Team Sync ID</label>' +
    '<div class="input-group">' +
    '<input type="text" class="form-control font-monospace" id="settingsSyncId" placeholder="Paste shared ID here…">' +
    '<button class="btn btn-outline-secondary" type="button" id="btnCopySyncId" title="Copy"><i class="bi bi-clipboard"></i></button>' +
    "</div>" +
    '<div class="form-text">Leave empty to use this device only (local).</div>' +
    "</div>" +
    '<div class="d-flex flex-wrap gap-2 mb-4">' +
    '<button type="button" class="btn btn-bhb btn-sm" id="btnCreateTeam"><i class="bi bi-plus-circle me-1"></i> Create New Team</button>' +
    '<button type="button" class="btn btn-outline-primary btn-sm" id="btnSaveSyncId"><i class="bi bi-check2 me-1"></i> Save ID &amp; Pull Data</button>' +
    '<button type="button" class="btn btn-outline-success btn-sm" id="btnPushNow"><i class="bi bi-cloud-upload me-1"></i> Push My Data</button>' +
    '<button type="button" class="btn btn-outline-info btn-sm" id="btnPullNow"><i class="bi bi-cloud-download me-1"></i> Pull Latest</button>' +
    "</div>" +
    "<hr>" +
    '<div class="row g-3 mb-3">' +
    '<div class="col-4"><div class="stat-card p-2 text-center"><div class="stat-value" id="settingsDtrCount">0</div><div class="stat-label">DTR Records</div></div></div>' +
    '<div class="col-4"><div class="stat-card p-2 text-center"><div class="stat-value" id="settingsTaskCount">0</div><div class="stat-label">Tasks</div></div></div>' +
    '<div class="col-4"><div class="stat-card p-2 text-center"><div class="stat-value" id="settingsEmpCount">0</div><div class="stat-label">Employees</div></div></div>' +
    "</div>" +
    '<div class="d-flex flex-wrap gap-2">' +
    '<button type="button" class="btn btn-outline-secondary btn-sm" id="btnExportAll"><i class="bi bi-download me-1"></i> Export Backup (JSON)</button>' +
    '<label class="btn btn-outline-secondary btn-sm mb-0">' +
    '<i class="bi bi-upload me-1"></i> Import Backup' +
    '<input type="file" id="importFile" accept=".json,application/json" hidden>' +
    "</label>" +
    '<button type="button" class="btn btn-outline-danger btn-sm" id="btnClearLocal"><i class="bi bi-trash me-1"></i> Clear Local Data</button>' +
    "</div>" +
    "</div>" +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-light" data-bs-dismiss="modal">Close</button>' +
    "</div>" +
    "</div></div></div>";
  $("body").append(html);

  $("#btnCreateTeam").on("click", function () {
    var $btn = $(this).prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-1"></span> Creating…');
    createTeamBlob(function (err, id) {
      $btn.prop("disabled", false).html('<i class="bi bi-plus-circle me-1"></i> Create New Team');
      if (err) {
        showToast("Could not create team. Try again later.", "danger");
        return;
      }
      $("#settingsSyncId").val(id);
      showToast("Team created! Share this ID with everyone.", "success");
    });
  });

  $("#btnSaveSyncId").on("click", function () {
    var id = $("#settingsSyncId").val().trim();
    setTeamSyncId(id);
    if (!id) {
      showToast("Team Sync removed. Using this device only.", "info");
      return;
    }
    var $btn = $(this).prop("disabled", true);
    pullTeamData(function (err) {
      $btn.prop("disabled", false);
      if (err) {
        showToast("Saved ID, but could not pull data. Check the ID.", "warning");
      } else {
        showToast("Connected! Shared data loaded. Reloading…", "success");
        setTimeout(function () { location.reload(); }, 900);
      }
    });
  });

  $("#btnPullNow").on("click", function () {
    if (!getTeamSyncId()) {
      showToast("Set a Team Sync ID first.", "warning");
      return;
    }
    var $btn = $(this).prop("disabled", true);
    pullTeamData(function (err) {
      $btn.prop("disabled", false);
      if (err) showToast("Pull failed: " + err.message, "danger");
      else {
        showToast("Latest team data loaded. Reloading…", "success");
        setTimeout(function () { location.reload(); }, 800);
      }
    });
  });

  $("#btnPushNow").on("click", function () {
    if (!getTeamSyncId()) {
      showToast("Set a Team Sync ID first.", "warning");
      return;
    }
    var $btn = $(this).prop("disabled", true);
    pushTeamData(function (err) {
      $btn.prop("disabled", false);
      if (err) showToast("Push failed: " + err.message, "danger");
      else showToast("Your data is now on the team cloud.", "success");
    });
  });

  $("#btnCopySyncId").on("click", function () {
    var id = $("#settingsSyncId").val().trim();
    if (!id) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id).then(function () {
        showToast("Team ID copied!", "success");
      });
    } else {
      $("#settingsSyncId").select();
      document.execCommand("copy");
      showToast("Team ID copied!", "success");
    }
  });

  $("#btnExportAll").on("click", exportAllData);
  $("#importFile").on("change", function () {
    importAllData(this.files[0]);
    this.value = "";
  });
  $("#btnClearLocal").on("click", clearAllLocalData);
}

$(function () {
  ensureSettingsModal();
});
