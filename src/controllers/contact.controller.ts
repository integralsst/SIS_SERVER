// src/controllers/contact.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. CARGA MASIVA DE CONTACTOS (Desde Excel/CSV o Lista)
export const bulkCreateContacts = async (req: any, res: Response) => {
  try {
    const { contacts } = req.body; // Un arreglo de { email, name, company }
    const userId = req.user.userId; // Obtenido del token

    const createdContacts = await Promise.all(
      contacts.map((contact: any) =>
        prisma.contact.upsert({
          where: { email: contact.email },
          update: {
            name: contact.name,
            company: contact.company,
          },
          create: {
            email: contact.email,
            name: contact.name,
            company: contact.company,
            userId: userId,
          },
        })
      )
    );

    res.status(201).json({
      message: `${createdContacts.length} contactos procesados exitosamente.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la lista de contactos.' });
  }
};

// 2. OBTENER MIS CONTACTOS
export const getMyContacts = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const contacts = await prisma.contact.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener contactos.' });
  }
};