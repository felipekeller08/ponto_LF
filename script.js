// Firebase Config e Inicialização
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  update
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

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

let startTimes = {}; // Cronômetro por usuário
let intervals = {};

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const cronometro = document.getElementById('cronometro');
const tabela = document.querySelector('#registros tbody');
const nomeTarefa = document.getElementById('nomeTarefa');
const dataTarefa = document.getElementById('dataTarefa');
const responsavel = document.getElementById('responsavel');
const btnAdd = document.getElementById('adicionarTarefa');
const listaLucas = document.getElementById('listaLucas');
const listaFelipe = document.getElementById('listaFelipe');

function calcularSegundos(duracaoStr) {
  const [h, m, s] = duracaoStr.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function formatarTempo(segundos) {
  const h = String(Math.floor(segundos / 3600)).padStart(2, '0');
  const m = String(Math.floor((segundos % 3600) / 60)).padStart(2, '0');
  const s = String(segundos % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function atualizarCronometro(usuario) {
  const startTime = new Date(startTimes[usuario]);
  intervals[usuario] = setInterval(() => {
    const now = new Date();
    const diff = new Date(now - startTime);
    cronometro.textContent = diff.toISOString().substr(11, 8);
  }, 1000);
}

function salvarLocalOffline(registro) {
  let registrosOffline = JSON.parse(localStorage.getItem("registrosOffline")) || [];
  registrosOffline.push(registro);
  localStorage.setItem("registrosOffline", JSON.stringify(registrosOffline));
}

function enviarRegistrosOffline() {
  const registrosOffline = JSON.parse(localStorage.getItem("registrosOffline")) || [];
  registrosOffline.forEach(reg => {
    push(ref(db, 'registros'), reg);
  });
  if (registrosOffline.length > 0) {
    localStorage.removeItem("registrosOffline");
    mostrarToast("✅ Registros offline enviados com sucesso!");
  }
}

window.addEventListener("online", enviarRegistrosOffline);

startBtn.addEventListener('click', () => {
  const usuario = document.getElementById('usuario').value;
  startTimes[usuario] = new Date();
  localStorage.setItem(`pontoLF_startTime_${usuario}`, startTimes[usuario].toISOString());
  startBtn.disabled = true;
  stopBtn.disabled = false;
  atualizarCronometro(usuario);
});

stopBtn.addEventListener('click', () => {
  const usuario = document.getElementById('usuario').value;
  clearInterval(intervals[usuario]);
  localStorage.removeItem(`pontoLF_startTime_${usuario}`);

  const endTime = new Date();
  const startTime = new Date(startTimes[usuario]);
  const diff = new Date(endTime - startTime);
  const duracao = diff.toISOString().substr(11, 8);

  const tarefa = document.getElementById('tarefa').value || "Sem título";
  const data = startTime.toLocaleDateString();
  const horaInicio = startTime.toLocaleTimeString();
  const horaFim = endTime.toLocaleTimeString();

  const registro = {
    usuario,
    tarefa,
    data,
    horaInicio,
    horaFim,
    duracao,
    timestamp: Date.now()
  };

  if (navigator.onLine) {
    push(ref(db, 'registros'), registro);
  } else {
    salvarLocalOffline(registro);
    mostrarToast("⏳ Registro salvo localmente. Ele será enviado quando a internet voltar.");
  }

  cronometro.textContent = '00:00:00';
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

function carregarRegistros() {
  const registrosRef = ref(db, 'registros');
  onValue(registrosRef, (snapshot) => {
    const data = snapshot.val();
    tabela.innerHTML = "";

    let totalLucas = 0;
    let totalFelipe = 0;

    for (const id in data) {
      const registro = data[id];
      const duracaoSegundos = calcularSegundos(registro.duracao);

      if (registro.usuario === "Lucas") totalLucas += duracaoSegundos;
      if (registro.usuario === "Felipe") totalFelipe += duracaoSegundos;

      const row = document.createElement("tr");
      const usuarioClass = registro.usuario === "Lucas" ? "usuario-lucas" : "usuario-felipe";

      row.innerHTML = `
        <td class="${usuarioClass}">${registro.usuario}</td>
        <td>${registro.tarefa}</td>
        <td>${registro.data}</td>
        <td>${registro.horaInicio}</td>
        <td>${registro.horaFim}</td>
        <td>${registro.duracao}</td>
        <td><button class="excluir-btn" data-id="${id}">🗑️</button></td>
      `;

      tabela.appendChild(row);

      row.querySelector(".excluir-btn").addEventListener("click", () => {
        if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
          remove(ref(db, 'registros/' + id));
        }
      });
    }

    document.getElementById('tempoLucas').textContent = formatarTempo(totalLucas);
    document.getElementById('tempoFelipe').textContent = formatarTempo(totalFelipe);
  });
}
carregarRegistros();

btnAdd.addEventListener('click', () => {
  const texto = nomeTarefa.value.trim();
  const user = responsavel.value;
  const data = dataTarefa.value;

  if (!texto || !data) return;

  push(ref(db, 'tarefas'), {
    responsavel: user,
    texto,
    data,
    concluida: false,
    timestamp: Date.now()
  });

  nomeTarefa.value = "";
  dataTarefa.value = new Date().toISOString().split("T")[0];
});

function carregarTarefas() {
  const tarefasRef = ref(db, 'tarefas');
  onValue(tarefasRef, (snapshot) => {
    const data = snapshot.val();
    listaLucas.innerHTML = "";
    listaFelipe.innerHTML = "";

    for (const id in data) {
      const tarefa = data[id];
      const li = document.createElement('li');
      li.classList.add("tarefa-item");

      const checkbox = document.createElement('input');
      checkbox.type = "checkbox";
      checkbox.checked = tarefa.concluida;
      if (tarefa.concluida) li.classList.add("checked");

      checkbox.addEventListener('change', () => {
        update(ref(db, 'tarefas/' + id), {
          concluida: checkbox.checked
        });
      });

      const textoSpan = document.createElement("span");
      textoSpan.textContent = `${tarefa.texto} (${tarefa.data})`;
      textoSpan.classList.add("texto-tarefa");

      const excluirBtn = document.createElement("button");
      excluirBtn.textContent = "🗑️";
      excluirBtn.classList.add("excluir-btn");
      excluirBtn.addEventListener("click", () => {
        if (confirm("Deseja excluir esta tarefa?")) {
          remove(ref(db, 'tarefas/' + id));
        }
      });

      li.appendChild(checkbox);
      li.appendChild(textoSpan);
      li.appendChild(excluirBtn);

      if (tarefa.responsavel === "Lucas") {
        listaLucas.appendChild(li);
      } else {
        listaFelipe.appendChild(li);
      }
    }
  });
}
carregarTarefas();

function mostrarToast(mensagem) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = mensagem;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}
