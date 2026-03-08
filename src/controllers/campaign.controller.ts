import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendSSTCampaign = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    
    // 1. Buscamos prospectos que NUNCA hayan recibido el correo (LEAD)
    // Limitamos a 100 para no exceder tu cuota diaria de Resend
    const contacts = await prisma.contact.findMany({
      where: { 
        userId: userId,
        status: 'LEAD' 
      },
      take: 100 
    });

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No hay nuevos prospectos pendientes de envío hoy.' });
    }

    const emails = contacts.map(c => c.email);

    // 2. Envío masivo con dominio verificado y replyTo corregido
    const { data, error } = await resend.emails.send({
      from: 'SIS Consultoría <alertas@sisriesgoslaborales.com>',
      to: emails,
      subject: '⚠️ Recordatorio: Requisitos Legales SST 2026',
      replyTo: 'contacto@sisriesgoslaborales.com',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 20px; border-radius: 20px;">
          <h1 style="color: #0891b2;">Actualización Requisitos SST</h1>
          <p style="color: #444; line-height: 1.6;">Le informamos sobre los nuevos estándares de seguridad obligatorios...</p>
          <p><a href="https://wa.me/3100000000" style="background: #0891b2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Contactar por WhatsApp</a></p>
        </div>
      `
    });

    if (error) throw error;

    // 3. ACTUALIZACIÓN: Marcamos a estos contactos como contactados en Hostinger
    const contactIds = contacts.map(c => c.id);
    await prisma.contact.updateMany({
      where: { id: { in: contactIds } },
      data: { 
        status: 'CONTACTED',
        lastContactedAt: new Date() 
      }
    });

    // 4. Guardamos historial de la campaña
    await prisma.emailCampaign.create({
      data: {
        subject: 'Requisitos Legales SST 2026',
        content: 'Campaña informativa masiva',
        totalRecipients: emails.length,
        userId: userId
      }
    });

    res.json({ message: `Campaña enviada a ${emails.length} contactos.`, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
// src/controllers/contact.controller.ts (Fragmento)
export const getMyContacts = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId; // Obtenido del token JWT
    const contacts = await prisma.contact.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' } // Los más recientes primero
    });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la lista de contactos.' });
  }
};