import nodemailer from "nodemailer";

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendResetCode(to: string, code: string) {
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({
    from: from ? `Virginia group <${from}>` : undefined,
    to,
    subject: "Код для сброса пароля",
    text: [
      "Код для нового пароля на virginia-group.kz:",
      "",
      code,
      "",
      "Он действует 15 минут.",
      "Если вы не запрашивали сброс, просто удалите это письмо.",
    ].join("\n"),
  });
}
