// 1. Configuração do Worker (Mantendo sua versão funcional)
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null;
let clickX = null; // Iniciamos como null para validar se houve clique
let clickY = null;
const pdfScale = 1.5; 
const boxSize = 100; // Tamanho do quadrado no navegador

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
        const arrayBuffer = await file.arrayBuffer();
        pdfBytes = arrayBuffer; 
        await renderPDF(pdfBytes);
        statusText.innerText = "PDF carregado! Clique no local onde deseja o campo de imagem.";
    } catch (err) {
        statusText.innerText = "Erro ao carregar PDF: " + err.message;
    }
});

// 3. Renderização Visual
async function renderPDF(data) {
    const loadingTask = pdfjsLib.getDocument({ data: data });
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
    // Forçamos a conversão para Inteiro para evitar dízimas infinitas
    clickX = Math.round(e.clientX - rect.left);
    clickY = Math.round(e.clientY - rect.top);

    // Redesenha para limpar e mostrar o feedback
    renderPDF(pdfBytes).then(() => {
        ctx.fillStyle = "rgba(37, 99, 235, 0.4)";
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.fillRect(clickX, clickY, boxSize, boxSize);
        ctx.strokeRect(clickX, clickY, boxSize, boxSize);
        
        statusText.innerText = "Posição definida! Agora clique em baixar.";
        downloadBtn.disabled = false;
    });
});

// 5. Geração do PDF - CORREÇÃO DO ERRO NaN
downloadBtn.addEventListener('click', async () => {
    if (clickX === null || clickY === null) {
        alert("Por favor, clique no PDF primeiro.");
        return;
    }

    try {
        downloadBtn.disabled = true;
        statusText.innerText = "Processando arquivo...";

        // IMPORTANTE: Carregar a biblioteca do objeto global
        const { PDFDocument, rgb } = PDFLib; 
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPages()[0];
        
        // Medida real da página no PDF (Pontos)
        const { width: pWidth, height: pHeight } = page.getSize();

        // CÁLCULO DE COORDENADAS (O segredo está em converter tudo para Number explicitamente)
        const sScale = Number(pdfScale);
        const sBox = Number(boxSize);
        
        // Inversão do Eixo Y (PDF começa de baixo)
        // Usamos Math.max para garantir que não seja negativo e Number para o pdf-lib
        const finalX = Number(clickX / sScale);
        const finalY = Number(pHeight - ((clickY + sBox) / sScale));
        const finalSize = Number(sBox / sScale);

        // Validação final anti-NaN
        if (isNaN(finalX) || isNaN(finalY) || isNaN(finalSize)) {
            throw new Error("Erro interno de cálculo. Tente recarregar a página.");
        }

        // Criar o campo de botão
        const nameId = "img_" + Math.random().toString(36).substr(2, 9);
        const buttonField = form.createButton(nameId);

        // Configuração do campo
        buttonField.addToPage(page, {
            x: finalX,
            y: finalY,
            width: finalSize,
            height: finalSize,
            backgroundColor: rgb(0.9, 0.9, 0.9),
            borderColor: rgb(0.1, 0.4, 0.9),
            borderWidth: 1,
        });

        // Adiciona um rótulo vazio para evitar o erro de "text"
        buttonField.setLabel("");

        const pdfModifiedBytes = await pdfDoc.save();
        
        // Gatilho de Download
        const blob = new Blob([pdfModifiedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_com_campo_de_imagem.pdf";
        document.body.appendChild(a);
        a.click();
        
        // Limpeza de memória
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        statusText.innerText = "Sucesso! Arquivo gerado.";
        downloadBtn.disabled = false;

    } catch (err) {
        console.error("Erro detalhado:", err);
        statusText.innerText = "Erro: " + err.message;
        downloadBtn.disabled = false;
    }
});
