/* BHB International — Reports */
function loadDtr() {
  try {
    return JSON.parse(localStorage.getItem(BHB.DTR_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(BHB.TASK_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

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

function monthFilter(list, monthVal) {
  if (!monthVal) return list;
  return list.filter(function (r) {
    return (r.date || r.created || "").indexOf(monthVal) === 0;
  });
}

function renderAttendanceReport(dtr) {
  var present = 0,
    late = 0,
    incomplete = 0;
  var totalHrs = 0;
  var byEmployee = {};

  dtr.forEach(function (r) {
    var st = getStatus(r.timeIn, r.timeOut);
    if (st === "Present") present++;
    else if (st === "Late") late++;
    else incomplete++;
    var h = calcHours(r.timeIn, r.timeOut);
    if (h != null) totalHrs += h;
    var name = r.employee || "Unknown";
    if (!byEmployee[name]) byEmployee[name] = { days: 0, hours: 0, late: 0 };
    byEmployee[name].days++;
    if (h != null) byEmployee[name].hours += h;
    if (st === "Late") byEmployee[name].late++;
  });

  $("#rptPresent").text(present);
  $("#rptLate").text(late);
  $("#rptIncomplete").text(incomplete);
  $("#rptTotalHours").text(totalHrs.toFixed(1));

  // Status bars
  var total = present + late + incomplete || 1;
  $("#barPresent").css("width", ((present / total) * 100).toFixed(1) + "%").text(present || "");
  $("#barLate").css("width", ((late / total) * 100).toFixed(1) + "%").text(late || "");
  $("#barIncomplete").css("width", ((incomplete / total) * 100).toFixed(1) + "%").text(incomplete || "");

  // Employee table
  var $tbody = $("#rptEmpBody");
  $tbody.empty();
  var names = Object.keys(byEmployee).sort();
  if (names.length === 0) {
    $tbody.append('<tr><td colspan="4" class="text-center text-muted">No attendance data</td></tr>');
  } else {
    names.forEach(function (n) {
      var e = byEmployee[n];
      $tbody.append(
        "<tr><td>" +
          escapeHtml(n) +
          "</td><td>" +
          e.days +
          "</td><td>" +
          e.hours.toFixed(1) +
          "</td><td>" +
          e.late +
          "</td></tr>"
      );
    });
  }
}

function renderTaskReport(taskList) {
  var todo = 0,
    progress = 0,
    done = 0,
    overdue = 0;
  var byAssignee = {};

  taskList.forEach(function (t) {
    if (t.status === "Todo") todo++;
    else if (t.status === "In Progress") progress++;
    else if (t.status === "Done") done++;
    if (t.due && t.due < todayISO() && t.status !== "Done") overdue++;
    var name = t.assignee || "Unassigned";
    if (!byAssignee[name]) byAssignee[name] = { total: 0, done: 0 };
    byAssignee[name].total++;
    if (t.status === "Done") byAssignee[name].done++;
  });

  $("#rptTodo").text(todo);
  $("#rptProgress").text(progress);
  $("#rptDone").text(done);
  $("#rptOverdue").text(overdue);

  var total = todo + progress + done || 1;
  $("#barTodo").css("width", ((todo / total) * 100).toFixed(1) + "%").text(todo || "");
  $("#barProgress").css("width", ((progress / total) * 100).toFixed(1) + "%").text(progress || "");
  $("#barDone").css("width", ((done / total) * 100).toFixed(1) + "%").text(done || "");

  var $tbody = $("#rptAssigneeBody");
  $tbody.empty();
  var names = Object.keys(byAssignee).sort();
  if (names.length === 0) {
    $tbody.append('<tr><td colspan="4" class="text-center text-muted">No task data</td></tr>');
  } else {
    names.forEach(function (n) {
      var e = byAssignee[n];
      var pct = e.total ? Math.round((e.done / e.total) * 100) : 0;
      $tbody.append(
        "<tr><td>" +
          escapeHtml(n) +
          "</td><td>" +
          e.total +
          "</td><td>" +
          e.done +
          '</td><td><div class="report-bar"><div class="report-bar-fill bg-success" style="width:' +
          pct +
          '%"></div></div> <small>' +
          pct +
          "%</small></td></tr>"
      );
    });
  }
}

function refreshReports() {
  var month = $("#rptMonth").val();
  var dtr = monthFilter(loadDtr(), month);
  var taskList = monthFilter(loadTasks(), month);
  // tasks use created or due — filter by created primarily
  if (month) {
    taskList = loadTasks().filter(function (t) {
      return (t.created || t.due || "").indexOf(month) === 0;
    });
  } else {
    taskList = loadTasks();
  }
  renderAttendanceReport(dtr);
  renderTaskReport(taskList);
  $("#rptGenerated").text("Generated: " + phDateShort() + " " + nowTimeHM() + " PHT");
}

$(function () {
  loadUser();
  initSidebar();

  function startApp() {
    var p = phNowParts();
    $("#rptMonth").val(p.year + "-" + p.month);
    $("#topbarDate").text(phDateShort());
    refreshReports();

    $("#rptMonth").on("change", refreshReports);
    $("#btnRefreshReport").on("click", refreshReports);
    $("#btnClearRptMonth").on("click", function () {
      $("#rptMonth").val("");
      refreshReports();
    });
  }

  if (typeof getTeamSyncId === "function" && getTeamSyncId()) {
    pullTeamData(function (err) {
      if (err) console.warn("Team pull on load:", err.message);
      startApp();
    });
  } else {
    startApp();
  }
});
