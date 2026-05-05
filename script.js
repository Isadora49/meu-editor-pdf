// 1. Configuração do Worker
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let clickX = 0;
let clickY = 0;
let externalImageBytes = null; // Armazena a imagem do link
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
        statusText.innerText = "PDF carregado! Clique onde quer a imagem e aperte CTRL + I";
    } catch (err) {
        statusText.innerText = "Erro ao carregar PDF: " + err.message;
    }
});

// 3. Renderização no Canvas
async function renderPDF(data) {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: pdfScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
}

// 4. Captura de clique
canvas.addEventListener('click', (e) => {
    if (!pdfBytes) return;
    const rect = canvas.getBoundingClientRect();
    clickX = e.clientX - rect.left;
    clickY = e.clientY - rect.top;

    renderPDF(pdfBytes).then(() => {
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.strokeRect(clickX, clickY, boxSize, boxSize);
        statusText.innerText = "Local selecionado! Agora aperte CTRL + I para colar o link da imagem.";
    });
});

// 5. Lógica Estilo FIRECAST (CTRL + I)
window.addEventListener('keydown', async (e) => {
    // Verifica se apertou Ctrl + I
    if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        
        if (!pdfBytes) {
            alert("Primeiro carregue um PDF!");
            return;
        }

        const url = prompt("Cole o link (URL) da imagem aqui:");
        if (url) {
            statusText.innerText = "Baixando imagem do link...";
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Não foi possível baixar a imagem.");
                
                externalImageBytes = await response.arrayBuffer();
                
                // Mostra uma prévia no canvas
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, clickX, clickY, boxSize, boxSize);
                    statusText.innerText = "Imagem carregada! Clique em 'Baixar PDF Modificado'.";
                    downloadBtn.disabled = false;
                };
                img.src = url;
            } catch (err) {
                alert("Erro ao buscar imagem: Verifique o link ou se o site permite acesso (CORS).");
                statusText.innerText = "Erro no link da imagem.";
            }
        }
    }
});

// 6. Geração do PDF Final (Injetando a imagem nos bytes)
downloadBtn.addEventListener('click', async () => {
    try {
        statusText.innerText = "Gerando PDF final...";
        const { PDFDocument } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const page = pdfDoc.getPages()[0];
        const { height: pHeight } = page.getSize();

        // Converte coordenadas do canvas para o PDF
        const finalX = clickX / pdfScale;
        const finalY = pHeight - ((clickY + boxSize) / pdfScale);
        const finalSize = boxSize / pdfScale;

        // Se houver uma imagem carregada via link, injeta ela
        if (externalImageBytes) {
            let image;
            // Tenta carregar como JPG, se falhar tenta PNG
            try {
                image = await pdfDoc.embedJpg(externalImageBytes);
            } catch {
                image = await pdfDoc.embedPng(externalImageBytes);
            }

            page.drawImage(image, {
                x: finalX,
                y: finalY,
                width: finalSize,
                height: finalSize,
            });
        }

        const pdfModifiedBytes = await pdfDoc.save();
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_com_imagem_firecast.pdf";
        a.click();
        
        statusText.innerText = "Concluído! O PDF já contém a imagem e funciona em qualquer navegador.";

    } catch (err) {
        console.error(err);
        statusText.innerText = "Erro ao gerar PDF: " + err.message;
    }
});
