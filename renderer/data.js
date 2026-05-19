// ─────────────────────────────────────────────────────────────
// data.js — shared state, Supabase, helpers
// ─────────────────────────────────────────────────────────────

let transactions    = []
let terms           = []
let classifications = []
let activeTerm      = null
let capitalRecord   = null

// ── Loading ───────────────────────────────────────────────────
function showLoading() { document.getElementById('loadingOverlay').classList.add('show') }
function hideLoading() { document.getElementById('loadingOverlay').classList.remove('show') }

// ── Calc — agent + transfer ADD to cost ──────────────────────
function calcTxn(t) {
  const saleTotal    = (t.bags || 0) * (t.price || 0)
  const agentCost    = (t.agent_bags || 0) * (t.agent_rate || 0)
  const transferCost = (t.transfer_bags || 0) * (t.transfer_rate || 0)
  const totalExp     = agentCost + transferCost + (t.other_exp || 0)
  // For Buy: total = cost paid + expenses (negative outcome)
  // For Sell: total = revenue - expenses (positive outcome)
  const total = t.category === 'Buy'
    ? -(saleTotal + totalExp)
    : saleTotal - totalExp
  return { saleTotal, agentCost, transferCost, totalExp, total }
}

// Net profit across ALL transactions (sell revenue - buy cost - all expenses)
function calcNetProfit() {
  const sellRevenue = transactions
    .filter(t => t.category === 'Sell')
    .reduce((s, t) => s + (t.bags || 0) * (t.price || 0), 0)
  const buyCost = transactions
    .filter(t => t.category === 'Buy')
    .reduce((s, t) => s + (t.bags || 0) * (t.price || 0), 0)
  const totalExp = transactions.reduce((s, t) => {
    const ag = (t.agent_bags || 0) * (t.agent_rate || 0)
    const tr = (t.transfer_bags || 0) * (t.transfer_rate || 0)
    return s + ag + tr + (t.other_exp || 0)
  }, 0)
  return { sellRevenue, buyCost, totalExp, netProfit: sellRevenue - buyCost - totalExp }
}

// ── Formatting ────────────────────────────────────────────────
function fmt(n) {
  return '₱' + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtSigned(n) { return (n < 0 ? '-' : '') + fmt(n) }
function fv(id)       { return parseFloat(document.getElementById(id).value) || 0 }

// ── Bootstrap ─────────────────────────────────────────────────
window.onload = async () => {
  showLoading()
  await Promise.all([loadTerms(), loadClassifications()])
  hideLoading()
}

// ── Classifications ───────────────────────────────────────────
async function loadClassifications() {
  const { data, error } = await supabase
    .from('classifications').select('*').order('name')
  if (error) { console.error('loadClassifications:', error); return }
  classifications = data || []
  populateClassSelects()
}

function populateClassSelects() {
  const opts = classifications.map(c => `<option value="${c.name}">${c.name}</option>`).join('')
  const sel  = document.getElementById('fClassSelect')
  if (sel) sel.innerHTML = '<option value="">— select —</option>' + opts + '<option value="Other">Other (custom)</option>'
  const fsel = document.getElementById('filterClass')
  if (fsel) fsel.innerHTML = '<option value="">All Classifications</option>' + opts
}

function onClassSelect() {
  const sel  = document.getElementById('fClassSelect')
  const wrap = document.getElementById('fClassCustomWrap')
  const inp  = document.getElementById('fClass')
  if (sel.value === 'Other') {
    wrap.style.display = 'flex'
    inp.value = ''
    inp.focus()
  } else {
    wrap.style.display = 'none'
    inp.value = sel.value
  }
}

// ── Terms ─────────────────────────────────────────────────────
async function loadTerms() {
  const { data, error } = await supabase
    .from('terms').select('*').order('name', { ascending: false })
  if (error) { console.error('loadTerms:', error); return }
  terms = data || []
  renderTermsList()
  if (terms.length > 0) await switchTerm(terms[0])
}

function renderTermsList() {
  const list = document.getElementById('termsList')
  if (terms.length === 0) {
    list.innerHTML = `<div style="font-size:12px;color:var(--text2);padding:8px 12px;">No terms yet.</div>`
    return
  }
  list.innerHTML = terms.map(t => `
    <div class="term-item ${activeTerm && activeTerm.id === t.id ? 'active' : ''}"
         onclick="switchTerm(${JSON.stringify(t).replace(/"/g, '&quot;')})">
      <span class="term-item-name">📅 ${t.name}</span>
      <button class="term-delete" onclick="event.stopPropagation();deleteTerm('${t.id}')" title="Delete">✕</button>
    </div>`).join('')
}

// Switch term — always reloads from Supabase
async function switchTerm(term) {
  activeTerm = term
  renderTermsList()
  showLoading()
  await loadTransactions()
  await loadCapital()
  hideLoading()
  updateSubtitles()
  renderDashboard()
  renderTransactions()
  renderCapital()
  renderPrint()
}

function updateSubtitles() {
  const n = activeTerm ? activeTerm.name : '—'
  ;['dashboard','transactions','capital','print'].forEach(p => {
    const el = document.getElementById(p + '-subtitle')
    if (el) el.textContent = 'Term: ' + n
  })
}

function openAddTerm()  { document.getElementById('termModalOverlay').classList.add('open') }
function closeAddTerm() { document.getElementById('termModalOverlay').classList.remove('open') }

function onTermOverlayClick(e) {
  if (e.target === document.getElementById('termModalOverlay')) closeAddTerm()
}

async function saveTerm() {
  const name = document.getElementById('newTermName').value.trim()
  if (!name) { alert('Please enter a year.'); return }
  if (terms.find(t => t.name === name)) { alert('That term already exists.'); return }
  const { data, error } = await supabase.from('terms').insert([{ name }]).select().single()
  if (error) { alert('Error: ' + error.message); return }
  terms.unshift(data)
  closeAddTerm()
  document.getElementById('newTermName').value = ''
  renderTermsList()
  await switchTerm(data)
}

async function deleteTerm(id) {
  if (!confirm('Delete this term and ALL its transactions? This cannot be undone.')) return
  const { error } = await supabase.from('terms').delete().eq('id', id)
  if (error) { alert('Error: ' + error.message); return }
  terms = terms.filter(t => t.id !== id)
  if (activeTerm && activeTerm.id === id) {
    activeTerm = null; transactions = []; capitalRecord = null
  }
  renderTermsList()
  if (terms.length > 0) await switchTerm(terms[0])
  else { renderDashboard(); renderTransactions(); renderCapital(); renderPrint() }
}

// ── Transactions ──────────────────────────────────────────────
async function loadTransactions() {
  if (!activeTerm) { transactions = []; return }
  const { data, error } = await supabase
    .from('transactions').select('*')
    .eq('term_id', activeTerm.id).order('date', { ascending: false })
  if (error) { console.error('loadTransactions:', error); return }
  transactions = data || []
}

// ── Capital — always sync from DB ─────────────────────────────
async function loadCapital() {
  if (!activeTerm) { capitalRecord = null; return }
  const { data, error } = await supabase
    .from('capital').select('*').eq('term_id', activeTerm.id).maybeSingle()
  if (error) { console.error('loadCapital:', error); return }
  capitalRecord = data  // null if no record yet
}

async function saveStartingCapital() {
  if (!activeTerm) { alert('Please select a term first.'); return }
  const val = fv('startingCapital')
  showLoading()
  if (capitalRecord) {
    const { error } = await supabase.from('capital')
      .update({ starting_capital: val, updated_at: new Date().toISOString() })
      .eq('id', capitalRecord.id)
    if (error) { hideLoading(); alert('Error: ' + error.message); return }
    capitalRecord.starting_capital = val
  } else {
    const { data, error } = await supabase.from('capital')
      .insert([{ term_id: activeTerm.id, starting_capital: val }]).select().single()
    if (error) { hideLoading(); alert('Error: ' + error.message); return }
    capitalRecord = data
  }
  hideLoading()
  renderCapital()
  renderPrint()
}