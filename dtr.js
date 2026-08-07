/* BHB International — Daily Time Record (PH Time) */
var records = [];
var editModal;

function timeToMinutes(t) {
  if (!t) return null;
  var p = t.split(":");
  return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

function calcHours(timeIn, timeOut) {
  if (!timeIn || !timeOut) return null;
  var inM = timeToMinutes(timeIn);
  var outM = timeToMinutes(timeOut);
  if (outM <= inM) return null;
  return Math.round(((outM - inM) / 60) * 100) / 100;
}

function getStatus(timeIn, timeOut) {
  if (!timeIn || !timeOut) return "Incomplete";
  if (timeToMinutes(timeIn) > timeToMinutes(BHB.LATE_THRESHOLD)) return "Late";
  return "Present";
}

function statusBadge(status) {
  var map = {
    Present: "bg-success-subtle text-success",
    Late: "bg-warning-subtle text-warning-emphasis",
    Incomplete: "bg-secondary-subtle text-secondary"
  };
  return '<span class="badge badge-status ' + (map[status] || "") + '">' + status + "</span>";
}

function formatDate(iso) {
  var d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function saveRecords() {
  saveAndSync(BHB.DTR_KEY, records);
}

function loadRecords() {
  try {
    var raw = localStorage.getItem(BHB.DTR_KEY);
    records = raw ? JSON.parse(raw) : [];
  } catch (e) {
    records = [];
  }
}

function updateClock() {
  $("#liveClock").text(nowTime());
  $("#liveDate").text(phDateLong());
  $("#topbarDate").text(phDateShort());
}

function getEmployeeName() {
  return ($("#employeeName").val() || "").trim();
}

function getTodayRecordFor(name) {
  var today = todayISO();
  return records.find(function (r) {
    return r.date === today && r.employee === name;
  });
}

function updateClockButtons() {
  var name = getEmployeeName();
  if (!name) {
    $("#btnTimeIn").prop("disabled", true);
    $("#btnTimeOut").prop("disabled", true);
    $("#todaySummary").html("Enter your name to punch in/out.");
    $("#statPresent").text("—");
    return;
  }
  var today = getTodayRecordFor(name);
  if (!today) {
    $("#btnTimeIn").prop("disabled", false);
    $("#btnTimeOut").prop("disabled", true);
    $("#todaySummary").html("No record for <strong>" + escapeHtml(name) + "</strong> today.");
    $("#statPresent").text("—");
  } else if (today.timeIn && !today.timeOut) {
    $("#btnTimeIn").prop("disabled", true);
    $("#btnTimeOut").prop("disabled", false);
    $("#todaySummary").html(
      "<strong>" +
        escapeHtml(name) +
        "</strong> · Time In: <strong>" +
        formatTime12(today.timeIn) +
        "</strong> · Waiting for Time Out"
    );
    $("#statPresent").text("In");
  } else {
    $("#btnTimeIn").prop("disabled", true);
    $("#btnTimeOut").prop("disabled", true);
    var hrs = calcHours(today.timeIn, today.timeOut);
    $("#todaySummary").html(
      "<strong>" +
        escapeHtml(name) +
        "</strong> · In: <strong>" +
        formatTime12(today.timeIn) +
        "</strong> · Out: <strong>" +
        formatTime12(today.timeOut) +
        "</strong> · " +
        (hrs != null ? hrs : "—") +
        " hrs"
    );
    $("#statPresent").text(getStatus(today.timeIn, today.timeOut));
  }
}

function filteredRecords() {
  var month = $("#filterMonth").val();
  var status = $("#filterStatus").val();
  var emp = ($("#filterEmployee").val() || "").trim().toLowerCase();
  return records
    .filter(function (r) {
      if (month && r.date.indexOf(month) !== 0) return false;
      if (status && getStatus(r.timeIn, r.timeOut) !== status) return false;
      if (emp && (r.employee || "").toLowerCase().indexOf(emp) < 0) return false;
      return true;
    })
    .sort(function (a, b) {
      var c = b.date.localeCompare(a.date);
      if (c !== 0) return c;
      return (a.employee || "").localeCompare(b.employee || "");
    });
}

function renderTable() {
  var list = filteredRecords();
  var $tbody = $("#dtrTableBody");
  $tbody.empty();

  if (list.length === 0) {
    $("#emptyState").removeClass("d-none");
    return;
  }
  $("#emptyState").addClass("d-none");

  list.forEach(function (r) {
    var hours = calcHours(r.timeIn, r.timeOut);
    var status = getStatus(r.timeIn, r.timeOut);
    $tbody.append(
      '<tr data-id="' +
        r.id +
        '">' +
        "<td><div class=\"fw-semibold\">" +
        escapeHtml(r.employee || "—") +
        "</div></td>" +
        "<td><div class=\"fw-semibold\">" +
        formatDate(r.date) +
        "</div>" +
        (r.notes ? '<small class="text-muted">' + escapeHtml(r.notes) + "</small>" : "") +
        "</td>" +
        "<td>" +
        formatTime12(r.timeIn) +
        "</td>" +
        "<td>" +
        formatTime12(r.timeOut) +
        "</td>" +
        "<td>" +
        (hours != null ? hours.toFixed(2) : "—") +
        "</td>" +
        "<td>" +
        statusBadge(status) +
        "</td>" +
        '<td class="text-end">' +
        '<button class="btn btn-sm btn-outline-primary btn-edit" title="Edit"><i class="bi bi-pencil"></i></button> ' +
        '<button class="btn btn-sm btn-outline-danger btn-delete" title="Delete"><i class="bi bi-trash"></i></button>' +
        "</td></tr>"
    );
  });
}

function updateStats() {
  var list = filteredRecords();
  var totalHrs = 0;
  var lateCount = 0;
  var names = {};
  list.forEach(function (r) {
    var h = calcHours(r.timeIn, r.timeOut);
    if (h != null) totalHrs += h;
    if (getStatus(r.timeIn, r.timeOut) === "Late") lateCount++;
    if (r.employee) names[r.employee] = true;
  });
  $("#statDays").text(
    list.filter(function (r) {
      return r.timeIn;
    }).length
  );
  $("#statHours").text(totalHrs.toFixed(1));
  $("#statLate").text(lateCount);
  $("#statEmployees").text(Object.keys(names).length);
}

function refreshAll() {
  updateClockButtons();
  renderTable();
  updateStats();
  fillEmployeeDatalist();
}

function fillEmployeeDatalist() {
  var list = getEmployeeList();
  var $dl = $("#employeeList");
  $dl.empty();
  list.forEach(function (n) {
    $dl.append('<option value="' + escapeHtml(n) + '">');
  });
}

function punchIn() {
  var name = getEmployeeName();
  if (!name) {
    showToast("Please enter your full name first.", "warning");
    $("#employeeName").focus();
    return;
  }
  if (getTodayRecordFor(name)) {
    showToast(name + " already has a record for today.", "warning");
    return;
  }
  var time = nowTimeHM();
  records.push({
    id: generateId("r"),
    employee: name,
    date: todayISO(),
    timeIn: time,
    timeOut: null,
    notes: "",
    company: BHB.COMPANY
  });
  saveEmployeeName(name);
  saveRecords();
  refreshAll();
  showToast(name + " — Time In at " + formatTime12(time) + " (PHT)", "success");
}

function punchOut() {
  var name = getEmployeeName();
  if (!name) {
    showToast("Please enter your full name first.", "warning");
    $("#employeeName").focus();
    return;
  }
  var rec = getTodayRecordFor(name);
  if (!rec || !rec.timeIn || rec.timeOut) {
    showToast("Cannot Time Out for " + name + " right now.", "warning");
    return;
  }
  var time = nowTimeHM();
  rec.timeOut = time;
  saveEmployeeName(name);
  saveRecords();
  refreshAll();
  showToast(name + " — Time Out at " + formatTime12(time) + " (PHT)", "success");
}

function openEdit(id) {
  var rec = records.find(function (r) {
    return r.id === id;
  });
  if (!rec) return;
  $("#editId").val(rec.id);
  $("#editEmployee").val(rec.employee || "");
  $("#editDate").val(rec.date);
  $("#editTimeIn").val(rec.timeIn || "");
  $("#editTimeOut").val(rec.timeOut || "");
  $("#editNotes").val(rec.notes || "");
  editModal.show();
}

function saveEdit() {
  var rec = records.find(function (r) {
    return r.id === $("#editId").val();
  });
  if (!rec) return;
  var emp = ($("#editEmployee").val() || "").trim();
  if (!emp) {
    showToast("Employee name is required.", "warning");
    return;
  }
  rec.employee = emp;
  rec.timeIn = $("#editTimeIn").val() || null;
  rec.timeOut = $("#editTimeOut").val() || null;
  rec.notes = $("#editNotes").val().trim();
  saveEmployeeName(emp);
  saveRecords();
  editModal.hide();
  refreshAll();
  showToast("Record updated.", "success");
}

function deleteRecord(id) {
  if (!confirm("Delete this time record?")) return;
  records = records.filter(function (r) {
    return r.id !== id;
  });
  saveRecords();
  refreshAll();
  showToast("Record deleted.", "success");
}

function csvCell(val) {
  if (val == null || val === "") return "";
  var s = String(val).replace(/\r?\n/g, " ").replace(/"/g, "'");
  if (/[",\n]/.test(s) || s !== s.trim()) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function exportCSV() {
  var list = filteredRecords();
  if (!list.length) {
    showToast("No records to export.", "warning");
    return;
  }
  var header = ["Company", "Employee", "Date", "Time In", "Time Out", "Hours", "Status", "Notes"];
  var rows = [header.join(",")];
  list.forEach(function (r) {
    var h = calcHours(r.timeIn, r.timeOut);
    var status = getStatus(r.timeIn, r.timeOut);
    rows.push([
      csvCell(BHB.COMPANY),
      csvCell(r.employee || ""),
      csvCell(r.date),
      csvCell(r.timeIn || ""),
      csvCell(r.timeOut || ""),
      csvCell(h != null ? h : ""),
      csvCell(status),
      csvCell(r.notes || "")
    ].join(","));
  });
  var csv = rows.join("\r\n");
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "BHB_DTR_" + todayISO() + ".csv";
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV exported (" + list.length + " rows). Open in Excel / Google Sheets.", "success");
}

$(function () {
  editModal = new bootstrap.Modal("#editModal");
  loadUser();
  initSidebar();

  function startApp() {
    loadRecords();
    try {
      var u = JSON.parse(localStorage.getItem(BHB.USER_KEY) || "{}");
      if (u.name) $("#employeeName").val(u.name);
    } catch (e) {}

    var now = phNowParts();
    $("#filterMonth").val(now.year + "-" + now.month);

    updateClock();
    setInterval(updateClock, 1000);
    refreshAll();

    $("#employeeName").on("input change", function () {
      updateClockButtons();
    });

    $("#btnTimeIn").on("click", punchIn);
    $("#btnTimeOut").on("click", punchOut);

    $("#filterMonth, #filterStatus, #filterEmployee").on("change input", function () {
      renderTable();
      updateStats();
    });

    $("#btnClearFilter").on("click", function () {
      $("#filterMonth").val("");
      $("#filterStatus").val("");
      $("#filterEmployee").val("");
      renderTable();
      updateStats();
    });

    $("#dtrTableBody").on("click", ".btn-edit", function () {
      openEdit($(this).closest("tr").data("id"));
    });
    $("#dtrTableBody").on("click", ".btn-delete", function () {
      deleteRecord($(this).closest("tr").data("id"));
    });

    $("#btnSaveEdit").on("click", saveEdit);
    $("#btnExport").on("click", exportCSV);
  }

  // Auto-pull shared team data if Team Sync ID is set
  if (typeof getTeamSyncId === "function" && getTeamSyncId()) {
    pullTeamData(function (err) {
      if (err) console.warn("Team pull on load:", err.message);
      startApp();
    });
  } else {
    startApp();
  }
});
