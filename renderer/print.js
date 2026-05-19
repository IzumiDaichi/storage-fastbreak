// print.js - detailed profit/expense breakdown + transaction totals

function renderPrint() {
  const termName = activeTerm ? activeTerm.name : 'No Term'
  const today    = new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })

  document.getElementById('report-term-label').textContent = 'Term: ' + termName
  document.getElementById('report-date').textContent       = 'Generated: ' + today

  const { sellRevenue, buyCost, totalExp, netProfit } = calcNetProfit()

  const totalAgent    = transactions.reduce(function(s,t){ return s + (t.agent_bags||0)*(t.agent_rate||0) }, 0)
  const totalTransfer = transactions.reduce(function(s,t){ return s + (t.transfer_bags||0)*(t.transfer_rate||0) }, 0)
  const totalOther    = transactions.reduce(function(s,t){ return s + (t.other_exp||0) }, 0)
  const totalBags     = transactions.reduce(function(s,t){ return s + (t.bags||0) }, 0)
  const roi           = buyCost > 0 ? ((netProfit / buyCost) * 100).toFixed(1) : '0.0'
  const margin        = sellRevenue > 0 ? ((netProfit / sellRevenue) * 100).toFixed(1) : '0.0'

  // Summary grid
  var grid = document.getElementById('rpt-profit-grid')
  grid.innerHTML =
    mbox('Total Bags',     totalBags.toLocaleString(), false) +
    mbox('Sell Revenue',   fmt(sellRevenue),           false) +
    mbox('Buy Cost',       fmt(buyCost),               false) +
    mbox('Agent Fees',     fmt(totalAgent),            false) +
    mbox('Transfer Fees',  fmt(totalTransfer),         false) +
    mbox('Other Expenses', fmt(totalOther),            false) +
    mbox('Total Expenses', fmt(totalExp),              false) +
    mbox('Net Profit',     fmtSigned(netProfit),       true)  +
    mbox('Profit Margin',  margin + '%',               true)  +
    mbox('ROI',            roi + '%',                  true)

  // Transactions table
  var tbody = document.getElementById('rpt-txn-body')
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:2rem;color:#888;">No transactions for this term.</td></tr>'
    return
  }

  var sorted = transactions.slice().sort(function(a,b){ return a.date.localeCompare(b.date) })

  // Accumulators for totals row
  var sumBags         = 0
  var sumSaleTotal    = 0
  var sumAgentCost    = 0
  var sumTransferCost = 0
  var sumOtherExp     = 0
  var sumTotal        = 0

  var rows = sorted.map(function(t) {
    var c     = calcTxn(t)
    var color = c.total >= 0 ? '#00a362' : '#e05252'
    var tags  = (t.tags || '').split(',').map(function(s){ return s.trim() }).filter(Boolean).join(', ')

    sumBags         += (t.bags || 0)
    sumSaleTotal    += c.saleTotal
    sumAgentCost    += c.agentCost
    sumTransferCost += c.transferCost
    sumOtherExp     += (t.other_exp || 0)
    sumTotal        += c.total

    return '<tr>' +
      '<td>' + t.date + '</td>' +
      '<td>' + t.category + '</td>' +
      '<td>' + (t.classification || '—') + '</td>' +
      '<td>' + (tags || '—') + '</td>' +
      '<td>' + (t.description || '—') + '</td>' +
      '<td style="text-align:right">' + (t.bags || 0) + '</td>' +
      '<td style="text-align:right">' + fmt(t.price || 0) + '</td>' +
      '<td style="text-align:right">' + fmt(c.saleTotal) + '</td>' +
      '<td style="text-align:right">' + fmt(c.agentCost) + '</td>' +
      '<td style="text-align:right">' + fmt(c.transferCost) + '</td>' +
      '<td style="text-align:right">' + fmt(t.other_exp || 0) + '</td>' +
      '<td style="text-align:right;font-weight:700;color:' + color + '">' + fmtSigned(c.total) + '</td>' +
    '</tr>'
  }).join('')

  // Totals row — one cell per column, no colspan, aligned to match headers
  var totalColor = sumTotal >= 0 ? '#00a362' : '#e05252'
  var totalsRow =
    '<tr style="background:#efefef;font-weight:700;border-top:2px solid #aaa;">' +
      '<td style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#444;">TOTALS</td>' +
      '<td></td>' +  // Category
      '<td></td>' +  // Classification
      '<td></td>' +  // Tags
      '<td></td>' +  // Description
      '<td style="text-align:right">' + sumBags.toLocaleString() + '</td>' +
      '<td style="text-align:right">—</td>' +
      '<td style="text-align:right">' + fmt(sumSaleTotal) + '</td>' +
      '<td style="text-align:right">' + fmt(sumAgentCost) + '</td>' +
      '<td style="text-align:right">' + fmt(sumTransferCost) + '</td>' +
      '<td style="text-align:right">' + fmt(sumOtherExp) + '</td>' +
      '<td style="text-align:right;font-weight:800;color:' + totalColor + '">' + fmtSigned(sumTotal) + '</td>' +
    '</tr>'

  tbody.innerHTML = rows + totalsRow
}

function mbox(label, value, highlight) {
  var cls = highlight ? 'report-metric highlight' : 'report-metric'
  return '<div class="' + cls + '"><div class="report-metric-label">' + label + '</div><div class="report-metric-value">' + value + '</div></div>'
}

function printReport() {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active') })
  document.getElementById('page-print').classList.add('active')
  window.print()
}