/**
 * Transactional email via Brevo (sib-api-v3-sdk).
 * Si BREVO_API_KEY no está definida, todas las funciones son no-op y retornan false.
 * Los tokens siguen apareciendo en consola y en la respuesta API (modo mock puro).
 * Con la key definida: envía email real y oculta los campos _mock_* de la respuesta.
 */
const SibApiV3Sdk = require('sib-api-v3-sdk');

const BREVO_API_KEY   = process.env.BREVO_API_KEY   || '';
const BREVO_FROM      = process.env.BREVO_FROM_EMAIL || 'noreply@methodology.local';
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME  || 'SCTDA';
const APP_URL         = process.env.APP_URL          || 'http://localhost:8080';

const enabled = !!BREVO_API_KEY;

if (enabled) {
  const client = SibApiV3Sdk.ApiClient.instance;
  client.authentications['api-key'].apiKey = BREVO_API_KEY;
}

async function send({ to, toName, subject, html }) {
  if (!enabled) return false;
  try {
    const api   = new SibApiV3Sdk.TransactionalEmailsApi();
    const email = new SibApiV3Sdk.SendSmtpEmail();
    email.sender      = { name: BREVO_FROM_NAME, email: BREVO_FROM };
    email.to          = [{ email: to, name: toName || to }];
    email.subject     = subject;
    email.htmlContent = html;
    await api.sendTransacEmail(email);
    return true;
  } catch (err) {
    console.error('[mailer] Error al enviar email:', err?.message || err);
    return false;
  }
}

async function sendPasswordRecovery(user, token) {
  const link = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return send({
    to:      user.email,
    toName:  user.full_name,
    subject: 'Recuperación de contraseña — SCTDA',
    html: `
      <p>Hola ${user.full_name},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
          Restablecer contraseña
        </a>
      </p>
      <p>Este enlace expira en 15 minutos. Si no solicitaste esto, ignorá este correo.</p>
    `,
  });
}

async function sendActivationLink(user, token) {
  const link = `${APP_URL}/api/v1/auth/activate/${encodeURIComponent(token)}`;
  return send({
    to:      user.email,
    toName:  user.full_name,
    subject: 'Activá tu cuenta — SCTDA',
    html: `
      <p>Hola ${user.full_name},</p>
      <p>Tu cuenta fue creada en el Sistema de Registro Metodológico.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
          Activar cuenta
        </a>
      </p>
      <p>Este enlace expira en 24 horas y es de uso único.</p>
    `,
  });
}

module.exports = { enabled, sendPasswordRecovery, sendActivationLink };
