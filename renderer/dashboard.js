// ─────────────────────────────────────────────────────────────
// dashboard.js — detailed dashboard, accurate net profit
// ─────────────────────────────────────────────────────────────

let buySellChartInstance = null

function renderDashboard() {
  const buyTxns  = transactions.filter(t => t.category === 'Buy')
  const sellTxns = transactions.filter(t => t.category === 'Sell')

  const { sellRevenue, buyCost, totalExp, netProfit } = calcNetProfit()

  const totalBags     = transactions.reduce((s, t) => s + (t.bags || 0), 0)
  const totalAgent    = transactions.reduce((s, t) => s + (t.agent_bags || 0) * (t.agent_rate || 0), 0)
  const totalTransfer = transactions.reduce((s, t) => s + (t.transfer_bags || 0) * (t.transfer_rate || 0), 0)
  const totalOther    = transactions.reduce((s, t) => s + (t.other_exp || 0), 0)
  const roi           = buyCost > 0 ? ((netProfit / buyCost) * 100) : 0
  const margin        = sellRevenue > 0 ? ((netProfit / sellRevenue) * 100) : 0

  // ── Metric cards ──────────────────────────────────────────
  document.getElementById('dashMetrics').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Transactions</div>
      <div class="metric-value">${transactions.length}</div>
      <div class="metric-sub">Buy: ${buyTxns.length} · Sell: ${sellTxns.length}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Total Bags</div>
      <div class="metric-value">${totalBags.toLocaleString()}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Sell Revenue</div>
      <div class="metric-value profit-pos">${fmt(sellRevenue)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Buy Cost</div>
      <div class="metric-value profit-neg">${fmt(buyCost)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Total Expenses</div>
      <div class="metric-value profit-neg">${fmt(totalExp)}</div>
      <div class="metric-sub">Agent + Transfer + Other</div>
    </div>
    <div class="metric-card highlight">
      <div class="metric-label">Net Profit</div>
      <div class="metric-value" style="color:${netProfit >= 0 ? 'var(--accent)' : 'var(--danger)'}">${fmtSigned(netProfit)}</div>
      <div class="metric-sub">ROI: ${roi.toFixed(1)}% · Margin: ${margin.toFixed(1)}%</div>
    </div>`

  // ── Bar chart ─────────────────────────────────────────────
  const ctx = document.getElementById('buySellChart').getContext('2d')
  if (buySellChartInstance) buySellChartInstance.destroy()
  buySellChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Buy Cost', 'Sell Revenue', 'Net Profit'],
      datasets: [{
        data: [buyCost, sellRevenue, netProfit],
        backgroundColor: ['rgba(96,165,250,.7)', 'rgba(0,201,122,.7)', netProfit >= 0 ? 'rgba(0,201,122,.4)' : 'rgba(224,82,82,.7)'],
        borderColor:     ['#60a5fa', '#00c97a', netProfit >= 0 ? '#00c97a' : '#e05252'],
        borderWidth: 1, borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } }
      },
      scales: {
        x: { ticks: { color: '#9aa0b4' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#9aa0b4', callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  })

  // ── Expense breakdown ─────────────────────────────────────
  const expItems = [
    { label: 'Agent Fees',     value: totalAgent    },
    { label: 'Transfer Fees',  value: totalTransfer },
    { label: 'Other Expenses', value: totalOther    },
  ]
  document.getElementById('expenseBreakdown').innerHTML =
    expItems.map(e => {
      const pct = totalExp > 0 ? (e.value / totalExp * 100) : 0
      return `<div class="breakdown-row">
        <div>
          <div class="breakdown-label">${e.label}</div>
          <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${pct.toFixed(1)}%"></div></div>
        </div>
        <div class="breakdown-value neg">${fmt(e.value)}</div>
      </div>`
    }).join('') +
    `<div class="breakdown-row" style="margin-top:4px;">
       <div class="breakdown-label" style="font-weight:600;color:var(--text)">Total</div>
       <div class="breakdown-value neg">${fmt(totalExp)}</div>
     </div>`

  // ── ROI detail ────────────────────────────────────────────
  document.getElementById('roiBreakdown').innerHTML = `
    <div class="breakdown-row"><div class="breakdown-label">Sell Revenue</div><div class="breakdown-value pos">${fmt(sellRevenue)}</div></div>
    <div class="breakdown-row"><div class="breakdown-label">Buy Cost</div><div class="breakdown-value neg">${fmt(buyCost)}</div></div>
    <div class="breakdown-row"><div class="breakdown-label">Total Expenses</div><div class="breakdown-value neg">${fmt(totalExp)}</div></div>
    <div class="breakdown-row"><div class="breakdown-label">Net Profit</div><div class="breakdown-value ${netProfit >= 0 ? 'pos' : 'neg'}">${fmtSigned(netProfit)}</div></div>
    <div class="breakdown-row"><div class="breakdown-label">Profit Margin</div><div class="breakdown-value ${margin >= 0 ? 'pos' : 'neg'}">${margin.toFixed(1)}%</div></div>
    <div class="breakdown-row"><div class="breakdown-label">ROI</div><div class="breakdown-value ${roi >= 0 ? 'pos' : 'neg'}">${roi.toFixed(1)}%</div></div>`

  // ── Classification breakdown ──────────────────────────────
  const classMap = {}
  transactions.forEach(t => {
    const key = t.classification || 'Unclassified'
    if (!classMap[key]) classMap[key] = { bags: 0, count: 0, net: 0 }
    classMap[key].bags  += t.bags || 0
    classMap[key].count += 1
    classMap[key].net   += calcTxn(t).total
  })
  const classItems = Object.entries(classMap).sort((a, b) => b[1].net - a[1].net)
  document.getElementById('classBreakdown').innerHTML = classItems.length === 0
    ? `<div class="empty-state" style="padding:1rem;">No data yet.</div>`
    : classItems.map(([name, d]) => `
        <div class="breakdown-row">
          <div class="breakdown-label">${name} <span style="font-size:11px;">(${d.count} txn · ${d.bags} bags)</span></div>
          <div class="breakdown-value ${d.net >= 0 ? 'pos' : 'neg'}">${fmtSigned(d.net)}</div>
        </div>`).join('')

  // ── Recent 5 ─────────────────────────────────────────────
  const tbody  = document.getElementById('recent-body')
  const recent = transactions.slice(0, 5)
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">No transactions yet.</div></td></tr>`
    return
  }
  tbody.innerHTML = recent.map(t => {
    const c    = calcTxn(t)
    const tags = (t.tags || '').split(',').map(s => s.trim()).filter(Boolean)
      .map(tag => `<span class="tag-pill">${tag}</span>`).join('')
    return `<tr>
      <td>${t.date}</td>
      <td><span class="badge badge-${t.category}">${t.category}</span></td>
      <td>${t.classification || '—'}</td>
      <td>${tags || '—'}</td>
      <td>${t.description || '—'}</td>
      <td>${(t.bags || 0).toLocaleString()}</td>
      <td>${fmt(c.saleTotal)}</td>
      <td>${fmt(c.totalExp)}</td>
      <td class="${c.total >= 0 ? 'profit-pos' : 'profit-neg'}">${fmtSigned(c.total)}</td>
    </tr>`
  }).join('')
}