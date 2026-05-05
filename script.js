// Configuração do Worker - Mantendo a sua versão funcional
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let clickX = 0;
let clickY = 0;
const pdfScale = 1.5; 
const boxSize = 100; 

const uploadInput = document.getElementById('uploadPdf');
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('status');

// 1. Upload e leitura
uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        statusText.innerText = "Lendo arquivo...";
        const buffer = await file.arrayBuffer();
        pdfBytes = buffer; // Armazena o buffer original
        await renderPDF(pdfBytes);
        statusText.innerText = "PDF carregado! Clique no local desejado para o campo.";
        downloadBtn.disabled = true;
    } catch (err) {
        statusText.innerText = "Erro ao carregar: " + err.message;
    }
});

// 2. Renderização
async function renderPDF(data) {
    const loadingTask = pdfjsLib.getDocument({ data: data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: pdfScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
}

// 3. Captura do clique
canvas.addEventListener('click', (e) => {
    if (!pdfBytes) return;

    const rect = canvas.getBoundingClientRect();
    // Forçamos o arredondamento imediato para evitar dízimas periódicas
    clickX = Math.round(e.clientX - rect.left);
    clickY = Math.round(e.clientY - rect.top);

    // Feedback visual
    renderPDF(pdfBytes).then(() => {
        ctx.fillStyle = "rgba(37, 99, 235, 0.4)";
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.fillRect(clickX, clickY, boxSize, boxSize);
        ctx.strokeRect(clickX, clickY, boxSize, boxSize);
        
        statusText.innerText = `Posição marcada (X:${clickX} Y:${clickY}). Pronto para baixar.`;
        downloadBtn.disabled = false;
    });
});

// 4. Geração do PDF - CORREÇÃO DO ERRO DE VALIDAÇÃO
downloadBtn.addEventListener('click', async () => {
    try {
        if (!pdfBytes) return;
        downloadBtn.disabled = true;
        statusText.innerText = "Processando... aguarde.";

        const { PDFDocument, rgb } = PDFLib; 
        // Carrega uma cópia limpa do buffer
        const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
        const form = pdfDoc.getForm();
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        // Pegamos o tamanho real da página do PDF
        const { width: pWidth, height: pHeight } = firstPage.getSize();

        // --- CÁLCULO DAS COORDENADAS COM VALIDAÇÃO ANTI-NaN ---
        // Garantimos que todos os valores usados na conta são números válidos
        const safeScale = Number(pdfScale) || 1.5;
        const safeBox = Number(boxSize) || 100;
        
        // No PDF, o Y=0 é o RODAPÉ da página. No navegador, o Y=0 é o TOPO.
        // A conta abaixo converte e inverte o eixo Y com segurança.
        const finalX = Number(clickX / safeScale);
        const finalY = Number(pHeight - ((clickY + safeBox) / safeScale));
        const finalW = Number(safeBox / safeScale);
        const finalH = Number(safeBox / safeScale);

        // LOG DE DEBUG (Aparecerá no console F12 caso dê erro novamente)
        console.log("Calculados:", { finalX, finalY, finalW, finalH, pHeight });

        // VERIFICAÇÃO FINAL: Se algo ainda for NaN, usamos valores padrão para não travar
        const x = isNaN(finalX) ? 50 : finalX;
        const y = isNaN(finalY) ? 50 : finalY;
        const w = isNaN(finalW) ? 100 : finalW;
        const h = isNaN(finalH) ? 100 : finalH;

        // Gerar um ID de campo único como STRING pura
        const fieldId = "field_" + Math.random().toString(36).substr(2, 9);
        const buttonField = form.createButton(fieldId);

        // APLICAÇÃO AO PDF
        buttonField.addToPage(firstPage, {
            x: x,
            y: y,
            width: w,
            height: h,
            backgroundColor: rgb(0.95, 0.95, 0.95),
            borderColor: rgb(0, 0, 0),
            borderWidth: 1
        });

        const pdfModifiedBytes = await pdfDoc.save();
        
        // Processo de Download
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_com_campo_de_imagem.pdf";
        document.body.appendChild(a);
        a.click();
        
        // Limpar memória
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 200);

        statusText.innerText = "Sucesso! Verifique seus downloads.";
        downloadBtn.disabled = false;

    } catch (err) {
        console.error("Falha detalhada:", err);
        statusText.innerText = "Erro crítico: " + err.message;
        downloadBtn.disabled = false;
    }
});
