// Configuração do Worker
const pdfjsLib = window['pdfjs-dist/build/pdf'];
// A versão aqui (2.16.105) DEVE ser igual à do HTML
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let clickX = 0;
let clickY = 0;
const pdfScale = 1.5; 

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
        statusText.innerText = "PDF carregado! Clique onde deseja o campo de imagem.";
    } catch (err) {
        statusText.innerText = "Erro ao carregar PDF: " + err.message;
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

// 3. Marcação de posição
canvas.addEventListener('click', (e) => {
    if (!pdfBytes) return;

    const rect = canvas.getBoundingClientRect();
    clickX = e.clientX - rect.left;
    clickY = e.clientY - rect.top;

    // Redesenha para limpar marcações anteriores
    renderPDF(pdfBytes).then(() => {
        ctx.fillStyle = "rgba(37, 99, 235, 0.4)";
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.fillRect(clickX, clickY, 100, 100); // Tamanho ajustado para 100px
        ctx.strokeRect(clickX, clickY, 100, 100);
        
        statusText.innerText = "Posição definida! Pronto para baixar.";
        downloadBtn.disabled = false;
    });
});

// 4. Geração do PDF (Corrigido)
downloadBtn.addEventListener('click', async () => {
    try {
        downloadBtn.disabled = true;
        statusText.innerText = "Processando... aguarde.";

        // USANDO PDFLib da forma correta
        const { PDFDocument, rgb } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPages()[0];
        const { height } = page.getSize();

        // Criar o campo de botão (Placeholder de imagem)
        const nameId = `img_field_${Math.floor(Math.random() * 1000)}`;
        const buttonField = form.createButton(nameId);

        // Ajuste de coordenadas (PDF usa origem no canto inferior esquerdo)
        const finalX = clickX / pdfScale;
        const finalY = (canvas.height - clickY - 100) / pdfScale; 
        const finalSize = 100 / pdfScale;

        buttonField.addToPage(page, {
            x: finalX,
            y: finalY,
            width: finalSize,
            height: finalSize,
            backgroundColor: rgb(0.95, 0.95, 0.95),
            borderColor: rgb(0.1, 0.4, 0.9),
            borderWidth: 1,
        });

        // Importante: Marcar como campo que pode ser clicado para upload (em leitores compatíveis)
        // Nota: O comportamento de "upload" depende do leitor de PDF do usuário final.

        const pdfModifiedBytes = await pdfDoc.save();
        
        // Gatilho de Download
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_editavel_com_imagem.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        statusText.innerText = "Sucesso! Verifique seus downloads.";
        downloadBtn.disabled = false;

    } catch (err) {
        console.error(err);
        statusText.innerText = "Erro ao gerar PDF: " + err.message;
        downloadBtn.disabled = false;
    }
});
