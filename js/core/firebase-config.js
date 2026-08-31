// ==========================================
// /js/core/firebase-config.js
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyAkKI_-dltw1ewgfKnow3ycfdz5yVYWFQE",
    authDomain: "cieeproject-br.firebaseapp.com",
    databaseURL: "https://cieeproject-br-default-rtdb.firebaseio.com",
    projectId: "cieeproject-br",
    storageBucket: "cieeproject-br.firebasestorage.app",
    messagingSenderId: "893492782084",
    appId: "1:893492782084:web:d9372f4161dcfe65750151"
};

try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase já inicializado ou erro na carga dos scripts.");
}
const db = firebase.database();

function enviarParaNuvem(acao, vaga, empresa) {
    if (!db || typeof operador === 'undefined' || !operador) return;
    let pacote = {
        operador: operador,
        ticket: (typeof ticket_global !== 'undefined' ? ticket_global : "") || "-",
        vaga: vaga || "-",
        empresa: empresa || "-",
        acao: acao,
        dataHora: new Date().toISOString()
    };
    db.ref('logs_operacionais').push(pacote).catch(e => console.error("Erro ao sincronizar com Firebase", e));
}

function enviarParaTreinamento(ticket, corpoEmail, analiseRegex, analiseIA) {
    if (!db) return;
    let pacoteFalha = {
        ticket: ticket,
        dataHora: new Date().toISOString(),
        textoOriginal: corpoEmail,
        resultadoRegex: analiseRegex,
        resultadoIA: analiseIA
    };
    db.ref('treinamento_regex').push(pacoteFalha).catch(e => console.error("Erro ao enviar dados para treinamento", e));
}