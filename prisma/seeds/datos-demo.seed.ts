import {
  ClaseRiesgo,
  Prisma,
  RolUsuario,
} from "@prisma/client";

export const EMPRESA_DEMO = {
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

export const CUENTAS_DEMO = {
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

export interface ContrasenasDemoCifradas {
  superadmin: string;
  coordinador: string;
  profesional: string;
}
