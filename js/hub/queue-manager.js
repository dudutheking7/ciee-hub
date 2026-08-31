// ==========================================
// /js/hub/queue-manager.js
// ==========================================

function iniciarFila() {
    isModoFila = true;
    ticket_global = "";
    document.getElementById('display_ticket_global').innerText = "Nenhum";
    document.getElementById('fila_banner_global').classList.add('active');
    document.getElementById('tab_fila').style.display = 'inline-block';
    atualizarBannerFila();
    document.getElementById('screen_demanda').classList.remove('active');
    document.getElementById('screen_tool').classList.add('active');
    if (typeof openTab === 'function') openTab('fila');
}

function sairModoFila() {
    isModoFila = false;
    document.getElementById('screen_tool').classList.remove('active');
    document.getElementById('screen_demanda').classList.add('active');
    if (typeof limparCamposMesa === 'function') limparCamposMesa();
    showToast("Você saiu do Modo Fila.", "info");
}

function atualizarBannerFila(vaga = "", ticket = "") {
    let bannerText = document.getElementById('fila_banner_text');
    if(!bannerText) return;
    if (vaga) {
        let t = ticket ? `#${ticket}` : "(Aguardando Escanear Ticket...)";
        bannerText.innerText = `⚙️ MODO FILA: Vaga ${vaga} | Ticket ${t}`;
    } else {
        bannerText.innerText = `⚙️ MODO FILA ATIVADO - Nenhuma vaga em andamento.`;
    }
}

function carregarFila() {
    filaTrabalho = JSON.parse(localStorage.getItem('ciee_fila') || '[]');
    renderizarFila();
}

function gerarFila() {
    let input = document.getElementById('fila_input').value;
    let matches = input.match(/\d{4,8}/g);
    if(!matches) return showToast("Nenhum número válido encontrado no texto.", "warning");
    
    let adicionados = 0;
    matches.forEach(v => {
        if(!filaTrabalho.find(i => i.vaga === v)) {
            filaTrabalho.push({ vaga: v, status: 'pendente', ticket: '' });
            adicionados++;
        }
    });
    
    localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
    document.getElementById('fila_input').value = "";
    renderizarFila();
    showToast(`${adicionados} vagas adicionadas à fila!`, "success");
}

function limparFila() {
    if(confirm("Deseja realmente apagar toda a sua fila?")) {
        filaTrabalho = [];
        localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
        renderizarFila();
    }
}

function renderizarFila() {
    requestAnimationFrame(() => {
        let container = document.getElementById('fila_container');
        if(!container) return;
        
        filaTrabalho.sort((a, b) => {
            const map = { 'andamento': 1, 'pendente': 2, 'concluido': 3 };
            return map[a.status] - map[b.status];
        });

        let total = filaTrabalho.length;
        let concluidas = filaTrabalho.filter(i => i.status === 'concluido').length;
        let pendentes = filaTrabalho.filter(i => i.status === 'pendente').length;
        let pct = total === 0 ? 0 : Math.round((concluidas / total) * 100);

        let statsEl = document.getElementById('fila_stats');
        if(statsEl) {
            statsEl.innerHTML = `Progresso: ${concluidas} de ${total} (${pct}%) | Pendentes: ${pendentes} 
            <div style="width:100%; background:#ddd; height:10px; border-radius:5px; margin-top:8px; overflow:hidden;">
                <div style="width:${pct}%; background:var(--success-color); height:100%; transition:0.4s ease-out;"></div>
            </div>`;
        }
        
        if(filaTrabalho.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#999; padding:20px; background:transparent; border-radius:8px; border:1px dashed var(--border-color);">A fila está vazia. Cole os números acima para começar.</div>`;
            return;
        }
        
        let html = "";
        filaTrabalho.forEach(item => {
            if(ocultarConcluidas && item.status === 'concluido') return;

            let corStatus = item.status === 'concluido' ? '#28a745' : (item.status === 'andamento' ? '#ffc107' : '#e9ecef');
            let textStatus = item.status === 'concluido' ? '🟢 Concluído' : (item.status === 'andamento' ? '🟡 Em Andamento' : '⚪ Pendente');
            let textStyle = (item.status === 'concluido' || item.status === 'andamento') ? 'color: #fff;' : 'color: #333;';
            if(item.status === 'andamento') textStyle = 'color: #333;';
            
            let opacity = item.status === 'concluido' ? 'opacity: 0.5;' : 'opacity: 1;';
            let strTicket = item.ticket ? `<span style="font-size: 11px; color: #888; margin-left: 10px;">(Tkt: #${item.ticket})</span>` : '';

            html += `
            <div style="background: ${item.status === 'andamento' ? '#fffdf5' : 'transparent'}; border: ${item.status === 'andamento' ? '2px solid #ffc107' : '1px solid var(--border-color)'}; padding: 12px 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: 0.3s; ${opacity}">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <strong style="font-size: 16px; color: var(--primary-color);">#${item.vaga}</strong> ${strTicket}
                    <button data-action="mudarStatusFila" data-vaga="${item.vaga}" style="background: ${corStatus}; ${textStyle} border: none; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer; transition: 0.2s;">${textStatus}</button>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-mini" style="background: #dc3545;" data-action="removerVagaFila" data-vaga="${item.vaga}">X</button>
                    <button class="action-btn" style="padding: 6px 12px; font-size: 12px; width: auto;" data-action="atacarVaga" data-vaga="${item.vaga}">🚀 Atacar Vaga</button>
                </div>
            </div>
            `;
        });
        container.innerHTML = html;
    });
}

function atacarVaga(vaga) {
    setTimeout(() => {
        navigator.clipboard.writeText(vaga).then(() => { showToast(`Vaga ${vaga} copiada para a área de transferência!`, "info"); });
        filaTrabalho.forEach(i => { if(i.status === 'andamento') i.status = 'pendente'; });
        
        let item = filaTrabalho.find(i => i.vaga === vaga);
        if(item) {
            item.status = 'andamento';
            if (item.ticket) {
                ticket_global = item.ticket;
                document.getElementById('input_ticket_global').value = ticket_global;
                document.getElementById('display_ticket_global').innerText = ticket_global;
            } else {
                ticket_global = "";
                document.getElementById('input_ticket_global').value = "";
                document.getElementById('display_ticket_global').innerText = "Aguardando...";
            }
        }
        
        localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
        if (typeof limparCamposMesa === 'function') limparCamposMesa();
        
        ['ab_vaga', 'acomp_vaga', 'conv_vaga', 'reg_vaga'].forEach(id => {
            let el = document.getElementById(id);
            if(el) el.value = vaga;
        });
        atualizarBannerFila(vaga, ticket_global);
        renderizarFila();
        
        showToast(`Mesa pronta! Atacando Vaga ${vaga}.`, "success");
        if (typeof openTab === 'function') openTab('acomps'); 
        
        window.open(`https://web.ciee.org.br/admin/vagas/convocados-v2/${vaga}?acompanhamento=true&tipoVagaSelecionada=NOVA`, 'kairos_aba_operaria');
    }, 10);
}

function mudarStatusFila(vaga) {
    let item = filaTrabalho.find(i => i.vaga === vaga);
    if(!item) return;
    
    if(item.status === 'pendente') item.status = 'andamento';
    else if(item.status === 'andamento') item.status = 'concluido';
    else item.status = 'pendente';
    
    localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
    renderizarFila();
}

function removerVagaFila(vaga) {
    filaTrabalho = filaTrabalho.filter(i => i.vaga !== vaga);
    localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
    renderizarFila();
}

function encerrarDemanda() {
    setTimeout(() => {
        if (isModoFila) {
            let vagaAndamento = filaTrabalho.find(i => i.status === 'andamento');
            if (vagaAndamento && !ticket_global) {
                showToast("⚠️ Anti-Vacilo: Você esqueceu de escanear o Ticket desta vaga!", "error");
                isProcessing = false;
                return;
            }
            if (vagaAndamento) {
                vagaAndamento.status = 'concluido';
                localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
                renderizarFila();
                showToast(`Vaga ${vagaAndamento.vaga} concluída na Fila!`, "success");
            }
        }

        ticket_global = "";
        document.getElementById('input_ticket_global').value = "";
        document.getElementById('display_ticket_global').innerText = "Nenhum";
        
        if (typeof limparCamposMesa === 'function') limparCamposMesa();
        
        if (isModoFila) {
            atualizarBannerFila();
            if (typeof openTab === 'function') openTab('fila');
        } else {
            document.getElementById('screen_tool').classList.remove('active');
            document.getElementById('screen_demanda').classList.add('active');
            showToast("Demanda encerrada e mesa limpa com sucesso!", "info");
        }
        isProcessing = false;
    }, 10);
}