// ── State ──────────────────────────────────────────────────────
let db = [];
let blockedCount = 0;
let nextId = 1;
let threshold = 75;

// Seed records
const seeds = [
  { name: 'Rohan Mehta',  email: 'rohan.mehta@corp.com', dept: 'Engineering', empId: 'EMP-001' },
  { name: 'Priya Kapoor', email: 'priya.k@corp.com',      dept: 'HR',          empId: 'EMP-002' },
  { name: 'James Liu',    email: 'j.liu@corp.com',         dept: 'Finance',     empId: 'EMP-003' },
];
seeds.forEach(s => db.push({ id: nextId++, ...s, status: 'verified' }));

// ── Utilities ──────────────────────────────────────────────────
function normalize(s) { return s.toLowerCase().trim().replace(/\s+/g, ' '); }

function levenshtein(a, b) {
  a = normalize(a); b = normalize(b);
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - levenshtein(a, b) / maxLen) * 100);
}

function isValidEmail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
function isValidName(n)  { return n.trim().length >= 2; }
function isValidId(id)   { return /^EMP-\d+$/i.test(id.trim()); }

function timestamp() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
}

function addLog(msg, type = 'info') {
  const body = document.getElementById('log-body');
  const entry = document.createElement('div');
  entry.className = 'log-entry ' + type;
  entry.innerHTML = `<span class="log-time">${timestamp()}</span><span class="log-msg">${msg}</span>`;
  body.prepend(entry);
  while (body.children.length > 40) body.removeChild(body.lastChild);
}

// ── Validation Pipeline ────────────────────────────────────────
function runValidation(name, email, dept, empId) {
  const checks = [];

  // Step 1: Format validation
  const nameOk  = isValidName(name);
  const emailOk = isValidEmail(email);
  const deptOk  = dept !== '';
  const idOk    = isValidId(empId);

  checks.push({ label: 'Name format',       pass: nameOk,  detail: nameOk  ? 'Valid' : 'Too short or empty' });
  checks.push({ label: 'Email format',      pass: emailOk, detail: emailOk ? 'Valid' : 'Invalid email address' });
  checks.push({ label: 'Department set',    pass: deptOk,  detail: deptOk  ? dept    : 'Required field' });
  checks.push({ label: 'Employee ID format',pass: idOk,    detail: idOk    ? 'Valid (EMP-NNN)' : 'Must match EMP-NNN' });

  if (!nameOk || !emailOk || !deptOk || !idOk)
    return { checks, verdict: 'invalid', reason: 'Failed format validation', matchScore: 0, matchWith: null };

  // Step 2: Exact duplicate detection
  const exactEmail = db.find(r => normalize(r.email) === normalize(email));
  const exactId    = db.find(r => normalize(r.empId)  === normalize(empId));

  checks.push({ label: 'Email uniqueness', pass: !exactEmail, detail: exactEmail ? `Duplicate found → Record #${exactEmail.id}` : 'Unique' });
  checks.push({ label: 'Employee ID uniqueness', pass: !exactId, detail: exactId ? `Duplicate found → Record #${exactId.id}` : 'Unique' });

  if (exactEmail || exactId)
    return { checks, verdict: 'duplicate', reason: `Exact match (${exactEmail ? 'email' : 'ID'})`, matchScore: 100, matchWith: exactEmail || exactId };

  // Step 3: Fuzzy / similarity detection (Levenshtein)
  let bestScore = 0, bestMatch = null;
  db.forEach(r => {
    const ns = similarity(r.name, name);
    const es = similarity(r.email, email);
    const combined = Math.round(ns * 0.5 + es * 0.5);
    if (combined > bestScore) { bestScore = combined; bestMatch = r; }
  });

  const isFuzzy = bestScore >= threshold;
  checks.push({ label: 'Fuzzy similarity check', pass: !isFuzzy, warn: isFuzzy,
    detail: bestMatch ? `Best match: ${bestScore}% similar to "${bestMatch.name}"` : 'No similar records found' });

  // Step 4: Cross-field consistency
  const sameNameDiffEmail = db.find(r => similarity(r.name, name) > 90 && normalize(r.email) !== normalize(email));
  checks.push({ label: 'Cross-field consistency', pass: !sameNameDiffEmail, warn: !!sameNameDiffEmail,
    detail: sameNameDiffEmail ? `Same name, different email → Record #${sameNameDiffEmail.id}` : 'Consistent' });

  if (isFuzzy)
    return { checks, verdict: 'fuzzy', reason: `${bestScore}% similarity with record #${bestMatch.id}`, matchScore: bestScore, matchWith: bestMatch };

  return { checks, verdict: 'unique', reason: 'All checks passed', matchScore: bestScore, matchWith: bestMatch };
}

// ── Render Validation Panel ────────────────────────────────────
function renderValidation(result) {
  const area = document.getElementById('validation-area');
  let html = result.checks.map(c => {
    const cls  = c.warn ? 'check-warn' : (c.pass ? 'check-pass' : 'check-fail');
    const icon = c.warn ? '&#9888;' : (c.pass ? '&#10003;' : '&#10007;');
    return `<div class="check-row"><span class="${cls}">${icon}</span><span class="check-label">${c.label}</span><span class="check-result ${cls}">${c.detail}</span></div>`;
  }).join('');

  const vClass = result.verdict === 'unique' ? 'unique' : result.verdict === 'duplicate' ? 'duplicate' : 'fuzzy';
  const vText  = result.verdict === 'unique'    ? '&#9989; Unique — Added to database'
               : result.verdict === 'duplicate' ? '&#10060; Blocked — Exact duplicate detected'
               : result.verdict === 'invalid'   ? '&#10060; Blocked — Invalid format'
               :                                  `&#9888; Flagged — ${result.reason}`;
  html += `<div class="verdict ${vClass}">${vText}</div>`;
  area.innerHTML = html;
}

// ── Render Database Table ──────────────────────────────────────
function renderTable() {
  const q      = document.getElementById('search-box').value.toLowerCase();
  const body   = document.getElementById('db-body');
  const empty  = document.getElementById('empty-msg');
  const filtered = db.filter(r =>
    !q || [r.name, r.email, r.empId, r.dept].some(f => f.toLowerCase().includes(q)));

  if (db.length === 0) { empty.style.display = 'block'; body.innerHTML = ''; return; }
  empty.style.display = 'none';

  body.innerHTML = filtered.map(r => `
    <tr class="${r.status === 'flagged' ? 'flagged' : ''}">
      <td style="color:#9ca3af;font-size:11px">#${r.id}</td>
      <td>${r.name}</td>
      <td style="color:#6b7280">${r.email}</td>
      <td>${r.dept}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td><button class="btn-remove" onclick="removeRecord(${r.id})">Remove</button></td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="text-align:center;padding:16px;color:#9ca3af;font-size:12px">No matching records</td></tr>';
}

function updateStats() {
  document.getElementById('s-total').textContent   = db.length;
  document.getElementById('s-unique').textContent  = db.filter(r => r.status === 'verified').length;
  document.getElementById('s-flagged').textContent = db.filter(r => r.status === 'flagged').length;
  document.getElementById('s-blocked').textContent = blockedCount;
}

// ── Actions ────────────────────────────────────────────────────
function updateThreshold(v) {
  threshold = parseInt(v);
  document.getElementById('thresh-label').textContent = v + '%';
}

function submitRecord() {
  const name  = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const dept  = document.getElementById('f-dept').value;
  const empId = document.getElementById('f-id').value.trim();

  if (!name && !email) { addLog('Submit attempted with empty form.', 'warn'); return; }

  const result = runValidation(name, email, dept, empId);
  renderValidation(result);

  if (result.verdict === 'unique') {
    db.push({ id: nextId++, name, email, dept, empId, status: 'verified' });
    addLog(`Record added: ${name} (${email})`, 'ok');
  } else if (result.verdict === 'fuzzy') {
    db.push({ id: nextId++, name, email, dept, empId, status: 'flagged' });
    addLog(`Fuzzy duplicate flagged: ${name} — ${result.reason}`, 'warn');
  } else {
    blockedCount++;
    addLog(`Record blocked: ${name || '(no name)'} — ${result.verdict}`, 'dup');
  }

  renderTable();
  updateStats();
}

function removeRecord(id) {
  const r = db.find(x => x.id === id);
  if (r) addLog(`Record #${id} removed: ${r.name}`, 'info');
  db = db.filter(x => x.id !== id);
  renderTable();
  updateStats();
}

function purgeAll() {
  const flagged = db.filter(r => r.status === 'flagged');
  if (!flagged.length) { addLog('No flagged records to purge.', 'info'); return; }
  db = db.filter(r => r.status !== 'flagged');
  addLog(`Purged ${flagged.length} flagged record(s) from database.`, 'dup');
  renderTable();
  updateStats();
}

// ── Init ───────────────────────────────────────────────────────
renderTable();
updateStats();
addLog(`System initialized with ${db.length} seed records.`, 'ok');
