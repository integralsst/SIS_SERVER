import "dotenv/config";

import {
  ClaseRiesgo,
  Prisma,
  PrismaClient,
  RolUsuario,
  TipoIdentificacion,
} from "@prisma/client";

import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMPRESA_DEMO = {
  nit: "900999888-1",
  nombre: "Empresa Demo Stack44 S.A.S.",
  ciudadPrincipal: "Pereira",
  direccionPrincipal:
    "Avenida de las Pruebas #44-44",
  correoEmpresa:
    "empresa.demo@stack4four.com",
  descripcionEmpresa:
    "Empresa controlada para pruebas funcionales y auditoría del flujo SG-SST.",
  claseRiesgoPrincipal: ClaseRiesgo.II,
  codigoActividadEconomica: "7020",
  descripcionActividadEconomica:
    "Actividades de consultoría de gestión.",
  nombreGerente: "Gerencia Demo",
  correoGerente:
    "gerencia.demo@stack4four.com",
  nombreContactoSst:
    "Responsable SST Demo",
  correoContactoSst:
    "sst.demo@stack4four.com",
  visitasSstConvenidas: 12,
  visitasEmergenciasConvenidas: 4,
} satisfies Prisma.EmpresaUncheckedCreateInput;

const CUENTAS = {
  superadmin: {
    nombre: "Superadministrador Stack44",
    correo: "superadmin@stack4four.com",
    contrasena: "Stack44Admin2026!",
    rol: RolUsuario.SUPERADMIN,
  },
  coordinador: {
    nombre: "Carlos Coordinador Demo",
    correo:
      "coordinador.demo@stack4four.com",
    contrasena:
      "Stack44Coordinador2026!",
    rol: RolUsuario.COORDINADOR,
  },
  profesional: {
    nombre: "Laura Martínez Demo",
    correo:
      "profesional.demo@stack4four.com",
    contrasena: "Stack44Demo2026!",
    rol: RolUsuario.PROFESIONAL,
  },
} as const;

async function cifrarContrasenas() {
  const [
    superadmin,
    coordinador,
    profesional,
  ] = await Promise.all([
    bcrypt.hash(
      CUENTAS.superadmin.contrasena,
      12
    ),
    bcrypt.hash(
      CUENTAS.coordinador.contrasena,
      12
    ),
    bcrypt.hash(
      CUENTAS.profesional.contrasena,
      12
    ),
  ]);

  return {
    superadmin,
    coordinador,
    profesional,
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
        const empresa =
          await tx.empresa.upsert({
            where: {
              nit: EMPRESA_DEMO.nit,
            },
            update: {
              ...EMPRESA_DEMO,
              activo: true,
            },
            create: {
              ...EMPRESA_DEMO,
              activo: true,
            },
          });

        const superadmin =
          await tx.usuario.upsert({
            where: {
              correo:
                CUENTAS.superadmin.correo,
            },
            update: {
              nombre:
                CUENTAS.superadmin.nombre,
              contrasena:
                contrasenas.superadmin,
              rol:
                CUENTAS.superadmin.rol,
              empresaId: null,
              activo: true,
            },
            create: {
              nombre:
                CUENTAS.superadmin.nombre,
              correo:
                CUENTAS.superadmin.correo,
              contrasena:
                contrasenas.superadmin,
              rol:
                CUENTAS.superadmin.rol,
              empresaId: null,
              activo: true,
            },
          });

        const usuarioCoordinador =
          await tx.usuario.upsert({
            where: {
              correo:
                CUENTAS.coordinador.correo,
            },
            update: {
              nombre:
                CUENTAS.coordinador.nombre,
              contrasena:
                contrasenas.coordinador,
              rol:
                CUENTAS.coordinador.rol,
              empresaId: null,
              activo: true,
            },
            create: {
              nombre:
                CUENTAS.coordinador.nombre,
              correo:
                CUENTAS.coordinador.correo,
              contrasena:
                contrasenas.coordinador,
              rol:
                CUENTAS.coordinador.rol,
              empresaId: null,
              activo: true,
            },
          });

        const usuarioProfesional =
          await tx.usuario.upsert({
            where: {
              correo:
                CUENTAS.profesional.correo,
            },
            update: {
              nombre:
                CUENTAS.profesional.nombre,
              contrasena:
                contrasenas.profesional,
              rol:
                CUENTAS.profesional.rol,
              empresaId: null,
              activo: true,
            },
            create: {
              nombre:
                CUENTAS.profesional.nombre,
              correo:
                CUENTAS.profesional.correo,
              contrasena:
                contrasenas.profesional,
              rol:
                CUENTAS.profesional.rol,
              empresaId: null,
              activo: true,
            },
          });

        const profesionalCoordinadorExistente =
          await tx.profesional.findFirst({
            where: {
              OR: [
                {
                  correo:
                    CUENTAS.coordinador.correo,
                },
                {
                  numeroIdentificacion:
                    "1000000044",
                },
              ],
            },
            select: {
              id: true,
            },
          });

        const profesionalCoordinador =
          profesionalCoordinadorExistente
            ? await tx.profesional.update({
                where: {
                  id:
                    profesionalCoordinadorExistente.id,
                },
                data: {
                  tipoIdentificacion:
                    TipoIdentificacion.CC,
                  numeroIdentificacion:
                    "1000000044",
                  nombres: "Carlos",
                  apellidos:
                    "Coordinador Demo",
                  cargo:
                    "Coordinador SG-SST",
                  profesion:
                    "Profesional en Seguridad y Salud en el Trabajo",
                  rolProfesional:
                    "Coordinación operativa",
                  correo:
                    CUENTAS.coordinador.correo,
                  celular: "3000000044",
                  direccion:
                    "Pereira, Risaralda",
                  usuarioId:
                    usuarioCoordinador.id,
                  activo: true,
                },
              })
            : await tx.profesional.create({
                data: {
                  tipoIdentificacion:
                    TipoIdentificacion.CC,
                  numeroIdentificacion:
                    "1000000044",
                  nombres: "Carlos",
                  apellidos:
                    "Coordinador Demo",
                  cargo:
                    "Coordinador SG-SST",
                  profesion:
                    "Profesional en Seguridad y Salud en el Trabajo",
                  rolProfesional:
                    "Coordinación operativa",
                  correo:
                    CUENTAS.coordinador.correo,
                  celular: "3000000044",
                  direccion:
                    "Pereira, Risaralda",
                  usuarioId:
                    usuarioCoordinador.id,
                  activo: true,
                },
              });

        const profesionalEjecutorExistente =
          await tx.profesional.findFirst({
            where: {
              OR: [
                {
                  correo:
                    CUENTAS.profesional.correo,
                },
                {
                  numeroIdentificacion:
                    "1000000045",
                },
              ],
            },
            select: {
              id: true,
            },
          });

        const profesionalEjecutor =
          profesionalEjecutorExistente
            ? await tx.profesional.update({
                where: {
                  id:
                    profesionalEjecutorExistente.id,
                },
                data: {
                  tipoIdentificacion:
                    TipoIdentificacion.CC,
                  numeroIdentificacion:
                    "1000000045",
                  nombres: "Laura",
                  apellidos:
                    "Martínez Demo",
                  cargo:
                    "Profesional SG-SST",
                  profesion:
                    "Profesional en Seguridad y Salud en el Trabajo",
                  rolProfesional:
                    "Gestión documental e intervención",
                  correo:
                    CUENTAS.profesional.correo,
                  celular: "3000000045",
                  direccion:
                    "Pereira, Risaralda",
                  usuarioId:
                    usuarioProfesional.id,
                  activo: true,
                },
              })
            : await tx.profesional.create({
                data: {
                  tipoIdentificacion:
                    TipoIdentificacion.CC,
                  numeroIdentificacion:
                    "1000000045",
                  nombres: "Laura",
                  apellidos:
                    "Martínez Demo",
                  cargo:
                    "Profesional SG-SST",
                  profesion:
                    "Profesional en Seguridad y Salud en el Trabajo",
                  rolProfesional:
                    "Gestión documental e intervención",
                  correo:
                    CUENTAS.profesional.correo,
                  celular: "3000000045",
                  direccion:
                    "Pereira, Risaralda",
                  usuarioId:
                    usuarioProfesional.id,
                  activo: true,
                },
              });

        await tx.empresaProfesional.upsert({
          where: {
            empresaId_profesionalId: {
              empresaId: empresa.id,
              profesionalId:
                profesionalCoordinador.id,
            },
          },
          update: {
            rolAsignacion:
              "Coordinador de la empresa",
            esProfesionalAsignado: false,
            fechaInicio: new Date(
              "2026-01-01T00:00:00.000Z"
            ),
            fechaFin: null,
            activo: true,
          },
          create: {
            empresaId: empresa.id,
            profesionalId:
              profesionalCoordinador.id,
            rolAsignacion:
              "Coordinador de la empresa",
            esProfesionalAsignado: false,
            fechaInicio: new Date(
              "2026-01-01T00:00:00.000Z"
            ),
            activo: true,
          },
        });

        await tx.empresaProfesional.upsert({
          where: {
            empresaId_profesionalId: {
              empresaId: empresa.id,
              profesionalId:
                profesionalEjecutor.id,
            },
          },
          update: {
            rolAsignacion:
              "Profesional responsable SG-SST",
            esProfesionalAsignado: true,
            fechaInicio: new Date(
              "2026-01-01T00:00:00.000Z"
            ),
            fechaFin: null,
            activo: true,
          },
          create: {
            empresaId: empresa.id,
            profesionalId:
              profesionalEjecutor.id,
            rolAsignacion:
              "Profesional responsable SG-SST",
            esProfesionalAsignado: true,
            fechaInicio: new Date(
              "2026-01-01T00:00:00.000Z"
            ),
            activo: true,
          },
        });

        return {
          empresa,
          superadmin,
          usuarioCoordinador,
          usuarioProfesional,
          profesionalCoordinador,
          profesionalEjecutor,
        };
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
  console.log(
    "Empresa: " +
      resultado.empresa.nombre +
      " · NIT " +
      resultado.empresa.nit
  );
  console.log("");
  console.table([
    {
      rol: "SUPERADMIN",
      correo:
        CUENTAS.superadmin.correo,
      contrasena:
        CUENTAS.superadmin.contrasena,
    },
    {
      rol: "COORDINADOR",
      correo:
        CUENTAS.coordinador.correo,
      contrasena:
        CUENTAS.coordinador.contrasena,
    },
    {
      rol: "PROFESIONAL",
      correo:
        CUENTAS.profesional.correo,
      contrasena:
        CUENTAS.profesional.contrasena,
    },
  ]);
  console.log("");
  console.log(
    "ℹ️ El seed no crea compromisos artificiales."
  );
  console.log(
    "ℹ️ Finaliza una gestión con nota 0 o 3 para probar el flujo real."
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
