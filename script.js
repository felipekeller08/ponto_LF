import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// Configuração do Firebase
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

let startTime;
let interval;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const cronometro = document.getElementById('cronometro');
const tabela = document.querySelector('#registros tbody');

// Iniciar tarefa
startBtn.addEventListener('click', () => {
  startTime = new Date();
  startBtn.disabled = true;
  stopBtn.disabled = false;

  interval = setInterval(() => {
    const now = new Date();
    const diff = new Date(now - startTime);
    cronometro.textContent = diff.toISOString().substr(11, 8);
  }, 1000);
});

// Finalizar tarefa
stopBtn.addEventListener('click', () => {
  clearInterval(interval);

  const endTime = new Date();
  const diff = new Date(endTime - startTime);
  const duracao = diff.toISOString().substr(11, 8);

  const usuario = document.getElementById('usuario').value;
  const tarefa = document.getElementById('tarefa').value || "Sem título";
  const data = startTime.toLocaleDateString();
  const horaInicio = startTime.toLocaleTimeString();
  const horaFim = endTime.toLocaleTimeString();

  // Salvar no Firebase
  push(ref(db, 'registros'), {
    usuario,
    tarefa,
    data,
    horaInicio,
    horaFim,
    duracao,
    timestamp: Date.now()
  });

  cronometro.textContent = '00:00:00';
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

// Carregar registros salvos do Firebase
function carregarRegistros() {
  const registrosRef = ref(db, 'registros');
  onValue(registrosRef, (snapshot) => {
    const data = snapshot.val();
    tabela.innerHTML = ""; // Limpa a tabela antes de adicionar os registros

    for (const id in data) {
      const registro = data[id];

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${registro.usuario}</td>
        <td>${registro.tarefa}</td>
        <td>${registro.data}</td>
        <td>${registro.horaInicio}</td>
        <td>${registro.horaFim}</td>
        <td>${registro.duracao}</td>
      `;
      tabela.appendChild(row);
    }
  });
}

// Carregar ao abrir a página
carregarRegistros();
