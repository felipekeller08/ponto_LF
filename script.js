// ====== Tailwind dark mode toggle ======
(function() {
  const root = document.documentElement;
  const saved = localStorage.getItem('lf-theme');
  if(saved === 'dark') root.classList.add('dark');
  document.getElementById('themeToggle').addEventListener('click', () => {
    root.classList.toggle('dark');
    localStorage.setItem('lf-theme', root.classList.contains('dark') ? 'dark' : 'light');
  });
})();

// ====== Tabs ======
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active', 'bg-indigo-600', 'text-white'));
  b.classList.add('active','bg-indigo-600','text-white');
  const tab = b.dataset.tab;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
}));

// ===== Clock preview
function updateClock() {
  const el = document.getElementById('clockNow');
  if(el) el.textContent = new Date().toLocaleString();
}
setInterval(updateClock, 1000); updateClock();

// ====== Firebase Init ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
const firebaseConfig = {
  apiKey: "AIzaSyCYL7rtR12hAyH0wejHUwZ-okkvPVq2gts",
  authDomain: "pontolf-b225c.firebaseapp.com",
  databaseURL: "https://pontolf-b225c-default-rtdb.firebaseio.com",
  projectId: "pontolf-b225c",
  storageBucket: "pontolf-b225c.firebasestorage.app",
  messagingSenderId: "461259953952",
  appId: "1:461259953952:web:9e70ab93b4793eb5566945"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
// tenta autenticar anonimamente (se habilitado no console)
signInAnonymously(auth).catch(err => {
  console.warn('Anon auth falhou:', err.code);
  // dica mais amigável
  if(err.code === 'auth/operation-not-allowed'){
    toast('Habilite "Sign-in anônimo" no Firebase Auth > Sign-in method.', false);
  }
});

// Toast/alerta suave
function toast(msg, ok=true){
  const t = document.createElement('div');
  t.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm shadow-glow ' +
                (ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>{ t.remove(); }, 2200);
}

// wrapper de push com try/catch
async function dbPush(path, data){
  try{
    await push(ref(db, path), data);
    return true;
  }catch(e){
    console.error('Erro Firebase push', e);
    toast((e && e.code ? e.code + ' — ' : '') + 'Falha ao salvar. Verifique internet/regras Firebase.', false);
    return false;
  }
}

// ===== Helpers =====
const fmt = (ms) => {
  const s = Math.floor(ms/1000);
  const hh = String(Math.floor(s/3600)).padStart(2,'0');
  const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
};
const uid = () => Math.random().toString(36).slice(2);

function toMsMaybe(v){
  if(typeof v === 'number') return v;
  if(typeof v === 'string'){
    const m = v.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if(m){ const h=+m[1], mi=+m[2], s=+m[3]; return ((h*3600+mi*60+s)*1000); }
    const n = Number(v); if(!isNaN(n)) return n;
  }
  return 0;
}



// ===== Offline queue para PROJETOS =====
function saveProjetoOffline(p){
  const arr = JSON.parse(localStorage.getItem('projetosOffline')||'[]');
  arr.push(p); localStorage.setItem('projetosOffline', JSON.stringify(arr));
}
async function flushProjetosOffline(){
  const arr = JSON.parse(localStorage.getItem('projetosOffline')||'[]');
  if(!arr.length){ toast('Sem pendências.'); return; }
  let okAll = true;
  for(const p of arr){
    try{
      await push(ref(db, 'projetos'), p);
    }catch(e){
      okAll = false; console.warn('Falha ao reenviar projeto offline', e);
    }
  }
  if(okAll){ localStorage.removeItem('projetosOffline'); toast('Projetos pendentes enviados!'); }
  else{ toast('Ainda há pendências. Verifique regras/ conexão.', false); }
}
document.getElementById('syncBtn').addEventListener('click', flushProjetosOffline);
window.addEventListener('online', flushProjetosOffline);
// ========= PONTO =========
const atividadeInput = document.getElementById('atividade');
const atividadeProjetoSelect = document.getElementById('atividadeProjeto');
const pontoUsuario = document.getElementById('pontoUsuario');
const tabelaRegistros = document.getElementById('tabelaRegistros');
const btnIniciar = document.getElementById('btnIniciar');
const btnParar = document.getElementById('btnParar');
const cronometroEl = document.getElementById('cronometro');
const btnLimparDia = document.getElementById('btnLimparDia');

let running = null; // {id, inicio, atividade, projetoId, usuario}
let tickInterval = null;
let savingRegistro = false; // evita duplicações ao parar

function loadRunningFromLocal() {
  const raw = localStorage.getItem('lf-running');
  if(!raw) return;
  try {
    running = JSON.parse(raw);
    if(running && running.inicio) startTick();
    btnIniciar.disabled = true; btnParar.disabled = false;
  } catch(e){}
}
function saveRunningToLocal() { localStorage.setItem('lf-running', JSON.stringify(running)); }
function clearRunning() { localStorage.removeItem('lf-running'); }

function startTick() {
  if(tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    const dur = Date.now() - running.inicio;
    cronometroEl.textContent = fmt(dur);
  }, 1000);
}

btnIniciar.addEventListener('click', () => {
  const atividade = atividadeInput.value.trim();
  if(!atividade) { alert('Descreva a atividade.'); return; }
  const projetoId = atividadeProjetoSelect.value || null;
  const usuario = pontoUsuario ? pontoUsuario.value : '';
  running = { id: uid(), atividade, projetoId, usuario, inicio: Date.now() };
  cronometroEl.textContent = '00:00:00';
  startTick(); saveRunningToLocal();
  btnIniciar.disabled = true; btnParar.disabled = false;
});

btnParar.addEventListener('click', async () => {
  if(savingRegistro) return; savingRegistro = true;
  if(!running){ savingRegistro = false; return; }
  const fim = Date.now();
  const dur = fim - running.inicio;
  const data = new Date().toISOString().slice(0,10);
  const registro = { ...running, fim, duracao: dur, data };
  // salva registro em /registros
  try{ await push(ref(db, 'registros'), registro); }
  catch(e){ console.warn('Falha ao salvar registro', e); }
  // onValue recarrega a tabela automaticamente
  running = null; clearRunning();
  if(tickInterval) clearInterval(tickInterval);
  btnIniciar.disabled = false; btnParar.disabled = true;
  cronometroEl.textContent = '00:00:00';
  savingRegistro = false;
});

btnLimparDia.addEventListener('click', () => {
  tabelaRegistros.innerHTML = '';
});

function addRegistroRow(key, r) {
  const tr = document.createElement('tr');
  const inicio = new Date(r.inicio).toLocaleTimeString();
  const fim = new Date(r.fim).toLocaleTimeString();
  tr.innerHTML = `
    <td class="py-2 pr-3">${inicio}</td>
    <td class="py-2 pr-3">${fim}</td>
    <td class="py-2 pr-3 font-mono">${fmt(r.duracao)}</td>
    <td class="py-2 pr-3">${r.atividade}</td>
    <td class="py-2 pr-3">${r.projetoId ? (projetosById[r.projetoId] || r.projetoId) : '-'}</td>
    <td class="py-2 pr-3"><button data-key="${'${key}'}" class="btn-excluir px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Excluir</button></td>`;
  tr.querySelector('.btn-excluir').addEventListener('click', () => remove(ref(db, 'registros/' + key)));
  tabelaRegistros.prepend(tr);
}

// carrega registros do dia corrente
onValue(ref(db, 'registros'), (snap) => {
  const dataHoje = new Date().toISOString().slice(0,10);
  tabelaRegistros.innerHTML = '';
  const vals = snap.val() || {};
  const entriesHoje = Object.entries(vals).filter(([k,r]) => r.data === dataHoje);
  entriesHoje.forEach(([key,r]) => addRegistroRow(key, r));
  let lucas=0, felipe=0;
  entriesHoje.forEach(([key,r])=>{ const ms = toMsMaybe(r.duracao); const u=(r.usuario||'').toLowerCase(); if(u==='lucas') lucas+=ms; if(u==='felipe') felipe+=ms; });
  const toFmt = (ms)=>{ const s=Math.floor(ms/1000); const hh=String(Math.floor(s/3600)).padStart(2,'0'); const mm=String(Math.floor((s%3600)/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return `${hh}:${mm}:${ss}`; };
  const L=document.getElementById('totalLucas'); if(L) L.textContent=toFmt(lucas);
  const F=document.getElementById('totalFelipe'); if(F) F.textContent=toFmt(felipe);
});
loadRunningFromLocal();

// ========= TAREFAS =========
const listaFelipe = document.getElementById('listaFelipe');
const listaLucas = document.getElementById('listaLucas');
const btnAddTarefa = document.getElementById('btnAddTarefa');
const tarefaTitulo = document.getElementById('tarefaTitulo');
const tarefaResp = document.getElementById('tarefaResp');
const tarefaPrazo = document.getElementById('tarefaPrazo');

btnAddTarefa.addEventListener('click', async () => {
  const titulo = tarefaTitulo.value.trim();
  if(!titulo) return alert('Descreva a tarefa');
  const resp = tarefaResp.value;
  const prazo = tarefaPrazo.value || null;
  const nova = { id: uid(), titulo, resp, prazo, feito: false, criadoEm: Date.now() };
  await push(ref(db, 'tarefas'), nova);
  tarefaTitulo.value = ''; tarefaPrazo.value='';
});

function tarefaItem(t) {
  const li = document.createElement('li');
  li.className = "p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3";
  li.innerHTML = `
    <div class="flex items-center gap-3">
      <input type="checkbox" ${t.feito ? 'checked' : ''} class="h-4 w-4 accent-indigo-600">
      <div>
        <p class="font-medium">${t.titulo}</p>
        <p class="text-xs text-slate-500">${t.prazo ? ('Prazo: ' + t.prazo) : ''}</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button class="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">Excluir</button>
    </div>`;
  const chk = li.querySelector('input[type=checkbox]');
  chk.addEventListener('change', () => update(ref(db, 'tarefas/' + t._key), { feito: chk.checked }));
  li.querySelector('button').addEventListener('click', () => remove(ref(db, 'tarefas/' + t._key)));
  return li;
}

onValue(ref(db, 'tarefas'), (snap) => {
  listaFelipe.innerHTML = ''; listaLucas.innerHTML='';
  const vals = snap.val() || {};
  Object.entries(vals).forEach(([key, t]) => {
    t._key = key;
    const li = tarefaItem(t);
    (t.resp === 'Felipe' ? listaFelipe : listaLucas).appendChild(li);
  });
});

// ========= PROJETOS =========
const padraoEtapas = [
  { label: "1. Encontrar cliente", key: "encontrar" },
  { label: "2. Conversar com o cliente", key: "conversar" },
  { label: "3. Projetar site/posts", key: "projetar" },
  { label: "4.1 Criar site", key: "criar_site" },
  { label: "4.2 Criar posts", key: "criar_posts" },
  { label: "5. Ver ajustes com o cliente", key: "ajustes" },
  { label: "6. Entregar/postar site", key: "entregar" },
];

const cardsProjetos = document.getElementById('cardsProjetos');
const projetosById = {};
const projNome = document.getElementById('projNome');
const projCliente = document.getElementById('projCliente');
const btnAddProjeto = document.getElementById('btnAddProjeto');

btnAddProjeto.addEventListener('click', async () => {
  const btn = btnAddProjeto;
  btn.disabled = true;
  btn.classList.add('opacity-60','cursor-not-allowed');
  const initialText = btn.textContent;
  btn.textContent = 'Salvando...';

  const nome = projNome.value.trim(); if(!nome) return alert('Digite o nome do projeto');
  const cliente = projCliente.value.trim();
  const projeto = {
    id: uid(),
    nome, cliente,
    criadoEm: Date.now(),
    etapaIndex: 0,
    etapas: padraoEtapas.map(e => ({ ...e, status: 'pendente', concluidoEm: null }))
  };
  const ok = await dbPush('projetos', projeto);
  if(ok){
    toast('Projeto criado!'); projNome.value=''; projCliente.value='';
    const projTabBtn = document.querySelector('[data-tab="projetos"]');
    if(projTabBtn){ projTabBtn.click(); setTimeout(()=>{ document.getElementById('cardsProjetos')?.scrollIntoView({behavior:'smooth'}); }, 200); }
  }else{
    saveProjetoOffline(projeto);
    toast('Sem permissão. Projeto salvo local e será reenviado após ajustar as regras.', false);
  }
  btn.textContent = initialText;
  btn.classList.remove('opacity-60','cursor-not-allowed');
  btn.disabled = false;
});

function etapaProgressHTML(p, idx) {
  const done = p.etapas.filter(e => e.status==='feito').length;
  const total = p.etapas.length;
  const pct = Math.round((done/total)*100);
  // barras
  const bars = p.etapas.map((e,i)=>`<div class="h-2 rounded-full ${i<done?'bg-indigo-500':'bg-slate-300 dark:bg-slate-700'}"></div>`).join('');
  const steps = p.etapas.map((e,i)=>`
    <div class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 ${i===idx?'bg-indigo-50 dark:bg-indigo-950/30':''}">
      <div class="w-7 h-7 rounded-full flex items-center justify-center ${e.status==='feito'?'bg-emerald-500 text-white':'bg-slate-200 dark:bg-slate-700'}">${i+1}</div>
      <div class="flex-1">
        <p class="text-sm">${e.label}</p>
        <div class="mt-2 w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
          <div class="h-full transition-all duration-500 ${e.status==='feito'?'bg-emerald-500':'bg-indigo-500'}" style="width:${e.status==='feito'?'100%':'0%'}"></div>
        </div>
      </div>
      ${i===idx ? '<button class="btn-avancar px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-500">Concluir</button>' : ''}
    </div>`).join('');
  return `
    <div class="space-y-3">
      <div class="grid grid-cols-${total} gap-1">${bars}</div>
      <p class="text-xs text-slate-500">Progresso: <b>${pct}%</b></p>
      <div class="space-y-2">${steps}</div>
    </div>`;
}

function projetoCard(p) {
  const card = document.createElement('div');
  card.className = "p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700";
  card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="font-semibold text-lg">${p.nome}</h3>
        <p class="text-sm text-slate-500">${p.cliente ? 'Cliente: ' + p.cliente : ''}</p>
      </div>
      <button class="btn-excluir text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">Excluir</button>
    </div>
    <div class="mt-4" data-steps></div>`;
  const stepsBox = card.querySelector('[data-steps]');
  const render = () => stepsBox.innerHTML = etapaProgressHTML(p, p.etapaIndex);
  render();

  card.addEventListener('click', (ev) => {
    if(ev.target.classList.contains('btn-avancar')) {
      // anima: barra de carregamento antes de concluir
      const button = ev.target;
      button.disabled = true; button.textContent = 'Carregando...';
      setTimeout(async () => {
        p.etapas[p.etapaIndex].status = 'feito';
        p.etapas[p.etapaIndex].concluidoEm = Date.now();
        p.etapaIndex = Math.min(p.etapaIndex+1, p.etapas.length-1);
        // persistir
        await update(ref(db, 'projetos/' + p._key), { etapas: p.etapas, etapaIndex: p.etapaIndex });
        render();
      }, 900);
    }
    if(ev.target.classList.contains('btn-excluir')) {
      remove(ref(db, 'projetos/' + p._key));
    }
  });
  return card;
}

function preencherProjetosSelect(projetos) {
  atividadeProjetoSelect.innerHTML = '<option value="">Sem projeto</option>';
  projetos.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p._key; opt.textContent = p.nome;
    atividadeProjetoSelect.appendChild(opt);
  });
}


function renderEmptyProjetos(){
  cardsProjetos.innerHTML = `<div class="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
    Nenhum projeto ainda. Crie um projeto ao lado para começar.
  </div>`;
}

onValue(ref(db, 'projetos'), (snap) => {
  cardsProjetos.innerHTML = '';
  const arr = [];
  const vals = snap.val() || {};
  Object.entries(vals).forEach(([key,p])=>{ p._key = key; arr.push(p); projetosById[key] = p.nome; });
  if(arr.length === 0){ renderEmptyProjetos(); preencherProjetosSelect([]); return; }
  arr.sort((a,b)=>(b.criadoEm||0)-(a.criadoEm||0));
  arr.forEach(p => cardsProjetos.appendChild(projetoCard(p)));
  preencherProjetosSelect(arr);
}, (err) => {
  console.warn('Leitura de /projetos falhou:', err);
  toast('Sem permissão de leitura em /projetos. Ajuste as regras.', false);
  renderEmptyProjetos();
});

// ====== PWA Install prompt (opcional) ======
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.getElementById('installPWA').classList.remove('hidden'); });
document.getElementById('installPWA').addEventListener('click', async () => { if(!deferredPrompt) return; deferredPrompt.prompt(); });


// ======== Resumo e Sparklines (últimos 7 dias) ========
function sumMs(arr){return arr.reduce((a,b)=>a+b,0);}
function msFmt(ms){ const s=Math.floor(ms/1000); const hh=String(Math.floor(s/3600)).padStart(2,'0'); const mm=String(Math.floor((s%3600)/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return `${hh}:${mm}:${ss}`; }

function lastNDates(n){
  const out=[]; const d=new Date();
  for(let i=n-1;i>=0;i--){
    const dt = new Date(d); dt.setDate(d.getDate()-i);
    out.push(dt.toISOString().slice(0,10));
  }
  return out;
}

function drawSparkline(canvasId, series){
  const c = document.getElementById(canvasId); if(!c) return;
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  ctx.clearRect(0,0,w,h);
  const max = Math.max(...series, 1);
  const step = w / (series.length-1 || 1);
  ctx.lineWidth = 2;
  ctx.strokeStyle = getComputedStyle(document.documentElement).classList.contains('dark') ? '#8b5cf6' : '#6366f1';
  ctx.beginPath();
  series.forEach((v,i)=>{
    const x = i*step;
    const y = h - (v/max)*h;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
  // fill under line (soft)
  const grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,'rgba(99,102,241,0.25)');
  grad.addColorStop(1,'rgba(99,102,241,0)');
  ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
}

// Atualiza métricas toda vez que registros mudarem
function updateResumo(registrosVals){
  const days = lastNDates(7);
  const mapLucas = new Array(days.length).fill(0);
  const mapFelipe = new Array(days.length).fill(0);
  let hojeLucas=0, hojeFelipe=0;

  Object.values(registrosVals || {}).forEach(r=>{
    if(!r || !r.data || typeof r.duracao!=='number') return;
    const idx = days.indexOf(r.data);
    if(idx === -1) return;
    const user = (r.usuario||'').toLowerCase();
    if(user==='lucas'){ mapLucas[idx]+=ms; if(idx===days.length-1) hojeLucas+=ms; }
    if(user==='felipe'){ mapFelipe[idx]+=ms; if(idx===days.length-1) hojeFelipe+=ms; }
  });

  const todayLucasEl = document.getElementById('todayLucas');
  const todayFelipeEl = document.getElementById('todayFelipe');
  const weekLucasEl  = document.getElementById('weekLucas');
  const weekFelipeEl = document.getElementById('weekFelipe');
  if(todayLucasEl) todayLucasEl.textContent = msFmt(hojeLucas);
  if(todayFelipeEl) todayFelipeEl.textContent = msFmt(hojeFelipe);
  if(weekLucasEl)  weekLucasEl.textContent  = msFmt(sumMs(mapLucas));
  if(weekFelipeEl) weekFelipeEl.textContent = msFmt(sumMs(mapFelipe));

  drawSparkline('sparkLucas', mapLucas);
  drawSparkline('sparkFelipe', mapFelipe);
}
