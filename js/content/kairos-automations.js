// =========================================================================
// ARQUIVO: /js/content/kairos-automations.js
// MÓDULO GLOBAL DE BYPASS E AUTOMAÇÕES KAIRÓS (V5.4.1 - CORREÇÕES DE MÁSCARA E HUB)
// =========================================================================

// --- 1. BYPASS DE PREENCHIMENTO ---
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
window.digitarComoHumano = async function(input, textToType, speed = 40) {
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

// --- 4. MOTORES AVANÇADOS DO KENDO UI ---
window.preencherDropdownKendo = async function(ariaLabel, valor) {
    const dropdown = document.querySelector(`kendo-dropdownlist[aria-label*="${ariaLabel}"], kendo-combobox[aria-label*="${ariaLabel}"]`);
    if (!dropdown) return false;

    // RESTAURADO: Apenas clica fisicamente sem digitar nada (Corrige Nível, Semestre e Área)
    window.cliqueFisicoRato(dropdown);

    // Polling Rápido: Checa a cada 100ms se a cortina abriu
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 100));
        const popups = Array.from(document.querySelectorAll('kendo-popup, .k-animation-container'));
        const popupVisivel = popups.find(p => p.getBoundingClientRect().height > 0);
        
        if (popupVisivel) {
            const itens = Array.from(popupVisivel.querySelectorAll('li.k-item'));
            const alvo = itens.find(el => el.innerText.trim().toLowerCase() === valor.toLowerCase());
            if (alvo) {
                window.cliqueFisicoRato(alvo);
                await new Promise(r => setTimeout(r, 300));
                return true;
            }
        }
    }
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    return false;
};

window.preencherMultiSelectKendo = async function(labelElemento, valoresArray) {
    const labels = Array.from(document.querySelectorAll('label'));
    const targetLabel = labels.find(l => l.innerText.includes(labelElemento));
    if (!targetLabel) return;

    const container = targetLabel.closest('.form-group').querySelector('kendo-multiselect');
    if (!container || !valoresArray || valoresArray.length === 0) return;

    for (let valor of valoresArray) {
        const inputBusca = container.querySelector('input.k-input, input[role="listbox"]');
        if (!inputBusca) continue;

        await window.digitarComoHumano(inputBusca, valor.substring(0, 20), 10);
        
        let clicou = false;
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 100));
            const popups = Array.from(document.querySelectorAll('kendo-popup, .k-animation-container'));
            const popupVisivel = popups.find(p => p.getBoundingClientRect().height > 0);

            if (popupVisivel) {
                const itens = Array.from(popupVisivel.querySelectorAll('li.k-item'));
                let alvo = itens.find(el => el.innerText.toLowerCase().includes(valor.toLowerCase()));
                if (!alvo && itens.length > 0) alvo = itens[0];

                if (alvo) {
                    const checkboxOrLabel = alvo.querySelector('label.k-checkbox-label') || alvo.querySelector('input[type="checkbox"]');
                    window.cliqueFisicoRato(checkboxOrLabel || alvo);
                    clicou = true;
                    await new Promise(r => setTimeout(r, 300));
                    break;
                }
            }
        }
        
        window.setReactInputValue(inputBusca, "");
        await new Promise(r => setTimeout(r, 200));
    }
    
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
};

// --- 5. FALLBACKS DE SEGURANÇA ---
window.showCieeToast = window.showCieeToast || function(msg, tipo) { console.log(`[TOAST ${tipo}]: ${msg}`); };
window.safeSendMessage = window.safeSendMessage || function(acao, dados) { console.log(`[MSG HUB]: ${acao}`, dados); return true; };


// ==========================================
// FUNÇÕES DE AUTOMAÇÃO KAIRÓS & TALENTOS
// ==========================================

async function capturarLinkTalentos() {
    window.showCieeToast("Buscando link gerado...", "info");
    let btnCopiar = document.querySelector('button[title="Copiar link e senha"]');
    
    if (!btnCopiar) {
        let btns = Array.from(document.querySelectorAll('button'));
        let btnCriar = btns.find(b => b.innerText.includes('Criar Link'));
        if (btnCriar) {
            btnCriar.click(); 
            window.showCieeToast("Gerando novo link...", "info");
            await new Promise(r => setTimeout(r, 1500));
            btnCopiar = document.querySelector('button[title="Copiar link e senha"]');
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

        // RESTAURADO: Validação pura para o Hub captar o atrelamento das vagas
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
}

async function injetarLogKairos() {
    let textoLog = "";
    try { textoLog = await navigator.clipboard.readText(); } catch (e) { console.warn("Aviso: O clipboard está bloqueado."); }

    if (!textoLog || textoLog.trim() === "") {
        textoLog = await new Promise(resolve => { chrome.storage.local.get('ciee_ultimo_log', data => resolve(data.ciee_ultimo_log || "")); });
    }

    if(!textoLog || textoLog === "undefined" || textoLog.trim() === "") return window.showCieeToast("Erro: Nada copiado!", "error");

    let textareaEncontrada = false;
    let assuntoField = document.querySelector('textarea#assunto-contato, textarea[name="assunto-contato"]');
    if (assuntoField) { window.setReactInputValue(assuntoField, textoLog); textareaEncontrada = true; } 
    else {
        const textareas = Array.from(document.querySelectorAll('textarea')).filter(txt => txt.offsetParent !== null);
        if(textareas.length > 0) { window.setReactInputValue(textareas[0], textoLog); textareaEncontrada = true; }
    }

    let d = new Date(); d.setDate(d.getDate() + 7);
    let dtBR_Puro = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
    let t = new Date(); t.setMinutes(t.getMinutes() + 5);
    let timePuro = `${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}`;

    let inputData = document.querySelector('#data-contato, [data-test="data-picker-data-contato"]');
    if (inputData) { 
        await window.digitarComoHumano(inputData, dtBR_Puro, 30); 
        inputData.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true })); 
        await new Promise(r => setTimeout(r, 200)); 
    }

    let inputHora = document.querySelector('input[title="Horário do contato"], .k-input[placeholder="hh:mm"]');
    if (inputHora) { 
        await window.digitarComoHumano(inputHora, timePuro, 50); 
        inputHora.blur(); 
        await new Promise(r => setTimeout(r, 200)); 
    }

    let selectContainer = document.querySelector('iteris-select, .ui-select-container');
    if (selectContainer) {
        let toggleBtn = selectContainer.querySelector('.ui-select-toggle');
        if (toggleBtn) {
            window.cliqueFisicoRato(toggleBtn); await new Promise(r => setTimeout(r, 500)); 
            let options = document.querySelectorAll('.ui-select-choices-row, a.dropdown-item, .ui-select-choices-row-inner');
            let opcaoLigar = Array.from(options).find(opt => opt.innerText.toLowerCase().includes('ligar'));
            if (opcaoLigar) { window.cliqueFisicoRato(opcaoLigar); } 
        }
    }

    document.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        let label = chk.nextElementSibling || chk.parentElement; let text = label ? label.innerText.toLowerCase() : "";
        if(text.includes('ligar') || text.includes('agendar') || chk.name.toLowerCase().includes('ligar')) { if(!chk.checked) window.cliqueFisicoRato(chk); }
    });

    if(textareaEncontrada) window.showCieeToast(`Log injetado (+7 Dias).`, "success"); 
    else window.showCieeToast("Abra a janela de Agendar Contato primeiro.", "warning");
}

async function clicaProximoKairos() {
    await new Promise(r => setTimeout(r, 500));
    let botoesProximo = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.toLowerCase().trim() === 'próximo' && b.getBoundingClientRect().width > 0);
    if(botoesProximo.length > 0) {
        window.cliqueFisicoRato(botoesProximo[botoesProximo.length - 1]);
        await new Promise(r => setTimeout(r, 1500)); 
    }
}

async function preencherEtapaUnificadaKairos() {
    window.showCieeToast("Iniciando Criação de Etapa...", "info");
    const tituloInput = document.querySelector('input[name*="nome"], input[id*="etapa-titulo"]');
    if (tituloInput) window.setReactInputValue(tituloInput, "UPLOAD DE CURRÍCULO");
    const tipoSelect = document.querySelector('select[name*="tipo"]');
    if (tipoSelect) window.setReactInputValue(tipoSelect, "1");
    const descTextarea = document.querySelector('textarea');
    if (descTextarea) window.setReactInputValue(descTextarea, `Olá, candidato!\n\nEncontramos uma vaga perfeita que corresponde ao seu perfil!\n\nBasta se candidatar e ler com atenção as informações sobre o processo seletivo.\n\nFique ligado nesta dica: Atualize o seu cadastro com o máximo de informações possíveis, como conhecimentos de informática, idiomas etc. Assim a empresa visualizará o seu currículo mais completo e você terá mais chances de ser aprovado.\n\nBoa sorte! :)`);

    let btnProximo1 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('próximo') && b.getBoundingClientRect().width > 0);
    if(btnProximo1) window.cliqueFisicoRato(btnProximo1); else return window.showCieeToast("Botão Próximo não encontrado na Tela 1.", "error");

    let tela2Carregada = false; let checkTela2 = 0;
    while(!tela2Carregada && checkTela2 < 100) { 
        await new Promise(r => setTimeout(r, 100));
        if(document.querySelectorAll('input[type="checkbox"]').length > 0) tela2Carregada = true;
        checkTela2++;
    }

    document.querySelectorAll('input[type="checkbox"]').forEach(chk => { if (!chk.checked) window.cliqueFisicoRato(chk); });
    await new Promise(r => setTimeout(r, 300)); 
    
    let btnProximo2 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('próximo') && b.getBoundingClientRect().width > 0);
    if(btnProximo2) window.cliqueFisicoRato(btnProximo2);

    let tela3Carregada = false; let checkTela3 = 0; let timeInputs = [];
    while(!tela3Carregada && checkTela3 < 100) {
        await new Promise(r => setTimeout(r, 100));
        timeInputs = document.querySelectorAll('input[type="time"], input[placeholder*="00:00"]');
        if(timeInputs.length >= 2) tela3Carregada = true;
        checkTela3++;
    }

    await window.digitarComoHumano(timeInputs[0], "0000", 30);
    await window.digitarComoHumano(timeInputs[1], "2359", 30);
    await new Promise(r => setTimeout(r, 800)); 

    let dateInputs = document.querySelectorAll('input[type="date"], input[placeholder*="dd/mm"], input[name*="data"]');
    if(dateInputs.length > 0) { window.cliqueFisicoRato(dateInputs[0]); await new Promise(r => setTimeout(r, 800)); }

    let calendar = document.querySelector('kendo-multiviewcalendar, .tabela-daterange');
    if (calendar) {
        let todayCell = calendar.querySelector('td.k-today span.k-link') || calendar.querySelector('td.k-today');
        if (todayCell) { window.cliqueFisicoRato(todayCell); await new Promise(r => setTimeout(r, 600)); }
        
        let dEnd = new Date(); dEnd.setMonth(dEnd.getMonth() + 1); 
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        let titleTarget = `${dEnd.getDate()} de ${meses[dEnd.getMonth()]} de ${dEnd.getFullYear()}`;
        let tdEnd = calendar.querySelector(`td[title*="${titleTarget}"]`);
        
        if (!tdEnd) {
            let btnNext = calendar.querySelector('.k-next-view, .k-i-arrow-chevron-right');
            if (btnNext) { window.cliqueFisicoRato(btnNext); await new Promise(r => setTimeout(r, 800)); tdEnd = calendar.querySelector(`td[title*="${titleTarget}"]`); }
        }

        if (tdEnd) {
            window.cliqueFisicoRato(tdEnd.querySelector('span.k-link') || tdEnd);
            window.showCieeToast("Etapa unificada criada com sucesso!", "success");
        }
    }
}

function injetarContatoVagaPadrao() {
    const nomeInput = document.getElementById('nomeContato-input');
    const deptoInput = document.getElementById('deptoContato-input');
    const emailInput = document.getElementById('emailContato-input');
    const foneInput = document.getElementById('foneContato-input');

    if (nomeInput) window.setReactInputValue(nomeInput, "CIEE Rio");
    if (deptoInput) window.setReactInputValue(deptoInput, "RH (Operacional Capital)");
    if (emailInput) window.setReactInputValue(emailInput, "nao.notificar@cieerj.org.br");
    if (foneInput) window.setReactInputValue(foneInput, "(21)0000-00000");

    window.showCieeToast("Contato padrão injetado com sucesso!", "success");
}

// =========================================================================
// MÓDULO: ROBÔ DE DOWNLOAD DE CVs (V4 - EXCLUSIVO PARA IA READY & ANEXOS)
// =========================================================================

// 1. GERADOR DE PDF NATIVO (Exceção IA)
async function gerarPdfNativoAutomatico(modalAberto, nomeCandidato) {
    if (!modalAberto || !document.contains(modalAberto)) {
        throw new Error("O modal do currículo não está mais disponível.");
    }

    if (typeof window.jspdf === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('jspdf.umd.min.js');
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        }).catch(() => console.error("Não foi possível carregar o jsPDF local."));
    }

    if (typeof window.jspdf === 'undefined') {
        throw new Error("A biblioteca jsPDF não pôde ser carregada.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let cursorY = 20;

    const checarPagina = (espacoNecessario) => {
        if (cursorY + espacoNecessario > 275) {
            doc.addPage();
            cursorY = 20;
        }
    };

    const detalhes = Array.from(modalAberto.querySelectorAll('.profile-details li')).map(el => el.innerText.trim());
    
    // Extração Inteligente (Blindada contra ausência de endereço)
    const idadeOuTempo = detalhes.find(d => d.toLowerCase().includes('anos')) || '';
    const email = detalhes.find(d => d.includes('@')) || '';
    const telefone = detalhes.find(d => /\(\d{2}\)/.test(d)) || '';
    const endereco = detalhes.find(d => d !== idadeOuTempo && d !== email && d !== telefone && (d.includes('CEP') || d.length > 20)) || '';

    // Cabeçalho do PDF
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(75, 0, 130);
    doc.text(nomeCandidato, 15, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);

    if (idadeOuTempo) { doc.text(idadeOuTempo, 15, cursorY); cursorY += 4; }
    if (endereco) { doc.text(endereco, 15, cursorY); cursorY += 4; }
    if (telefone || email) {
        doc.text(`${telefone}  |  ${email}`, 15, cursorY);
        cursorY += 8;
    }

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(15, cursorY, 195, cursorY);
    cursorY += 10;

    const desenharSecao = (titulo, linhasConteudo) => {
        if (!linhasConteudo || linhasConteudo.length === 0) return;
        checarPagina(20);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(75, 0, 130);
        doc.text(titulo.toUpperCase(), 15, cursorY);
        cursorY += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);

        linhasConteudo.forEach(linha => {
            const textoQuebrado = doc.splitTextToSize(linha, 180);
            textoQuebrado.forEach(l => {
                checarPagina(6);
                doc.text(l, 15, cursorY);
                cursorY += 5;
            });
        });
        cursorY += 6;
    };

    const sobreMimEl = modalAberto.querySelector('.section p');
    const sobreMimTexto = sobreMimEl ? sobreMimEl.innerText.trim() : '';
    if (sobreMimTexto && sobreMimTexto.length > 1) {
        desenharSecao("Sobre mim", [sobreMimTexto]);
    }

    const escolaridades = Array.from(modalAberto.querySelectorAll('.education-item')).map(item => {
        return item.innerText.replace(/\s+/g, ' ').trim();
    });
    desenharSecao("Escolaridade", escolaridades.length > 0 ? escolaridades : ["Nenhuma escolaridade informada"]);

    const extrairSecaoPorNome = (termo) => {
        const secs = Array.from(modalAberto.querySelectorAll('.section'));
        const alvo = secs.find(s => s.innerText.toUpperCase().includes(termo.toUpperCase()));
        if (!alvo) return [];
        return alvo.innerText.split('\n').map(l => l.trim()).filter(l => l && l.toUpperCase() !== termo.toUpperCase() && l !== '—');
    };

    desenharSecao("Experiência profissional", extrairSecaoPorNome('Experiência profissional'));
    desenharSecao("Idiomas", extrairSecaoPorNome('Idiomas'));
    desenharSecao("Tecnologia", extrairSecaoPorNome('Tecnologia'));
    desenharSecao("Cursos e treinamentos", extrairSecaoPorNome('Cursos e treinamentos'));
    desenharSecao("Análise comportamental", extrairSecaoPorNome('Análise comportamental'));

    const nomeArquivo = `Currículo - ${nomeCandidato}.pdf`;
    doc.save(nomeArquivo);
    console.log(`✅ [Exceção IA Ready] PDF nativo gerado e baixado com sucesso: ${nomeArquivo}`);
}

// 2. OBSERVADORES REATIVOS DE TELA
async function aguardarResultadoCurriculoReativo() {
    const TEMPO_MAXIMO = 10000;
    const JANELA_APOS_LOADING = 350;
    const inicio = Date.now();

    return await new Promise(resolve => {
        let finalizado = false;
        let observador = null;
        let timer = null;
        let intervalo = null;
        let momentoSemLoading = null;

        const finalizar = (resultado) => {
            if (finalizado) return;
            finalizado = true;
            if (observador) observador.disconnect();
            if (timer) clearTimeout(timer);
            if (intervalo) clearInterval(intervalo);
            resolve(resultado);
        };

        const verificar = () => {
            if (window.isRoboCVParado) { finalizar({ tipo: 'parado', elemento: null }); return; }
            
            const modal = document.querySelector('app-curriculum-automatico');
            if (modal && modal.getBoundingClientRect().width > 0) {
                console.log(`📄 [Exceção IA Ready] app-curriculum-automatico detectado reativamente.`);
                finalizar({ tipo: 'modal-sem-curriculo', elemento: modal });
                return;
            }
            
            const loading = document.querySelector('.k-loading-mask, .k-loading-image, .ciee-loading, [aria-busy="true"]');
            if (!loading) {
                if (momentoSemLoading === null) momentoSemLoading = Date.now();
                if (Date.now() - momentoSemLoading >= JANELA_APOS_LOADING) { finalizar({ tipo: 'download-direto', elemento: null }); return; }
            } else {
                momentoSemLoading = null;
            }
            
            if (Date.now() - inicio >= TEMPO_MAXIMO) { finalizar({ tipo: 'download-direto', elemento: null }); }
        };

        observador = new MutationObserver(verificar);
        observador.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'aria-busy'] });
        intervalo = setInterval(verificar, 100);
        timer = setTimeout(verificar, TEMPO_MAXIMO + 50);
        verificar();
    });
}

async function aguardarCurriculoCompleto(container, nomeEsperado) {
    const TEMPO_MAXIMO = 15000;
    const JANELA_ESTABILIDADE = 450;
    const INTERVALO = 100;
    const inicio = Date.now();

    let ultimaAssinatura = null;
    let momentoUltimaAlteracao = Date.now();

    const obterEstado = () => {
        if (!container || !document.contains(container)) return null;
        const texto = (container.innerText || '').replace(/\s+/g, ' ').trim();
        const nomeNoModal = container.querySelector('.profile-info h2')?.innerText?.trim() || '';
        const detalhes = container.querySelectorAll('.profile-details li').length;
        const secoes = container.querySelectorAll('.section').length;
        const escolaridades = container.querySelectorAll('.education-item').length;
        const temIndicadorCarregamento = !!container.querySelector('.k-loading-mask, .k-loading-image, .ciee-loading, [aria-busy="true"], .loading, .spinner, .skeleton, mat-progress-spinner, mat-spinner');
        const estaCarregando = temIndicadorCarregamento || texto.toLowerCase().includes('carregando');
        const nomeOk = nomeNoModal.length > 1 || (nomeEsperado && texto.toLowerCase().includes(String(nomeEsperado).toLowerCase()));
        const temConteudoCurriculo = detalhes > 0 || secoes > 0 || escolaridades > 0;

        return { texto, nomeOk, temConteudoCurriculo, estaCarregando, detalhes, secoes, escolaridades };
    };

    while (Date.now() - inicio < TEMPO_MAXIMO) {
        if (window.isRoboCVParado) return false;
        const estado = obterEstado();
        if (!estado) return false;

        const assinatura = JSON.stringify({ texto: estado.texto, detalhes: estado.detalhes, secoes: estado.secoes, escolaridades: estado.escolaridades });
        if (assinatura !== ultimaAssinatura) {
            ultimaAssinatura = assinatura;
            momentoUltimaAlteracao = Date.now();
        }

        if (estado.nomeOk && estado.temConteudoCurriculo && !estado.estaCarregando && Date.now() - momentoUltimaAlteracao >= JANELA_ESTABILIDADE) {
            console.log(`✅ [Exceção IA Ready] Currículo pronto de forma reativa.`);
            return true;
        }
        await new Promise(r => setTimeout(r, INTERVALO));
    }
    const estadoFinal = obterEstado();
    return !!(estadoFinal && estadoFinal.nomeOk && estadoFinal.temConteudoCurriculo && estadoFinal.texto.length > 50);
}

// 3. MOTOR PRINCIPAL DO ROBÔ (Navegação limpa sem fallback nativo)
window.isRoboCVParado = false;
window.pararRoboCurriculos = function() { window.isRoboCVParado = true; window.showCieeToast("🛑 Robô parado pelo operador.", "warning"); };

window.baixarCurriculosKairos = async function() {
    window.showCieeToast("🤖 Robô de CVs Ativado (IA Ready)! Pressione 'Parar' para abortar.", "info");

    window.isRoboCVParado = false; 
    let processados = 0; let analisados = 0; let ultimoNomeLido = ""; let limiteSeguranca = 50; 
    const originalConfirm = window.confirm; window.confirm = function() { return true; };
    
    while (analisados < limiteSeguranca) {
        if (window.isRoboCVParado) break;

        analisados++;
        let labelsNome = Array.from(document.querySelectorAll('.label-nome, .label-nome-sem-margin')).filter(el => el.getBoundingClientRect().width > 0);
        let nomeAtual = labelsNome.length > 0 ? labelsNome[0].innerText.trim() : `Candidato ${analisados}`;

        if (nomeAtual === ultimoNomeLido) break;
        ultimoNomeLido = nomeAtual;

        // Procura e clica no ícone de "currículo do estudante"
        let todosLinks = Array.from(document.querySelectorAll('a, span, button, p')).filter(el => el.getBoundingClientRect().width > 0);
        let btnAcessarCV = todosLinks.find(el => el.innerText && el.innerText.toLowerCase().includes('currículo do estudante'));
        if (!btnAcessarCV) {
            let icone = document.querySelector('.ciee-movie-curriculo:not(.icone-desabilitado)');
            if (icone && icone.getBoundingClientRect().width > 0) btnAcessarCV = icone.closest('a, button, span') || icone;
        }

        if (btnAcessarCV && !btnAcessarCV.classList.contains('disabled')) {
            window.cliqueFisicoRato(btnAcessarCV); 
            
            let modalAberto = null;
            let anexoBaixadoDireto = false;

            // Espera a tela reagir ao clique
            const resultadoCurriculo = await aguardarResultadoCurriculoReativo();

            if (resultadoCurriculo.tipo === 'modal-sem-curriculo') {
                modalAberto = resultadoCurriculo.elemento;
            } else if (resultadoCurriculo.tipo === 'download-direto') {
                anexoBaixadoDireto = true;
            }

            if (modalAberto && !anexoBaixadoDireto) {
                const curriculoPronto = await aguardarCurriculoCompleto(modalAberto, nomeAtual);

                if (curriculoPronto) {
                    try {
                        // Monta e baixa o PDF
                        await gerarPdfNativoAutomatico(modalAberto, nomeAtual);
                        processados++;
                    } catch (err) {
                        console.error("❌ Falha na geração do PDF:", err);
                        window.showCieeToast(`Falha ao gerar PDF de ${nomeAtual}.`, "error");
                        // O fallback de tentar achar botão nativo foi totalmente removido!
                    }
                } else {
                    console.warn("⚠️ [Exceção IA Ready] Currículo não atingiu estado seguro. PDF ignorado.");
                }

                await new Promise(r => setTimeout(r, 1000));

                // Fecha o Modal e espera sumir da tela
                let btnFechar = modalAberto.querySelector('.botao-fechar, img[src*="fechar.svg"], .k-window-action, [aria-label*="Fechar"], .close, button[title*="Fechar"], button[aria-label*="Fechar"]');
                if (btnFechar) window.cliqueFisicoRato(btnFechar.closest('button, a') || btnFechar);
                else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));

                while(document.querySelector('.k-window, .k-dialog, .modal-dialog, div[role="dialog"]')) {
                    if (window.isRoboCVParado) break;
                    await new Promise(r => setTimeout(r, 100));
                }
            } else { 
                // Se foi anexo direto (Kairós baixou sozinho), apenas conta e espera
                if (!window.isRoboCVParado) { processados++; await new Promise(r => setTimeout(r, 500)); }
            }
        } else { 
            if (!window.isRoboCVParado) await new Promise(r => setTimeout(r, 400)); 
        }

        // Clica em Próximo
        let btnProximo = null;
        let seletoresSeta = ['.ciee-arrow-button-right-full', '.botao-pagina', '.k-i-arrow-e', '.fa-chevron-right'];
        for (let sel of seletoresSeta) {
            let elementos = Array.from(document.querySelectorAll(sel)).filter(el => el.getBoundingClientRect().width > 0);
            if (elementos.length > 0) { btnProximo = elementos[elementos.length - 1].closest('button, a, span') || elementos[elementos.length - 1]; break; }
        }

        if (btnProximo) {
            let isDisabled = btnProximo.disabled || btnProximo.classList.contains('disabled') || btnProximo.classList.contains('k-state-disabled') || btnProximo.getAttribute('aria-disabled') === 'true';
            if (isDisabled) break;

            window.cliqueFisicoRato(btnProximo);
            let mudou = false; let checksMudanca = 0;
            while(!mudou && checksMudanca < 150) { 
                if (window.isRoboCVParado) break;
                await new Promise(r => setTimeout(r, 100));
                let cLabels = Array.from(document.querySelectorAll('.label-nome, .label-nome-sem-margin')).filter(el => el.getBoundingClientRect().width > 0);
                let checkNome = cLabels.length > 0 ? cLabels[0].innerText.trim() : "";
                if (checkNome !== "" && checkNome !== nomeAtual) mudou = true;
                checksMudanca++;
            }
        } else { break; }
    }
    
    window.confirm = originalConfirm;
    window.showCieeToast(`Varredura IA Ready Concluída! Baixados com Sucesso: ${processados}`, "success");
}

// =========================================================================
// MÓDULO: ROBÔ DE ABERTURA DE VAGA (Kairós - TELA A TELA V5.4.1)
// =========================================================================

window.executarRoboAberturaVaga = async function() {
    window.showCieeToast("🤖 Lendo a tela atual do Kairós...", "info");

    try {
        chrome.storage.local.get(['ciee_vaga_ia'], async function(result) {
            if (chrome.runtime.lastError) return window.showCieeToast("⚠️ Erro de conexão. Dê F5!", "error");

            const dados = result.ciee_vaga_ia;
            if (!dados) return window.showCieeToast("⚠️ Nenhum pacote de vaga no Hub!", "error");

            const isVisivel = (el) => el && el.getBoundingClientRect().height > 0;
            let preencheuAlgo = false;

            // ==========================================
            // TELA 1: NÍVEL, SEMESTRE, ÁREA E CURSOS
            // ==========================================
            const comboboxNivel = document.querySelector('kendo-combobox[aria-label="Nível escolar"]');
            if (isVisivel(comboboxNivel)) {
                
                await window.preencherDropdownKendo('Nível escolar', dados.nivel_escolar);
                
                if (dados.area_profissional) {
                    await new Promise(r => setTimeout(r, 500)); 
                    await window.preencherDropdownKendo('Área Profissional', dados.area_profissional);
                }

                if (dados.semestre_min) {
                    await new Promise(r => setTimeout(r, 500));
                    await window.preencherDropdownKendo('A partir do', dados.semestre_min + "º SEMESTRE");
                }
                if (dados.semestre_max) {
                    await new Promise(r => setTimeout(r, 500));
                    await window.preencherDropdownKendo('Até o', dados.semestre_max + "º SEMESTRE");
                }

                if (dados.cursos && dados.cursos.length > 0) {
                    const btnFiltro = document.querySelector('app-course-multi-search-select .btn-filtro-avancado');
                    if (isVisivel(btnFiltro)) {
                        window.cliqueFisicoRato(btnFiltro);
                        await new Promise(r => setTimeout(r, 600));

                        const btnLimpar = Array.from(document.querySelectorAll('.filtros-container span')).find(s => s.innerText.trim() === 'Limpar');
                        if (btnLimpar) { window.cliqueFisicoRato(btnLimpar); await new Promise(r => setTimeout(r, 400)); }

                        for (let curso of dados.cursos) {
                            const inputBusca = document.getElementById('id-filtro');
                            if (inputBusca) {
                                let cursoBuscaText = curso.replace(/^\d+\s*/, '').trim();
                                await window.digitarComoHumano(inputBusca, cursoBuscaText, 15);
                                
                                let achou = false;
                                for(let k=0; k<20; k++) {
                                    await new Promise(r => setTimeout(r, 100));
                                    const labels = Array.from(document.querySelectorAll('.filtros-container label.k-checkbox-label.linha'));
                                    const alvo = labels.find(l => l.innerText.toLowerCase().includes(cursoBuscaText.toLowerCase()));
                                    if (alvo) {
                                        if (!alvo.previousElementSibling.checked) window.cliqueFisicoRato(alvo);
                                        achou = true;
                                        break;
                                    }
                                }
                                if(!achou) window.showCieeToast(`⚠️ Curso "${cursoBuscaText}" não encontrado.`, "warning");
                            }
                        }
                        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
                        await new Promise(r => setTimeout(r, 400));
                    }
                }

                if (dados.atividades && dados.atividades.length > 0) {
                    await window.preencherMultiSelectKendo('Atividades', dados.atividades);
                }

                preencheuAlgo = true;
            }

            // ==========================================
            // TELA 2: BOLSA AUXÍLIO (MÁSCARA CORRIGIDA)
            // ==========================================
            const telaBolsa = document.querySelector('app-form-bolsa-auxilio');
            if (telaBolsa && telaBolsa.getBoundingClientRect().height > 0) {
                const labelsBolsa = Array.from(telaBolsa.querySelectorAll('label'));
                const lblMensal = labelsBolsa.find(l => l.innerText.trim().toLowerCase() === 'mensal');
                if (lblMensal) window.cliqueFisicoRato(lblMensal);
                
                if (dados.bolsa_tipo === "Fixo") {
                    const lblFixo = labelsBolsa.find(l => l.innerText.trim().toLowerCase() === 'fixo');
                    if (lblFixo) window.cliqueFisicoRato(lblFixo);
                    await new Promise(r => setTimeout(r, 600)); 

                    const inputBolsa = telaBolsa.querySelector('input[type="text"], input[type="tel"]');
                    if (inputBolsa && dados.bolsa_valor) {
                        let valorLimpo = dados.bolsa_valor.replace(/\D/g, '');
                        if (!dados.bolsa_valor.includes(',')) valorLimpo += "00";
                        
                        inputBolsa.focus();
                        // Hack da Máscara: Apaga com Backspace para não bugar o Kairós
                        for(let i=0; i<15; i++) {
                            inputBolsa.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
                        }
                        await new Promise(r => setTimeout(r, 100));
                        
                        for (let char of valorLimpo) {
                            inputBolsa.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
                            document.execCommand('insertText', false, char);
                            inputBolsa.dispatchEvent(new Event('input', { bubbles: true }));
                            await new Promise(r => setTimeout(r, 20));
                        }
                    }
                } else {
                    const lblCombinar = labelsBolsa.find(l => l.innerText.trim().toLowerCase() === 'a combinar');
                    if (lblCombinar) window.cliqueFisicoRato(lblCombinar);
                }
                preencheuAlgo = true;
            }

            // ==========================================
            // TELA 3: BENEFÍCIOS (VT)
            // ==========================================
            const containersVT = Array.from(document.querySelectorAll('app-sticky-accordion-item, div.row, fieldset'));
            const telaVT = containersVT.find(el => el.innerText && el.innerText.includes('Qual será o valor do auxílio-transporte?') && el.getBoundingClientRect().height > 0);
            
            if (telaVT) {
                const labelsVT = Array.from(telaVT.querySelectorAll('label'));
                if (dados.vt_tipo && dados.vt_tipo !== "A combinar") {
                    const tipoBusca = dados.vt_tipo.toLowerCase() === "mensal" ? "mensal" : "diário";
                    const lblTipo = labelsVT.find(l => l.innerText.trim().toLowerCase() === tipoBusca);
                    if (lblTipo) window.cliqueFisicoRato(lblTipo);
                    await new Promise(r => setTimeout(r, 300));
                    
                    const lblFixoVT = labelsVT.find(l => l.innerText.trim().toLowerCase() === 'fixo');
                    if (lblFixoVT) window.cliqueFisicoRato(lblFixoVT);
                    await new Promise(r => setTimeout(r, 600)); 
                    
                    const inputVT = telaVT.querySelector('input[type="text"], input[type="tel"]');
                    if (inputVT && dados.vt_valor) {
                        let valorLimpoVT = dados.vt_valor.replace(/\D/g, '');
                        if (!dados.vt_valor.includes(',')) valorLimpoVT += "00";
                        
                        inputVT.focus();
                        for(let i=0; i<15; i++) {
                            inputVT.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
                        }
                        await new Promise(r => setTimeout(r, 100));
                        
                        for (let char of valorLimpoVT) {
                            inputVT.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
                            document.execCommand('insertText', false, char);
                            inputVT.dispatchEvent(new Event('input', { bubbles: true }));
                            await new Promise(r => setTimeout(r, 20));
                        }
                    }
                } else {
                    const lblCombinarVT = labelsVT.find(l => l.innerText.trim().toLowerCase() === 'a combinar');
                    if (lblCombinarVT) window.cliqueFisicoRato(lblCombinarVT);
                    await new Promise(r => setTimeout(r, 600)); 

                    const inputsTextVT = Array.from(telaVT.querySelectorAll('input[type="text"]'));
                    const inputContra = inputsTextVT[inputsTextVT.length - 1]; 
                    if (inputContra) {
                        await window.digitarComoHumano(inputContra, "A combinar com a empresa", 20);
                    }
                }

                const switchBeneficios = telaVT.querySelector('kendo-switch');
                if (switchBeneficios && switchBeneficios.classList.contains('k-switch-off')) window.cliqueFisicoRato(switchBeneficios);

                preencheuAlgo = true;
            }

            // ==========================================
            // TELA 4: HORÁRIOS E JORNADA
            // ==========================================
            const telaHorario = document.querySelector('app-form-horario');
            if (telaHorario && telaHorario.getBoundingClientRect().height > 0) {
                const labelsHorario = Array.from(telaHorario.querySelectorAll('label'));
                
                if (dados.horario_entrada && dados.horario_saida) {
                    const lblDefinido = labelsHorario.find(l => l.innerText.trim().toLowerCase() === 'definido');
                    if (lblDefinido) window.cliqueFisicoRato(lblDefinido);
                    await new Promise(r => setTimeout(r, 400));
                    
                    const timeInputs = telaHorario.querySelectorAll('input.k-input, input[type="time"]');
                    if (timeInputs.length >= 2) {
                        await window.digitarComoHumano(timeInputs[0], dados.horario_entrada.replace(':', ''), 20);
                        await window.digitarComoHumano(timeInputs[1], dados.horario_saida.replace(':', ''), 20);
                    }
                } else {
                    const lblCombinarH = labelsHorario.find(l => l.innerText.trim().toLowerCase() === 'a combinar');
                    if (lblCombinarH) window.cliqueFisicoRato(lblCombinarH);
                    await new Promise(r => setTimeout(r, 600)); 

                    if (dados.carga_horaria) {
                        const labelJornada = labelsHorario.find(l => l.innerText.toLowerCase().includes('jornada'));
                        if (labelJornada) {
                            const containerJornada = labelJornada.closest('.form-group');
                            if (containerJornada) {
                                const inputJornada = containerJornada.querySelector('input.k-input, input[role="spinbutton"]');
                                if (inputJornada) await window.digitarComoHumano(inputJornada, dados.carga_horaria.replace(':', ''), 20);
                            }
                        }
                    }
                }
                preencheuAlgo = true;
            }

            // ==========================================
            // TELA 5: LOCALIZAÇÃO DO ESTUDANTE (HACK 18KM)
            // ==========================================
            const containersLoc = Array.from(document.querySelectorAll('app-sticky-accordion-item, div.row, fieldset'));
            const telaLocalizacao = containersLoc.find(el => el.innerText && el.innerText.toLowerCase().includes('onde deseja buscar o estudante') && el.getBoundingClientRect().height > 0);
            
            if (telaLocalizacao) {
                const sliderInput = telaLocalizacao.querySelector('kendo-slider input');
                if (sliderInput) {
                    sliderInput.focus();
                    let nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    if (nativeSetter) { nativeSetter.call(sliderInput, '18'); } else { sliderInput.value = '18'; }
                    sliderInput.dispatchEvent(new Event('input', { bubbles: true }));
                    sliderInput.dispatchEvent(new Event('change', { bubbles: true }));
                    sliderInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', keyCode: 39, bubbles: true }));
                    sliderInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', keyCode: 37, bubbles: true }));
                }
                preencheuAlgo = true;
            }

            // ==========================================
            // TELA 6: PERFIL (SEXO)
            // ==========================================
            const inputSexo = document.querySelector('kendo-combobox[aria-label="Sexo"] input.k-input');
            if (isVisivel(inputSexo)) {
                if (dados.sexo && dados.sexo !== "Ambos") {
                    await window.digitarComoHumano(inputSexo, dados.sexo, 20);
                    await new Promise(r => setTimeout(r, 600));
                    const popupSexo = document.querySelector('kendo-popup, .k-animation-container');
                    if (popupSexo) {
                        const itens = Array.from(popupSexo.querySelectorAll('li.k-item'));
                        const alvo = itens.find(el => el.innerText.trim().toLowerCase() === dados.sexo.toLowerCase());
                        if (alvo) window.cliqueFisicoRato(alvo);
                    }
                }
                preencheuAlgo = true;
            }

            if (preencheuAlgo) window.showCieeToast("✅ Tela preenchida!", "success");
            else window.showCieeToast("⚠️ Avance a tela para o robô continuar.", "warning");

        });
    } catch (error) {
        window.showCieeToast("⚠️ Erro Crítico. Dê F5 na página.", "error");
    }
};

// =========================================================================
// ZENDESK EXTRACTOR BLINDADO
// =========================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.acao === "extrairZendesk") {
        const text = document.querySelector('.zd-comment')?.innerText || window.getSelection().toString() || "";
        const urlMatch = window.location.href.match(/\/tickets\/(\d+)/); 
        
        let assuntoTicket = "";
        const subjectInput = document.querySelector('input[data-test-id="omni-header-subject"]') || document.querySelector('input[data-test-id="ticket-pane-subject"]') || document.querySelector('.ticket-pane-subject');
        if (subjectInput) assuntoTicket = subjectInput.value || subjectInput.innerText || "";
        else { const titleMatch = document.title.match(/^(.*?)\s*-\s*Ticket/i); if (titleMatch) assuntoTicket = titleMatch[1].trim(); }
        
        let splitAssunto = assuntoTicket.split('-');
        let empresaDigital = splitAssunto.length > 1 ? splitAssunto[splitAssunto.length - 1].replace(/\[.*?\]/g, '').trim() : "";
        let empresaText = text.match(/Empresa:\s*(.+)/i)?.[1]?.trim() || empresaDigital;

        if (empresaText.includes("Status EmpresaAtiva")) {
            empresaText = empresaText.replace(/Status EmpresaAtiva.*/i, '').trim();
        }

        sendResponse({
            ticket: urlMatch ? urlMatch[1] : "", 
            assunto: assuntoTicket, 
            ab_empresa: empresaText, 
            ab_qtd_vagas: text.match(/N[°º]? de Vagas:\s*(\d+)/i)?.[1]?.trim() || text.match(/Quantidade de vagas:\s*(\d+)/i)?.[1]?.trim() || "1", 
            ab_curso: text.match(/Curso[s]? (?:desejados|desejado|solicitados):\s*([^\n]+)/i)?.[1]?.trim() || text.match(/Curso:\s*([^\n]+)/i)?.[1]?.trim() || "", 
            ab_bolsa: text.match(/Valor bolsa aux[ií]lio:\s*R\$\s*([\d\.,]+)/i)?.[1]?.trim() || text.match(/Bolsa-Auxílio:\s*(.+)/i)?.[1]?.trim() || "", 
            ab_vt: text.match(/Valor do auxílio transporte:\s*R\$\s*([\d\.,]+)/i)?.[1]?.trim() || text.match(/Auxílio-Transporte:\s*(.+)/i)?.[1]?.trim() || "", 
            ab_email_solic: text.match(/E-mail:\s*([^\s]+)/i)?.[1]?.trim() || "", 
            horario_cru: text.match(/Horário de Estágio:\s*([^\n]+)/i)?.[1]?.trim() || ""
        });
    }

    if (request.acao === "injetarZendesk") {
        const zendeskEditor = document.querySelector('div[data-test-id="omni-composer-rich-text-editor"]') || document.querySelector('.ck-content') || document.querySelector('.zd-comment') || document.querySelector('div[contenteditable="true"]');
        if (zendeskEditor) { 
            zendeskEditor.focus(); document.execCommand('insertText', false, request.texto);
            if (!zendeskEditor.innerHTML.includes(request.texto.substring(0, 10))) { zendeskEditor.innerHTML = request.texto.replace(/\n/g, '<br>'); }
            zendeskEditor.dispatchEvent(new Event('input', { bubbles: true, composed: true })); sendResponse({sucesso: true}); 
        } else { sendResponse({sucesso: false, erro: "Caixa não encontrada."}); }
    }
});