// Configuração do Worker - Mantendo a versão que você confirmou que funciona
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let clickX = 0;
let clickY = 0;
const pdfScale = 1.5; 
const boxSize = 100; // Tamanho visual do quadrado no navegador

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
        statusText.innerText = "PDF carregado! Clique no local onde deseja o campo de imagem.";
        downloadBtn.disabled = true; // Só habilita após o clique
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
}

// 3. Captura do clique
canvas.addEventListener('click', (e) => {
    if (!pdfBytes) return;

    const rect = canvas.getBoundingClientRect();
    // Forçamos o valor a ser Number para evitar NaN
    clickX = Number(e.clientX - rect.left);
    clickY = Number(e.clientY - rect.top);

    // Redesenha para mostrar o feedback visual
    renderPDF(pdfBytes).then(() => {
        ctx.fillStyle = "rgba(37, 99, 235, 0.4)";
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.fillRect(clickX, clickY, boxSize, boxSize);
        ctx.strokeRect(clickX, clickY, boxSize, boxSize);
        
        statusText.innerText = "Posição marcada! Agora você pode baixar.";
        downloadBtn.disabled = false;
    });
});

// 4. Geração do PDF - CORREÇÃO DO ERRO NaN
downloadBtn.addEventListener('click', async () => {
    try {
        downloadBtn.disabled = true;
        statusText.innerText = "Processando PDF...";

        const { PDFDocument, rgb } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPages()[0];
        
        // Pegamos o tamanho real da página do PDF (em pontos)
        const { width: pageW, height: pageH } = page.getSize();

        // Gerar um ID de campo único e limpo
        const nameId = `img_${Math.floor(Math.random() * 10000).toString()}`;
        const buttonField = form.createButton(nameId);

        /* CÁLCULO DAS COORDENADAS:
           1. Dividimos os pixels do clique pela escala (pdfScale) para voltar ao tamanho original.
           2. O PDF conta o Y de baixo para cima, então subtraímos do total da página.
        */
        const finalX = Number(clickX / pdfScale);
        const finalY = Number(pageH - ((clickY + boxSize) / pdfScale));
        const finalSize = Number(boxSize / pdfScale);

        // Verificação de segurança: se algum valor for NaN, interrompemos aqui com aviso
        if (isNaN(finalX) || isNaN(finalY) || isNaN(finalSize)) {
            throw new Error("Erro no cálculo das coordenadas. Tente clicar novamente.");
        }

        buttonField.addToPage(page, {
            x: finalX,
            y: finalY,
            width: finalSize,
            height: finalSize,
            backgroundColor: rgb(0.95, 0.95, 0.95),
            borderColor: rgb(0.1, 0.4, 0.9),
            borderWidth: 1,
        });

        // Opcional: define um texto de ajuda dentro do campo
        // Isso ajuda a identificar que é um campo de imagem
        // buttonField.setLabel('Clique p/ Imagem'); 

        const pdfModifiedBytes = await pdfDoc.save();
        
        // Gatilho de Download
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_editavel_com_campo.pdf";
        document.body.appendChild(a);
        a.click();
        
        // Limpeza
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        statusText.innerText = "Pronto! PDF baixado com sucesso.";
        downloadBtn.disabled = false;

    } catch (err) {
        console.error(err);
        statusText.innerText = "Erro ao gerar PDF: " + err.message;
        downloadBtn.disabled = false;
    }
});
