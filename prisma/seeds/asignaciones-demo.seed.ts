import {
  Prisma,
} from "@prisma/client";

interface IdentidadesAsignables {
  empresa: {
    id: string;
  };
  empresas?: Array<{
    id: string;
  }>;
  profesionalCoordinador: {
    id: string;
  };
  profesionalEjecutor: {
    id: string;
  };
}

export async function crearAsignacionesDemo(
  tx: Prisma.TransactionClient,
  identidades: IdentidadesAsignables
): Promise<void> {
  const fechaInicio = new Date(
    "2026-01-01T00:00:00.000Z"
  );
  const empresas =
    identidades.empresas ?? [identidades.empresa];

  for (const empresa of empresas) {
    await tx.empresaProfesional.upsert({
      where: {
        empresaId_profesionalId: {
          empresaId: empresa.id,
          profesionalId:
            identidades.profesionalCoordinador.id,
        },
      },
      update: {
        rolAsignacion:
          "Coordinador de la empresa",
        esProfesionalAsignado: false,
        fechaInicio,
        fechaFin: null,
        activo: true,
      },
      create: {
        empresaId: empresa.id,
        profesionalId:
          identidades.profesionalCoordinador.id,
        rolAsignacion:
          "Coordinador de la empresa",
        esProfesionalAsignado: false,
        fechaInicio,
        activo: true,
      },
    });

    await tx.empresaProfesional.upsert({
      where: {
        empresaId_profesionalId: {
          empresaId: empresa.id,
          profesionalId:
            identidades.profesionalEjecutor.id,
        },
      },
      update: {
        rolAsignacion:
          "Profesional responsable SG-SST",
        esProfesionalAsignado: true,
        fechaInicio,
        fechaFin: null,
        activo: true,
      },
      create: {
        empresaId: empresa.id,
        profesionalId:
          identidades.profesionalEjecutor.id,
        rolAsignacion:
          "Profesional responsable SG-SST",
        esProfesionalAsignado: true,
        fechaInicio,
        activo: true,
      },
    });
  }
}
