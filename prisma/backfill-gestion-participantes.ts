import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("");
  console.log("👥 Backfill de participantes de gestiones SG-SST");
  console.log(
    "ℹ️ Se crea un participante inicial únicamente cuando la gestión todavía no lo tiene."
  );
  console.log("");

  const gestiones = await prisma.gestionSgsst.findMany({
    select: {
      id: true,
      profesionalId: true,
      usuarioCreadorId: true,
      createdAt: true,
      usuarioCreador: {
        select: {
          profesional: {
            select: {
              id: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let creados = 0;
  let existentes = 0;
  let sinProfesional = 0;

  for (const gestion of gestiones) {
    const profesionalId =
      gestion.profesionalId ??
      gestion.usuarioCreador.profesional?.id ??
      null;

    if (!profesionalId) {
      sinProfesional += 1;
      continue;
    }

    const participanteExistente =
      await prisma.gestionParticipante.findFirst({
        where: {
          gestionId: gestion.id,
          profesionalId,
          activo: true,
        },
        select: {
          id: true,
        },
      });

    if (participanteExistente) {
      existentes += 1;
      continue;
    }

    await prisma.gestionParticipante.create({
      data: {
        gestionId: gestion.id,
        profesionalId,
        esLider: true,
        puedeEvaluar: true,
        puedeGestionarEvidencias: true,
        responsabilidad: "Participante inicial migrado desde la gestión existente.",
        activo: true,
        fechaInicio: gestion.createdAt,
        asignadoPorUsuarioId: gestion.usuarioCreadorId,
      },
    });

    creados += 1;
  }

  console.log(`✓ Gestiones revisadas: ${gestiones.length}`);
  console.log(`✓ Participantes creados: ${creados}`);
  console.log(`✓ Participantes ya existentes: ${existentes}`);
  console.log(`✓ Gestiones sin profesional resoluble: ${sinProfesional}`);
  console.log("");
  console.log("✅ Backfill finalizado.");
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error("❌ Error durante el backfill de participantes:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
