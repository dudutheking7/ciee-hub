// ==========================================
// ARQUIVO: /js/hub/ia-beta.js
// MÓDULO: Gerenciador da Aba Abertura IA (Beta) com Firebase e Áreas
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

// ==========================================
// 1. INICIALIZAÇÃO E FIREBASE
// ==========================================
function initIABeta() {
    carregarCatalogoDaNuvem();

    // Liga o Autocomplete passando o Set de dados para ele poder marcar/desmarcar sem fechar (Multi-Select)
    setupAutocomplete('input_busca_cursos', 'dropdown_cursos', getCursosPorArea, window.IADados.cursos, 'cursos');
    setupAutocomplete('input_busca_atividades', 'dropdown_atividades', getAtividadesPorArea, window.IADados.atividades, 'atividades');

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
            selectArea.style.pointerEvents = "none"; // Impede o clique
            selectArea.style.opacity = "0.7"; // Visual de bloqueado
            
            // Força a atualização das listas para exibir os de ensino médio
            document.getElementById('input_busca_cursos').value = '';
            document.getElementById('input_busca_atividades').value = '';
        } else {
            selectArea.style.pointerEvents = "auto";
            selectArea.style.opacity = "1";
        }
    };

    // Escuta quando o usuário muda na mão
    selectNivel.addEventListener('change', aplicarTravaNivel);
}

function carregarCatalogoDaNuvem() {
    const db = firebase.database();
    
    // Carrega tudo do Kairós de uma vez (Cursos, Atividades e Kits já organizados por área/nome)
    db.ref('catalogo_kairos').on('value', (snapshot) => {
        const dados = snapshot.val();
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
    });
}

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
// 2. ADIÇÃO EM MASSA AO BANCO E KITS
// ==========================================
window.adicionarNovoItemBanco = function(tipo) {
    const areaAtual = document.getElementById('ia_area_profissional').value;
    
    if (!areaAtual) {
        return alert("⚠️ Selecione uma Área Profissional primeiro no campo acima!");
    }

    const textoColado = prompt(`📥 COLAGEM EM MASSA - ${tipo.toUpperCase()} (${areaAtual}):\nCole a sua lista inteira aqui. Separe cada item com uma quebra de linha (Enter).`);
    
    if (!textoColado || textoColado.trim() === "") return;

    // Quebra o texto copiado por linha, tira espaços em branco nas pontas e remove linhas vazias
    const itens = textoColado.split('\n').map(i => i.trim()).filter(i => i !== "");
    
    if (itens.length === 0) return;

    const db = firebase.database();
    let gravados = 0;

    itens.forEach(item => {
        db.ref(`catalogo_kairos/${tipo}/${areaAtual}`).push().set(item);
        gravados++;
    });

    alert(`✅ Sucesso! ${gravados} itens foram adicionados à área de ${areaAtual}.`);
};

function salvarKitPadrão() {
    if (window.IADados.cursos.size === 0 && window.IADados.atividades.size === 0) {
        return alert("⚠️ Adicione cursos ou atividades antes de salvar um Kit.");
    }

    const nomeKit = prompt("Dê um nome para este Kit Padrão (Ex: ADM Ensino Médio - Básico):");
    if (!nomeKit || nomeKit.trim() === "") return;

    const db = firebase.database();
    db.ref(`catalogo_kairos/kits/${nomeKit.trim()}`).set({
        cursos: Array.from(window.IADados.cursos),
        atividades: Array.from(window.IADados.atividades)
    }).then(() => {
        alert("✅ Kit salvo com sucesso na nuvem para todos os operadores!");
    });
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
// 3. AUTOCOMPLETE E RENDERIZAÇÃO (MULTI-SELECT PROFISSIONAL)
// ==========================================
function setupAutocomplete(inputId, dropdownId, listGetter, targetSet, tipoTag) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    const renderizarLista = (termo) => {
        dropdown.innerHTML = '';
        if (termo.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        const lista = listGetter(); // Puxa apenas da área selecionada
        let filtrados = lista.filter(item => item.toLowerCase().includes(termo)).slice(0, 50);

        if (filtrados.length === 0) {
            const areaAtual = document.getElementById('ia_area_profissional').value;
            dropdown.innerHTML = `<div class="autocomplete-item" style="color: #999;">Nenhum resultado em ${areaAtual}. Use o botão de Lote para adicionar.</div>`;
        } else {
            // ORDENAÇÃO INTELIGENTE: Joga os que já estão marcados pro topo
            filtrados.sort((a, b) => {
                let aSel = targetSet.has(a) ? -1 : 1;
                let bSel = targetSet.has(b) ? -1 : 1;
                return aSel - bSel;
            });

            filtrados.forEach(item => {
                const div = document.createElement('div');
                const isSelected = targetSet.has(item);

                // Se já estiver selecionado, fica com visual diferenciado
                div.className = 'autocomplete-item';
                div.style.cursor = 'pointer';
                if (isSelected) {
                    div.style.backgroundColor = '#e9ecef';
                    div.innerHTML = `<span style="color: #004BAD; font-weight: bold;">✅ ${item}</span>`;
                } else {
                    div.innerText = item;
                }
                
                div.onclick = (e) => {
                    e.stopPropagation(); // <-- IMPEDE QUE A LISTA FECHE
                    
                    // Lógica de Toggle
                    if (isSelected) {
                        targetSet.delete(item);
                    } else {
                        targetSet.add(item);
                    }
                    
                    // Atualiza as tags e redesenha a lista na mesma hora
                    renderTags(`container_tags_${tipoTag}`, targetSet, tipoTag);
                    renderizarLista(input.value.toLowerCase());
                    input.focus(); // Mantém o cursor no input
                };
                dropdown.appendChild(div);
            });
        }
        dropdown.style.display = 'block';
    };

    // Escuta a digitação
    input.addEventListener('input', (e) => {
        renderizarLista(e.target.value.toLowerCase());
    });
    
    // Se clicar no input e já tiver algo digitado, reabre a lista
    input.addEventListener('click', (e) => {
        if (e.target.value.length >= 2) renderizarLista(e.target.value.toLowerCase());
    });

    // Fecha a lista SÓ se clicar fora dela e fora do input
    document.addEventListener('click', (e) => {
        if (e.target !== input && !dropdown.contains(e.target)) {
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
// 4. INTEGRAÇÃO COM A IA (Gemini) E KAIRÓS
// ==========================================
window.popularAbaBeta = function(dadosIA) {
    window.IADados.cursos.clear();
    window.IADados.atividades.clear();

    document.getElementById('ia_modalidade').value = dadosIA.modalidade || "Estágio";
    
    // Preenchimento do Sexo, se o campo existir no HTML
    const selectSexo = document.getElementById('ia_sexo');
    if (selectSexo && dadosIA.sexo) {
        selectSexo.value = dadosIA.sexo;
    }
    
    if (dadosIA.curso && dadosIA.curso.toLowerCase().includes("superior")) {
        document.getElementById('ia_nivel_escolar').value = "Superior";
    } else {
        document.getElementById('ia_nivel_escolar').value = "Médio";
    }

    // DISPARA A TRAVA AUTOMATICAMENTE APÓS A IA PREENCHER O NÍVEL
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
    
    // NOVA INJEÇÃO DA CARGA HORÁRIA
    const inputCarga = document.getElementById('ia_carga_horaria');
    if (inputCarga) {
        inputCarga.value = dadosIA.carga_horaria || "";
    }
    
    if (dadosIA.semestre) {
        document.getElementById('ia_semestre_min').value = dadosIA.semestre.minimo || "";
        document.getElementById('ia_semestre_max').value = dadosIA.semestre.maximo || "";
    }

    // MATCH LÓGICO USANDO A ÁREA SELECIONADA PARA CURSOS
    const listaCursos = getCursosPorArea();
    const termoBusca = dadosIA.filtro_cursos ? dadosIA.filtro_cursos.pesquisa_kairos : dadosIA.curso;
    
    if (termoBusca) {
        const cursosEncontrados = listaCursos.filter(c => c.toLowerCase().includes(termoBusca.toLowerCase())).slice(0, 3);
        cursosEncontrados.forEach(c => window.IADados.cursos.add(c));
    }

    // MATCH ANTI-ALUCINAÇÃO TURBINADO (ALGORITMO DE SIMILARIDADE)
    const listaAtividades = getAtividadesPorArea();
    if (dadosIA.atividades_sugeridas) {
        dadosIA.atividades_sugeridas.forEach(ativ => {
            const ativLimpa = ativ.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            // Separa em palavras e ignora conectivos curtos (de, da, na, no)
            const palavrasIA = ativLimpa.split(/\s+/).filter(p => p.length > 2); 

            let melhorMatch = null;
            let maiorPontuacao = -999;

            listaAtividades.forEach(itemCatalogo => {
                const itemLimpo = itemCatalogo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const palavrasCatalogo = itemLimpo.split(/\s+/).filter(p => p.length > 2);
                
                let pontos = 0;

                // 1. Ganha 3 pontos para cada palavra em comum
                palavrasIA.forEach(palavra => {
                    if (itemLimpo.includes(palavra)) pontos += 3; 
                });

                // 2. Penaliza se a opção do catálogo tiver palavras a mais que não tem nada a ver
                let diferencaTamanho = Math.abs(palavrasCatalogo.length - palavrasIA.length);
                pontos -= diferencaTamanho;

                // 3. Define o vencedor absoluto da pontuação
                if (pontos > maiorPontuacao && pontos > 0) {
                    maiorPontuacao = pontos;
                    melhorMatch = itemCatalogo;
                }
            });

            // Se o algoritmo encontrou um vencedor com pontuação positiva, adiciona à tela
            if (melhorMatch) {
                window.IADados.atividades.add(melhorMatch);
            }
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
        sexo: document.getElementById('ia_sexo') ? document.getElementById('ia_sexo').value : "Ambos",
        bolsa_tipo: document.getElementById('ia_bolsa_tipo').value,
        bolsa_valor: document.getElementById('ia_bolsa_valor').value,
        vt_tipo: document.getElementById('ia_vt_tipo').value,
        vt_valor: document.getElementById('ia_vt_valor').value,
        horario_entrada: document.getElementById('ia_horario_entrada').value,
        horario_saida: document.getElementById('ia_horario_saida').value,
        carga_horaria: document.getElementById('ia_carga_horaria') ? document.getElementById('ia_carga_horaria').value : "",
        semestre_min: document.getElementById('ia_semestre_min').value,
        semestre_max: document.getElementById('ia_semestre_max').value,
        cursos: Array.from(window.IADados.cursos),
        atividades: Array.from(window.IADados.atividades)
    };

    chrome.storage.local.set({ 'ciee_vaga_ia': pacoteFinal }, () => {
        if(typeof showToast === 'function') showToast("🚀 Dados validados! Abra o Kairós e ative o robô.", "success");
        else alert("🚀 Dados validados! Abra o Kairós e ative o robô.");
    });
}

document.addEventListener('DOMContentLoaded', initIABeta);