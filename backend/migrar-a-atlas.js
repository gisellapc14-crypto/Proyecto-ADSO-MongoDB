/*
 * Copia controlada de la información local de RallyTraver hacia MongoDB Atlas.
 *
 * Uso (PowerShell):
 *   $env:MONGO_URI_ATLAS = '<URI de Atlas>'
 *   node migrar-a-atlas.js
 *
 * La migración nunca borra datos locales y se detiene si encuentra documentos
 * existentes en Atlas, para evitar una sobrescritura accidental.
 */
const { MongoClient } = require('mongodb');

const colecciones = ['users', 'destinos', 'contactos'];
const uriLocal = process.env.MONGO_URI_LOCAL || 'mongodb://localhost:27017';
const uriAtlas = process.env.MONGO_URI_ATLAS;
const nombreBase = 'rallytravel';

if (!uriAtlas) {
  console.error('Falta la variable MONGO_URI_ATLAS. No se realizó ninguna migración.');
  process.exit(1);
}

const opcionesIndicePermitidas = [
  'name',
  'unique',
  'sparse',
  'expireAfterSeconds',
  'partialFilterExpression',
  'collation',
  'hidden'
];

function convertirIndice(indice) {
  const opciones = {};
  for (const propiedad of opcionesIndicePermitidas) {
    if (indice[propiedad] !== undefined) opciones[propiedad] = indice[propiedad];
  }
  return { key: indice.key, ...opciones };
}

async function migrar() {
  const clienteLocal = new MongoClient(uriLocal);
  const clienteAtlas = new MongoClient(uriAtlas);

  try {
    await clienteLocal.connect();
    await clienteAtlas.connect();

    const baseLocal = clienteLocal.db(nombreBase);
    const baseAtlas = clienteAtlas.db(nombreBase);
    const coleccionesLocales = new Set(
      (await baseLocal.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name)
    );

    for (const nombreColeccion of colecciones) {
      if (!coleccionesLocales.has(nombreColeccion)) {
        throw new Error(`No existe la colección local "${nombreColeccion}".`);
      }

      const origen = baseLocal.collection(nombreColeccion);
      const destino = baseAtlas.collection(nombreColeccion);
      const documentosRemotos = await destino.countDocuments();

      if (documentosRemotos > 0) {
        throw new Error(
          `Atlas ya contiene ${documentosRemotos} documento(s) en "${nombreColeccion}". ` +
          'La migración se detuvo para no sobrescribir información.'
        );
      }

      const documentos = await origen.find({}).toArray();
      if (documentos.length > 0) {
        await destino.insertMany(documentos, { ordered: true });
      } else {
        await baseAtlas.createCollection(nombreColeccion);
      }

      const indices = await origen.indexes();
      const indicesAdicionales = indices
        .filter((indice) => indice.name !== '_id_')
        .map(convertirIndice);
      if (indicesAdicionales.length > 0) {
        await destino.createIndexes(indicesAdicionales);
      }

      const totalEnAtlas = await destino.countDocuments();
      if (totalEnAtlas !== documentos.length) {
        throw new Error(
          `Verificación fallida en "${nombreColeccion}": local ${documentos.length}, Atlas ${totalEnAtlas}.`
        );
      }

      console.log(`✓ ${nombreColeccion}: ${totalEnAtlas} documento(s) copiados y verificados.`);
    }

    console.log('Migración a Atlas terminada correctamente. La base local no fue modificada.');
  } finally {
    await Promise.allSettled([clienteLocal.close(), clienteAtlas.close()]);
  }
}

migrar().catch((error) => {
  console.error(`Error de migración: ${error.message}`);
  process.exit(1);
});
