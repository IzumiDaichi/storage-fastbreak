// ui.js — page navigation
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active') })
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active') })
  document.getElementById('page-' + name).classList.add('active')
  if (el) el.classList.add('active')
  if (name === 'print') renderPrint()
}