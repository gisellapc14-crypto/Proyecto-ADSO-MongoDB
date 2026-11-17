# RallyTraver con MongoDB

## Inicio rápido

1. Abre esta carpeta en Visual Studio Code.
2. En una terminal, entra a `backend`.
3. Ejecuta `npm install` una sola vez.
4. Ejecuta `node seed.js` para crear o actualizar los tres usuarios de prueba y el catálogo.
5. Ejecuta `node server.js` para iniciar la API en `http://localhost:8080`.
6. Comprueba `http://localhost:8080/api/salud`: debe responder con `estado: ok`.
7. Abre `registrese.html` con Live Server y registra una cuenta.

La conexión se configura en `backend/.env` y usa la base de datos `rallytravel`. Para el proyecto compartido se utiliza MongoDB Atlas.

## Preparación para despliegue

- El backend se publica como servicio Node.js en Render desde la carpeta `backend`.
- El frontend se prepara con `node scripts/preparar-frontend.js`; el resultado queda en `public/` y contiene solo archivos estáticos, estilos e imágenes.
- En producción, los scripts consumen la API pública de Render; en `localhost` continúan usando `http://localhost:8080`.
- Las variables `MONGO_URI`, `JWT_SECRET`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` y `BREVO_SENDER_NAME` se registran como secretos en Render. No deben incluirse en GitHub.

## Cuentas de prueba y roles

- **Ana Torres** — `ana.torres@rallytravel.test` — administradora.
- **Carlos Rojas** — `carlos.rojas@rallytravel.test` — cliente.
- **Laura Gomez** — `laura.gomez@rallytravel.test` — cliente.

La contraseña para los tres es `Viaje2026`.

La cuenta administradora puede consultar todas las reservas, actualizar su estado y exportarlas a Excel desde `admin.html`. Las cuentas cliente pueden registrar experiencias y consultarlas en `mis-reservas.html`.
