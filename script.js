// 1. Configuração do Worker
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let clickX = 0;
let clickY = 0;
const pdfScale = 1.5; 
const boxSize = 150; // Aumentado para facilitar a visualização

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
        statusText.innerText = "PDF carregado! Clique onde deseja o campo de imagem.";
        downloadBtn.disabled = true; 
    } catch (err) {
        statusText.innerText = "Erro: " + err.message;
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
    clickX = Math.floor(e.clientX - rect.left);
    clickY = Math.floor(e.clientY - rect.top);

    renderPDF(pdfBytes).then(() => {
        ctx.fillStyle = "rgba(37, 99, 235, 0.2)";
        ctx.strokeStyle = "#2563eb";
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(clickX, clickY, boxSize, boxSize);
        ctx.fillRect(clickX, clickY, boxSize, boxSize);
        statusText.innerText = "Posição do campo definida!";
        downloadBtn.disabled = false;
    });
});

// 5. Geração do PDF com Campo de Assinatura (Permite Imagem no Navegador)
downloadBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Gerando PDF...";
        const { PDFDocument, rgb } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPages()[0];
        const { height: pHeight } = page.getSize();

        const finalX = clickX / pdfScale;
        const finalY = pHeight - ((clickY + boxSize) / pdfScale);
        const finalSize = boxSize / pdfScale;

        // Criamos um Signature Field (Campo de Assinatura)
        // No Chrome/Edge, este campo permite carregar ficheiros de imagem!
        const signatureField = form.createSignature(`img_${Math.floor(Math.random()*1000)}`);
        
        signatureField.addToPage(page, {
            x: finalX,
            y: finalY,
            width: finalSize,
            height: finalSize,
            backgroundColor: rgb(0.98, 0.98, 0.98),
            borderColor: rgb(0.1, 0.4, 0.9),
            borderWidth: 1,
        });

        const pdfModifiedBytes = await pdfDoc.save();
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_interativo.pdf";
        a.click();
        
        statusText.innerText = "Baixado! Abra no Chrome e clique no campo azul.";
        downloadBtn.disabled = false;
    } catch (err) {
        statusText.innerText = "Erro: " + err.message;
    }
});
