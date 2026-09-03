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

const EMPRESA_BASE = {
  nit: "901444888-1",
  nombre: "SIS Sistema Integral en Riesgos Laborales",
  ciudadPrincipal: "Pereira",
  direccionPrincipal: "Carrera 13 # 14-28, Pereira, Risaralda",
  correoEmpresa: "sis@stack4four.com",
  descripcionEmpresa:
    "Empresa base de pruebas Stack44 para operación y validación del SG-SST.",
  claseRiesgoPrincipal: ClaseRiesgo.II,
  codigoActividadEconomica: "7020",
  descripcionActividadEconomica:
    "Actividades de consultoría de gestión y asesoría en Seguridad y Salud en el Trabajo.",
  nombreContactoSst: "Cristina Perdomo",
  correoContactoSst: "cristina@stack4four.com",
  visitasSstConvenidas: 12,
  visitasEmergenciasConvenidas: 4,
  activo: true,
} satisfies Prisma.EmpresaUncheckedCreateInput;

const CUENTAS_BASE = {
  superusuario: {
    nombre: "Jesus Zappa",
    correo: "integralsst@stack4four.com",
    contrasena: "Cardenas1970",
    rol: RolUsuario.SUPERADMIN,
  },
  coordinador: {
    nombre: "Cristina Perdomo",
    correo: "cristina@stack4four.com",
    contrasena: "Carenas1970",
    rol: RolUsuario.COORDINADOR,
  },
  profesional: {
    nombre: "Santiago Zappa",
    correo: "santiago@stack4four.com",
    contrasena: "Cardenas1970",
    rol: RolUsuario.PROFESIONAL,
  },
  adminCliente: {
    nombre: "Jesus Zappa",
    correo: "jesus@stack4four.com",
    contrasena: "Cardenas1970",
    rol: RolUsuario.ADMIN_CLIENTE,
  },
} as const;

interface DatosProfesionalBase {
  correo: string;
  numeroIdentificacion: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  rolProfesional: string;
  celular: string;
  usuarioId: string;
}

async function crearOActualizarProfesional(
  tx: Prisma.TransactionClient,
  datos: DatosProfesionalBase
) {
  const existente = await tx.profesional.findFirst({
    where: {
      OR: [
        { correo: datos.correo },
        {
          numeroIdentificacion:
            datos.numeroIdentificacion,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  const data = {
    tipoIdentificacion: TipoIdentificacion.CC,
    numeroIdentificacion:
      datos.numeroIdentificacion,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    cargo: datos.cargo,
    profesion:
      "Profesional en Seguridad y Salud en el Trabajo",
    rolProfesional: datos.rolProfesional,
    correo: datos.correo,
    celular: datos.celular,
    direccion: "Pereira, Risaralda",
    usuarioId: datos.usuarioId,
    activo: true,
  };

  return existente
    ? tx.profesional.update({
        where: {
          id: existente.id,
        },
        data,
      })
    : tx.profesional.create({
        data,
      });
}

async function crearUsuario(
  tx: Prisma.TransactionClient,
  cuenta: (typeof CUENTAS_BASE)[keyof typeof CUENTAS_BASE],
  contrasenaCifrada: string,
  empresaId: string | null
) {
  return tx.usuario.upsert({
    where: {
      correo: cuenta.correo,
    },
    update: {
      nombre: cuenta.nombre,
      contrasena: contrasenaCifrada,
      rol: cuenta.rol,
      empresaId,
      activo: true,
    },
    create: {
      nombre: cuenta.nombre,
      correo: cuenta.correo,
      contrasena: contrasenaCifrada,
      rol: cuenta.rol,
      empresaId,
      activo: true,
    },
  });
}

async function main(): Promise<void> {
  console.log("");
  console.log(
    "🌱 Creando entorno base SIS para Stack44..."
  );
  console.log(
    "ℹ️ Este seed es idempotente: puede ejecutarse nuevamente para restaurar las identidades base."
  );

  const [
    passwordSuperusuario,
    passwordCoordinador,
    passwordProfesional,
    passwordAdminCliente,
  ] = await Promise.all([
    bcrypt.hash(
      CUENTAS_BASE.superusuario.contrasena,
      12
    ),
    bcrypt.hash(
      CUENTAS_BASE.coordinador.contrasena,
      12
    ),
    bcrypt.hash(
      CUENTAS_BASE.profesional.contrasena,
      12
    ),
    bcrypt.hash(
      CUENTAS_BASE.adminCliente.contrasena,
      12
    ),
  ]);

  const resultado = await prisma.$transaction(
    async (tx) => {
      const empresa = await tx.empresa.upsert({
        where: {
          nit: EMPRESA_BASE.nit,
        },
        update: EMPRESA_BASE,
        create: EMPRESA_BASE,
      });

      const superusuario = await crearUsuario(
        tx,
        CUENTAS_BASE.superusuario,
        passwordSuperusuario,
        null
      );

      const usuarioCoordinador = await crearUsuario(
        tx,
        CUENTAS_BASE.coordinador,
        passwordCoordinador,
        null
      );

      const usuarioProfesional = await crearUsuario(
        tx,
        CUENTAS_BASE.profesional,
        passwordProfesional,
        null
      );

      const usuarioAdminCliente = await crearUsuario(
        tx,
        CUENTAS_BASE.adminCliente,
        passwordAdminCliente,
        empresa.id
      );

      const coordinador =
        await crearOActualizarProfesional(tx, {
          correo: CUENTAS_BASE.coordinador.correo,
          numeroIdentificacion: "1000000101",
          nombres: "Cristina",
          apellidos: "Perdomo",
          cargo: "Coordinadora SG-SST",
          rolProfesional:
            "Coordinación operativa SG-SST",
          celular: "3000000101",
          usuarioId: usuarioCoordinador.id,
        });

      const profesional =
        await crearOActualizarProfesional(tx, {
          correo: CUENTAS_BASE.profesional.correo,
          numeroIdentificacion: "1000000102",
          nombres: "Santiago",
          apellidos: "Zappa",
          cargo: "Profesional SG-SST",
          rolProfesional:
            "Gestión documental e intervención",
          celular: "3000000102",
          usuarioId: usuarioProfesional.id,
        });

      const fechaInicio = new Date(
        "2026-01-01T00:00:00.000Z"
      );

      await tx.empresaProfesional.upsert({
        where: {
          empresaId_profesionalId: {
            empresaId: empresa.id,
            profesionalId: coordinador.id,
          },
        },
        update: {
          rolAsignacion:
            "Coordinadora de la empresa",
          esProfesionalAsignado: false,
          fechaInicio,
          fechaFin: null,
          activo: true,
        },
        create: {
          empresaId: empresa.id,
          profesionalId: coordinador.id,
          rolAsignacion:
            "Coordinadora de la empresa",
          esProfesionalAsignado: false,
          fechaInicio,
          activo: true,
        },
      });

      await tx.empresaProfesional.upsert({
        where: {
          empresaId_profesionalId: {
            empresaId: empresa.id,
            profesionalId: profesional.id,
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
          profesionalId: profesional.id,
          rolAsignacion:
            "Profesional responsable SG-SST",
          esProfesionalAsignado: true,
          fechaInicio,
          activo: true,
        },
      });

      return {
        empresa,
        superusuario,
        usuarioCoordinador,
        usuarioProfesional,
        usuarioAdminCliente,
        coordinador,
        profesional,
      };
    },
    {
      maxWait: 5000,
      timeout: 30000,
    }
  );

  console.log("");
  console.log("✅ Entorno base SIS creado o actualizado.");
  console.log("");
  console.table([
    {
      empresa: resultado.empresa.nombre,
      nit: resultado.empresa.nit,
      ciudad:
        resultado.empresa.ciudadPrincipal ?? "-",
      direccion:
        resultado.empresa.direccionPrincipal ?? "-",
    },
  ]);
  console.log("");
  console.table([
    {
      rol: "SUPERADMIN",
      correo: CUENTAS_BASE.superusuario.correo,
      contrasena:
        CUENTAS_BASE.superusuario.contrasena,
    },
    {
      rol: "COORDINADOR",
      correo: CUENTAS_BASE.coordinador.correo,
      contrasena:
        CUENTAS_BASE.coordinador.contrasena,
    },
    {
      rol: "PROFESIONAL",
      correo: CUENTAS_BASE.profesional.correo,
      contrasena:
        CUENTAS_BASE.profesional.contrasena,
    },
    {
      rol: "ADMIN_CLIENTE",
      correo: CUENTAS_BASE.adminCliente.correo,
      contrasena:
        CUENTAS_BASE.adminCliente.contrasena,
    },
  ]);
  console.log("");
  console.log(
    "✅ Cristina y Santiago quedaron vinculados a SIS."
  );
  console.log(
    "✅ Jesus quedó vinculado a SIS como administrador cliente."
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "❌ Error ejecutando seed:entorno-base:"
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
