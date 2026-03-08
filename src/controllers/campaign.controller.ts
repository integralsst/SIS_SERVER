import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const generateSSTTemplate = (email: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización SG-SST: Circular 0027</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F5F7; padding: 50px 20px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
          
          <tr>
            <td style="padding: 0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="30%" height="14" style="background-color: #2cbef9; border-top-left-radius: 18px;"></td>
                  <td width="70%" height="14" style="background-color: #04127c; border-top-right-radius: 18px;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px 20px 30px; text-align: center;">
              <img src="http://sisriesgoslaborales.com/logo-correo.jpeg" alt="Logo de la Empresa" width="120" style="display: block; margin: 0 auto; max-width: 100%; height: auto;">
            </td>
          </tr>

          <tr>
            <td style="padding: 10px 40px 30px 40px; text-align: center;">
              <h1 style="color: #1D1D1F; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2;">
                Circular 0027.<br>
                <span style="color: #04127c;">El plazo está corriendo.</span>
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 30px 40px; text-align: center;">
              <p style="color: #86868B; font-size: 18px; line-height: 1.5; margin: 0; font-weight: 400;">
                El Ministerio del Trabajo ha fijado una fecha límite estricta para el reporte de la autoevaluación del SG-SST (vigencia 2025) y su plan de mejoramiento.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 30px 40px; text-align: center;">
              <img src="http://sisriesgoslaborales.com/ministerio.png" alt="Comunicado Ministerio del Trabajo" width="100%" style="display: block; margin: 0 auto; border-radius: 12px; border: 1px solid #E5E5EA;">
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F5F7; border-radius: 12px; padding: 25px;">
                <tr>
                  <td style="padding-bottom: 15px;">
                    <strong style="color: #1D1D1F; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Fecha Límite:</strong><br>
                    <span style="color: #ef4444; font-size: 18px; font-weight: 600;">31 de julio de 2026</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 15px;">
                    <strong style="color: #1D1D1F; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Obligación Adicional:</strong><br>
                    <span style="color: #4b5563; font-size: 16px;">Remitir copia a su ARL para evitar reportes por incumplimiento.</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong style="color: #1D1D1F; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Plataforma Oficial:</strong><br>
                    <a href="https://sgrl.mintrabajo.gov.co/Autenticacion/Autenticacion" style="color: #2cbef9; font-size: 16px; text-decoration: none; font-weight: 500;">Acceder al Fondo de Riesgos Laborales ↗</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 30px 40px; text-align: center;">
              <p style="color: #1D1D1F; font-size: 18px; line-height: 1.5; margin: 0; font-weight: 500;">
                Auditoría, estructuración y reporte sin interrumpir su operación.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 50px 40px; text-align: center;">
              <a href="https://wa.link/7awkvv" style="background-color: #04127c; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 980px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.3s ease;">
                Solicitar Diagnóstico Gratuito
              </a>
            </td>
          </tr>

          <tr>
            <td style="background-color: #FAFAFA; padding: 25px 40px; text-align: center; border-top: 1px solid #E5E5EA;">
              <p style="color: #86868B; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0;">
                Recibe esta información técnica como parte de nuestras actualizaciones normativas corporativas.
              </p>
              <p style="margin: 0;">
                <a href="#" style="color: #2cbef9; font-size: 12px; text-decoration: none;">Modificar preferencias</a> &nbsp;|&nbsp; 
                <a href="#" style="color: #2cbef9; font-size: 12px; text-decoration: none;">Darse de baja</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const sendSSTCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // CORRECCIÓN: Usamos String() en lugar de Number() porque en Prisma tu ID es un UUID (String)
    const userId = String(req.user.userId);

    const contacts = await prisma.contact.findMany({
      where: { 
        userId: userId,
        status: 'LEAD' 
      },
      take: 100 
    });

    if (contacts.length === 0) {
      res.status(400).json({ error: 'No hay prospectos pendientes de envío hoy.' });
      return;
    }

    const emailsBatch = contacts.map(contact => ({
      from: 'Consultoría <alertas@sisriesgoslaborales.com>',
      to: [contact.email],
      subject: 'Actualización Normativa: Requisitos Legales SST 2026',
      replyTo: 'contacto@sisriesgoslaborales.com',
      html: generateSSTTemplate(contact.email)
    }));

    const { data, error } = await resend.batch.send(emailsBatch);

    if (error) {
        throw new Error(`Error en Resend: ${error.message}`);
    }

    const contactIds = contacts.map(c => c.id);
    
    await prisma.contact.updateMany({
      where: { id: { in: contactIds } },
      data: { status: 'CONTACTED' }
    });

    await prisma.emailCampaign.create({
      data: {
        subject: 'Requisitos Legales SST 2026',
        content: 'Campaña informativa masiva (Batch)',
        totalRecipients: contacts.length,
        userId: userId
      }
    });

    res.json({ message: `Campaña enviada con éxito a ${contacts.length} contactos.`, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido del servidor';
    res.status(500).json({ error: errorMessage });
  }
};

export const getMyContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // CORRECCIÓN: También usamos String() aquí
    const userId = String(req.user.userId);

    const contacts = await prisma.contact.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' } 
    });
    
    res.json(contacts);
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error al obtener la lista de contactos.' });
  }
};