import "dotenv/config";

import {
  PrismaClient,
} from "@prisma/client";

import { validarConfirmacionResetTotal } from "./reset-total/confirmacion-reset-total";
import { eliminarDatosOperativos } from "./reset-total/datos-operativos.reset";
import { eliminarIdentidades } from "./reset-total/identidades.reset";
import { eliminarSupermatrizCompleta } from "./reset-total/supermatriz.reset";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const destino = validarConfirmacionResetTotal();

  console.log("");
  console.log(
    "⚠️ RESET TOTAL DE DATOS STACK44"
  );
  console.log(
    `Base confirmada: ${destino.nombre}`
  );
  console.log(
    `Servidor: ${destino.host}`
  );
  console.log(
    "ℹ️ Se conservan las tablas, migraciones y el esquema Prisma."
  );
  console.log(
    "ℹ️ El proceso es repetible y no usa una transacción extensa."
  );
  console.log("");

  await eliminarDatosOperativos(prisma);
  await eliminarIdentidades(prisma);
  await eliminarSupermatrizCompleta(prisma);

  console.log("");
  console.log(
    "✅ Toda la información de la aplicación fue eliminada."
  );
  console.log(
    "✅ La base quedó lista para ejecutar npm run seed:reconstruccion."
  );
  console.log(
    "ℹ️ seed:reconstruccion carga la Supermatriz completa, sus lógicas de evaluación y el entorno base SIS."
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "❌ Error durante el reset total:"
    );
    console.error(error);
    console.error("");
    console.error(
      "El proceso es repetible: corrige el problema y ejecuta nuevamente reset:total."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
