const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let selectedImageBytes = null;
let imageType = null; // 'jpg' ou 'png'
let clickX = 0;
let clickY = 0;
const pdfScale = 1.5; 
const boxSize = 100; 

const uploadInput = document.getElementById('uploadPdf');
const imageInput = document.getElementById('imageInput');
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('status');

// 1. Carregar PDF
uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    statusText.innerText = "Lendo PDF...";
    pdfBytes = await file.arrayBuffer();
    await renderPDF(pdfBytes);
    statusText.innerText = "Clique no PDF para escolher o local da imagem.";
});

async function renderPDF(data) {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: pdfScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
}

// 2. Ao clicar no Canvas, abrir seletor de imagem
canvas.addEventListener('click', (e) => {
    if (!pdfBytes) {
        alert("Selecione um PDF primeiro!");
        return;
    }
    const rect = canvas.getBoundingClientRect();
    clickX = Math.floor(e.clientX - rect.left);
    clickY = Math.floor(e.clientY - rect.top);
    
    // Dispara o clique no input de imagem
    imageInput.click();
});

// 3. Processar Imagem Selecionada
imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    imageType = file.type === 'image/png' ? 'png' : 'jpg';
    selectedImageBytes = await file.arrayBuffer();

    // Preview no Canvas
    await renderPDF(pdfBytes); // Limpa marcações anteriores
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(img, clickX, clickY, boxSize, boxSize);
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 3;
        ctx.strokeRect(clickX, clickY, boxSize, boxSize);
        ctx.globalAlpha = 1.0;
        statusText.innerText = "Imagem posicionada! Clique em Baixar.";
        downloadBtn.disabled = false;
        URL.revokeObjectURL(url);
    };
    img.src = url;
});

// 4. Gerar PDF com a imagem embutida (Funciona em TODOS os navegadores)
downloadBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Embutindo imagem no PDF...";
        downloadBtn.disabled = true;

        const { PDFDocument } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const page = pdfDoc.getPages()[0];
        const { height: pHeight } = page.getSize();

        // Converter coordenadas do canvas para o PDF
        const finalX = Number(clickX) / pdfScale;
        const finalY = pHeight - ((Number(clickY) + boxSize) / pdfScale);
        const finalSize = boxSize / pdfScale;

        // Embutir a imagem de acordo com o tipo
        let embeddedImage;
        if (imageType === 'png') {
            embeddedImage = await pdfDoc.embedPng(selectedImageBytes);
        } else {
            embeddedImage = await pdfDoc.embedJpg(selectedImageBytes);
        }

        // Desenhar a imagem permanentemente no PDF
        page.drawImage(embeddedImage, {
            x: finalX,
            y: finalY,
            width: finalSize,
            height: finalSize,
        });

        const pdfModifiedBytes = await pdfDoc.save();
        
        // Download
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_com_foto.pdf";
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            statusText.innerText = "Sucesso! O arquivo funciona em qualquer navegador.";
            downloadBtn.disabled = false;
        }, 100);

    } catch (err) {
        console.error(err);
        statusText.innerText = "Erro ao processar: " + err.message;
        downloadBtn.disabled = false;
    }
});
