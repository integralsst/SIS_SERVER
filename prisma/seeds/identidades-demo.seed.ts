import {
  Prisma,
  TipoIdentificacion,
} from "@prisma/client";

import {
  CUENTAS_DEMO,
  EMPRESA_DEMO,
  EMPRESAS_DEMO_ADICIONALES,
  type ContrasenasDemoCifradas,
} from "./datos-demo.seed";

export async function crearIdentidadesDemo(
  tx: Prisma.TransactionClient,
  contrasenas: ContrasenasDemoCifradas
) {
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

  const empresasAdicionales = [];

  for (const datosEmpresa of EMPRESAS_DEMO_ADICIONALES) {
    const empresaAdicional = await tx.empresa.upsert({
      where: {
        nit: datosEmpresa.nit,
      },
      update: {
        ...datosEmpresa,
        activo: true,
      },
      create: {
        ...datosEmpresa,
        activo: true,
      },
    });

    empresasAdicionales.push(empresaAdicional);
  }

  const superadmin =
    await tx.usuario.upsert({
      where: {
        correo:
          CUENTAS_DEMO.superadmin.correo,
      },
      update: {
        nombre:
          CUENTAS_DEMO.superadmin.nombre,
        contrasena:
          contrasenas.superadmin,
        rol:
          CUENTAS_DEMO.superadmin.rol,
        empresaId: null,
        activo: true,
      },
      create: {
        nombre:
          CUENTAS_DEMO.superadmin.nombre,
        correo:
          CUENTAS_DEMO.superadmin.correo,
        contrasena:
          contrasenas.superadmin,
        rol:
          CUENTAS_DEMO.superadmin.rol,
        empresaId: null,
        activo: true,
      },
    });

  const usuarioCoordinador =
    await tx.usuario.upsert({
      where: {
        correo:
          CUENTAS_DEMO.coordinador.correo,
      },
      update: {
        nombre:
          CUENTAS_DEMO.coordinador.nombre,
        contrasena:
          contrasenas.coordinador,
        rol:
          CUENTAS_DEMO.coordinador.rol,
        empresaId: null,
        activo: true,
      },
      create: {
        nombre:
          CUENTAS_DEMO.coordinador.nombre,
        correo:
          CUENTAS_DEMO.coordinador.correo,
        contrasena:
          contrasenas.coordinador,
        rol:
          CUENTAS_DEMO.coordinador.rol,
        empresaId: null,
        activo: true,
      },
    });

  const usuarioProfesional =
    await tx.usuario.upsert({
      where: {
        correo:
          CUENTAS_DEMO.profesional.correo,
      },
      update: {
        nombre:
          CUENTAS_DEMO.profesional.nombre,
        contrasena:
          contrasenas.profesional,
        rol:
          CUENTAS_DEMO.profesional.rol,
        empresaId: null,
        activo: true,
      },
      create: {
        nombre:
          CUENTAS_DEMO.profesional.nombre,
        correo:
          CUENTAS_DEMO.profesional.correo,
        contrasena:
          contrasenas.profesional,
        rol:
          CUENTAS_DEMO.profesional.rol,
        empresaId: null,
        activo: true,
      },
    });

  const usuarioAdminCliente =
    await tx.usuario.upsert({
      where: {
        correo:
          CUENTAS_DEMO.adminCliente.correo,
      },
      update: {
        nombre:
          CUENTAS_DEMO.adminCliente.nombre,
        contrasena:
          contrasenas.adminCliente,
        rol:
          CUENTAS_DEMO.adminCliente.rol,
        empresaId: empresa.id,
        activo: true,
      },
      create: {
        nombre:
          CUENTAS_DEMO.adminCliente.nombre,
        correo:
          CUENTAS_DEMO.adminCliente.correo,
        contrasena:
          contrasenas.adminCliente,
        rol:
          CUENTAS_DEMO.adminCliente.rol,
        empresaId: empresa.id,
        activo: true,
      },
    });

  const profesionalCoordinador =
    await crearOActualizarProfesional(
      tx,
      {
        correo:
          CUENTAS_DEMO.coordinador.correo,
        numeroIdentificacion:
          "1000000044",
        nombres: "Carlos",
        apellidos:
          "Coordinador Demo",
        cargo:
          "Coordinador SG-SST",
        rolProfesional:
          "Coordinación operativa",
        celular: "3000000044",
        usuarioId:
          usuarioCoordinador.id,
      }
    );

  const profesionalEjecutor =
    await crearOActualizarProfesional(
      tx,
      {
        correo:
          CUENTAS_DEMO.profesional.correo,
        numeroIdentificacion:
          "1000000045",
        nombres: "Laura",
        apellidos:
          "Martínez Demo",
        cargo:
          "Profesional SG-SST",
        rolProfesional:
          "Gestión documental e intervención",
        celular: "3000000045",
        usuarioId:
          usuarioProfesional.id,
      }
    );

  return {
    empresa,
    empresas: [
      empresa,
      ...empresasAdicionales,
    ],
    superadmin,
    usuarioCoordinador,
    usuarioProfesional,
    usuarioAdminCliente,
    profesionalCoordinador,
    profesionalEjecutor,
  };
}

interface DatosProfesionalDemo {
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
  datos: DatosProfesionalDemo
) {
  const existente =
    await tx.profesional.findFirst({
      where: {
        OR: [
          {
            correo: datos.correo,
          },
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
    tipoIdentificacion:
      TipoIdentificacion.CC,
    numeroIdentificacion:
      datos.numeroIdentificacion,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    cargo: datos.cargo,
    profesion:
      "Profesional en Seguridad y Salud en el Trabajo",
    rolProfesional:
      datos.rolProfesional,
    correo: datos.correo,
    celular: datos.celular,
    direccion:
      "Pereira, Risaralda",
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
