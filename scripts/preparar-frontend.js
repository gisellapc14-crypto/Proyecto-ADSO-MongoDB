const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const salida = path.join(raiz, 'public');
const directoriosPublicos = ['Images', 'style'];

fs.rmSync(salida, { recursive: true, force: true });
fs.mkdirSync(salida, { recursive: true });

for (const entrada of fs.readdirSync(raiz, { withFileTypes: true })) {
  if (entrada.isFile() && /\.(html|js)$/i.test(entrada.name)) {
    fs.copyFileSync(path.join(raiz, entrada.name), path.join(salida, entrada.name));
  }
}

for (const directorio of directoriosPublicos) {
  const origen = path.join(raiz, directorio);
  if (fs.existsSync(origen)) {
    fs.cpSync(origen, path.join(salida, directorio), { recursive: true });
  }
}

console.log('Frontend preparado en public/.');
