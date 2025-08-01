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

let startTimes = {};
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

window.addEventListener("load", () => {
  const usuarioSalvo = localStorage.getItem("pontoLF_usuario");
  const tarefaSalva = localStorage.getItem("pontoLF_tarefa");
  const startSalvoLucas = localStorage.getItem("pontoLF_startTime_Lucas");
  const startSalvoFelipe = localStorage.getItem("pontoLF_startTime_Felipe");

  if (usuarioSalvo) document.getElementById("usuario").value = usuarioSalvo;
  if (tarefaSalva) document.getElementById("tarefa").value = tarefaSalva;

  if (startSalvoLucas) {
    startTimes["Lucas"] = new Date(startSalvoLucas);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    atualizarCronometro("Lucas");
  }

  if (startSalvoFelipe) {
    startTimes["Felipe"] = new Date(startSalvoFelipe);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    atualizarCronometro("Felipe");
  }
});
