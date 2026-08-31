// =========================================================================
// ARQUIVO: /js/content/kairos-automations.js
// MÓDULO GLOBAL DE BYPASS E AUTOMAÇÕES KAIRÓS (V5.0 - SNIPER ENGINE)
// =========================================================================

// --- 1. BYPASS DE PREENCHIMENTO (React/Angular) ---
window.setReactInputValue = function(input, value) {
    if (!input) return;
    input.focus();
    let lastValue = input.value; 
    input.value = value;
    
    let tracker = input._valueTracker; 
    if (tracker) tracker.setValue(lastValue);
    
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    input.blur();
};

// --- 2. BYPASS DE CLIQUE FÍSICO ---
window.cliqueFisicoRato = function(elemento) {
    if (!elemento) return;
    try { elemento.focus(); } catch(e) {} 
    elemento.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
    elemento.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    elemento.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    elemento.click();
};

// --- 3. BYPASS DE DIGITAÇÃO HUMANA ---
window.digitarComoHumano = async function(input, textToType, speed = 20) {
    if (!input) return;
    input.focus(); 
    input.click();
    
    let nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    if (nativeSetter) { nativeSetter.call(input, ''); } else { input.value = ''; }
    input.dispatchEvent(new Event('input', { bubbles: true }));

    for (let char of textToType) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
        document.execCommand('insertText', false, char);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
        await new Promise(r => setTimeout(r, speed));
    }
    input.dispatchEvent(new Event('change', { bubbles: true }));
};

// --- 4. MOTOR SNIPER (ESPERA INTELIGENTE ANTI-LAG) ---
window.esperarAlvo = async function(seletor, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        // Busca todos e filtra apenas os que estão visíveis na tela (width > 0)
        const elementos = Array.from(document.querySelectorAll(seletor)).filter(el => el.getBoundingClientRect().width > 0);
        // Retorna sempre o último (útil para Kendo UI que sobrepõe popups velhos)
        if (elementos.length > 0) return elementos[elementos.length - 1];
        await new Promise(r => setTimeout(r, 100)); // Aguarda 100ms e tenta de novo
    }
    return null; 
};

// --- 5. FALLBACKS DE SEGURANÇA ---
window.showCieeToast = window.showCieeToast || function(msg, tipo) { console.log(`[TOAST ${tipo}]: ${msg}`); };
window.safeSendMessage = window.safeSendMessage || function(acao, dados) { console.log(`[MSG HUB]: ${acao}`, dados); return true; };


// ==========================================
// FUNÇÕES DE AUTOMAÇÃO KAIRÓS & TALENTOS
// ==========================================

window.capturarLinkTalentos = async function() {
    window.showCieeToast("Buscando link gerado...", "info");
    let btnCopiar = document.querySelector('button[title="Copiar link e senha"]');
    
    if (!btnCopiar) {
        let btns = Array.from(document.querySelectorAll('button'));
        let btnCriar = btns.find(b => b.innerText.includes('Criar Link'));
        if (btnCriar) {
            btnCriar.click(); 
            window.showCieeToast("Gerando novo link...", "info");
            btnCopiar = await window.esperarAlvo('button[title="Copiar link e senha"]', 4000);
        }
    }

    if (!btnCopiar) return window.showCieeToast("Abra a janela 'Enviar para concedente' primeiro!", "error");

    btnCopiar.click(); 
    await new Promise(r => setTimeout(r, 500)); 
    
    try {
        let texto = await navigator.clipboard.readText();
        let linkMatch = texto.match(/🔗 Link:\s*(https?:\/\/[^\s]+)/);
        let senhaMatch = texto.match(/🔑 Senha:\s*([^\s]+)/);
        
        let codigoVaga = "Indefinida";
        let tagsTexto = Array.from(document.querySelectorAll('p'));
        let tagOportunidade = tagsTexto.find(p => p.innerText && p.innerText.includes('OPORTUNIDADE ·'));
        
        if (tagOportunidade) {
            let matchVaga = tagOportunidade.innerText.match(/\d+/);
            if (matchVaga) codigoVaga = matchVaga[0];
        }

        if (linkMatch && senhaMatch) {
            if (window.safeSendMessage("encaminharLinkHub", { link: linkMatch[1], senha: senhaMatch[1], vaga: codigoVaga })) {
                window.showCieeToast(`Link e Senha (Vaga ${codigoVaga}) atrelados ao Hub!`, "success");
            }
        } else {
            window.showCieeToast("Texto copiado não está no padrão esperado.", "error");
        }
    } catch (e) {
        window.showCieeToast("Erro ao ler a área de transferência. Clique manualmente.", "error");
    }
};

window.injetarLogKairos = async function() {
    let textoLog = "";
    try { textoLog = await navigator.clipboard.readText(); } catch (e) { console.warn("Clipboard bloqueado."); }

    if (!textoLog || textoLog.trim() === "") {
        textoLog = await new Promise(resolve => { chrome.storage.local.get('ciee_ultimo_log', data => resolve(data.ciee_ultimo_log || "")); });
    }

    if(!textoLog || textoLog === "undefined" || textoLog.trim() === "") return window.showCieeToast("Erro: Nada copiado!", "error");

    let textareaEncontrada = false;
    let assuntoField = await window.esperarAlvo('textarea#assunto-contato, textarea[name="assunto-contato"], textarea', 2000);
    
    if (assuntoField) { 
        window.setReactInputValue(assuntoField, textoLog); 
        textareaEncontrada = true; 
    }

    let d = new Date(); d.setDate(d.getDate() + 7);
    let dtBR_Puro = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
    let t = new Date(); t.setMinutes(t.getMinutes() + 5);
    let timePuro = `${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}`;

    let inputData = await window.esperarAlvo('#data-contato, [data-test="data-picker-data-contato"]', 1000);
    if (inputData) { 
        await window.digitarComoHumano(inputData, dtBR_Puro, 20); 
        inputData.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true })); 
    }

    let inputHora = await window.esperarAlvo('input[title="Horário do contato"], .k-input[placeholder="hh:mm"]', 1000);
    if (inputHora) { 
        await window.digitarComoHumano(inputHora, timePuro, 20); 
        inputHora.blur(); 
    }

    let selectContainer = await window.esperarAlvo('iteris-select, .ui-select-container', 1000);
    if (selectContainer) {
        let toggleBtn = selectContainer.querySelector('.ui-select-toggle');
        if (toggleBtn) {
            window.cliqueFisicoRato(toggleBtn); 
            await new Promise(r => setTimeout(r, 400)); 
            let opcaoLigar = await window.esperarAlvo('.ui-select-choices-row, a.dropdown-item, .ui-select-choices-row-inner', 1000);
            
            if (opcaoLigar && opcaoLigar.innerText.toLowerCase().includes('ligar')) { 
                window.cliqueFisicoRato(opcaoLigar); 
            } else { 
                document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true })); 
                document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true })); 
                await new Promise(r => setTimeout(r, 200)); 
                document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); 
            }
        }
    }

    document.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        let label = chk.nextElementSibling || chk.parentElement; let text = label ? label.innerText.toLowerCase() : "";
        if(text.includes('ligar') || text.includes('agendar') || chk.name.toLowerCase().includes('ligar')) { if(!chk.checked) window.cliqueFisicoRato(chk); }
    });

    if(textareaEncontrada) window.showCieeToast(`Log injetado e Agendado (+7 Dias). Pode gravar!`, "success"); 
    else window.showCieeToast("Abra a janela de Agendar Contato primeiro.", "warning");
};

window.preencherEtapaUnificadaKairos = async function() {
    window.showCieeToast("Iniciando Criação de Etapa...", "info");
    
    // TELA 1
    const tituloInput = await window.esperarAlvo('input[name*="nome"], input[id*="etapa-titulo"]', 2000);
    if (tituloInput) window.setReactInputValue(tituloInput, "UPLOAD DE CURRÍCULO");
    
    const tipoSelect = document.querySelector('select[name*="tipo"]');
    if (tipoSelect) window.setReactInputValue(tipoSelect, "1");
    
    const descTextarea = document.querySelector('textarea');
    if (descTextarea) window.setReactInputValue(descTextarea, `Olá, candidato!\n\nEncontramos uma vaga perfeita que corresponde ao seu perfil!\n\nBasta se candidatar e ler com atenção as informações sobre o processo seletivo.\n\nFique ligado nesta dica: Atualize o seu cadastro com o máximo de informações possíveis, como conhecimentos de informática, idiomas etc. Assim a empresa visualizará o seu currículo mais completo e você terá mais chances de ser aprovado.\n\nBoa sorte! :)`);

    let btnProximo = await window.esperarAlvo('button:not([disabled])', 1000);
    let botoes = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.toLowerCase().includes('próximo') && b.getBoundingClientRect().width > 0);
    if(botoes.length > 0) window.cliqueFisicoRato(botoes[botoes.length - 1]); 
    else return window.showCieeToast("Botão Próximo não encontrado na Tela 1.", "error");

    // TELA 2
    let chkBox = await window.esperarAlvo('input[type="checkbox"]', 3000);
    if(!chkBox) return window.showCieeToast("Tela de Arquivos não carregou a tempo.", "error");

    document.querySelectorAll('input[type="checkbox"]').forEach(chk => { if (!chk.checked) window.cliqueFisicoRato(chk); });
    await new Promise(r => setTimeout(r, 300)); 
    
    botoes = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.toLowerCase().includes('próximo') && b.getBoundingClientRect().width > 0);
    if(botoes.length > 0) window.cliqueFisicoRato(botoes[botoes.length - 1]); 
    else return window.showCieeToast("Botão Próximo não encontrado na Tela 2.", "error");

    // TELA 3
    let timeInput = await window.esperarAlvo('input[type="time"], input[placeholder*="00:00"]', 3000);
    if(!timeInput) return window.showCieeToast("Tela de Prazos não carregou a tempo.", "error");

    let timeInputs = document.querySelectorAll('input[type="time"], input[placeholder*="00:00"]');
    if(timeInputs.length >= 2) {
        await window.digitarComoHumano(timeInputs[0], "0000", 20);
        await window.digitarComoHumano(timeInputs[1], "2359", 20);
    }

    let dateInput = await window.esperarAlvo('input[type="date"], input[placeholder*="dd/mm"], input[name*="data"]', 1000);
    if(dateInput) { window.cliqueFisicoRato(dateInput); await new Promise(r => setTimeout(r, 500)); }

    let calendar = await window.esperarAlvo('kendo-multiviewcalendar, .tabela-daterange', 2000);
    if (calendar) {
        let todayCell = calendar.querySelector('td.k-today span.k-link') || calendar.querySelector('td.k-today');
        if (todayCell) { window.cliqueFisicoRato(todayCell); await new Promise(r => setTimeout(r, 500)); }
        
        let dEnd = new Date(); dEnd.setMonth(dEnd.getMonth() + 1); 
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        let titleTarget = `${dEnd.getDate()} de ${meses[dEnd.getMonth()]} de ${dEnd.getFullYear()}`;
        
        let tdEnd = calendar.querySelector(`td[title*="${titleTarget}"]`);
        if (!tdEnd) {
            let btnNext = calendar.querySelector('.k-next-view, .k-i-arrow-chevron-right');
            if (btnNext) { window.cliqueFisicoRato(btnNext); await new Promise(r => setTimeout(r, 500)); tdEnd = calendar.querySelector(`td[title*="${titleTarget}"]`); }
        }

        if (tdEnd) {
            window.cliqueFisicoRato(tdEnd.querySelector('span.k-link') || tdEnd);
            window.showCieeToast("Etapa unificada criada com sucesso! Pode Salvar.", "success");
        } else { window.showCieeToast("Data final não encontrada no calendário.", "warning"); }
    } else { window.showCieeToast("Horários preenchidos, mas calendário não abriu.", "warning"); }
};

window.injetarContatoVagaPadrao = function() {
    const nomeInput = document.getElementById('nomeContato-input');
    const deptoInput = document.getElementById('deptoContato-input');
    const emailInput = document.getElementById('emailContato-input');
    const foneInput = document.getElementById('foneContato-input');

    if (nomeInput) window.setReactInputValue(nomeInput, "CIEE Rio");
    if (deptoInput) window.setReactInputValue(deptoInput, "RH (Operacional Capital)");
    if (emailInput) window.setReactInputValue(emailInput, "nao.notificar@cieerj.org.br");
    if (foneInput) window.setReactInputValue(foneInput, "(21)0000-00000");

    window.showCieeToast("Contato padrão injetado com sucesso!", "success");
};

// =========================================================================
// MÓDULO: ROBÔ DE ABERTURA DE VAGA IA (SNIPER REFINADO)
// =========================================================================

window.executarRoboAberturaVaga = async function() {
    window.showCieeToast("🤖 Sniper Kairós (IA) acionado! Mirando nos campos...", "info");

    chrome.storage.local.get(['ciee_vaga_ia'], async function(result) {
        const dados = result.ciee_vaga_ia;
        if (!dados) return window.showCieeToast("⚠️ Munição (Dados) não encontrada no Storage!", "error");

        // 1. NÍVEL ESCOLAR (Kendo Combobox)
        if (dados.nivel_escolar) {
            const inputNivel = await window.esperarAlvo('kendo-combobox[aria-label="Nível escolar"] input.k-input', 2000);
            if (inputNivel) {
                await window.digitarComoHumano(inputNivel, dados.nivel_escolar, 20);
                await new Promise(r => setTimeout(r, 300));
                inputNivel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
            }
        }

        // 2. ÁREA PROFISSIONAL (Kendo Dropdown - Popups são injetados no final do body!)
        if (dados.area_profissional) {
            const dropdownArea = await window.esperarAlvo('kendo-dropdownlist[aria-label="Área Profissional"]', 2000);
            if (dropdownArea) {
                window.cliqueFisicoRato(dropdownArea);
                
                // O Kendo renderiza o menu fora do dropdown, na raiz do documento
                const popup = await window.esperarAlvo('kendo-popup .k-list-container, .k-animation-container kendo-popup', 3000);
                if (popup) {
                    await new Promise(r => setTimeout(r, 400)); // Aguarda animação
                    const itens = Array.from(popup.querySelectorAll('li.k-item'));
                    const alvo = itens.find(el => el.innerText.trim().toLowerCase() === dados.area_profissional.toLowerCase());
                    
                    if (alvo) {
                        window.cliqueFisicoRato(alvo);
                    } else {
                        window.showCieeToast(`Área '${dados.area_profissional}' não achada na lista.`, "warning");
                        document.body.click(); // Fecha o popup
                    }
                }
            }
        }

        // 3. BOLSA-AUXÍLIO (Injeção React)
        if (dados.bolsa_tipo) {
            if (dados.bolsa_tipo === "Fixo") {
                const radioFixo = await window.esperarAlvo('#opcao-auxilio-tipo-fixo', 1000);
                if (radioFixo) window.cliqueFisicoRato(radioFixo);

                const inputBolsa = await window.esperarAlvo('#valor-bolsa-auxilio-fixo', 1000);
                if (inputBolsa && dados.bolsa_valor) {
                    await window.digitarComoHumano(inputBolsa, dados.bolsa_valor.replace(/\D/g, ''), 20);
                }
            } else {
                const radioCombinar = await window.esperarAlvo('#opcao-auxilio-tipo-combinar', 1000);
                if (radioCombinar) window.cliqueFisicoRato(radioCombinar);
            }
        }

        // 4. HORÁRIOS (Quebra de Máscara)
        if (dados.horario_entrada && dados.horario_saida) {
            const radioDefinido = await window.esperarAlvo('#opcao-definido', 1000);
            if (radioDefinido) window.cliqueFisicoRato(radioDefinido);

            const timeInput = await window.esperarAlvo('app-form-horario input.k-input', 2000);
            if (timeInput) {
                const timeInputs = document.querySelectorAll('app-form-horario input.k-input');
                if (timeInputs.length >= 2) {
                    await window.digitarComoHumano(timeInputs[0], dados.horario_entrada.replace(':', ''), 20);
                    await window.digitarComoHumano(timeInputs[1], dados.horario_saida.replace(':', ''), 20);
                }
            }
        }

        window.showCieeToast("🎯 Headshot! Primeira tela preenchida com sucesso.", "success");
    });
};

// =========================================================================
// MÓDULO: ROBÔ DE DOWNLOAD DE CVs (COM BOTÃO DE PARADA)
// =========================================================================
window.isRoboCVParado = false;
window.pararRoboCurriculos = function() { window.isRoboCVParado = true; };

window.baixarCurriculosKairos = async function() {
    window.showCieeToast("Robô Reativo Ativado! Pressione 'Parar' para abortar.", "info");

    window.isRoboCVParado = false; 
    let processados = 0; let analisados = 0; let ultimoNomeLido = ""; let limiteSeguranca = 50; 
    const originalConfirm = window.confirm; window.confirm = function() { return true; };
    
    while (analisados < limiteSeguranca) {
        if (window.isRoboCVParado) {
            window.confirm = originalConfirm;
            return window.showCieeToast("Robô de Currículos PARADO pelo usuário!", "warning");
        }

        analisados++;
        let labelsNome = Array.from(document.querySelectorAll('.label-nome, .label-nome-sem-margin')).filter(el => el.getBoundingClientRect().width > 0);
        let nomeAtual = labelsNome.length > 0 ? labelsNome[0].innerText.trim() : `Candidato ${analisados}`;

        if (nomeAtual === ultimoNomeLido) break;
        ultimoNomeLido = nomeAtual;

        let todosLinks = Array.from(document.querySelectorAll('a, span, button, p')).filter(el => el.getBoundingClientRect().width > 0);
        let btnAcessarCV = todosLinks.find(el => el.innerText && el.innerText.toLowerCase().includes('currículo do estudante'));
        if (!btnAcessarCV) {
            let icone = document.querySelector('.ciee-movie-curriculo:not(.icone-desabilitado)');
            if (icone && icone.getBoundingClientRect().width > 0) btnAcessarCV = icone.closest('a, button, span') || icone;
        }

        if (btnAcessarCV && !btnAcessarCV.classList.contains('disabled')) {
            window.cliqueFisicoRato(btnAcessarCV); 
            
            // Sniper: Espera o Modal abrir
            let modalAberto = await window.esperarAlvo('.k-window, .k-dialog, .modal-dialog, div[role="dialog"]', 4000);
            
            if (window.isRoboCVParado) break; 

            if (modalAberto) {
                // Sniper: Espera o botão de download dentro do modal
                let btnDownloadModal = await window.esperarAlvo('.k-window button, .k-dialog button, .modal-dialog a', 3000);
                
                if (btnDownloadModal && !window.isRoboCVParado) { 
                    window.cliqueFisicoRato(btnDownloadModal); 
                    processados++; 
                    await new Promise(r => setTimeout(r, 1500)); 
                }

                let btnFechar = modalAberto.querySelector('.botao-fechar, img[src*="fechar.svg"], .k-window-action, [aria-label*="Fechar"], .close');
                if (btnFechar) window.cliqueFisicoRato(btnFechar.closest('button, a') || btnFechar);
                else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
                
                // Sniper: Espera o modal sumir
                let modalAindaAberto = true;
                let sumirStart = Date.now();
                while(modalAindaAberto && Date.now() - sumirStart < 3000) {
                    if (window.isRoboCVParado) break;
                    let m = document.querySelector('.k-window, .k-dialog, .modal-dialog, div[role="dialog"]');
                    if (!m) modalAindaAberto = false;
                    await new Promise(r => setTimeout(r, 100));
                }
            } else { 
                if (!window.isRoboCVParado) { processados++; await new Promise(r => setTimeout(r, 500)); }
            }
        } else { 
            if (!window.isRoboCVParado) await new Promise(r => setTimeout(r, 400)); 
        }

        if (window.isRoboCVParado) break;

        let btnProximo = null;
        let seletoresSeta = ['.ciee-arrow-button-right-full', '.botao-pagina', '.k-i-arrow-e', '.fa-chevron-right'];
        for (let sel of seletoresSeta) {
            let elementos = Array.from(document.querySelectorAll(sel)).filter(el => el.getBoundingClientRect().width > 0);
            if (elementos.length > 0) { btnProximo = elementos[elementos.length - 1].closest('button, a, span') || elementos[elementos.length - 1]; break; }
        }

        if (btnProximo) {
            let isDisabled = btnProximo.disabled || btnProximo.classList.contains('disabled') || btnProximo.classList.contains('k-state-disabled') || btnProximo.getAttribute('aria-disabled') === 'true' || btnProximo.style.opacity === '0.5';
            if (isDisabled) { window.showCieeToast("Fim da lista alcançado!", "info"); break; }

            window.cliqueFisicoRato(btnProximo);
            
            // Sniper: Aguarda a página mudar (o nome da Label mudar)
            let mudou = false; let checksMudanca = 0;
            while(!mudou && checksMudanca < 150) { 
                if (window.isRoboCVParado) break;
                await new Promise(r => setTimeout(r, 100));
                let cLabels = Array.from(document.querySelectorAll('.label-nome, .label-nome-sem-margin')).filter(el => el.getBoundingClientRect().width > 0);
                let checkNome = cLabels.length > 0 ? cLabels[0].innerText.trim() : "";
                if (checkNome !== "" && checkNome !== nomeAtual) mudou = true;
                checksMudanca++;
            }
            
            if (!mudou && !window.isRoboCVParado) { 
                window.confirm = originalConfirm; 
                let tentarDeNovo = confirm("⚠️ O Kairós demorou a carregar o próximo candidato.\n\nDeseja forçar o avanço?\n(Clique em Cancelar para abortar e não perder o que já baixou).");
                if(tentarDeNovo) { window.confirm = function() { return true; }; window.cliqueFisicoRato(btnProximo); await new Promise(r => setTimeout(r, 2000)); continue; } 
                else { window.showCieeToast("Operação abortada com segurança.", "warning"); break; }
            }
        } else { break; }
    }
    
    window.confirm = originalConfirm;
    
    if (!window.isRoboCVParado) {
        window.showCieeToast(`Esfriando o Kairós para estabilizar os dados...`, "warning");
        await new Promise(r => setTimeout(r, 2500)); 
        window.showCieeToast(`Varredura Segura Concluída! Baixados: ${processados}`, "success");
    }
};

// =========================================================================
// MÓDULO: EXTRAÇÃO DE CONTATOS AVANÇADOS (Kairós -> Excel)
// =========================================================================

window.isExtrairContatosRunning = false;
window.stopExtrairContatos = false;

window.extrairContatosKairos = async function(btnElement) {
    if (window.isExtrairContatosRunning) {
        window.stopExtrairContatos = true;
        if (btnElement) {
            btnElement.innerText = "⏳ Parando...";
            btnElement.style.background = "#dc3545";
        }
        window.showCieeToast("Parada solicitada! Fechando a planilha...", "warning");
        return;
    }

    window.isExtrairContatosRunning = true;
    window.stopExtrairContatos = false;
    
    let originalText = btnElement ? btnElement.innerText : "☎️ Extrair Contatos (CSV)";
    let originalColor = btnElement ? btnElement.style.background : "#e83e8c";

    if (btnElement) {
        btnElement.innerText = "🛑 PARAR Extração";
        btnElement.style.background = "#dc3545";
    }

    window.showCieeToast("Robô de Extração Ativado! Puxando dados completos...", "info");

    let analisados = 0; 
    let ultimoNomeLido = ""; 
    let limiteSeguranca = 200; 
    let dadosExtraidos = [];
    
    const originalConfirm = window.confirm; 
    window.confirm = function() { return true; };
    
    while (analisados < limiteSeguranca) {
        if (window.stopExtrairContatos) break;
        analisados++;
        
        let labelsNome = Array.from(document.querySelectorAll('.label-nome, .label-nome-sem-margin')).filter(el => el.getBoundingClientRect().width > 0);
        let nomeAtual = labelsNome.length > 0 ? labelsNome[0].innerText.trim() : `Candidato ${analisados}`;

        if (nomeAtual === ultimoNomeLido) break;
        ultimoNomeLido = nomeAtual;

        let telefone = "-"; let email = "-"; let nascimento = "-";

        let spansVisiveis = Array.from(document.querySelectorAll('span')).filter(el => el.getBoundingClientRect().width > 0);
        
        let spanTel = spansVisiveis.find(s => s.innerText && s.innerText.includes('Telefone:'));
        if (spanTel) telefone = spanTel.innerText.replace('Telefone:', '').trim();

        let spanEmail = spansVisiveis.find(s => s.innerText && s.innerText.includes('E-mail:'));
        if (spanEmail) email = spanEmail.innerText.replace('E-mail:', '').trim();

        let spanNasc = spansVisiveis.find(s => s.innerText && s.innerText.includes('Nascimento'));
        if (spanNasc) nascimento = spanNasc.innerText.replace('Nascimento', '').trim();

        let dictCadastral = {};
        let dts = Array.from(document.querySelectorAll('.info-dados-cadastrais dt'));
        let dds = Array.from(document.querySelectorAll('.info-dados-cadastrais dd'));

        dts.forEach((dt, index) => {
            let key = dt.innerText.trim().toLowerCase();
            let val = dds[index] ? dds[index].innerText.trim().replace(/\n/g, ' ') : "";
            dictCadastral[key] = val;
        });

        let curso = dictCadastral['nível de escolaridade'] || dictCadastral['curso'] || "-";
        let instituicao = dictCadastral['escola'] || dictCadastral['instituição de ensino'] || "-";
        let periodoAno = dictCadastral['cursando'] || dictCadastral['período'] || "-";
        let turno = dictCadastral['período de estudo'] || dictCadastral['turno'] || "-";
        let previsao = dictCadastral['conclusão prevista'] || "-";
        
        let enderecoBruto = dictCadastral['endereço do estudante'] || "";
        let bairro = "-"; let cidade = "-";
        
        if (enderecoBruto) {
            let endLimpo = enderecoBruto.replace(/CEP\s?\d{5}-\d{3}/i, '').trim();
            let regexHifen = /-\s*(.+?),\s*(.+?)\s*-/;
            let match = endLimpo.match(regexHifen);
            if (match) {
                bairro = match[1].trim(); cidade = match[2].trim();
            } else {
                bairro = endLimpo;
            }
        }

        dadosExtraidos.push({ 
            Nome: nomeAtual, Nascimento: nascimento, Telefone: telefone, Email: email, Cidade: cidade, Bairro: bairro,
            Curso: curso, Instituicao: instituicao, PeriodoAno: periodoAno, Turno: turno, Previsao: previsao
        });
        
        let btnProximo = null;
        let seletoresSeta = ['.ciee-arrow-button-right-full', '.botao-pagina', '.k-i-arrow-e', '.fa-chevron-right'];
        for (let sel of seletoresSeta) {
            let elementos = Array.from(document.querySelectorAll(sel)).filter(el => el.getBoundingClientRect().width > 0);
            if (elementos.length > 0) { btnProximo = elementos[elementos.length - 1].closest('button, a, span') || elementos[elementos.length - 1]; break; }
        }

        if (btnProximo) {
            let isDisabled = btnProximo.disabled || btnProximo.classList.contains('disabled') || btnProximo.classList.contains('k-state-disabled') || btnProximo.getAttribute('aria-disabled') === 'true' || btnProximo.style.opacity === '0.5';
            if (isDisabled) break; 

            window.cliqueFisicoRato(btnProximo);
            
            // Sniper: Aguarda a página mudar (o nome da Label mudar)
            let mudou = false; let checksMudanca = 0;
            while(!mudou && checksMudanca < 150) { 
                if (window.stopExtrairContatos) break;
                await new Promise(r => setTimeout(r, 100));
                let cLabels = Array.from(document.querySelectorAll('.label-nome, .label-nome-sem-margin')).filter(el => el.getBoundingClientRect().width > 0);
                let checkNome = cLabels.length > 0 ? cLabels[0].innerText.trim() : "";
                if (checkNome !== "" && checkNome !== nomeAtual) mudou = true;
                checksMudanca++;
            }
            
            if (!mudou && !window.stopExtrairContatos) { 
                window.confirm = originalConfirm; 
                let tentarDeNovo = confirm("⚠️ O Kairós demorou a carregar o próximo candidato.\nDeseja forçar o avanço?");
                if(tentarDeNovo) { window.confirm = function() { return true; }; window.cliqueFisicoRato(btnProximo); await new Promise(r => setTimeout(r, 2000)); continue; } else { break; }
            } else {
                if (!window.stopExtrairContatos) await new Promise(r => setTimeout(r, 800)); 
            }
        } else { break; }
    }
    
    window.confirm = originalConfirm;
    window.isExtrairContatosRunning = false;

    if (btnElement) { btnElement.innerText = originalText; btnElement.style.background = originalColor; }
    
    if (dadosExtraidos.length > 0) {
        window.showCieeToast(`Extração Finalizada! Gerando planilha com ${dadosExtraidos.length} candidatos...`, "success");
        window.gerarPlanilhaContatosCompleta(dadosExtraidos);
    } else {
        window.showCieeToast("Nenhum dado encontrado para extração.", "error");
    }
};

window.gerarPlanilhaContatosCompleta = function(dados) {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "NOME;DATA DE NASC;TELEFONE;EMAIL;CIDADE;BAIRRO;CURSO;INSTITUICAO DE ENSINO;PERIODO/ANO;TURNO;PREVISAO DE CONCLUSAO\n";
    
    dados.forEach(row => {
        let linhaObj = Object.values(row).map(v => `"${v.replace(/"/g, '""').replace(/\n/g, ' ')}"`);
        csvContent += linhaObj.join(";") + "\n";
    });
    
    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    let dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    link.setAttribute("download", `Candidatos_Detalhados_${dataHoje}.csv`);
    
    document.body.appendChild(link); link.click(); link.remove();
};