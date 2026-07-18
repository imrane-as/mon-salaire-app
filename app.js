
const KEY = "monSalaireDataV1";
const state = JSON.parse(localStorage.getItem(KEY) || '{"months":{}}');

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(Number(n)||0);
const currentMonth = new Date().toISOString().slice(0,7);
$("month").value = currentMonth;

function getMonthData(){
  const month = $("month").value || currentMonth;
  if(!state.months[month]) state.months[month] = {salary:0,bonus:0,savingGoal:0,expenses:[]};
  return state.months[month];
}
function save(){
  localStorage.setItem(KEY, JSON.stringify(state));
  render();
}
function loadMonth(){
  const d = getMonthData();
  $("salary").value = d.salary || "";
  $("bonus").value = d.bonus || "";
  $("savingGoal").value = d.savingGoal || "";
  render();
}
function render(){
  const d = getMonthData();
  const income = Number(d.salary||0)+Number(d.bonus||0);
  const expenses = d.expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const remaining = income-expenses;
  const savings = Math.max(0, Math.min(remaining, Number(d.savingGoal||0)));

  $("salaryValue").textContent = money(income);
  $("expensesValue").textContent = money(expenses);
  $("remaining").textContent = money(remaining);
  $("savingsValue").textContent = money(savings);
  $("expenseCount").textContent = `${d.expenses.length} dépense${d.expenses.length>1?"s":""}`;

  $("expenseList").innerHTML = d.expenses.length ? d.expenses.map((e,i)=>`
    <div class="expense-item">
      <div class="expense-meta"><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(e.category)}</small></div>
      <div><span class="amount">${money(e.amount)}</span> <button class="delete" onclick="removeExpense(${i})">×</button></div>
    </div>`).join("") : '<div class="empty">Aucune dépense enregistrée</div>';

  const months = Object.keys(state.months).sort().reverse();
  $("history").innerHTML = months.length ? months.map(m=>{
    const x=state.months[m];
    const inc=Number(x.salary||0)+Number(x.bonus||0);
    const exp=x.expenses.reduce((s,e)=>s+Number(e.amount||0),0);
    return `<div class="history-item"><div><strong>${formatMonth(m)}</strong><small>${x.expenses.length} dépense(s)</small></div><div class="amount">${money(inc-exp)}</div></div>`;
  }).join("") : '<div class="empty">Aucun historique</div>';
}
function escapeHtml(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function formatMonth(m){return new Date(m+"-01T12:00:00").toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}
window.removeExpense=i=>{getMonthData().expenses.splice(i,1);save()};

$("month").addEventListener("change",loadMonth);
$("saveMonth").addEventListener("click",()=>{
  const d=getMonthData();
  d.salary=Number($("salary").value||0);
  d.bonus=Number($("bonus").value||0);
  d.savingGoal=Number($("savingGoal").value||0);
  save();
});
$("addExpense").addEventListener("click",()=>{
  const name=$("expenseName").value.trim();
  const amount=Number($("expenseAmount").value||0);
  if(!name || amount<=0){alert("Ajoute un nom et un montant valide.");return}
  getMonthData().expenses.push({name,category:$("expenseCategory").value,amount});
  $("expenseName").value=""; $("expenseAmount").value="";
  save();
});
$("resetBtn").addEventListener("click",()=>{
  if(confirm("Supprimer toutes les données ?")){
    localStorage.removeItem(KEY); location.reload();
  }
});

function generatePDFReport(){
  const monthKey = $("month").value || currentMonth;
  const d = getMonthData();
  const income = Number(d.salary||0) + Number(d.bonus||0);
  const expenses = d.expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const remaining = income-expenses;
  const savingGoal = Number(d.savingGoal||0);
  const progress = savingGoal > 0 ? Math.max(0, Math.min(100, (Math.max(0,remaining)/savingGoal)*100)) : 0;

  const byCategory = {};
  d.expenses.forEach(e => byCategory[e.category] = (byCategory[e.category]||0) + Number(e.amount||0));
  const categories = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);

  const expenseRows = d.expenses.length
    ? d.expenses.map((e,i)=>`
      <tr>
        <td>${String(i+1).padStart(2,"0")}</td>
        <td><strong>${escapeHtml(e.name)}</strong></td>
        <td><span class="tag">${escapeHtml(e.category)}</span></td>
        <td class="num">${money(e.amount)}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" class="empty-row">Aucune dépense enregistrée pour ce mois.</td></tr>`;

  const categoryRows = categories.length
    ? categories.map(([cat,val])=>{
        const pct = expenses > 0 ? Math.round((val/expenses)*100) : 0;
        return `<div class="cat-row">
          <div class="cat-line"><span>${escapeHtml(cat)}</span><strong>${money(val)} · ${pct}%</strong></div>
          <div class="bar"><i style="width:${pct}%"></i></div>
        </div>`;
      }).join("")
    : `<p class="muted">Aucune catégorie disponible.</p>`;

  const generated = new Date().toLocaleString("fr-FR", {dateStyle:"long", timeStyle:"short"});
  const report = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport ${formatMonth(monthKey)} - Imrane Asrir</title>
<style>
  @page{size:A4;margin:0}
  *{box-sizing:border-box}
  body{margin:0;background:#e9edf5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#111827}
  .page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;position:relative;overflow:hidden}
  .cover{height:72mm;padding:17mm 16mm 12mm;color:white;background:
    radial-gradient(circle at 85% 10%,rgba(96,165,250,.45),transparent 34%),
    radial-gradient(circle at 15% 100%,rgba(139,92,246,.45),transparent 34%),
    linear-gradient(135deg,#0f172a,#172554 55%,#312e81)}
  .brand{display:flex;align-items:center;gap:11px}
  .logo{width:15mm;height:15mm;border-radius:5mm;display:grid;place-items:center;
    background:linear-gradient(135deg,#60a5fa,#8b5cf6);font-size:20px;font-weight:900;
    box-shadow:0 8px 24px rgba(0,0,0,.22)}
  .brand-name{font-weight:800;font-size:16px;letter-spacing:.02em}
  .brand-sub{font-size:10px;opacity:.72;margin-top:2px;text-transform:uppercase;letter-spacing:.16em}
  .cover-content{display:flex;justify-content:space-between;align-items:flex-end;margin-top:15mm}
  .cover h1{font-size:29px;line-height:1.05;margin:0 0 4px}
  .cover p{margin:0;opacity:.78;font-size:12px}
  .month-badge{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);
    padding:9px 13px;border-radius:10px;font-size:12px;font-weight:700;backdrop-filter:blur(8px)}
  .content{padding:11mm 16mm 18mm}
  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:-20mm}
  .card{background:white;border-radius:5mm;padding:6mm;box-shadow:0 10px 30px rgba(15,23,42,.12);border:1px solid #eef2f7}
  .card .label{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#64748b}
  .card .value{font-size:18px;font-weight:850;margin-top:3mm;color:#0f172a}
  .card.blue{border-top:3px solid #2563eb}.card.violet{border-top:3px solid #7c3aed}.card.green{border-top:3px solid #059669}
  .section{margin-top:9mm}
  .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4mm}
  h2{font-size:15px;margin:0;color:#0f172a}
  .small{font-size:9px;color:#94a3b8}
  .goal{background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #e0e7ff;border-radius:4mm;padding:5mm}
  .goal-top{display:flex;justify-content:space-between;align-items:center}
  .goal strong{font-size:13px}.goal span{font-size:10px;color:#64748b}
  .progress{height:3mm;border-radius:99px;background:#dbeafe;margin-top:4mm;overflow:hidden}
  .progress i{height:100%;display:block;background:linear-gradient(90deg,#2563eb,#7c3aed);border-radius:99px}
  .grid-2{display:grid;grid-template-columns:1.3fr .7fr;gap:6mm}
  table{width:100%;border-collapse:collapse;font-size:9px}
  th{text-align:left;padding:3mm 2.5mm;background:#f8fafc;color:#64748b;text-transform:uppercase;letter-spacing:.08em;font-size:8px}
  td{padding:3mm 2.5mm;border-bottom:1px solid #eef2f7}
  .num{text-align:right;font-weight:750}
  .tag{padding:1.2mm 2mm;border-radius:99px;background:#eef2ff;color:#4338ca;font-size:8px;font-weight:700}
  .empty-row{text-align:center;color:#94a3b8;padding:8mm}
  .cat-box{border:1px solid #eef2f7;border-radius:4mm;padding:5mm}
  .cat-row{margin-bottom:4mm}.cat-row:last-child{margin-bottom:0}
  .cat-line{display:flex;justify-content:space-between;font-size:9px;margin-bottom:1.5mm}
  .cat-line strong{font-size:8px;color:#64748b}
  .bar{height:2mm;background:#eef2f7;border-radius:99px;overflow:hidden}
  .bar i{height:100%;display:block;background:linear-gradient(90deg,#60a5fa,#7c3aed);border-radius:99px}
  .footer{position:absolute;bottom:8mm;left:16mm;right:16mm;display:flex;justify-content:space-between;
    border-top:1px solid #eef2f7;padding-top:3mm;font-size:8px;color:#94a3b8}
  .muted{color:#94a3b8;font-size:9px}
  .negative{color:#dc2626!important}
  @media print{
    body{background:white}
    .page{margin:0;box-shadow:none}
  }
</style>
</head>
<body>
<div class="page">
  <header class="cover">
    <div class="brand">
      <div class="logo">IA</div>
      <div><div class="brand-name">Imrane Asrir</div><div class="brand-sub">Personal Finance</div></div>
    </div>
    <div class="cover-content">
      <div><h1>Rapport financier<br>mensuel</h1><p>Une vue claire de vos revenus, dépenses et objectifs.</p></div>
      <div class="month-badge">${formatMonth(monthKey)}</div>
    </div>
  </header>

  <main class="content">
    <div class="cards">
      <div class="card blue"><div class="label">Revenus</div><div class="value">${money(income)}</div></div>
      <div class="card violet"><div class="label">Dépenses</div><div class="value">${money(expenses)}</div></div>
      <div class="card green"><div class="label">Reste disponible</div><div class="value ${remaining<0?"negative":""}">${money(remaining)}</div></div>
    </div>

    <section class="section">
      <div class="section-head"><h2>Objectif d’épargne</h2><span class="small">${Math.round(progress)}% atteint</span></div>
      <div class="goal">
        <div class="goal-top"><strong>${money(Math.max(0,remaining))} disponibles</strong><span>Objectif : ${money(savingGoal)}</span></div>
        <div class="progress"><i style="width:${progress}%"></i></div>
      </div>
    </section>

    <section class="section grid-2">
      <div>
        <div class="section-head"><h2>Détail des dépenses</h2><span class="small">${d.expenses.length} opération(s)</span></div>
        <table>
          <thead><tr><th>#</th><th>Description</th><th>Catégorie</th><th class="num">Montant</th></tr></thead>
          <tbody>${expenseRows}</tbody>
        </table>
      </div>
      <div>
        <div class="section-head"><h2>Répartition</h2></div>
        <div class="cat-box">${categoryRows}</div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <span>Rapport privé - Imrane Asrir</span>
    <span>Généré le ${generated}</span>
  </footer>
</div>
<script>
  window.onload=()=>setTimeout(()=>window.print(),350);
</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if(!w){ alert("Autorise les fenêtres surgissantes pour générer le PDF."); return; }
  w.document.open();
  w.document.write(report);
  w.document.close();
}

$("exportBtn").addEventListener("click", generatePDFReport);
$("pdfBtn").addEventListener("click", generatePDFReport);

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
loadMonth();
