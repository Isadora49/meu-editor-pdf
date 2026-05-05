document.getElementById('generateBtn').addEventListener('click', () => {
    // O conteúdo do arquivo que o usuário vai baixar
    const docContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Documento com Campo de Imagem</title>
        <style>
            body { background: #525659; display: flex; justify-content: center; padding: 50px; font-family: sans-serif; }
            .page { background: white; width: 595px; height: 842px; position: relative; shadow: 0 0 10px rgba(0,0,0,0.5); }
            .image-field {
                position: absolute;
                top: 100px; left: 100px; /* Posição fixa ou capturada do clique */
                width: 200px; height: 200px;
                border: 2px dashed #2563eb;
                background: #f0f4ff;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; overflow: hidden;
            }
            .image-field img { width: 100%; height: 100%; object-fit: cover; }
            input[type="file"] { display: none; }
            @media print { body { background: white; padding: 0; } .image-field { border: none; } }
        </style>
    </head>
    <body>
        <div class="page">
            <label class="image-field">
                <span id="label">Clique para carregar imagem</span>
                <input type="file" accept="image/*" onchange="loadFile(event)">
                <img id="output" style="display:none;">
            </label>
        </div>

        <script>
            function loadFile(event) {
                var reader = new FileReader();
                reader.onload = function(){
                    var output = document.getElementById('output');
                    var label = document.getElementById('label');
                    output.src = reader.result;
                    output.style.display = 'block';
                    label.style.display = 'none';
                };
                reader.readAsDataURL(event.target.files[0]);
            }
        <\/script>
    </body>
    </html>
    `;

    const blob = new Blob([docContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "documento_interativo.html";
    a.click();
});
