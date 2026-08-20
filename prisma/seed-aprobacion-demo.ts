import "dotenv/config";

import {
  EstadoRegistro,
  EstadoVersionSupermatriz,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

const ASPECTO_CODIGO = "1111";
const TIPO_ACTIVIDAD = "PRUEBA APROBACION GESTION";
const CRITERIO =
  "[SEED APROBACION DEMO] Regla controlada para validar el flujo real de aprobación administrativa de una gestión.";

async function main(): Promise<void> {
  console.log("");
  console.log(
    "🧪 Preparando regla demo para aprobación de gestión..."
  );

  const version =
    await prisma.versionSupermatriz.findFirst({
      where: {
        estado: EstadoVersionSupermatriz.VIGENTE,
      },
      orderBy: {
        id: "desc",
      },
      select: {
        id: true,
        nombre: true,
      },
    });

  if (!version) {
    throw new Error(
      "No existe una versión VIGENTE de la Supermatriz. Aprueba primero la versión creada por seed:supermatriz."
    );
  }

  const aspecto = await prisma.aspecto.findFirst({
    where: {
      versionSupermatrizId: version.id,
      codigo: ASPECTO_CODIGO,
      estado: EstadoRegistro.ACTIVO,
    },
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  });

  if (!aspecto) {
    throw new Error(
      `No se encontró el aspecto activo ${ASPECTO_CODIGO} en la Supermatriz vigente.`
    );
  }

  const existentes =
    await prisma.reglaAprobacionGestion.findMany({
      where: {
        aspectoId: aspecto.id,
        tipoActividad: TIPO_ACTIVIDAD,
      },
      select: {
        id: true,
      },
    });

  if (existentes.length > 1) {
    throw new Error(
      "Existen varias reglas demo equivalentes. No se modificó ninguna para evitar ambigüedades."
    );
  }

  const data = {
    aspectoId: aspecto.id,
    modalidad: null,
    tipoActividad: TIPO_ACTIVIDAD,
    criterio: CRITERIO,
    requiereAprobacion: true,
    vigenteDesde: null,
    vigenteHasta: null,
    estado: EstadoRegistro.ACTIVO,
  };

  const regla =
    existentes.length === 1
      ? await prisma.reglaAprobacionGestion.update({
          where: {
            id: existentes[0].id,
          },
          data,
        })
      : await prisma.reglaAprobacionGestion.create({
          data,
        });

  console.log("");
  console.log(
    existentes.length === 1
      ? "✅ Regla demo actualizada."
      : "✅ Regla demo creada."
  );
  console.table([
    {
      reglaId: regla.id,
      version: version.nombre,
      aspecto: `${aspecto.codigo ?? "-"} · ${aspecto.nombre}`,
      tipoActividad: regla.tipoActividad,
      requiereAprobacion: regla.requiereAprobacion,
      estado: regla.estado,
    },
  ]);
  console.log("");
  console.log(
    `ℹ️ Para disparar la regla, crea una gestión que incluya el aspecto ${ASPECTO_CODIGO} y usa como tipo de actividad: "${TIPO_ACTIVIDAD}".`
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "❌ Error ejecutando seed:aprobacion-demo:"
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
