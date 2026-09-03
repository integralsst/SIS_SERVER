import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import {
  FUENTE_LOGICAS_EVALUACION,
  LOGICAS_EVALUACION_ASPECTOS,
} from "./seeds/logicas-evaluacion-aspectos.seed";

const prisma = new PrismaClient();

const NOMBRE_VERSION =
  process.env.SUPERMATRIZ_SEED_VERSION_NAME?.trim() ||
  "Supermatriz SIS - Excel maestro";

const VERSION_ID = (() => {
  const raw = process.env.LOGICA_EVALUACION_VERSION_ID?.trim();

  if (!raw) return null;

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      "LOGICA_EVALUACION_VERSION_ID debe ser un entero positivo."
    );
  }

  return value;
})();

const DRY_RUN = process.argv.includes("--dry-run");

async function resolverVersion() {
  if (VERSION_ID) {
    const version = await prisma.versionSupermatriz.findUnique({
      where: { id: VERSION_ID },
      select: { id: true, nombre: true },
    });

    if (!version) {
      throw new Error(
        `No existe la versión de Supermatriz ${VERSION_ID}.`
      );
    }

    return version;
  }

  const version = await prisma.versionSupermatriz.findUnique({
    where: { nombre: NOMBRE_VERSION },
    select: { id: true, nombre: true },
  });

  if (!version) {
    throw new Error(
      `No existe la versión de Supermatriz "${NOMBRE_VERSION}".`
    );
  }

  return version;
}

async function main(): Promise<void> {
  const version = await resolverVersion();

  console.log("");
  console.log("🧠 Backfill de lógica de evaluación por aspecto");
  console.log(`   Versión: #${version.id} · ${version.nombre}`);
  console.log(
    `   Fuente: ${FUENTE_LOGICAS_EVALUACION.archivo} · ${FUENTE_LOGICAS_EVALUACION.hoja}!${FUENTE_LOGICAS_EVALUACION.columna}`
  );
  console.log(`   Modo: ${DRY_RUN ? "DRY-RUN" : "APLICAR"}`);
  console.log("");

  let actualizadas = 0;
  let sinCambios = 0;
  let noEncontradas = 0;

  for (const fuente of LOGICAS_EVALUACION_ASPECTOS) {
    const candidatos = await prisma.aspecto.findMany({
      where: {
        versionSupermatrizId: version.id,
        codigo: fuente.codigo,
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        logicaEvaluacion: true,
      },
    });

    if (candidatos.length === 0) {
      noEncontradas += 1;
      console.warn(
        `   ⚠ ${fuente.codigo}: no se encontró aspecto en la versión.`
      );
      continue;
    }

    if (candidatos.length > 1) {
      throw new Error(
        `El código ${fuente.codigo} coincide con ${candidatos.length} aspectos en la versión ${version.id}; se detiene para no actualizar ambiguamente.`
      );
    }

    const aspecto = candidatos[0];
    const nuevaLogica = fuente.logicaEvaluacion.trim();

    if (aspecto.logicaEvaluacion?.trim() === nuevaLogica) {
      sinCambios += 1;
      console.log(`   = ${fuente.codigo}: sin cambios.`);
      continue;
    }

    if (!DRY_RUN) {
      await prisma.aspecto.update({
        where: { id: aspecto.id },
        data: { logicaEvaluacion: nuevaLogica },
      });
    }

    actualizadas += 1;
    console.log(
      `   ${DRY_RUN ? "~" : "✓"} ${fuente.codigo}: ${aspecto.nombre}`
    );
  }

  console.log("");
  console.log("Resumen:");
  console.log(`   Actualizadas: ${actualizadas}`);
  console.log(`   Sin cambios: ${sinCambios}`);
  console.log(`   No encontradas: ${noEncontradas}`);
  console.log("");
  console.log(
    "ℹ️ Las filas cuya columna FX está vacía permanecen con logicaEvaluacion = null. Stack44 aplica en esos casos el criterio general 0/3/5 y no inventa reglas específicas."
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "❌ Error ejecutando el backfill de lógica de evaluación:",
      error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
