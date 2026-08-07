/* BHB International — Task Manager */
var tasks = [];
var taskModal, deleteModal;
var currentView = "list";
var dragId = null;

function priorityBadge(p) {
  var map = {
    High: "bg-danger-subtle text-danger",
    Medium: "bg-warning-subtle text-warning-emphasis",
    Low: "bg-success-subtle text-success"
  };
  return '<span class="badge badge-priority ' + (map[p] || "") + '">' + p + "</span>";
}

function statusBadge(s) {
  var map = {
    Todo: "bg-secondary-subtle text-secondary",
    "In Progress": "bg-info-subtle text-info",
    Done: "bg-success-subtle text-success"
  };
  return '<span class="badge badge-status-task ' + (map[s] || "") + '">' + s + "</span>";
}

function dueLabel(due) {
  if (!due) return '<span class="text-muted">No due date</span>';
  var today = todayISO();
  if (due < today)
    return (
      '<span class="due-soon"><i class="bi bi-exclamation-triangle me-1"></i>Overdue (' +
      due +
      ")</span>"
    );
  if (due === today)
    return '<span class="due-today"><i class="bi bi-calendar-event me-1"></i>Due today</span>';
  return '<span><i class="bi bi-calendar3 me-1"></i>' + due + "</span>";
}

function isOverdue(t) {
  return t.due && t.due < todayISO() && t.status !== "Done";
}

function saveTasks() {
  localStorage.setItem(BHB.TASK_KEY, JSON.stringify(tasks));
}

function getSampleTasks() {
  var t = todayISO();
  var d = new Date();
  d.setDate(d.getDate() + 2);
  var p = new Intl.DateTimeFormat("en-CA", { timeZone: BHB.TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  var parts = {};
  p.forEach(function (x) { if (x.type !== "literal") parts[x.type] = x.value; });
  var dueSoon = parts.year + "-" + parts.month + "-" + parts.day;
  d.setDate(d.getDate() - 5);
  p = new Intl.DateTimeFormat("en-CA", { timeZone: BHB.TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  parts = {};
  p.forEach(function (x) { if (x.type !== "literal") parts[x.type] = x.value; });
  var overdue = parts.year + "-" + parts.month + "-" + parts.day;
  return [
    {
      id: generateId("t"),
      title: "Prepare weekly DTR summary",
      description: "Compile attendance for BHB International managers.",
      assignee: "Maria Santos",
      priority: "High",
      status: "In Progress",
      due: t,
      created: t,
      company: BHB.COMPANY
    },
    {
      id: generateId("t"),
      title: "Update project documentation",
      description: "",
      assignee: "Juan Dela Cruz",
      priority: "Medium",
      status: "Todo",
      due: dueSoon,
      created: t,
      company: BHB.COMPANY
    },
    {
      id: generateId("t"),
      title: "Review department requests",
      description: "Check pending approvals",
      assignee: "Ana Reyes",
      priority: "High",
      status: "Todo",
      due: overdue,
      created: t,
      company: BHB.COMPANY
    },
    {
      id: generateId("t"),
      title: "Archive last week notes",
      description: "",
      assignee: "Maria Santos",
      priority: "Low",
      status: "Done",
      due: t,
      created: t,
      company: BHB.COMPANY
    }
  ];
}

function loadTasks() {
  try {
    var raw = localStorage.getItem(BHB.TASK_KEY);
    tasks = raw ? JSON.parse(raw) : getSampleTasks();
    if (!raw) saveTasks();
  } catch (e) {
    tasks = getSampleTasks();
  }
}

function fillAssigneeDatalist() {
  var list = getEmployeeList();
  var $dl = $("#assigneeList");
  $dl.empty();
  list.forEach(function (n) {
    $dl.append('<option value="' + escapeHtml(n) + '">');
  });
}

function filteredTasks() {
  var q = ($("#searchTask").val() || "").toLowerCase().trim();
  var pri = $("#filterPriority").val();
  var st = $("#filterStatus").val();
  return tasks
    .filter(function (t) {
      if (
        q &&
        t.title.toLowerCase().indexOf(q) < 0 &&
        (t.description || "").toLowerCase().indexOf(q) < 0 &&
        (t.assignee || "").toLowerCase().indexOf(q) < 0
      )
        return false;
      if (pri && t.priority !== pri) return false;
      if (st && t.status !== st) return false;
      return true;
    })
    .sort(function (a, b) {
      if (a.status === "Done" && b.status !== "Done") return 1;
      if (b.status === "Done" && a.status !== "Done") return -1;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      var pOrder = { High: 0, Medium: 1, Low: 2 };
      return (pOrder[a.priority] || 9) - (pOrder[b.priority] || 9);
    });
}

function updateStats() {
  var all = tasks;
  $("#statTotal").text(all.length);
  $("#statInProgress").text(
    all.filter(function (t) {
      return t.status === "In Progress";
    }).length
  );
  $("#statDone").text(
    all.filter(function (t) {
      return t.status === "Done";
    }).length
  );
  $("#statOverdue").text(all.filter(isOverdue).length);
}

function renderList() {
  var list = filteredTasks();
  var $list = $("#taskList");
  $list.empty();

  if (list.length === 0) {
    $("#emptyList").removeClass("d-none");
    return;
  }
  $("#emptyList").addClass("d-none");

  list.forEach(function (t) {
    var doneClass = t.status === "Done" ? "done" : "";
    $list.append(
      '<div class="task-item ' +
        doneClass +
        '" data-id="' +
        t.id +
        '">' +
        '<div class="d-flex align-items-start gap-3">' +
        '<div class="form-check mt-1">' +
        '<input class="form-check-input task-check" type="checkbox" ' +
        (t.status === "Done" ? "checked" : "") +
        ' title="Mark complete">' +
        "</div>" +
        '<div class="flex-grow-1 min-w-0">' +
        '<div class="task-title">' +
        escapeHtml(t.title) +
        "</div>" +
        (t.description
          ? '<div class="small text-muted mb-1 text-truncate">' +
            escapeHtml(t.description) +
            "</div>"
          : "") +
        '<div class="task-meta">' +
        (t.assignee
          ? '<span><i class="bi bi-person me-1"></i>' + escapeHtml(t.assignee) + "</span>"
          : "") +
        priorityBadge(t.priority) +
        " " +
        statusBadge(t.status) +
        " " +
        dueLabel(t.due) +
        "</div>" +
        "</div>" +
        '<div class="dropdown">' +
        '<button class="btn btn-sm btn-light" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>' +
        '<ul class="dropdown-menu dropdown-menu-end">' +
        '<li><a class="dropdown-item btn-edit-task" href="#"><i class="bi bi-pencil me-2"></i>Edit</a></li>' +
        '<li><a class="dropdown-item btn-status-todo" href="#"><i class="bi bi-circle me-2"></i>Set To Do</a></li>' +
        '<li><a class="dropdown-item btn-status-progress" href="#"><i class="bi bi-play me-2"></i>Set In Progress</a></li>' +
        '<li><a class="dropdown-item btn-status-done" href="#"><i class="bi bi-check2 me-2"></i>Set Done</a></li>' +
        '<li><hr class="dropdown-divider"></li>' +
        '<li><a class="dropdown-item text-danger btn-delete-task" href="#"><i class="bi bi-trash me-2"></i>Delete</a></li>' +
        "</ul>" +
        "</div>" +
        "</div>" +
        "</div>"
    );
  });
}

function renderKanban() {
  var list = filteredTasks();
  var cols = {
    Todo: $("#colTodo"),
    "In Progress": $("#colProgress"),
    Done: $("#colDone")
  };
  Object.keys(cols).forEach(function (k) {
    cols[k].empty();
  });
  var counts = { Todo: 0, "In Progress": 0, Done: 0 };

  list.forEach(function (t) {
    counts[t.status] = (counts[t.status] || 0) + 1;
    var card =
      '<div class="kanban-card" draggable="true" data-id="' +
      t.id +
      '">' +
      '<div class="title">' +
      escapeHtml(t.title) +
      "</div>" +
      '<div class="meta d-flex flex-wrap gap-2 align-items-center">' +
      (t.assignee
        ? '<span><i class="bi bi-person me-1"></i>' + escapeHtml(t.assignee) + "</span>"
        : "") +
      '<span class="priority-dot priority-' +
      t.priority.toLowerCase() +
      '"></span>' +
      priorityBadge(t.priority) +
      " " +
      (t.due ? dueLabel(t.due) : "") +
      "</div>" +
      '<div class="mt-2 d-flex gap-1">' +
      '<button class="btn btn-sm btn-outline-secondary btn-edit-task py-0 px-1" title="Edit"><i class="bi bi-pencil"></i></button>' +
      '<button class="btn btn-sm btn-outline-danger btn-delete-task py-0 px-1" title="Delete"><i class="bi bi-trash"></i></button>' +
      "</div>" +
      "</div>";
    if (cols[t.status]) cols[t.status].append(card);
  });

  $("#countTodo").text(counts.Todo || 0);
  $("#countProgress").text(counts["In Progress"] || 0);
  $("#countDone").text(counts.Done || 0);
}

function refresh() {
  updateStats();
  fillAssigneeDatalist();
  if (currentView === "list") {
    renderList();
    $("#listView").removeClass("d-none");
    $("#kanbanView").addClass("d-none");
  } else {
    renderKanban();
    $("#listView").addClass("d-none");
    $("#kanbanView").removeClass("d-none");
  }
}

function openNewTask() {
  $("#taskModalTitle").html('<i class="bi bi-plus-circle me-2"></i>New Task');
  $("#taskId").val("");
  $("#taskTitle").val("");
  $("#taskDesc").val("");
  $("#taskAssignee").val("");
  $("#taskPriority").val("Medium");
  $("#taskStatus").val("Todo");
  $("#taskDue").val("");
  fillAssigneeDatalist();
  taskModal.show();
  setTimeout(function () {
    $("#taskTitle").focus();
  }, 300);
}

function openEditTask(id) {
  var t = tasks.find(function (x) {
    return x.id === id;
  });
  if (!t) return;
  $("#taskModalTitle").html('<i class="bi bi-pencil-square me-2"></i>Edit Task');
  $("#taskId").val(t.id);
  $("#taskTitle").val(t.title);
  $("#taskDesc").val(t.description || "");
  $("#taskAssignee").val(t.assignee || "");
  $("#taskPriority").val(t.priority);
  $("#taskStatus").val(t.status);
  $("#taskDue").val(t.due || "");
  fillAssigneeDatalist();
  taskModal.show();
}

function saveTask() {
  var title = $("#taskTitle").val().trim();
  if (!title) {
    showToast("Title is required.", "warning");
    $("#taskTitle").focus();
    return;
  }
  var assignee = ($("#taskAssignee").val() || "").trim();
  if (!assignee) {
    showToast("Assignee name is required.", "warning");
    $("#taskAssignee").focus();
    return;
  }
  var id = $("#taskId").val();
  var data = {
    title: title,
    description: $("#taskDesc").val().trim(),
    assignee: assignee,
    priority: $("#taskPriority").val(),
    status: $("#taskStatus").val(),
    due: $("#taskDue").val() || null,
    company: BHB.COMPANY
  };

  if (id) {
    var t = tasks.find(function (x) {
      return x.id === id;
    });
    if (t) {
      t.title = data.title;
      t.description = data.description;
      t.assignee = data.assignee;
      t.priority = data.priority;
      t.status = data.status;
      t.due = data.due;
    }
    showToast("Task updated.", "success");
  } else {
    tasks.push({
      id: generateId("t"),
      title: data.title,
      description: data.description,
      assignee: data.assignee,
      priority: data.priority,
      status: data.status,
      due: data.due,
      created: todayISO(),
      company: BHB.COMPANY
    });
    showToast("Task created.", "success");
  }
  saveEmployeeName(assignee);
  saveTasks();
  taskModal.hide();
  refresh();
}

function setStatus(id, status) {
  var t = tasks.find(function (x) {
    return x.id === id;
  });
  if (!t) return;
  t.status = status;
  saveTasks();
  refresh();
  showToast("Status → " + status, "success");
}

function toggleDone(id) {
  var t = tasks.find(function (x) {
    return x.id === id;
  });
  if (!t) return;
  t.status = t.status === "Done" ? "Todo" : "Done";
  saveTasks();
  refresh();
}

function confirmDelete(id) {
  $("#deleteId").val(id);
  deleteModal.show();
}

function doDelete() {
  var id = $("#deleteId").val();
  tasks = tasks.filter(function (t) {
    return t.id !== id;
  });
  saveTasks();
  deleteModal.hide();
  refresh();
  showToast("Task deleted.", "success");
}

function setupDragDrop() {
  $(document).on("dragstart", ".kanban-card", function (e) {
    dragId = $(this).data("id");
    e.originalEvent.dataTransfer.effectAllowed = "move";
    $(this).css("opacity", "0.5");
  });
  $(document).on("dragend", ".kanban-card", function () {
    $(this).css("opacity", "1");
    dragId = null;
  });
  $(".kanban-col-body").on("dragover", function (e) {
    e.preventDefault();
    e.originalEvent.dataTransfer.dropEffect = "move";
    $(this).css("background", "#e2e8f0");
  });
  $(".kanban-col-body").on("dragleave", function () {
    $(this).css("background", "");
  });
  $(".kanban-col-body").on("drop", function (e) {
    e.preventDefault();
    $(this).css("background", "");
    if (!dragId) return;
    setStatus(dragId, $(this).data("status"));
  });
}

$(function () {
  taskModal = new bootstrap.Modal("#taskModal");
  deleteModal = new bootstrap.Modal("#deleteModal");
  loadTasks();
  loadUser();
  initSidebar();
  refresh();
  setupDragDrop();

  $(".view-toggle .btn").on("click", function () {
    $(".view-toggle .btn").removeClass("active");
    $(this).addClass("active");
    currentView = $(this).data("view");
    refresh();
  });

  $("#searchTask").on("input", refresh);
  $("#filterPriority, #filterStatus").on("change", refresh);
  $("#btnClearFilters").on("click", function () {
    $("#searchTask").val("");
    $("#filterPriority").val("");
    $("#filterStatus").val("");
    refresh();
  });

  $("#btnNewTask").on("click", openNewTask);
  $("#btnSaveTask").on("click", saveTask);

  $("#taskList, #kanbanView").on("click", ".btn-edit-task", function (e) {
    e.preventDefault();
    openEditTask($(this).closest("[data-id]").data("id"));
  });
  $("#taskList, #kanbanView").on("click", ".btn-delete-task", function (e) {
    e.preventDefault();
    confirmDelete($(this).closest("[data-id]").data("id"));
  });
  $("#taskList").on("click", ".btn-status-todo", function (e) {
    e.preventDefault();
    setStatus($(this).closest("[data-id]").data("id"), "Todo");
  });
  $("#taskList").on("click", ".btn-status-progress", function (e) {
    e.preventDefault();
    setStatus($(this).closest("[data-id]").data("id"), "In Progress");
  });
  $("#taskList").on("click", ".btn-status-done", function (e) {
    e.preventDefault();
    setStatus($(this).closest("[data-id]").data("id"), "Done");
  });
  $("#taskList").on("change", ".task-check", function () {
    toggleDone($(this).closest("[data-id]").data("id"));
  });

  $("#btnConfirmDelete").on("click", doDelete);
  $("#taskTitle").on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTask();
    }
  });
});
