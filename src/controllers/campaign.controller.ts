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
  <title>Urgente: Obligaciones SG-SST Circular 0027 de 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <tr>
            <td style="background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 3px solid #0891b2;">
              <img src="http://sisriesgoslaborales.com/logo-correo.jpg" alt="Logo de la Empresa" width="180" style="display: block; margin: 0 auto; max-width: 100%; height: auto;">
            </td>
          </tr>

          <tr>
            <td style="background-color: #0891b2; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">
                Alerta Normativa: Circular 0027 de 2026
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; font-size: 20px; margin-top: 0; margin-bottom: 20px;">
                ¿Su empresa ya reportó la autoevaluación del SG-SST?
              </h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hola,<br><br>
                El Ministerio del Trabajo acaba de emitir la <strong>Circular 0027 del 26 de febrero de 2026</strong>[cite: 6, 8, 9]. Esta normativa exige que todos los empleadores y contratantes registren la autoevaluación de los Estándares Mínimos del SG-SST del año 2025 y su respectivo plan de mejoramiento[cite: 11, 29].
              </p>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 25px;">
                <p style="color: #991b1b; font-size: 15px; margin: 0; font-weight: bold;">
                  Fecha límite impostergable: 31 de julio de 2026[cite: 30].
                </p>
              </div>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Además del registro en la plataforma del Fondo de Riesgos Laborales, es obligatorio enviar una copia de la autoevaluación a su ARL[cite: 33, 35]. Tenga en cuenta que las ARL tienen el deber de informar a las Direcciones Territoriales del Ministerio del Trabajo sobre las empresas que no cumplan con este reporte[cite: 53].
              </p>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 35px;">
                <strong>Evite sanciones o requerimientos innecesarios.</strong> Nuestro equipo de especialistas está listo para auditar su sistema, estructurar el plan de mejoramiento y gestionar todo el proceso de reporte por usted, sin afectar la operatividad de su negocio.
              </p>
              
              <table border="0" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://wa.link/7awkvv" style="background-color: #0891b2; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                      Solicitar Diagnóstico Gratuito
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0;">
                Recibe este correo porque está registrado en nuestra base de datos corporativa y consideramos que esta actualización legal es vital para su empresa.
              </p>
              <p style="margin: 0;">
                <a href="#" style="color: #6b7280; font-size: 12px; text-decoration: underline;">Modificar preferencias</a> | 
                <a href="#" style="color: #6b7280; font-size: 12px; text-decoration: underline;">Darse de baja</a>
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