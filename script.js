// 1. Configuração do Worker
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let clickX = 0; clickY = 0;
const pdfScale = 1.5; const boxSize = 100;

const uploadInput = document.getElementById('uploadPdf');
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('status');

uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        statusText.innerText = "Lendo arquivo...";
        pdfBytes = await file.arrayBuffer();
        await renderPDF(pdfBytes);
        statusText.innerText = "PDF carregado! Clique na posição do anexo.";
        downloadBtn.disabled = true;
    } catch (err) { statusText.innerText = "Erro: " + err.message; }
});

async function renderPDF(data) {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: pdfScale });
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
}

canvas.addEventListener('click', (e) => {
    if (!pdfBytes) return;
    const rect = canvas.getBoundingClientRect();
    clickX = Math.floor(e.clientX - rect.left);
    clickY = Math.floor(e.clientY - rect.top);
    renderPDF(pdfBytes).then(() => {
        ctx.fillStyle = "rgba(16, 163, 74, 0.4)"; // Verde para Anexo
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 2;
        ctx.fillRect(clickX, clickY, boxSize, boxSize);
        ctx.strokeRect(clickX, clickY, boxSize, boxSize);
        statusText.innerText = "Posição do Anexo definida!";
        downloadBtn.disabled = false;
    });
});

downloadBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Gerando campo de anexo...";
        const { PDFDocument, rgb, PDFName } = PDFLib;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const page = pdfDoc.getPages()[0];
        const { height: pHeight } = page.getSize();

        const finalX = clickX / pdfScale;
        const finalY = pHeight - ((clickY + boxSize) / pdfScale);
        const finalSize = boxSize / pdfScale;

        // Criando uma anotação de "File Attachment" (Ícone de Clipe)
        const attachmentAnnotation = pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'FileAttachment',
            Rect: [finalX, finalY, finalX + finalSize, finalY + finalSize],
            Contents: pdfDoc.context.obj('Clique aqui para gerenciar anexos (Adobe Reader necessário)'),
            Name: 'Paperclip', // Ícone de clipe
            C: [0.1, 0.4, 0.9], // Cor azul
        });

        const annots = page.node.get(PDFName.of('Annots')) || pdfDoc.context.obj([]);
        annots.push(attachmentAnnotation);
        page.node.set(PDFName.of('Annots'), annots);

        const pdfModifiedBytes = await pdfDoc.save();
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_com_anexo.pdf";
        a.click();
        
        statusText.innerText = "Sucesso! Lembre-se: Navegadores têm suporte limitado a anexos.";
        downloadBtn.disabled = false;
    } catch (err) {
        statusText.innerText = "Erro: " + err.message;
    }
});
