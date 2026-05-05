// Configurando o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null; // Guardará o arquivo original
let clickX = 0;
let clickY = 0;
let pdfScale = 1.5; // Escala de visualização
let viewport = null;

const uploadInput = document.getElementById('uploadPdf');
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('status');

// 1. Quando o usuário faz o upload do PDF
uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const arrayBuffer = await file.arrayBuffer();
        pdfBytes = arrayBuffer; // Salvamos os dados brutos para editar depois
        renderPDF(arrayBuffer);
    }
});

// 2. Renderizar o PDF na tela usando PDF.js
async function renderPDF(data) {
    const loadingTask = pdfjsLib.getDocument({ data: data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1); // Pegando apenas a página 1 para este MVP

    viewport = page.getViewport({ scale: pdfScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };
    await page.render(renderContext).promise;
    statusText.innerText = "PDF carregado! Clique em um local do PDF para posicionar o campo.";
}

// 3. Capturar o clique do usuário no Canvas
canvas.addEventListener('click', (e) => {
    if (!pdfBytes) return;

    // Pegando a posição X e Y baseada no canvas
    const rect = canvas.getBoundingClientRect();
    clickX = e.clientX - rect.left;
    clickY = e.clientY - rect.top;

    // Redesenhar o PDF para limpar cliques anteriores e desenhar um "quadrado" indicativo
    renderPDF(pdfBytes).then(() => {
        ctx.fillStyle = "rgba(0, 150, 255, 0.5)"; // Azul transparente
        ctx.fillRect(clickX, clickY, 150, 150); // Simula um campo de 150x150
        statusText.innerText = "Posição marcada! Agora você pode baixar o PDF.";
        downloadBtn.disabled = false;
    });
});

// 4. Injetar o campo usando pdf-lib e fazer o download
downloadBtn.addEventListener('click', async () => {
    if (!pdfBytes) return;

    statusText.innerText = "Gerando PDF...";

    // Carrega o documento original no pdf-lib
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Cria um campo de botão (que servirá de placeholder para imagem em leitores avançados)
    const buttonField = form.createButton('imagem_placeholder');

    // A matemática chata: o canvas conta o Y de cima para baixo. O PDF conta de baixo para cima!
    // Precisamos reverter a escala e inverter o eixo Y.
    const pdfX = clickX / pdfScale;
    const pdfY = (canvas.height - clickY - 150) / pdfScale; // 150 é a altura do quadrado

    buttonField.addToPage(firstPage, {
        x: pdfX,
        y: pdfY,
        width: 150 / pdfScale,
        height: 150 / pdfScale,
        color: PDFLib.rgb(0.9, 0.9, 0.9) // Fundo cinza claro para destacar
    });

    // Gera o novo arquivo PDF
    const pdfBytesModificado = await pdfDoc.save();

    // Cria um link invisível para forçar o download
    const blob = new Blob([pdfBytesModificado], { type: "application/pdf" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "pdf_com_campo.pdf";
    link.click();

    statusText.innerText = "Download concluído!";
});
