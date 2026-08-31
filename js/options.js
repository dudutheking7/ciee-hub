// ==========================================
// /js/options.js
// ==========================================

// Elementos da tela
const scaleInput = document.getElementById('menu_scale');
const zoomValue = document.getElementById('zoom_value');
const statusDiv = document.getElementById('status');

// Atualiza o texto do % do Slider em tempo real
scaleInput.addEventListener('input', () => {
    zoomValue.innerText = `${scaleInput.value}%`;
});

// Salva as opções no banco de dados do Chrome (storage.sync)
function salvarOpcoes() {
    const configs = {
        menuScale: scaleInput.value,
        botoesAtivos: {
            etapa: document.getElementById('btn_etapa').checked,
            inj_padrao: document.getElementById('btn_inj_padrao').checked,
            log: document.getElementById('btn_log').checked,
            cv: document.getElementById('btn_cv').checked,
            csv: document.getElementById('btn_csv').checked,
            antilag: document.getElementById('btn_antilag').checked
        }
    };

    chrome.storage.sync.set(configs, () => {
        // Mostra o aviso de sucesso
        statusDiv.style.opacity = '1';
        setTimeout(() => {
            statusDiv.style.opacity = '0';
        }, 3000);
    });
}

// Restaura as opções que o usuário salvou antes
function carregarOpcoes() {
    chrome.storage.sync.get({
        // Valores Padrão (caso o usuário nunca tenha entrado nas opções)
        menuScale: 100,
        botoesAtivos: {
            etapa: true, inj_padrao: true, log: true, cv: true, csv: true, antilag: true
        }
    }, (items) => {
        scaleInput.value = items.menuScale;
        zoomValue.innerText = `${items.menuScale}%`;

        document.getElementById('btn_etapa').checked = items.botoesAtivos.etapa;
        document.getElementById('btn_inj_padrao').checked = items.botoesAtivos.inj_padrao;
        document.getElementById('btn_log').checked = items.botoesAtivos.log;
        document.getElementById('btn_cv').checked = items.botoesAtivos.cv;
        document.getElementById('btn_csv').checked = items.botoesAtivos.csv;
        document.getElementById('btn_antilag').checked = items.botoesAtivos.antilag;
    });
}

// Inicia os "ouvintes"
document.addEventListener('DOMContentLoaded', carregarOpcoes);
document.getElementById('salvar_btn').addEventListener('click', salvarOpcoes);