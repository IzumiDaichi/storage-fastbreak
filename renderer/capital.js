// ─────────────────────────────────────────────────────────────
// capital.js — capital page, syncs from Supabase
// ─────────────────────────────────────────────────────────────

function renderCapital() {
  const starting = capitalRecord ? (capitalRecord.starting_capital || 0) : 0

  const inp      = document.getElementById('startingCapital')
  const applyBtn = document.getElementById('capitalApplyBtn')
  const editBtn  = document.getElementById('capitalEditBtn')
  const hint     = document.getElementById('capitalHint')

  // Always show the current value from DB
  inp.value = starting > 0 ? starting : ''

  if (capitalRecord && capitalRecord.starting_capital > 0) {
    // Already set — lock input, show Edit button
    inp.disabled           = true
    applyBtn.style.display = 'none'
    editBtn.style.display  = 'inline-block'
    hint.textContent       = 'Starting capital is set. Click Edit to change.'
  } else {
    // Not set yet — show Apply button after typing
    inp.disabled           = false
    applyBtn.style.display = 'none'
    editBtn.style.display  = 'none'
    hint.textContent       = 'Enter your starting capital and click Apply.'
  }

  document.getElementById('cap-starting').textContent = fmt(starting)

  // ── Aggregates ────────────────────────────────────────────
  let totalInflows  = 0
  let totalOutflows = 0
  let totalExpenses = 0

  transactions.forEach(t => {
    const ag = (t.agent_bags || 0) * (t.agent_rate || 0)
    const tr = (t.transfer_bags || 0) * (t.transfer_rate || 0)
    const ex = ag + tr + (t.other_exp || 0)
    if (t.category === 'Sell') totalInflows  += (t.bags || 0) * (t.price || 0)
    if (t.category === 'Buy')  totalOutflows += (t.bags || 0) * (t.price || 0)
    totalExpenses += ex
  })

  const current = starting + totalInflows - totalOutflows - totalExpenses

  document.getElementById('cap-inflows').textContent  = fmt(totalInflows)
  document.getElementById('cap-outflows').textContent = fmt(totalOutflows)
  document.getElementById('cap-expenses').textContent = fmt(totalExpenses)

  const capEl = document.getElementById('cap-current')
  capEl.textContent = fmtSigned(current)
  capEl.style.color = current >= 0 ? 'var(--accent)' : 'var(--danger)'

  // ── Running balance table ─────────────────────────────────
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
  let running  = starting
  const tbody  = document.getElementById('capital-body')

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No transactions yet.</div></td></tr>`
    return
  }

  tbody.innerHTML = sorted.map(t => {
    const ag = (t.agent_bags || 0) * (t.agent_rate || 0)
    const tr = (t.transfer_bags || 0) * (t.transfer_rate || 0)
    const ex = ag + tr + (t.other_exp || 0)
    const inflow  = t.category === 'Sell' ? (t.bags || 0) * (t.price || 0) : 0
    const outflow = t.category === 'Buy'  ? (t.bags || 0) * (t.price || 0) : 0
    running = running + inflow - outflow - ex
    return `<tr>
      <td>${t.date}</td>
      <td><span class="badge badge-${t.category}">${t.category}</span></td>
      <td>${t.description || '—'}</td>
      <td class="profit-pos">${inflow  > 0 ? fmt(inflow)  : '—'}</td>
      <td class="profit-neg">${outflow > 0 ? fmt(outflow) : '—'}</td>
      <td class="profit-neg">${ex > 0 ? fmt(ex) : '—'}</td>
      <td class="running-bal ${running >= 0 ? 'profit-pos' : 'profit-neg'}">${fmtSigned(running)}</td>
    </tr>`
  }).join('')
}

// ── Show Apply as soon as user types ─────────────────────────
function onCapitalInput() {
  const val      = parseFloat(document.getElementById('startingCapital').value) || 0
  const applyBtn = document.getElementById('capitalApplyBtn')
  applyBtn.style.display = val > 0 ? 'inline-block' : 'none'
}

// ── Unlock for editing ────────────────────────────────────────
function editCapital() {
  const inp      = document.getElementById('startingCapital')
  const applyBtn = document.getElementById('capitalApplyBtn')
  const editBtn  = document.getElementById('capitalEditBtn')
  const hint     = document.getElementById('capitalHint')
  inp.disabled           = false
  editBtn.style.display  = 'none'
  applyBtn.style.display = 'inline-block'
  hint.textContent       = 'Update the value and click Apply.'
  inp.focus()
}