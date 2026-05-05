// 1. Configuração do Worker (Mantendo as versões sincronizadas)
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let clickX = null;
let clickY = null;
const pdfScale = 1.5; 
const boxSize = 100; // Tamanho do campo no navegador

const uploadInput = document.getElementById('uploadPdf');
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('status');

// 2. Upload e leitura do arquivo
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

// 3. Renderização Visual no Canvas
async function renderPDF(data) {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: pdfScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
}

// 4. Captura do clique e marcador visual
canvas.addEventListener('click', (e) => {
    if (!pdfBytes) return;

    const rect = canvas.getBoundingClientRect();
    // Arredondamos para evitar dízimas que quebram o PDF
    clickX = Math.round(e.clientX - rect.left);
    clickY = Math.round(e.clientY - rect.top);

    renderPDF(pdfBytes).then(() => {
        ctx.fillStyle = "rgba(37, 99, 235, 0.4)";
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.fillRect(clickX, clickY, boxSize, boxSize);
        ctx.strokeRect(clickX, clickY, boxSize, boxSize);
        
        statusText.innerText = "Posição definida! Agora você pode baixar.";
        downloadBtn.disabled = false;
    });
});

// 5. Geração do PDF - SOLUÇÃO DO ERRO NaN
downloadBtn.addEventListener('click', async () => {
    if (!pdfBytes || clickX === null) return;

    try {
        downloadBtn.disabled = true;
        statusText.innerText = "Gerando PDF interativo...";

        const { PDFDocument, rgb } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const page = pdfDoc.getPages()[0];
        const form = pdfDoc.getForm();
        
        // Tamanho real da página no PDF (em points)
        const { width: pWidth, height: pHeight } = page.getSize();

        // CÁLCULO SEGURO E ARREDONDADO
        // sScale precisa ser o mesmo usado na renderização
        const finalSize = Math.round(boxSize / pdfScale);
        const finalX = Math.round(clickX / pdfScale);
        
        // Inversão do Eixo Y: O PDF conta de baixo para cima.
        // pHeight (total) - posição do clique - tamanho do box.
        const finalY = Math.round(pHeight - ((clickY + boxSize) / pdfScale));

        // NUNCA use nomes de campos com espaços ou caracteres especiais
        const fieldName = `img_target_${Math.floor(Math.random() * 10000)}`;
        const button = form.createButton(fieldName);

        // O SEGREDO: addToPage sem caption/label evita o cálculo de fonte que gera o NaN
        button.addToPage(page, {
            x: finalX,
            y: finalY,
            width: finalSize,
            height: finalSize,
            backgroundColor: rgb(0.95, 0.95, 0.95),
            borderColor: rgb(0.1, 0.4, 0.9),
            borderWidth: 1,
        });

        // Não usamos button.setLabel("") pois isso aciona o motor de texto do pdf-lib
        // que é o culpado pelo erro NaN em coordenadas fracionadas.

        const pdfModifiedBytes = await pdfDoc.save();
        
        // Processo de Download
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_para_imagem.pdf";
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            statusText.innerText = "Sucesso! Abra o arquivo no Adobe Reader para inserir a imagem.";
            downloadBtn.disabled = false;
        }, 500);

    } catch (err) {
        console.error("Erro completo:", err);
        statusText.innerText = "Erro ao gerar: " + err.message;
        downloadBtn.disabled = false;
    }
});
