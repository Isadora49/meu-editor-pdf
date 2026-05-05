// 1. Configuração do Worker
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

// 2. Upload e leitura
uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        statusText.innerText = "Lendo arquivo...";
        pdfBytes = await file.arrayBuffer();
        await renderPDF(pdfBytes);
        statusText.innerText = "PDF carregado! Clique no local onde deseja o campo de imagem.";
        downloadBtn.disabled = true; 
    } catch (err) {
        statusText.innerText = "Erro ao carregar PDF: " + err.message;
    }
});

// 3. Renderização Visual
async function renderPDF(data) {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: pdfScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
}

// 4. Marcação de posição
canvas.addEventListener('click', (e) => {
    if (!pdfBytes) return;

    const rect = canvas.getBoundingClientRect();
    // Math.floor garante que teremos números inteiros puros
    clickX = Math.floor(e.clientX - rect.left);
    clickY = Math.floor(e.clientY - rect.top);

    renderPDF(pdfBytes).then(() => {
        ctx.fillStyle = "rgba(37, 99, 235, 0.4)";
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.fillRect(clickX, clickY, boxSize, boxSize);
        ctx.strokeRect(clickX, clickY, boxSize, boxSize);
        
        statusText.innerText = "Posição definida! Clique em baixar.";
        downloadBtn.disabled = false;
    });
});

// 5. Geração do PDF - CORREÇÃO DEFINITIVA
downloadBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Processando...";
        downloadBtn.disabled = true;

        const { PDFDocument, rgb } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPages()[0];
        
        // Medida real da página
        const { width: pWidth, height: pHeight } = page.getSize();

        // CÁLCULO SEGURO COM VALORES PADRÃO (Caso algo falhe no clique)
        const safeX = Number(clickX) || 0;
        const safeY = Number(clickY) || 0;
        const safeScale = Number(pdfScale) || 1;
        const safeBox = Number(boxSize) || 100;

        // Conversão para coordenadas do PDF
        const finalX = safeX / safeScale;
        const finalY = pHeight - ((safeY + safeBox) / safeScale);
        const finalSize = safeBox / safeScale;

        // NOME DO CAMPO: Deve ser estritamente uma string
        const fieldName = `field_${Math.floor(Math.random() * 10000)}`;
        const buttonField = form.createButton(fieldName);

        // CONFIGURAÇÃO DO BOTÃO ANTES DE ADICIONAR À PÁGINA
        // Isso evita que o validador interno busque labels inexistentes
        buttonField.setLabel(' '); // Um espaço em branco em vez de vazio ou NaN

        buttonField.addToPage(page, {
            x: finalX,
            y: finalY,
            width: finalSize,
            height: finalSize,
            backgroundColor: rgb(0.95, 0.95, 0.95),
            borderColor: rgb(0.1, 0.4, 0.9),
            borderWidth: 1,
        });

        const pdfModifiedBytes = await pdfDoc.save();
        
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_editavel.pdf";
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            statusText.innerText = "Sucesso! Verifique seus downloads.";
            downloadBtn.disabled = false;
        }, 100);

    } catch (err) {
        console.error("Erro completo:", err);
        statusText.innerText = "Erro ao gerar: " + err.message;
        downloadBtn.disabled = false;
    }
});
_______
style.css:
:root {
    --primary: #2563eb;
    --success: #16a34a;
    --bg: #f8fafc;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--bg);
    margin: 0;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.controls {
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    margin-bottom: 30px;
    text-align: center;
    width: 100%;
    max-width: 600px;
}

.button-group {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin: 15px 0;
}

.btn {
    padding: 10px 20px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
    background: var(--primary);
    color: white;
    text-decoration: none;
    display: inline-block;
}

.btn-success { background: var(--success); }

.btn:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
}

.btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }

#status {
    font-size: 0.9rem;
    color: #4f3b75;
}

.canvas-container {
    border: 2px solid #651585;
    border-radius: 4px;
    overflow: auto;
    max-width: 100%;
    background: #525659;
    padding: 20px;
    cursor: crosshair;
}

canvas {
    background: white;
    box-shadow: 0 0 20px rgba(0,0,0,0.3);
}
