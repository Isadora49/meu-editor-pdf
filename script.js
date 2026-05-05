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

// 5. Geração do PDF com Script de Seleção de Imagem
downloadBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Injetando campo de imagem...";
        downloadBtn.disabled = true;

        const { PDFDocument, rgb } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPages()[0];
        const { height: pHeight } = page.getSize();

        const finalX = Number(clickX) / pdfScale;
        const finalY = pHeight - ((Number(clickY) + boxSize) / pdfScale);
        const finalSize = boxSize / pdfScale;

        const fieldName = `img_field_${Math.floor(Math.random() * 10000)}`;
        const buttonField = form.createButton(fieldName);

        // Adiciona o botão com um rótulo indicativo
        buttonField.addToPage('Clique para Foto', page, {
            x: finalX,
            y: finalY,
            width: finalSize,
            height: finalSize,
            backgroundColor: rgb(0.9, 0.9, 0.9),
            borderColor: rgb(0.1, 0.4, 0.9),
            borderWidth: 1,
        });

        // --- A MÁGICA PARA A IMAGEM FUNCIONAR ---
        // Este script diz ao PDF: "Quando clicado, abra o seletor de arquivos e use como ícone"
        buttonField.acroField.getWidgets().forEach((widget) => {
            widget.dict.set(
                PDFLib.PDFName.of('AA'), 
                pdfDoc.context.obj({
                    D: {
                        S: 'JavaScript',
                        JS: 'event.target.buttonImportIcon();'
                    }
                })
            );
        });

        const pdfModifiedBytes = await pdfDoc.save();
        
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_com_campo_imagem.pdf";
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            statusText.innerText = "Sucesso! Use o Adobe Reader para testar o campo.";
            downloadBtn.disabled = false;
        }, 100);

    } catch (err) {
        console.error(err);
        statusText.innerText = "Erro: " + err.message;
        downloadBtn.disabled = false;
    }
});
