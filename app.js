const KEY="imraneFinanceV3";
const THEMES=["midnight","light","aurora"];
const CATS=["Loyer","Voiture","Alimentation","Abonnements","Famille","Voyages","Santé","Loisirs","Autre"];
const icons={Loyer:"⌂",Voiture:"◇",Alimentation:"◉",Abonnements:"↻",Famille:"♡",Voyages:"✈",Santé:"+",Loisirs:"☆",Autre:"•"};
let state=JSON.parse(localStorage.getItem(KEY)||'{"months":{},"goals":[],"theme":"midnight"}');
const $=id=>document.getElementById(id),num=v=>Number(v)||0;
const money=v=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(num(v));
const now=new Date(),current=now.toISOString().slice(0,7);

function monthData(k=$("month").value){return state.months[k]||(state.months[k]={salary:0,bonus:0,savingGoal:0,budget:0,expenses:[],categoryBudgets:{}})}
function persist(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function labelMonth(k){return new Date(k+"-01T12:00:00").toLocaleDateString("fr-FR",{month:"short",year:"2-digit"})}

function setup(){
  for(let i=0;i<18;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1),k=d.toISOString().slice(0,7);
    $("month").add(new Option(d.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),k));
  }
  $("month").value=current;
  $("expenseDate").value=now.toISOString().slice(0,10);
  CATS.forEach(c=>{$("expenseCategory").add(new Option(c,c));$("filter").add(new Option(c,c))});
  document.documentElement.dataset.theme=state.theme||"midnight";

  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showView(b.dataset.view));
  document.querySelectorAll("[data-view-link]").forEach(b=>b.onclick=()=>showView(b.dataset.viewLink));

  $("openExpense").onclick=$("openExpense2").onclick=()=>$("expenseModal").showModal();
  $("openIncome").onclick=()=>{loadIncome();$("incomeModal").showModal()};
  $("themeBtn").onclick=()=>{state.theme=THEMES[(THEMES.indexOf(state.theme)+1)%THEMES.length];document.documentElement.dataset.theme=state.theme;persist()};
  $("month").onchange=render;
  $("search").oninput=renderTransactions;
  $("filter").onchange=renderTransactions;
  $("saveMonth").onclick=saveIncome;
  $("addExpense").onclick=saveExpense;
  $("saveGoal").onclick=addGoal;
  $("exportBtn").onclick=$("pdfBtn").onclick=generatePDF;
  $("backupBtn").onclick=backup;
  $("resetBtn").onclick=()=>{if(confirm("Supprimer toutes les données ?")){localStorage.removeItem(KEY);location.reload()}};
  render();
}

function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".nav").forEach(v=>v.classList.toggle("active",v.dataset.view===id));
  $("pageTitle").textContent={dashboard:"Vue d’ensemble",transactions:"Transactions",budgets:"Budgets",goals:"Objectifs",reports:"Rapports"}[id];
}

function totals(d){
  const income=num(d.salary)+num(d.bonus),expenses=d.expenses.reduce((s,e)=>s+num(e.amount),0);
  return{income,expenses,remaining:income-expenses,saving:Math.max(0,income-expenses)};
}

function render(){
  const d=monthData(),t=totals(d),rate=t.income?Math.round(t.saving/t.income*100):0;
  const score=Math.max(0,Math.min(100,Math.round(45+rate*.7-(t.remaining<0?35:0))));
  $("remaining").textContent=money(t.remaining);
  $("incomeValue").textContent=money(t.income);
  $("expensesValue").textContent=money(t.expenses);
  $("savingsValue").textContent=money(t.saving);
  $("budgetRemaining").textContent=money(num(d.budget)-t.expenses);
  $("expenseNote").textContent=`${d.expenses.length} transaction${d.expenses.length>1?"s":""}`;
  $("savingRate").textContent=`${rate}% des revenus`;
  $("budgetNote").textContent=d.budget?`Budget ${money(d.budget)}`:"Non défini";
  $("insight").textContent=t.income?(t.remaining>=0?`Tu conserves ${rate}% de tes revenus ce mois-ci.`:"Attention, tes dépenses dépassent tes revenus."):"Configure tes revenus pour commencer.";
  $("score").textContent=score;
  document.querySelector(".score").style.setProperty("--score",score+"%");
  renderChart();renderCategories();renderTransactions();renderGoal();renderBudgets();renderGoals();
}

function renderChart(){
  let ks=Object.keys(state.months).sort().slice(-6);if(!ks.length)ks=[current];
  let max=1;ks.forEach(k=>{const t=totals(monthData(k));max=Math.max(max,t.income,t.expenses)});
  $("cashflow").innerHTML=ks.map(k=>{const t=totals(monthData(k));return `<div class="bar-col"><div class="bar-pair"><i class="bar in" style="height:${t.income/max*100}%"></i><i class="bar out" style="height:${t.expenses/max*100}%"></i></div><small>${labelMonth(k)}</small></div>`}).join("");
}

function categoryTotals(){
  const o={};monthData().expenses.forEach(e=>o[e.category]=(o[e.category]||0)+num(e.amount));
  return Object.entries(o).sort((a,b)=>b[1]-a[1]);
}

function renderCategories(){
  const arr=categoryTotals(),total=arr.reduce((s,x)=>s+x[1],0);
  if(!total){$("categoryChart").innerHTML='<div class="empty">Aucune dépense</div>';return}
  const colors=["#6d5dfc","#23b5d3","#39d98a","#ffb84d","#ff6b7a","#9a79ff","#4dd0a5"];
  let angle=0,parts=[];
  arr.forEach(([c,v],i)=>{const a=v/total*360;parts.push(`${colors[i%colors.length]} ${angle}deg ${angle+a}deg`);angle+=a});
  $("categoryChart").innerHTML=`<div class="donut" style="background:conic-gradient(${parts.join(",")})"></div><div class="legend-list">${arr.slice(0,6).map(([c,v])=>`<div class="legend-row"><span>${icons[c]||"•"} ${c}</span><b>${money(v)}</b></div>`).join("")}</div>`;
}

function transactionHTML(e,i){return `<div class="tx"><div class="tx-icon">${icons[e.category]||"•"}</div><div class="tx-main"><b>${esc(e.name)}</b><small>${esc(e.category)} · ${e.date||""}${e.note?" · "+esc(e.note):""}</small></div><div class="tx-amount">−${money(e.amount)}</div><button class="delete" onclick="removeExpense(${i})">×</button></div>`}

function renderTransactions(){
  const d=monthData(),q=($("search").value||"").toLowerCase(),f=$("filter").value||"";
  const list=d.expenses.map((e,i)=>({...e,_i:i})).filter(e=>(!q||e.name.toLowerCase().includes(q))&&(!f||e.category===f)).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  $("transactionsList").innerHTML=list.length?list.map(e=>transactionHTML(e,e._i)).join(""):'<div class="empty">Aucune transaction</div>';
  $("recent").innerHTML=list.length?list.slice(0,5).map(e=>transactionHTML(e,e._i)).join(""):'<div class="empty">Ajoute ta première dépense</div>';
}
window.removeExpense=i=>{monthData().expenses.splice(i,1);persist()};

function loadIncome(){const d=monthData();$("salary").value=d.salary||"";$("bonus").value=d.bonus||"";$("savingGoal").value=d.savingGoal||"";$("monthlyBudget").value=d.budget||""}
function saveIncome(){const d=monthData();d.salary=num($("salary").value);d.bonus=num($("bonus").value);d.savingGoal=num($("savingGoal").value);d.budget=num($("monthlyBudget").value);$("incomeModal").close();persist()}

function saveExpense(){
  const name=$("expenseName").value.trim(),amount=num($("expenseAmount").value);
  if(!name||amount<=0)return alert("Nom et montant obligatoires.");
  monthData().expenses.push({name,amount,category:$("expenseCategory").value,date:$("expenseDate").value,type:$("expenseType").value,note:$("expenseNote").value.trim()});
  $("expenseName").value="";$("expenseAmount").value="";$("expenseNote").value="";
  $("expenseModal").close();persist();
}

function renderGoal(){
  const d=monthData(),t=totals(d),goal=num(d.savingGoal),pct=goal?Math.min(100,Math.round(t.saving/goal*100)):0;
  $("monthlyGoal").innerHTML=`<div class="goal-box"><b>${money(t.saving)}</b><p>sur un objectif de ${money(goal)}</p><div class="progress"><i style="width:${pct}%"></i></div><p>${pct}% atteint</p></div>`;
}

function renderBudgets(){
  const d=monthData(),spent=Object.fromEntries(categoryTotals());
  $("budgetsList").innerHTML=CATS.map(c=>{const budget=num(d.categoryBudgets[c]),used=num(spent[c]),pct=budget?Math.min(100,Math.round(used/budget*100)):0;return `<div class="budget-row"><div class="budget-top"><b>${icons[c]} ${c}</b><span>${money(used)} / <input class="budget-input" type="number" value="${budget||""}" placeholder="Budget" onchange="setBudget('${c}',this.value)"></span></div><div class="progress"><i style="width:${pct}%"></i></div></div>`}).join("");
}
window.setBudget=(c,v)=>{monthData().categoryBudgets[c]=num(v);persist()};

function addGoal(){
  const name=$("goalName").value.trim(),target=num($("goalTarget").value),currentValue=num($("goalCurrent").value);
  if(!name||target<=0)return alert("Nom et cible obligatoires.");
  state.goals.push({name,target,current:currentValue});
  $("goalName").value="";$("goalTarget").value="";$("goalCurrent").value="";persist();
}

function renderGoals(){
  $("goalsList").innerHTML=state.goals.length?state.goals.map((g,i)=>{const pct=Math.min(100,Math.round(num(g.current)/num(g.target)*100));return `<div class="goal-row"><div class="goal-top"><b>${esc(g.name)}</b><button class="delete" onclick="removeGoal(${i})">×</button></div><p>${money(g.current)} sur ${money(g.target)} · ${pct}%</p><div class="progress"><i style="width:${pct}%"></i></div></div>`}).join(""):'<div class="empty">Aucun objectif enregistré</div>';
}
window.removeGoal=i=>{state.goals.splice(i,1);persist()};

function backup(){
  const a=document.createElement("a"),blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  a.href=URL.createObjectURL(blob);a.download="imrane-finance-backup.json";a.click();URL.revokeObjectURL(a.href);
}

function generatePDF(){
  const d=monthData(),t=totals(d);
  const rows=d.expenses.map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.category)}</td><td>${e.date||""}</td><td>${money(e.amount)}</td></tr>`).join("")||'<tr><td colspan="4">Aucune dépense</td></tr>';
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport Imrane Finance</title><style>@page{size:A4;margin:0}body{margin:0;font-family:Arial;color:#14213d}.cover{padding:55px;color:white;background:linear-gradient(135deg,#07111f,#312e81)}.logo{font-size:30px;font-weight:900}.content{padding:40px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:-55px}.card{background:white;padding:22px;border-radius:18px;box-shadow:0 10px 35px #0002}.card span{color:#64748b;font-size:12px}.card b{display:block;font-size:21px;margin-top:8px}table{width:100%;border-collapse:collapse;margin-top:25px}th,td{text-align:left;padding:12px;border-bottom:1px solid #e5e7eb}th{background:#f4f6fb}.footer{margin-top:30px;color:#64748b;font-size:11px}</style></head><body><div class="cover"><div class="logo">IF · Imrane Finance</div><h1>Rapport financier mensuel</h1><p>${$("month").options[$("month").selectedIndex].text}</p></div><div class="content"><div class="cards"><div class="card"><span>Revenus</span><b>${money(t.income)}</b></div><div class="card"><span>Dépenses</span><b>${money(t.expenses)}</b></div><div class="card"><span>Solde</span><b>${money(t.remaining)}</b></div></div><h2>Détail des transactions</h2><table><thead><tr><th>Description</th><th>Catégorie</th><th>Date</th><th>Montant</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">Document privé généré par Imrane Finance · ${new Date().toLocaleString("fr-FR")}</div></div><script>onload=()=>setTimeout(()=>print(),300)</script></body></html>`;
  const w=open("","_blank");if(!w)return alert("Autorise les fenêtres surgissantes.");w.document.write(html);w.document.close();
}
function setupSplashScreen() {
  const splashScreen = document.getElementById("splashScreen");
  const skipButton = document.getElementById("skipSplash");
  const progressBar = document.getElementById("splashProgressBar");
  const status = document.getElementById("splashStatus");

  if (!splashScreen || !progressBar || !status) {
    return;
  }

  document.body.classList.add("splash-active");

  const steps = [
    {
      progress: 18,
      message: "Connexion au dépôt GitHub…"
    },
    {
      progress: 42,
      message: "Analyse du Dockerfile…"
    },
    {
      progress: 68,
      message: "Déploiement de l’image avec Coolify…"
    },
    {
      progress: 88,
      message: "Vérification du conteneur Cyclop…"
    },
    {
      progress: 100,
      message: "Application prête."
    }
  ];

  let currentStep = 0;
  let closed = false;

  function closeSplash() {
    if (closed) {
      return;
    }

    closed = true;
    progressBar.style.width = "100%";
    status.textContent = "Application prête.";

    setTimeout(() => {
      splashScreen.classList.add("is-closing");
      document.body.classList.remove("splash-active");

      setTimeout(() => {
        splashScreen.remove();
      }, 850);
    }, 300);
  }

  function runStep() {
    if (closed) {
      return;
    }

    const step = steps[currentStep];

    progressBar.style.width = `${step.progress}%`;
    status.textContent = step.message;

    currentStep += 1;

    if (currentStep < steps.length) {
      setTimeout(runStep, 650);
    } else {
      setTimeout(closeSplash, 650);
    }
  }

  skipButton.addEventListener("click", closeSplash);

  setTimeout(runStep, 400);
}

document.addEventListener("DOMContentLoaded", () => {
  setup();
  setupSplashScreen();
});