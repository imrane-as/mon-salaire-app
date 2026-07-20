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
  const score = t.income > 0
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(45 + rate * 0.7 - (t.remaining < 0 ? 35 : 0))
        )
      )
    : 0;
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

function saveExpense() {
  const name = $("expenseName").value.trim();
  const amount = num($("expenseAmount").value);
  const category = $("expenseCategory").value;
  const date = $("expenseDate").value;
  const type = $("expenseType").value;
  const note = $("expenseNoteInput").value.trim();

  if (!name) {
    alert("Le nom de la dépense est obligatoire.");
    $("expenseName").focus();
    return;
  }

  if (amount <= 0) {
    alert("Le montant doit être supérieur à 0.");
    $("expenseAmount").focus();
    return;
  }

  const data = monthData();

  if (!Array.isArray(data.expenses)) {
    data.expenses = [];
  }

  data.expenses.push({
    id: Date.now(),
    name,
    amount,
    category,
    date,
    type,
    note
  });

  $("expenseName").value = "";
  $("expenseAmount").value = "";
  $("expenseNoteInput").value = "";
  $("expenseDate").value = new Date().toISOString().slice(0, 10);
  $("expenseType").value = "variable";

  $("expenseModal").close();
  persist();
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
function generatePDF() {
  const data = monthData();
  const total = totals(data);

  const selectedMonth =
    $("month").options[$("month").selectedIndex]?.text || "Mois sélectionné";

  const savingRate =
    total.income > 0
      ? Math.round((total.saving / total.income) * 100)
      : 0;

  const categoryData = {};

  data.expenses.forEach((expense) => {
    const category = expense.category || "Autre";

    categoryData[category] =
      (categoryData[category] || 0) + num(expense.amount);
  });

  const categoryRows = Object.entries(categoryData)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([category, amount]) => `
        <tr>
          <td>${esc(category)}</td>
          <td class="amount">${money(amount)}</td>
        </tr>
      `
    )
    .join("");

  const transactionRows = [...data.expenses]
    .sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    )
    .map(
      (expense) => `
        <tr>
          <td>
            <strong>${esc(expense.name || "Dépense")}</strong>
            ${
              expense.note
                ? `<small>${esc(expense.note)}</small>`
                : ""
            }
          </td>

          <td>${esc(expense.category || "Autre")}</td>

          <td>
            ${
              expense.date
                ? new Date(
                    `${expense.date}T12:00:00`
                  ).toLocaleDateString("fr-FR")
                : "—"
            }
          </td>

          <td>${expense.type === "fixed" ? "Fixe" : "Variable"}</td>

          <td class="amount negative">
            −${money(expense.amount)}
          </td>
        </tr>
      `
    )
    .join("");

  const reportHTML = `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">

        <title>Rapport Imrane Finance — ${esc(selectedMonth)}</title>

        <style>
          @page {
            size: A4;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #14213d;
            background: #ffffff;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
            font-size: 12px;
            line-height: 1.5;
          }

          .page {
            width: 100%;
          }

          .cover {
            position: relative;
            overflow: hidden;
            padding: 34px;
            border-radius: 20px;
            color: #ffffff;
            background:
              radial-gradient(
                circle at 90% 0,
                rgba(35, 181, 211, 0.55),
                transparent 40%
              ),
              linear-gradient(
                135deg,
                #07111f,
                #312e81
              );
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .logo {
            width: 44px;
            height: 44px;
            display: grid;
            place-items: center;
            border-radius: 13px;
            background: linear-gradient(
              135deg,
              #6d5dfc,
              #23b5d3
            );
            font-size: 16px;
            font-weight: 900;
          }

          .brand strong {
            display: block;
            font-size: 16px;
          }

          .brand span {
            color: #bfcee0;
            font-size: 10px;
          }

          .cover h1 {
            max-width: 520px;
            margin: 38px 0 8px;
            font-size: 30px;
            line-height: 1.1;
          }

          .cover p {
            margin: 0;
            color: #c7d5e6;
          }

          .cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 18px 0;
          }

          .card {
            min-height: 92px;
            padding: 15px;
            border: 1px solid #e4e9f1;
            border-radius: 14px;
            background: #f8fafc;
          }

          .card span {
            display: block;
            margin-bottom: 9px;
            color: #64748b;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .card strong {
            display: block;
            font-size: 18px;
          }

          .positive {
            color: #138a5b;
          }

          .negative {
            color: #d6455d;
          }

          .section {
            margin-top: 22px;
            page-break-inside: avoid;
          }

          .section-header {
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e7ebf2;
          }

          .section-header h2 {
            margin: 0;
            font-size: 17px;
          }

          .section-header p {
            margin: 3px 0 0;
            color: #64748b;
            font-size: 10px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            padding: 9px;
            color: #64748b;
            background: #f3f6fa;
            font-size: 9px;
            text-align: left;
            text-transform: uppercase;
          }

          td {
            padding: 10px 9px;
            border-bottom: 1px solid #e7ebf2;
            vertical-align: top;
          }

          td strong,
          td small {
            display: block;
          }

          td small {
            margin-top: 3px;
            color: #64748b;
          }

          .amount {
            white-space: nowrap;
            text-align: right;
            font-weight: 700;
          }

          .empty {
            padding: 24px;
            border: 1px dashed #ccd5e1;
            border-radius: 12px;
            color: #64748b;
            text-align: center;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }

          .footer {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-top: 30px;
            padding-top: 12px;
            border-top: 1px solid #dfe5ed;
            color: #64748b;
            font-size: 9px;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .section,
            table,
            tr,
            .card {
              break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>
        <div class="page">
          <section class="cover">
            <div class="brand">
              <div class="logo">IF</div>

              <div>
                <strong>Imrane Finance</strong>
                <span>Personal wealth cockpit</span>
              </div>
            </div>

            <h1>Rapport financier mensuel</h1>

            <p>${esc(selectedMonth)}</p>
          </section>

          <section class="cards">
            <article class="card">
              <span>Revenus</span>
              <strong>${money(total.income)}</strong>
            </article>

            <article class="card">
              <span>Dépenses</span>
              <strong class="negative">${money(total.expenses)}</strong>
            </article>

            <article class="card">
              <span>Solde disponible</span>
              <strong class="${
                total.remaining >= 0 ? "positive" : "negative"
              }">
                ${money(total.remaining)}
              </strong>
            </article>

            <article class="card">
              <span>Taux d’épargne</span>
              <strong>${savingRate} %</strong>
            </article>
          </section>

          <div class="summary-grid">
            <section class="section">
              <div class="section-header">
                <h2>Répartition par catégorie</h2>
                <p>Dépenses enregistrées pour ce mois</p>
              </div>

              ${
                categoryRows
                  ? `
                    <table>
                      <thead>
                        <tr>
                          <th>Catégorie</th>
                          <th class="amount">Montant</th>
                        </tr>
                      </thead>

                      <tbody>
                        ${categoryRows}
                      </tbody>
                    </table>
                  `
                  : `
                    <div class="empty">
                      Aucune dépense enregistrée.
                    </div>
                  `
              }
            </section>

            <section class="section">
              <div class="section-header">
                <h2>Planification</h2>
                <p>Budget et objectif d’épargne</p>
              </div>

              <table>
                <tbody>
                  <tr>
                    <td>Budget mensuel</td>
                    <td class="amount">${money(data.budget)}</td>
                  </tr>

                  <tr>
                    <td>Budget restant</td>
                    <td class="amount">
                      ${money(num(data.budget) - total.expenses)}
                    </td>
                  </tr>

                  <tr>
                    <td>Objectif d’épargne</td>
                    <td class="amount">${money(data.savingGoal)}</td>
                  </tr>

                  <tr>
                    <td>Épargne actuelle</td>
                    <td class="amount">${money(total.saving)}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <section class="section">
            <div class="section-header">
              <h2>Détail des transactions</h2>

              <p>
                ${data.expenses.length} transaction${
                  data.expenses.length > 1 ? "s" : ""
                }
              </p>
            </div>

            ${
              transactionRows
                ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Catégorie</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th class="amount">Montant</th>
                      </tr>
                    </thead>

                    <tbody>
                      ${transactionRows}
                    </tbody>
                  </table>
                `
                : `
                  <div class="empty">
                    Aucune transaction pour ce mois.
                  </div>
                `
            }
          </section>

          <footer class="footer">
            <span>Document privé généré par Imrane Finance</span>

            <span>
              ${new Date().toLocaleString("fr-FR")}
            </span>
          </footer>
        </div>
      </body>
    </html>
  `;

  const printFrame = document.createElement("iframe");

  printFrame.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;"
  );

  document.body.appendChild(printFrame);

  const frameDocument =
    printFrame.contentDocument || printFrame.contentWindow.document;

  frameDocument.open();
  frameDocument.write(reportHTML);
  frameDocument.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (error) {
      console.error("Erreur pendant l’export PDF :", error);
      alert("Impossible d’ouvrir l’impression PDF.");
    }

    setTimeout(() => {
      printFrame.remove();
    }, 1500);
  }, 500);
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

      splashScreen.classList.add("is-closing");

      document.body.classList.remove("splash-active");

      setTimeout(() => {

          splashScreen.remove();

      }, 800);

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
        progressBar.style.width = "100%";
        status.textContent = "Application prête. Cliquez sur « Accéder à l'application ».";
    }
  }

  skipButton.addEventListener("click", closeSplash);

  setTimeout(runStep, 400);
}

document.addEventListener("DOMContentLoaded", () => {
  setup();
  setupSplashScreen();
});