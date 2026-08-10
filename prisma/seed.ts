import "dotenv/config";

import {
  PrismaClient,
} from "@prisma/client";

import bcrypt from "bcryptjs";

import { crearAsignacionesDemo } from "./seeds/asignaciones-demo.seed";
import {
  CUENTAS_DEMO,
  type ContrasenasDemoCifradas,
} from "./seeds/datos-demo.seed";
import { crearIdentidadesDemo } from "./seeds/identidades-demo.seed";

const prisma = new PrismaClient();

async function cifrarContrasenas():
Promise<ContrasenasDemoCifradas> {
  const [
    superadmin,
    coordinador,
    profesional,
    adminCliente,
  ] = await Promise.all([
    bcrypt.hash(
      CUENTAS_DEMO.superadmin.contrasena,
      12
    ),
    bcrypt.hash(
      CUENTAS_DEMO.coordinador.contrasena,
      12
    ),
    bcrypt.hash(
      CUENTAS_DEMO.profesional.contrasena,
      12
    ),
    bcrypt.hash(
      CUENTAS_DEMO.adminCliente.contrasena,
      12
    ),
  ]);

  return {
    superadmin,
    coordinador,
    profesional,
    adminCliente,
  };
}

async function main(): Promise<void> {
  console.log("");
  console.log(
    "🌱 Preparando escenario demo Stack44..."
  );

  const contrasenas =
    await cifrarContrasenas();

  const resultado =
    await prisma.$transaction(
      async (tx) => {
        const identidades =
          await crearIdentidadesDemo(
            tx,
            contrasenas
          );

        await crearAsignacionesDemo(
          tx,
          identidades
        );

        return identidades;
      },
      {
        maxWait: 5000,
        timeout: 30000,
      }
    );

  console.log("");
  console.log(
    "✅ Escenario demo creado o actualizado."
  );
  console.log("");
  console.table(
    resultado.empresas.map((empresa) => ({
      empresa: empresa.nombre,
      nit: empresa.nit,
      ciudad: empresa.ciudadPrincipal ?? "-",
    }))
  );
  console.log("");
  console.table([
    {
      rol: "SUPERADMIN",
      correo:
        CUENTAS_DEMO.superadmin.correo,
      contrasena:
        CUENTAS_DEMO.superadmin.contrasena,
    },
    {
      rol: "COORDINADOR",
      correo:
        CUENTAS_DEMO.coordinador.correo,
      contrasena:
        CUENTAS_DEMO.coordinador.contrasena,
    },
    {
      rol: "PROFESIONAL",
      correo:
        CUENTAS_DEMO.profesional.correo,
      contrasena: CUENTAS_DEMO.profesional.contrasena,
    },
    {
      rol: "ADMIN_CLIENTE",
      correo:
        CUENTAS_DEMO.adminCliente.correo,
      contrasena:
        CUENTAS_DEMO.adminCliente.contrasena,
    },
  ]);
  console.log("");
  console.log(
    "ℹ️ Coordinador y profesional quedan asignados a las cuatro empresas demo."
  );
  console.log(
    "ℹ️ Este seed crea identidades y asignaciones; ejecuta npm run seed:alertas para precargar gestiones y acciones pendientes."
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "❌ Error ejecutando el seed demo:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
