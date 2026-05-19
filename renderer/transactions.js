// ─────────────────────────────────────────────────────────────
// transactions.js — list, filters, modal, CRUD
// ─────────────────────────────────────────────────────────────

let editingId = null

// ── Render table ──────────────────────────────────────────────
function renderTransactions() {
  const catFilter   = document.getElementById('filterCat').value
  const classFilter = document.getElementById('filterClass').value
  const monthFilter = document.getElementById('filterMonth').value
  const hasAgent    = document.getElementById('filterHasAgent').checked
  const hasTransfer = document.getElementById('filterHasTransfer').checked
  const hasOther    = document.getElementById('filterHasOther').checked
  const hasTags     = document.getElementById('filterHasTags').checked

  const filtered = transactions.filter(t => {
    if (catFilter   && t.category !== catFilter)              return false
    if (classFilter && t.classification !== classFilter)      return false
    if (monthFilter && !t.date.startsWith(monthFilter))       return false
    if (hasAgent    && !((t.agent_bags    || 0) > 0))         return false
    if (hasTransfer && !((t.transfer_bags || 0) > 0))         return false
    if (hasOther    && !((t.other_exp     || 0) > 0))         return false
    if (hasTags     && !(t.tags && t.tags.trim().length > 0)) return false
    return true
  })

  const tbody = document.getElementById('txn-body')
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13"><div class="empty-state">No transactions found.</div></td></tr>`
    return
  }

  tbody.innerHTML = filtered.map(t => {
    const c    = calcTxn(t)
    const tags = (t.tags || '').split(',').map(s => s.trim()).filter(Boolean)
      .map(tag => `<span class="tag-pill">${tag}</span>`).join('')
    // Buy = always negative total (you spent money), Sell = profit/loss
    const totalClass = c.total >= 0 ? 'profit-pos' : 'profit-neg'
    return `<tr>
      <td>${t.date}</td>
      <td><span class="badge badge-${t.category}">${t.category}</span></td>
      <td>${t.classification || '—'}</td>
      <td>${tags || '—'}</td>
      <td>${t.description || '—'}</td>
      <td>${t.bags || 0}</td>
      <td>${fmt(t.price || 0)}</td>
      <td>${fmt(c.saleTotal)}</td>
      <td>${fmt(c.agentCost)}</td>
      <td>${fmt(c.transferCost)}</td>
      <td>${fmt(t.other_exp || 0)}</td>
      <td class="${totalClass}">${fmtSigned(c.total)}</td>
      <td>
        <button class="btn-icon" onclick="openModal('${t.id}')" title="Edit">✏️</button>
        <button class="btn-icon" onclick="deleteTransaction('${t.id}')" title="Delete">🗑️</button>
      </td>
    </tr>`
  }).join('')
}

// ── Filters ───────────────────────────────────────────────────
function clearFilters() {
  document.getElementById('filterCat').value            = ''
  document.getElementById('filterClass').value          = ''
  document.getElementById('filterMonth').value          = ''
  document.getElementById('filterHasAgent').checked    = false
  document.getElementById('filterHasTransfer').checked = false
  document.getElementById('filterHasOther').checked    = false
  document.getElementById('filterHasTags').checked     = false
  renderTransactions()
}

// ── Click outside modal closes it ────────────────────────────
function onOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal()
}

// ── Modal open/close ──────────────────────────────────────────
function openModal(id) {
  if (!activeTerm) { alert('Please select or create a term first.'); return }
  editingId = id || null
  document.getElementById('modal-title').textContent = id ? 'Edit Transaction' : 'Add Transaction'
  populateClassSelects()

  // Reset custom class wrap
  document.getElementById('fClassCustomWrap').style.display = 'none'

  if (id) {
    const t = transactions.find(x => x.id === id)
    document.getElementById('fCat').value          = t.category
    document.getElementById('fDate').value         = t.date
    document.getElementById('fTags').value         = t.tags || ''
    document.getElementById('fDesc').value         = t.description || ''
    document.getElementById('fBags').value         = t.bags || 0
    document.getElementById('fPrice').value        = t.price || 0
    document.getElementById('fAgentBags').value    = t.agent_bags || 0
    document.getElementById('fAgentRate').value    = t.agent_rate || 0
    document.getElementById('fTransferBags').value = t.transfer_bags || 0
    document.getElementById('fTransferRate').value = t.transfer_rate || 0
    document.getElementById('fOtherExp').value     = t.other_exp || 0

    // set classification dropdown + custom field
    const knownClass = classifications.find(c => c.name === t.classification)
    if (knownClass) {
      document.getElementById('fClassSelect').value = t.classification
      document.getElementById('fClass').value       = t.classification
    } else if (t.classification) {
      document.getElementById('fClassSelect').value = 'Other'
      document.getElementById('fClass').value       = t.classification
      document.getElementById('fClassCustomWrap').style.display = 'flex'
    } else {
      document.getElementById('fClassSelect').value = ''
      document.getElementById('fClass').value       = ''
    }
  } else {
    clearModalFields()
    document.getElementById('fCat').value  = 'Sell'
    document.getElementById('fDate').value = new Date().toISOString().slice(0, 10)
  }

  onCategoryChange()
  updatePreview()
  document.getElementById('modalOverlay').classList.add('open')
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open')
}

function clearModalFields() {
  ['fTags','fDesc','fBags','fPrice','fAgentBags','fAgentRate','fTransferBags','fTransferRate','fOtherExp']
    .forEach(f => document.getElementById(f).value = '')
  document.getElementById('fClassSelect').value = ''
  document.getElementById('fClass').value       = ''
  document.getElementById('fClassCustomWrap').style.display = 'none'
}

// ── Category change — show/hide copy-buy row ──────────────────
function onCategoryChange() {
  const cat  = document.getElementById('fCat').value
  const row  = document.getElementById('copyBuyRow')
  const sel  = document.getElementById('copyBuySelect')

  if (cat === 'Sell') {
    row.style.display = 'flex'
    const buys = transactions.filter(t => t.category === 'Buy')
    sel.innerHTML = '<option value="">— select a buy transaction to copy from —</option>' +
      buys.map(t => `<option value="${t.id}">${t.date} · ${t.classification || 'No class'} · ${t.bags} bags · ${t.description || ''}</option>`).join('')
  } else {
    row.style.display = 'none'
  }
}

// ── Copy bags + tags + description from Buy ───────────────────
function copyFromBuy() {
  const id = document.getElementById('copyBuySelect').value
  if (!id) return
  const t = transactions.find(x => x.id === id)
  if (!t) return

  document.getElementById('fBags').value = t.bags || 0
  document.getElementById('fTags').value = t.tags || ''
  document.getElementById('fDesc').value = t.description || ''

  // classification
  const knownClass = classifications.find(c => c.name === t.classification)
  if (knownClass) {
    document.getElementById('fClassSelect').value           = t.classification
    document.getElementById('fClass').value                 = t.classification
    document.getElementById('fClassCustomWrap').style.display = 'none'
  } else if (t.classification) {
    document.getElementById('fClassSelect').value           = 'Other'
    document.getElementById('fClass').value                 = t.classification
    document.getElementById('fClassCustomWrap').style.display = 'flex'
  }
  updatePreview()
}

// ── Live calc preview ─────────────────────────────────────────
function updatePreview() {
  const cat          = document.getElementById('fCat').value
  const saleTotal    = fv('fBags') * fv('fPrice')
  const agentCost    = fv('fAgentBags') * fv('fAgentRate')
  const transferCost = fv('fTransferBags') * fv('fTransferRate')
  const otherExp     = fv('fOtherExp')
  const totalExp     = agentCost + transferCost + otherExp
  const total        = cat === 'Buy' ? -(saleTotal + totalExp) : saleTotal - totalExp
  const cls          = total >= 0 ? 'profit-row' : 'profit-neg-row'

  document.getElementById('calcPreview').innerHTML = `
    <div class="calc-row"><span>${cat === 'Buy' ? 'Purchase cost' : 'Sale subtotal'}</span><span>${fmt(saleTotal)}</span></div>
    <div class="calc-row"><span>Agent fees (+ cost)</span><span>+ ${fmt(agentCost)}</span></div>
    <div class="calc-row"><span>Transfer fees (+ cost)</span><span>+ ${fmt(transferCost)}</span></div>
    <div class="calc-row"><span>Other expenses (+ cost)</span><span>+ ${fmt(otherExp)}</span></div>
    <div class="calc-row total"><span>Total expenses</span><span>${fmt(totalExp)}</span></div>
    <div class="calc-row ${cls}"><span>Total</span><span>${fmtSigned(total)}</span></div>`
}

// ── Save ──────────────────────────────────────────────────────
async function saveTransaction() {
  const date = document.getElementById('fDate').value
  if (!date) { alert('Please enter a date.'); return }

  // resolve classification — if Other was chosen, use the custom text field
  const classSelect = document.getElementById('fClassSelect').value
  const classCustom = document.getElementById('fClass').value.trim()
  const classification = classSelect === 'Other' ? classCustom : (classCustom || classSelect)

  showLoading()
  const payload = {
    term_id:        activeTerm.id,
    category:       document.getElementById('fCat').value,
    date,
    classification,
    tags:           document.getElementById('fTags').value.trim(),
    description:    document.getElementById('fDesc').value.trim(),
    bags:           fv('fBags'),
    price:          fv('fPrice'),
    agent_bags:     fv('fAgentBags'),
    agent_rate:     fv('fAgentRate'),
    transfer_bags:  fv('fTransferBags'),
    transfer_rate:  fv('fTransferRate'),
    other_exp:      fv('fOtherExp')
  }

  if (editingId) {
    const { error } = await supabase.from('transactions').update(payload).eq('id', editingId)
    if (error) { hideLoading(); alert('Error: ' + error.message); return }
    transactions = transactions.map(x => x.id === editingId ? { ...x, ...payload } : x)
  } else {
    const { data, error } = await supabase.from('transactions').insert([payload]).select().single()
    if (error) { hideLoading(); alert('Error: ' + error.message); return }
    transactions.unshift(data)
  }

  transactions.sort((a, b) => b.date.localeCompare(a.date))
  hideLoading()
  closeModal()
  renderDashboard()
  renderTransactions()
  renderCapital()
  renderPrint()
}

// ── Delete ────────────────────────────────────────────────────
async function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return
  showLoading()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) { hideLoading(); alert('Error: ' + error.message); return }
  transactions = transactions.filter(x => x.id !== id)
  hideLoading()
  renderDashboard()
  renderTransactions()
  renderCapital()
  renderPrint()
}