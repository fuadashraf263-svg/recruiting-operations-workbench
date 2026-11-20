const state = { candidates: [], view: "all", search: "", stage: "all", health: "all" };
const activeStages = new Set(["New", "Screen", "Hiring Manager Review", "Interview", "Work Sample", "Offer"]);
const stageColors = { New: "gray", Screen: "blue", "Hiring Manager Review": "purple", Interview: "purple", "Work Sample": "amber", Offer: "green", Hired: "green", Rejected: "gray" };
const stageOrder = ["New", "Screen", "Hiring Manager Review", "Interview", "Work Sample", "Offer", "Hired", "Rejected"];
const shortStage = { "Hiring Manager Review": "HM Review", "Work Sample": "Work Sample" };
const attentionMeta = {
  "Interview has no scheduled slot": { icon: "◷", color: "purple", label: "Scheduling gap" },
  "Candidate update overdue": { icon: "↗", color: "amber", label: "Candidate update" },
  "Possible duplicate record": { icon: "⧉", color: "red", label: "Possible duplicate" },
  "Reviewer feedback missing": { icon: "▤", color: "amber", label: "Feedback missing" },
  "Source conflict": { icon: "◇", color: "red", label: "Source conflict" }
};

const $ = (id) => document.getElementById(id);
const initials = (name) => name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();
const isActive = candidate => activeStages.has(candidate.stage);
const needsAttention = candidate => candidate.qualityIssues.length > 0 || candidate.followUpDue;

async function start() {
  try {
    const response = await fetch("data/candidates.json");
    if (!response.ok) throw new Error("Candidate sample could not be loaded.");
    state.candidates = await response.json();
  } catch (error) {
    $("candidate-rows").innerHTML = `<tr><td colspan="8" class="load-error">${escapeHTML(error.message)} Open this folder through a local web server to load the JSON file.</td></tr>`;
    return;
  }
  buildStageFilter();
  wireControls();
  render();
}

function buildStageFilter() {
  const select = $("stage-filter");
  stageOrder.filter(stage => state.candidates.some(candidate => candidate.stage === stage)).forEach(stage => {
    const option = document.createElement("option");
    option.value = stage;
    option.textContent = stage;
    select.append(option);
  });
}

function wireControls() {
  $("search-input").addEventListener("input", event => { state.search = event.target.value.toLowerCase().trim(); renderRows(); });
  $("stage-filter").addEventListener("change", event => { state.stage = event.target.value; renderRows(); });
  $("health-filter").addEventListener("change", event => { state.health = event.target.value; renderRows(); });
  $("queue-button").addEventListener("click", () => { state.view = state.view === "attention" ? "all" : "attention"; renderRows(); scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); });
  $("show-all-button").addEventListener("click", () => { state.view = "attention"; state.health = "attention"; $("health-filter").value = "attention"; renderRows(); document.querySelector(".records-panel").scrollIntoView({ behavior: "smooth" }); });
  $("export-button").addEventListener("click", exportCSV);
  $("candidate-rows").addEventListener("click", event => {
    const button = event.target.closest("[data-candidate]");
    if (button) showDetail(button.dataset.candidate);
  });
  $("dialog-close").addEventListener("click", () => $("candidate-dialog").close());
  $("candidate-dialog").addEventListener("click", event => { if (event.target === $("candidate-dialog")) $("candidate-dialog").close(); });
}

function render() {
  renderMetrics();
  renderStages();
  renderAttention();
  renderRows();
}

function renderMetrics() {
  const active = state.candidates.filter(isActive);
  const followups = state.candidates.filter(candidate => candidate.followUpDue);
  const scheduling = state.candidates.filter(candidate => candidate.stage === "Interview" && !candidate.interviewScheduled);
  const duplicateIds = new Set(state.candidates.filter(candidate => candidate.duplicateGroup).map(candidate => candidate.duplicateGroup));
  $("metric-active").textContent = active.length;
  $("metric-followup").textContent = followups.length;
  $("metric-scheduling").textContent = scheduling.length;
  $("metric-duplicates").textContent = duplicateIds.size;
  $("nav-followup-count").textContent = followups.length;
}

function renderStages() {
  const counts = Object.fromEntries(stageOrder.map(stage => [stage, state.candidates.filter(candidate => candidate.stage === stage).length]));
  const max = Math.max(1, ...Object.values(counts));
  $("stage-chart").innerHTML = stageOrder.map(stage => {
    const count = counts[stage];
    if (!count) return "";
    const color = stage === "Hired" ? "green-bg" : stage === "Rejected" ? "gray-bg" : "blue-bg";
    const height = Math.max(7, Math.round((count / max) * 76));
    return `<div class="stage-column" title="${escapeHTML(stage)}: ${count}"><div class="stage-bar ${color}" style="height:${height}px"><span class="stage-count">${count}</span></div><span class="stage-name">${escapeHTML(shortStage[stage] || stage)}</span></div>`;
  }).join("");
}

function renderAttention() {
  const items = state.candidates.filter(needsAttention).slice(0, 4);
  $("attention-list").innerHTML = items.map(candidate => {
    const issue = candidate.qualityIssues[0] || "Candidate follow-up due";
    const meta = attentionMeta[issue] || { icon: "↗", color: "amber", label: "Follow-up due" };
    return `<div class="attention-item"><span class="attention-symbol ${meta.color}">${meta.icon}</span><div class="attention-copy"><b>${escapeHTML(candidate.name)} <span class="attention-muted">· ${escapeHTML(candidate.role)}</span></b><small>${escapeHTML(meta.label)} · ${escapeHTML(candidate.id)} · Owner ${escapeHTML(candidate.owner)}</small></div><span class="attention-action">${escapeHTML(issue === "Interview has no scheduled slot" ? "Schedule" : issue.includes("duplicate") || issue.includes("Duplicate") ? "Reconcile" : "Review")}</span></div>`;
  }).join("");
}

function renderRows() {
  let rows = [...state.candidates];
  if (state.view === "attention") rows = rows.filter(needsAttention);
  if (state.stage !== "all") rows = rows.filter(candidate => candidate.stage === state.stage);
  if (state.health === "attention") rows = rows.filter(needsAttention);
  if (state.health === "clear") rows = rows.filter(candidate => !needsAttention(candidate));
  if (state.search) rows = rows.filter(candidate => `${candidate.id} ${candidate.name} ${candidate.role} ${candidate.function} ${candidate.stage}`.toLowerCase().includes(state.search));
  $("candidate-rows").innerHTML = rows.map(rowHTML).join("");
  $("empty-state").hidden = rows.length !== 0;
  $("record-count").textContent = `Showing ${rows.length} of ${state.candidates.length} synthetic records`;
}

function rowHTML(candidate) {
  const color = stageColors[candidate.stage] || "gray";
  const health = healthFor(candidate);
  const touch = new Date(`${candidate.lastTouch}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  return `<tr>
    <td><div class="candidate-cell"><span class="candidate-avatar">${initials(candidate.name)}</span><div><div class="candidate-name">${escapeHTML(candidate.name)}</div><div class="candidate-id">${escapeHTML(candidate.id)}</div></div></div></td>
    <td class="role-cell">${escapeHTML(candidate.role)}</td>
    <td><span class="stage-pill ${color}">${escapeHTML(candidate.stage)}</span></td>
    <td>${escapeHTML(candidate.source)}</td>
    <td class="last-touch">${touch}</td>
    <td class="next-action" title="${escapeHTML(candidate.nextAction)}">${escapeHTML(candidate.nextAction)}</td>
    <td><span class="health-pill ${health.className}">${escapeHTML(health.label)}</span></td>
    <td><button class="row-menu" data-candidate="${escapeHTML(candidate.id)}" aria-label="Open ${escapeHTML(candidate.name)} record">···</button></td>
  </tr>`;
}

function healthFor(candidate) {
  if (candidate.duplicateGroup) return { label: "Possible duplicate", className: "danger" };
  if (candidate.qualityIssues.length) return { label: "Review record", className: "warning" };
  if (candidate.followUpDue) return { label: "Follow-up due", className: "warning" };
  return { label: "Looks clear", className: "clear" };
}

function showDetail(id) {
  const candidate = state.candidates.find(item => item.id === id);
  if (!candidate) return;
  const issues = candidate.qualityIssues.length ? candidate.qualityIssues.map(issue => `<li>${escapeHTML(issue)}</li>`).join("") : "<li>No flagged record issues in this snapshot.</li>";
  $("candidate-detail").innerHTML = `<div class="detail-head"><span class="candidate-avatar">${initials(candidate.name)}</span><div><h2>${escapeHTML(candidate.name)}</h2><p>${escapeHTML(candidate.id)} · ${escapeHTML(candidate.role)}</p></div></div>
    <div class="detail-label">CURRENT STAGE</div><div class="detail-value">${escapeHTML(candidate.stage)} · ${escapeHTML(candidate.function)}</div>
    <div class="detail-label">NEXT ACTION</div><div class="detail-value">${escapeHTML(candidate.nextAction)}</div>
    <div class="detail-label">RECORD CHECK</div><div class="detail-value"><ul>${issues}</ul></div>
    <div class="detail-callout"><b>Privacy note:</b> this practice record uses synthetic information and intentionally contains no personal contact details, addresses, dates of birth, or identity documents.</div>`;
  $("candidate-dialog").showModal();
}

function exportCSV() {
  const fields = ["id", "name", "role", "function", "stage", "source", "lastTouch", "nextAction", "owner", "followUpDue", "interviewScheduled", "duplicateGroup", "qualityIssues"];
  const csv = [fields.join(","), ...state.candidates.map(candidate => fields.map(field => csvCell(Array.isArray(candidate[field]) ? candidate[field].join("; ") : candidate[field])).join(","))].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = "synthetic-recruiting-pipeline.csv";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Synthetic sample exported as CSV.");
}

function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function showToast(message) { const toast = $("toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2200); }

start();
