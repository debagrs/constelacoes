/**
 * Envio transacional de e-mail de recuperação.
 * Server-only. A chave RESEND_API_KEY nunca vai para o navegador.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function siteUrl(): string {
  const explicit =
    process.env.SITE_URL?.trim() || process.env.VITE_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `${vercel.startsWith("http") ? "" : "https://"}${vercel}`.replace(
      /\/$/,
      "",
    );
  }

  throw new Error("Defina SITE_URL na Vercel para habilitar a recuperação de senha.");
}

export function assertPasswordEmailConfigured() {
  required("RESEND_API_KEY");
  required("AUTH_EMAIL_FROM");
  siteUrl();
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const apiKey = required("RESEND_API_KEY");
  const from = required("AUTH_EMAIL_FROM");
  const resetUrl = `${siteUrl()}/recuperar-senha#token=${encodeURIComponent(token)}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Redefinição de senha — Atlas Planetário",
      html: `
        <div style="font-family:Georgia,serif;max-width:620px;margin:auto;color:#171512;line-height:1.55">
          <h1 style="font-size:24px;font-weight:500">Atlas Planetário</h1>
          <p>Recebemos um pedido para redefinir a senha desta conta.</p>
          <p>O link abaixo é de uso único e expira em <strong>15 minutos</strong>.</p>
          <p style="margin:28px 0">
            <a href="${resetUrl}" style="background:#aa3b27;color:white;text-decoration:none;padding:12px 18px;border-radius:7px;display:inline-block">Criar uma nova senha</a>
          </p>
          <p>Se você não solicitou a alteração, ignore esta mensagem. Sua senha continuará a mesma.</p>
          <p style="font-size:12px;color:#6f6a63;margin-top:30px">Por segurança, o Atlas nunca solicita sua senha por e-mail.</p>
        </div>
      `,
      text: `Atlas Planetário\n\nUse este link único, válido por 15 minutos, para criar uma nova senha:\n${resetUrl}\n\nSe você não solicitou a alteração, ignore esta mensagem.`,
    }),
  });

  if (!response.ok) {
    // Não propagar a resposta do provedor para o cliente: ela pode conter
    // detalhes operacionais. O servidor registra apenas o status.
    console.error(`[auth-email] Falha ao enviar recuperação: HTTP ${response.status}`);
    throw new Error("EMAIL_SEND_FAILED");
  }
}
