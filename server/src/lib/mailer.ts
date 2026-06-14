import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

export async function sendSimpleMail(to: string, subject: string, content: string): Promise<void> {
  if (env.MAIL_HOST === 'smtp.example.com') {
    console.info(`Mock email -> TO: ${to}, SUBJECT: ${subject}, CONTENT: ${content}`)
    return
  }

  const transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_PORT === 465,
    auth: env.MAIL_USERNAME
      ? { user: env.MAIL_USERNAME, pass: env.MAIL_PASSWORD }
      : undefined,
    tls: { rejectUnauthorized: false },
  })

  await transporter.sendMail({
    from: env.MAIL_USERNAME,
    to,
    subject,
    text: content,
  })
}
