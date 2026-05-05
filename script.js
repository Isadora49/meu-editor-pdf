// Manter a versão que você confirmou que funciona para evitar o erro de Worker
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let clickX = 0;
let clickY = 0;
const pdfScale = 1.5; 
const boxSize = 100; // Tamanho do quadrado no navegador

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
        pdfBytes = await file.arrayBuffer();
        await renderPDF(pdfBytes);
        statusText.innerText = "PDF carregado! Clique no local desejado.";
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

// 3. Captura do clique (com limpeza de valores)
canvas.addEventListener('click', (e) => {
    if (!pdfBytes) return;

    const rect = canvas.getBoundingClientRect();
    // Usamos Math.round para garantir que não existam números quebrados infinitos
    clickX = Math.round(e.clientX - rect.left);
    clickY = Math.round(e.clientY - rect.top);

    renderPDF(pdfBytes).then(() => {
        ctx.fillStyle = "rgba(37, 99, 235, 0.4)";
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.fillRect(clickX, clickY, boxSize, boxSize);
        ctx.strokeRect(clickX, clickY, boxSize, boxSize);
        
        statusText.innerText = "Posição marcada! Pronto para baixar.";
        downloadBtn.disabled = false;
    });
});

// 4. Geração do PDF - CORREÇÃO TOTAL DO NaN
downloadBtn.addEventListener('click', async () => {
    try {
        downloadBtn.disabled = true;
        statusText.innerText = "Processando...";

        const { PDFDocument, rgb } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        // Pegamos as dimensões reais da página PDF
        const { width: pdfPageWidth, height: pdfPageHeight } = firstPage.getSize();

        // Garantir que os inputs do cálculo sejam números válidos
        const sX = Number(clickX);
        const sY = Number(clickY);
        const sScale = Number(pdfScale);
        const sBox = Number(boxSize);

        // CÁLCULO SEGURO:
        // Convertemos a posição do clique (pixel) para a unidade do PDF (point)
        // O PDF usa o eixo Y começando de baixo (0) para cima.
        const finalX = sX / sScale;
        const finalY = pdfPageHeight - ((sY + sBox) / sScale);
        const finalSize = sBox / sScale;

        // Validação CRÍTICA antes de aplicar ao PDF
        if (isNaN(finalX) || isNaN(finalY) || isNaN(finalSize)) {
            throw new Error("Valores de posição inválidos (NaN). Tente clicar novamente.");
        }

        // Criar nome do campo estritamente como String
        const fieldId = "img_field_" + String(Math.floor(Math.random() * 10000));
        const buttonField = form.createButton(fieldId);

        buttonField.addToPage(firstPage, {
            x: finalX,
            y: finalY,
            width: finalSize,
            height: finalSize,
            backgroundColor: rgb(0.9, 0.9, 0.9),
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
        });

        const pdfModifiedBytes = await pdfDoc.save();
        
        // Download
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_editavel.pdf";
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        statusText.innerText = "Download concluído!";
        downloadBtn.disabled = false;

    } catch (err) {
        console.error(err);
        statusText.innerText = "Erro: " + err.message;
        downloadBtn.disabled = false;
    }
});
