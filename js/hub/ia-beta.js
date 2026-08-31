// ==========================================
// ARQUIVO: /js/hub/ia-beta.js
// MÓDULO: Gerenciador da Aba Abertura IA (Beta) com Firebase via REST API
// ==========================================

window.IADados = {
    cursos: new Set(),
    atividades: new Set()
};

// O banco em nuvem guarda objetos divididos por Áreas (ex: cursos.Administrativa, cursos.Tecnologia)
window.CatalogoNuvem = {
    cursos: {},
    atividades: {},
    kits: {}
};

// Guarda o objeto original da IA para repassar dados que não estão na tela
window.dadosExtraidosIA = null; 

// A URL base do seu banco de dados
const FIREBASE_URL = "https://cieeproject-br-default-rtdb.firebaseio.com";

// ==========================================
// 1. INICIALIZAÇÃO E FIREBASE (VIA FETCH/REST API)
// ==========================================
function initIABeta() {
    carregarCatalogoDaNuvem();

    // Liga o Autocomplete para ler as funções auxiliares que filtram pela Área selecionada
    setupAutocomplete('input_busca_cursos', 'dropdown_cursos', getCursosPorArea, (texto) => {
        window.IADados.cursos.add(texto);
        renderTags('container_tags_cursos', window.IADados.cursos, 'cursos');
    });

    setupAutocomplete('input_busca_atividades', 'dropdown_atividades', getAtividadesPorArea, (texto) => {
        window.IADados.atividades.add(texto);
        renderTags('container_tags_atividades', window.IADados.atividades, 'atividades');
    });

    // === LIGANDO O BOTÃO BETA NO ZENDESK (VIA APP.JS) ===
    const btnExtrairIA = document.querySelector('[data-action="extrairZendeskIA"]');
    if (btnExtrairIA) {
        btnExtrairIA.addEventListener('click', () => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    if (tabs.length === 0 || !tabs[0].url.includes("zendesk")) {
                        const textoCorpo = document.getElementById('texto_upload').value;
                        const assuntoTicket = document.getElementById('out_assunto') ? document.getElementById('out_assunto').value : "Nova Vaga";

                        if (!textoCorpo || textoCorpo.trim() === "") {
                            alert("⚠️ Abra um ticket no Zendesk OU cole o e-mail na aba '1. Abertura' primeiro!");
                            return;
                        }
                        if (typeof showToast === 'function') showToast("⏳ Processando texto manual com IA...", "info");
                        if (typeof auditarComGemini === 'function') auditarComGemini(assuntoTicket, textoCorpo, "0000", {});
                        return;
                    }

                    if (typeof showToast === 'function') showToast("🤖 IA lendo ticket do Zendesk...", "info");
                    
                    chrome.tabs.sendMessage(tabs[0].id, { acao: "extrairZendeskIA" }, function(response) {
                        if(chrome.runtime.lastError) {
                            alert("⚠️ Erro de conexão com o Zendesk. Dê um F5 no ticket.");
                        }
                    });
                });
            } else {
                alert("Erro: API do Chrome não disponível.");
            }
        });
    }

    // === LIGANDO OS CLIQUES DAS CAIXAS DE PESQUISA E BOTÕES DE ADD ===
    document.getElementById('container_tags_cursos').addEventListener('click', () => document.getElementById('input_busca_cursos').focus());
    document.getElementById('container_tags_atividades').addEventListener('click', () => document.getElementById('input_busca_atividades').focus());

    document.getElementById('btn_add_curso_banco').addEventListener('click', () => adicionarNovoItemBanco('cursos'));
    document.getElementById('btn_add_ativ_banco').addEventListener('click', () => adicionarNovoItemBanco('atividades'));

    // Ligar botões de Kits e Kairós
    document.getElementById('btn_salvar_kit').addEventListener('click', salvarKitPadrão);
    document.getElementById('btn_carregar_kit').addEventListener('click', carregarKitPadrão);
    document.getElementById('btn_enviar_kairos').addEventListener('click', salvarParaKairos);
    
    // Atualiza a busca se o usuário trocar a área no meio da operação
    document.getElementById('ia_area_profissional').addEventListener('change', () => {
        document.getElementById('input_busca_cursos').value = '';
        document.getElementById('input_busca_atividades').value = '';
    });

    // === TRAVA DE SEGURANÇA: NÍVEL MÉDIO ===
    const selectNivel = document.getElementById('ia_nivel_escolar');
    const selectArea = document.getElementById('ia_area_profissional');

    const aplicarTravaNivel = () => {
        if (selectNivel.value === "Médio") {
            selectArea.value = "Ensino Médio";
            selectArea.style.pointerEvents = "none"; 
            selectArea.style.opacity = "0.7"; 
            
            document.getElementById('input_busca_cursos').value = '';
            document.getElementById('input_busca_atividades').value = '';
        } else {
            selectArea.style.pointerEvents = "auto";
            selectArea.style.opacity = "1";
        }
    };

    selectNivel.addEventListener('change', aplicarTravaNivel);
}

// Bypassa o bloqueio do Chrome usando REST API (fetch nativo)
async function carregarCatalogoDaNuvem() {
    try {
        const response = await fetch(`${FIREBASE_URL}/catalogo_kairos.json`);
        const dados = await response.json();
        
        if (dados) {
            window.CatalogoNuvem.cursos = dados.cursos || {};
            window.CatalogoNuvem.atividades = dados.atividades || {};
            window.CatalogoNuvem.kits = dados.kits || {};

            // Renderiza o Dropdown de Kits
            const seletor = document.getElementById('ia_seletor_kits');
            if (seletor) {
                seletor.innerHTML = '<option value="">Selecione um Kit para carregar...</option>';
                Object.keys(window.CatalogoNuvem.kits).forEach(nomeKit => {
                    const opt = document.createElement('option');
                    opt.value = nomeKit;
                    opt.innerText = nomeKit;
                    seletor.appendChild(opt);
                });
            }
        }
    } catch (error) {
        console.error("Erro ao carregar o catálogo via REST API:", error);
    }
}

// Funções auxiliares para filtrar dados baseados na Área Profissional selecionada
function getCursosPorArea() {
    const area = document.getElementById('ia_area_profissional').value;
    if (window.CatalogoNuvem.cursos && window.CatalogoNuvem.cursos[area]) {
        return Object.values(window.CatalogoNuvem.cursos[area]);
    }
    return [];
}

function getAtividadesPorArea() {
    const area = document.getElementById('ia_area_profissional').value;
    if (window.CatalogoNuvem.atividades && window.CatalogoNuvem.atividades[area]) {
        return Object.values(window.CatalogoNuvem.atividades[area]);
    }
    return [];
}

// ==========================================
// 2. ADIÇÃO EM MASSA AO BANCO E KITS (REST API)
// ==========================================
window.adicionarNovoItemBanco = async function(tipo) {
    const areaAtual = document.getElementById('ia_area_profissional').value;
    
    if (!areaAtual) {
        return alert("⚠️ Selecione uma Área Profissional primeiro no campo acima!");
    }

    const textoColado = prompt(`📥 COLAGEM EM MASSA - ${tipo.toUpperCase()} (${areaAtual}):\nCole a sua lista inteira aqui. Separe cada item com uma quebra de linha (Enter).`);
    
    if (!textoColado || textoColado.trim() === "") return;

    const itens = textoColado.split('\n').map(i => i.trim()).filter(i => i !== "");
    
    if (itens.length === 0) return;

    let gravados = 0;

    // Dispara via REST API (POST simula a função .push() do Firebase criando um ID único)
    for (let item of itens) {
        try {
            await fetch(`${FIREBASE_URL}/catalogo_kairos/${tipo}/${areaAtual}.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            gravados++;
        } catch (error) {
            console.error("Erro ao gravar item:", error);
        }
    }

    alert(`✅ Sucesso! ${gravados} itens foram adicionados à área de ${areaAtual}.`);
    carregarCatalogoDaNuvem(); // Recarrega a nuvem para atualizar a memória do Hub
};

async function salvarKitPadrão() {
    if (window.IADados.cursos.size === 0 && window.IADados.atividades.size === 0) {
        return alert("⚠️ Adicione cursos ou atividades antes de salvar um Kit.");
    }

    const nomeKit = prompt("Dê um nome para este Kit Padrão (Ex: ADM Ensino Médio - Básico):");
    if (!nomeKit || nomeKit.trim() === "") return;

    const payload = {
        cursos: Array.from(window.IADados.cursos),
        atividades: Array.from(window.IADados.atividades)
    };

    try {
        // Dispara via REST API (PUT simula a função .set() do Firebase, substituindo o nó)
        await fetch(`${FIREBASE_URL}/catalogo_kairos/kits/${nomeKit.trim()}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        alert("✅ Kit salvo com sucesso na nuvem para todos os operadores!");
        carregarCatalogoDaNuvem(); // Atualiza a lista suspensa
    } catch (error) {
        alert("Erro ao salvar o Kit na nuvem.");
        console.error(error);
    }
}

function carregarKitPadrão() {
    const nomeKit = document.getElementById('ia_seletor_kits').value;
    if (!nomeKit) return alert("⚠️ Selecione um kit na lista primeiro.");

    const kit = window.CatalogoNuvem.kits[nomeKit];
    if (kit) {
        window.IADados.cursos.clear();
        window.IADados.atividades.clear();

        if (kit.cursos) kit.cursos.forEach(c => window.IADados.cursos.add(c));
        if (kit.atividades) kit.atividades.forEach(a => window.IADados.atividades.add(a));

        renderTags('container_tags_cursos', window.IADados.cursos, 'cursos');
        renderTags('container_tags_atividades', window.IADados.atividades, 'atividades');
    }
}

// ==========================================
// 3. AUTOCOMPLETE E RENDERIZAÇÃO
// ==========================================
function setupAutocomplete(inputId, dropdownId, listGetter, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    input.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        dropdown.innerHTML = '';
        if (termo.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        const lista = listGetter(); 
        const filtrados = lista.filter(item => item.toLowerCase().includes(termo)).slice(0, 50);

        if (filtrados.length === 0) {
            const areaAtual = document.getElementById('ia_area_profissional').value;
            dropdown.innerHTML = `<div class="autocomplete-item" style="color: #999;">Nenhum resultado em ${areaAtual}. Use o botão de Lote para adicionar.</div>`;
        } else {
            filtrados.forEach(item => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerText = item;
                div.onclick = () => {
                    onSelect(item);
                    input.value = '';
                    dropdown.style.display = 'none';
                };
                dropdown.appendChild(div);
            });
        }
        dropdown.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== dropdown) {
            dropdown.style.display = 'none';
        }
    });
}

function renderTags(containerId, dataSet, tipo) {
    const container = document.getElementById(containerId);
    Array.from(container.querySelectorAll('.tag-item')).forEach(el => el.remove());

    dataSet.forEach(texto => {
        const tag = document.createElement('div');
        tag.className = 'tag-item';
        tag.innerText = texto;
        
        const btnRemove = document.createElement('button');
        btnRemove.className = 'remove-tag';
        btnRemove.innerText = '✖';
        btnRemove.onclick = (e) => {
            e.stopPropagation();
            dataSet.delete(texto);
            renderTags(containerId, dataSet, tipo);
        };

        tag.appendChild(btnRemove);
        container.insertBefore(tag, container.querySelector('.tag-input'));
    });
}

// ==========================================
// 4. INTEGRAÇÃO COM A IA E KAIRÓS
// ==========================================
window.popularAbaBeta = function(dadosIA) {
    // SALVA OS DADOS ORIGINAIS DA IA NA MEMÓRIA
    window.dadosExtraidosIA = dadosIA;

    window.IADados.cursos.clear();
    window.IADados.atividades.clear();

    document.getElementById('ia_modalidade').value = dadosIA.modalidade || "Estágio";
    
    if (dadosIA.curso && dadosIA.curso.toLowerCase().includes("superior")) {
        document.getElementById('ia_nivel_escolar').value = "Superior";
    } else {
        document.getElementById('ia_nivel_escolar').value = "Médio";
    }

    document.getElementById('ia_nivel_escolar').dispatchEvent(new Event('change'));

    if (dadosIA.bolsa === "A combinar") {
        document.getElementById('ia_bolsa_tipo').value = "A combinar";
        document.getElementById('ia_bolsa_valor').value = "";
    } else {
        document.getElementById('ia_bolsa_tipo').value = "Fixo";
        document.getElementById('ia_bolsa_valor').value = dadosIA.bolsa || "";
    }

    if (dadosIA.vt && dadosIA.vt.tipo) {
        let tipoVtCapitalized = dadosIA.vt.tipo.charAt(0).toUpperCase() + dadosIA.vt.tipo.slice(1);
        document.getElementById('ia_vt_tipo').value = tipoVtCapitalized === "A_combinar" ? "A combinar" : tipoVtCapitalized;
        document.getElementById('ia_vt_valor').value = dadosIA.vt.valor || "";
    }

    document.getElementById('ia_horario_entrada').value = dadosIA.horario_entrada || "";
    document.getElementById('ia_horario_saida').value = dadosIA.horario_saida || "";
    
    if (dadosIA.semestre) {
        document.getElementById('ia_semestre_min').value = dadosIA.semestre.minimo || "";
        document.getElementById('ia_semestre_max').value = dadosIA.semestre.maximo || "";
    }

    const listaCursos = getCursosPorArea();
    const termoBusca = dadosIA.filtro_cursos ? dadosIA.filtro_cursos.pesquisa_kairos : dadosIA.curso;
    
    if (termoBusca) {
        const cursosEncontrados = listaCursos.filter(c => c.toLowerCase().includes(termoBusca.toLowerCase())).slice(0, 3);
        cursosEncontrados.forEach(c => window.IADados.cursos.add(c));
    }

    const listaAtividades = getAtividadesPorArea();
    if (dadosIA.atividades_sugeridas) {
        dadosIA.atividades_sugeridas.forEach(ativ => {
            const match = listaAtividades.find(a => a.toLowerCase().includes(ativ.toLowerCase()));
            if (match) window.IADados.atividades.add(match);
            else window.IADados.atividades.add(ativ);
        });
    }

    renderTags('container_tags_cursos', window.IADados.cursos, 'cursos');
    renderTags('container_tags_atividades', window.IADados.atividades, 'atividades');
};

function salvarParaKairos() {
    if (window.IADados.cursos.size === 0 || window.IADados.atividades.size < 3) {
        alert("⚠️ Você precisa selecionar pelo menos 1 Curso e 3 Atividades para prosseguir!");
        return;
    }

    const pacoteFinal = {
        nivel_escolar: document.getElementById('ia_nivel_escolar').value,
        area_profissional: document.getElementById('ia_area_profissional').value,
        modalidade: document.getElementById('ia_modalidade').value,
        bolsa_tipo: document.getElementById('ia_bolsa_tipo').value,
        bolsa_valor: document.getElementById('ia_bolsa_valor').value,
        vt_tipo: document.getElementById('ia_vt_tipo').value,
        vt_valor: document.getElementById('ia_vt_valor').value,
        horario_entrada: document.getElementById('ia_horario_entrada').value,
        horario_saida: document.getElementById('ia_horario_saida').value,
        semestre_min: document.getElementById('ia_semestre_min').value,
        semestre_max: document.getElementById('ia_semestre_max').value,
        cursos: Array.from(window.IADados.cursos),
        atividades: Array.from(window.IADados.atividades),
        carga_horaria: window.dadosExtraidosIA ? window.dadosExtraidosIA.carga_horaria : "",
        sexo: window.dadosExtraidosIA ? window.dadosExtraidosIA.sexo : "Ambos"
    };

    chrome.storage.local.set({ 'ciee_vaga_ia': pacoteFinal }, () => {
        if(typeof showToast === 'function') showToast("🚀 Dados validados! Abra o Kairós e ative o robô.", "success");
        else alert("🚀 Dados validados! Abra o Kairós e ative o robô.");
    });
}

document.addEventListener('DOMContentLoaded', initIABeta);