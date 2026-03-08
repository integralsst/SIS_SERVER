import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
// La API KEY la pondremos en Render más adelante
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendSSTCampaign = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    
    // 1. Buscamos todos tus contactos cargados
    const contacts = await prisma.contact.findMany({
      where: { userId: userId }
    });

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No tienes contactos cargados.' });
    }

    const emails = contacts.map(c => c.email);

    // 2. Enviamos el correo masivo a través de Resend
    const { data, error } = await resend.emails.send({
      from: 'SIS Consultoría <alertas@tu-dominio.com>', // Aquí irá tu dominio validado
      to: emails,
      subject: '⚠️ Recordatorio: Requisitos Legales SST 2026',
      replyTo: 'contacto@sisriesgoslaborales.com', // ¡AQUÍ ES DONDE RECIBIRÁS LAS RESPUESTAS!
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 20px; border-radius: 20px;">
          <h1 style="color: #0891b2; font-size: 24px;">Actualización Requisitos Legales SST</h1>
          <p style="color: #444; line-height: 1.6;">
            Estimado cliente, le informamos que para este trimestre es obligatorio cumplir con los nuevos estándares de seguridad.
          </p>
          <div style="background: white; padding: 20px; border-radius: 15px; border: 1px solid #eee;">
            <ul style="color: #666;">
              <li>Revisión de matriz de riesgos.</li>
              <li>Actualización de certificados de capacitación.</li>
              <li>Reporte de estándares mínimos.</li>
            </ul>
          </div>
          <p style="margin-top: 25px;">
            <a href="https://wa.me/3100000000?text=Me%20interesa%20la%20asesoria" 
               style="background: #0891b2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
               Contactar por WhatsApp
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            Si tiene dudas, responda directamente a este correo.
          </p>
        </div>
      `
    });

    if (error) throw error;

    // 3. Guardamos el registro de la campaña en la DB
    await prisma.emailCampaign.create({
      data: {
        subject: 'Requisitos Legales SST 2026',
        content: 'Plantilla Informativa + WhatsApp',
        totalRecipients: emails.length,
        userId: userId
      }
    });

    res.json({ message: 'Campaña enviada con éxito', data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};