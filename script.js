const { PDFDocument, rgb } = PDFLib; // Extrai as classes da biblioteca

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let clickX = 0;
let clickY = 0;
const pdfScale = 1.5;
const fieldSize = 100; // Tamanho do campo de imagem

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
        downloadBtn.disabled = true; // Desabilita até o usuário clicar na posição
    } catch (err) {
        statusText.innerText = "Erro ao carregar PDF: " + err.message;
    }
});

// 2. Renderização visual
async function renderPDF(data) {
    const loadingTask = pdfjsLib.getDocument({ data: data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: pdfScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    statusText.innerText = "PDF carregado. Clique onde deseja inserir o campo de imagem.";
}

// 3. Marcação de posição
canvas.addEventListener('click', (e) => {
    if (!pdfBytes) return;

    const rect = canvas.getBoundingClientRect();
    clickX = e.clientX - rect.left;
    clickY = e.clientY - rect.top;

    // Limpa e redesenha o marcador visual
    renderPDF(pdfBytes).then(() => {
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 3;
        ctx.strokeRect(clickX, clickY, fieldSize, fieldSize);
        ctx.fillStyle = "rgba(37, 99, 235, 0.2)";
        ctx.fillRect(clickX, clickY, fieldSize, fieldSize);
        
        statusText.innerText = "Posição definida! Clique em 'Baixar' para finalizar.";
        downloadBtn.disabled = false;
    });
});

// 4. Geração do PDF (Correção do Erro)
downloadBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Gerando PDF... Aguarde.";
        downloadBtn.disabled = true;

        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // Nome único para evitar conflitos se o usuário baixar várias vezes
        const fieldName = `img_field_${Date.now()}`;
        const buttonField = form.createButton(fieldName);

        // Ajuste de coordenadas (Inversão do eixo Y)
        const pdfX = clickX / pdfScale;
        const pdfY = (canvas.height - clickY - fieldSize) / pdfScale;

        buttonField.addToPage(firstPage, {
            x: pdfX,
            y: pdfY,
            width: fieldSize / pdfScale,
            height: fieldSize / pdfScale,
        });

        // Adiciona um rótulo básico ao botão para o usuário saber que é clicável
        buttonField.setLabel('Clique para Imagem');

        const pdfBytesModificado = await pdfDoc.save();

        // Download
        const blob = new Blob([pdfBytesModificado], { type: "application/pdf" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "editavel_com_campo.pdf";
        link.click();

        statusText.innerText = "Sucesso! O arquivo foi baixado.";
        downloadBtn.disabled = false;
    } catch (err) {
        console.error(err);
        statusText.innerText = "Erro ao processar PDF: " + err.message;
        downloadBtn.disabled = false;
    }
});
