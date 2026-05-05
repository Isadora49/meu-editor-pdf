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
        statusText.innerText = "PDF carregado! Clique onde deseja o campo de Link da Imagem.";
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
        ctx.fillStyle = "rgba(16, 163, 74, 0.2)"; // Verde suave para indicar campo de texto
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 2;
        ctx.fillRect(clickX, clickY, boxSize, 40); // Campo mais baixo, estilo input
        ctx.strokeRect(clickX, clickY, boxSize, 40);
        
        statusText.innerText = "Campo de Link definido! Clique em baixar.";
        downloadBtn.disabled = false;
    });
});

// 5. Geração do PDF com Campo de Texto (URL)
downloadBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Criando campo de texto...";
        downloadBtn.disabled = true;

        const { PDFDocument, rgb } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPages()[0];
        const { height: pHeight } = page.getSize();

        // Conversão de coordenadas
        const finalX = Number(clickX) / pdfScale;
        const finalY = pHeight - ((Number(clickY) + 40) / pdfScale);
        const finalWidth = boxSize / pdfScale;
        const finalHeight = 40 / pdfScale;

        // CRIANDO O CAMPO DE TEXTO
        const textField = form.createTextField(`url_field_${Math.floor(Math.random() * 10000)}`);
        textField.setText('Cole o link aqui'); // Placeholder
        
        textField.addToPage(page, {
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            backgroundColor: rgb(1, 1, 1),
            borderColor: rgb(0.1, 0.6, 0.3),
            borderWidth: 1,
        });

        // Configurações para facilitar a colagem do link
        textField.setFontSize(10);

        const pdfModifiedBytes = await pdfDoc.save();
        
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_com_link.pdf";
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            statusText.innerText = "Sucesso! O campo de link funciona em qualquer navegador.";
            downloadBtn.disabled = false;
        }, 100);

    } catch (err) {
        console.error(err);
        statusText.innerText = "Erro: " + err.message;
        downloadBtn.disabled = false;
    }
});
