const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_LOGO_URL = 'https://img.mailinblue.com/12818649/images/content_library/original/6afb3a2c7afe7ad747abc030.png';

function escaparHTML(valor) {
  return String(valor || '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caracter]);
}

function nombreCategoria(categoria) {
  return {
    reserva: 'Reserva de experiencia',
    alojamiento: 'Solicitud de alojamiento',
    vuelo: 'Solicitud de vuelo'
  }[categoria] || 'Solicitud de viaje';
}

function detalleEstado(estado) {
  if (estado === 'Confirmada') return { etiqueta: 'Confirmada', color: '#087443' };
  if (estado === 'Cancelada') return { etiqueta: 'Cancelada', color: '#b42318' };
  return { etiqueta: 'Pendiente de confirmación', color: '#9a6700' };
}

function crearCorreoEstado({ nombreCliente, categoria, codigo, estado, detalle }) {
  const estadoCorreo = detalleEstado(estado);
  const nombre = escaparHTML(nombreCliente || 'cliente');
  const solicitud = escaparHTML(nombreCategoria(categoria));
  const codigoSeguro = escaparHTML(codigo);
  const detalleSeguro = escaparHTML(detalle || 'Consulta los detalles desde tu cuenta RallyTraver.');

  return `
    <div style="margin:0;padding:28px 16px;background:#f4f8fc;font-family:Arial,Helvetica,sans-serif;color:#102a4c;">
      <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dce8f3;">
        <div style="padding:18px 30px;text-align:center;background:#ffffff;border-bottom:1px solid #dce8f3;">
          <img src="${BREVO_LOGO_URL}" alt="RallyTraver - Agencia de Viajes" width="132" style="display:inline-block;width:132px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
        </div>
        <div style="padding:26px 30px;background:#082d5d;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1px;">RALLYTRAVER</p>
          <h1 style="margin:0;font-size:25px;line-height:1.2;">Actualización de tu solicitud</h1>
        </div>
        <div style="padding:28px 30px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.55;">Hola, ${nombre}.</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;">Tu ${solicitud.toLowerCase()} tiene una actualización.</p>
          <div style="padding:16px;border-radius:10px;background:#edf6fd;">
            <p style="margin:0 0 7px;font-size:13px;color:#49627c;">CÓDIGO DE SOLICITUD</p>
            <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#082d5d;">${codigoSeguro}</p>
            <p style="margin:0 0 7px;font-size:13px;color:#49627c;">ESTADO</p>
            <p style="margin:0;color:${estadoCorreo.color};font-size:17px;font-weight:700;">${estadoCorreo.etiqueta}</p>
          </div>
          <p style="margin:22px 0 0;font-size:14px;line-height:1.55;color:#49627c;">${detalleSeguro}</p>
          <p style="margin:22px 0 0;font-size:14px;line-height:1.55;color:#49627c;">Ingresa a tu cuenta RallyTraver para consultar los detalles de tu solicitud.</p>
        </div>
        <div style="padding:16px 30px;background:#f7fafc;color:#6b7f95;font-size:12px;line-height:1.5;">Este es un aviso informativo de RallyTraver.</div>
      </div>
    </div>`;
}

function crearCorreoRecuperacion({ nombreCliente, enlaceRestablecimiento }) {
  const nombre = escaparHTML(nombreCliente || 'cliente');
  const enlaceSeguro = escaparHTML(enlaceRestablecimiento);

  return `
    <div style="margin:0;padding:28px 16px;background:#f4f8fc;font-family:Arial,Helvetica,sans-serif;color:#102a4c;">
      <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dce8f3;">
        <div style="padding:18px 30px;text-align:center;background:#ffffff;border-bottom:1px solid #dce8f3;">
          <img src="${BREVO_LOGO_URL}" alt="RallyTraver - Agencia de Viajes" width="132" style="display:inline-block;width:132px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
        </div>
        <div style="padding:26px 30px;background:#082d5d;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1px;">RALLYTRAVER</p>
          <h1 style="margin:0;font-size:25px;line-height:1.2;">Recupera tu contraseña</h1>
        </div>
        <div style="padding:28px 30px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.55;">Hola, ${nombre}.</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;">Recibimos una solicitud para restablecer la contraseña de tu cuenta RallyTraver.</p>
          <p style="margin:0 0 22px;text-align:center;">
            <a href="${enlaceSeguro}" style="display:inline-block;padding:13px 22px;border-radius:8px;background:#ec1670;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Crear nueva contraseña</a>
          </p>
          <p style="margin:0;font-size:14px;line-height:1.55;color:#49627c;">Por seguridad, este enlace vence en 30 minutos y solo puede utilizarse una vez.</p>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:#6b7f95;">Si no solicitaste este cambio, puedes ignorar este correo: tu contraseña actual permanecerá igual.</p>
        </div>
        <div style="padding:16px 30px;background:#f7fafc;color:#6b7f95;font-size:12px;line-height:1.5;">Este es un aviso de seguridad de RallyTraver.</div>
      </div>
    </div>`;
}

async function enviarCorreoBrevo({ emailCliente, nombreCliente, asunto, contenidoHTML }) {
  const apiKey = String(process.env.BREVO_API_KEY || '').trim();
  const remitente = String(process.env.BREVO_SENDER_EMAIL || '').trim();
  const nombreRemitente = String(process.env.BREVO_SENDER_NAME || 'RallyTraver').trim();

  if (!apiKey || !remitente) {
    console.warn('Correo transaccional omitido: configura BREVO_API_KEY y BREVO_SENDER_EMAIL en el archivo .env.');
    return { enviado: false, motivo: 'configuracion_incompleta' };
  }

  if (!emailCliente) return { enviado: false, motivo: 'cliente_sin_correo' };

  const respuesta = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      Accept: 'application/json'
    },
    body: JSON.stringify({
      sender: { email: remitente, name: nombreRemitente },
      to: [{ email: emailCliente, name: nombreCliente || 'Cliente RallyTraver' }],
      subject: asunto,
      htmlContent: contenidoHTML
    })
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => ({}));
    throw new Error(detalle.message || `Brevo respondió con el estado ${respuesta.status}.`);
  }

  return { enviado: true };
}

async function enviarCorreoEstadoSolicitud(datos) {
  return enviarCorreoBrevo({
    emailCliente: datos.emailCliente,
    nombreCliente: datos.nombreCliente,
    asunto: `${datos.titulo || 'Actualización de solicitud'} · RallyTraver`,
    contenidoHTML: crearCorreoEstado(datos)
  });
}

async function enviarCorreoRecuperacionContrasena(datos) {
  return enviarCorreoBrevo({
    emailCliente: datos.emailCliente,
    nombreCliente: datos.nombreCliente,
    asunto: 'Recupera tu contraseña · RallyTraver',
    contenidoHTML: crearCorreoRecuperacion(datos)
  });
}

module.exports = { enviarCorreoEstadoSolicitud, enviarCorreoRecuperacionContrasena };
