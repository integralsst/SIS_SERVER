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

export const EMPRESAS_DEMO_ADICIONALES = [
  {
    nit: "901111222-3",
    nombre: "Industrias Andinas Demo S.A.S.",
    ciudadPrincipal: "Dosquebradas",
    direccionPrincipal: "Zona Industrial La Pradera",
    correoEmpresa: "andinas.demo@stack4four.com",
    descripcionEmpresa:
      "Escenario demo con compromisos, actividades y recalificación pendiente.",
    claseRiesgoPrincipal: ClaseRiesgo.IV,
    codigoActividadEconomica: "2599",
    descripcionActividadEconomica:
      "Fabricación de otros productos elaborados de metal.",
    nombreGerente: "Gerencia Andinas Demo",
    correoGerente: "gerencia.andinas.demo@stack4four.com",
    nombreContactoSst: "SST Andinas Demo",
    correoContactoSst: "sst.andinas.demo@stack4four.com",
    visitasSstConvenidas: 18,
    visitasEmergenciasConvenidas: 6,
  },
  {
    nit: "901222333-4",
    nombre: "Comercializadora Cafetera Demo S.A.S.",
    ciudadPrincipal: "Manizales",
    direccionPrincipal: "Avenida Santander 44-20",
    correoEmpresa: "cafetera.demo@stack4four.com",
    descripcionEmpresa:
      "Escenario demo con No aplica y revisión técnica pendientes.",
    claseRiesgoPrincipal: ClaseRiesgo.III,
    codigoActividadEconomica: "4631",
    descripcionActividadEconomica:
      "Comercio al por mayor de productos alimenticios.",
    nombreGerente: "Gerencia Cafetera Demo",
    correoGerente: "gerencia.cafetera.demo@stack4four.com",
    nombreContactoSst: "SST Cafetera Demo",
    correoContactoSst: "sst.cafetera.demo@stack4four.com",
    visitasSstConvenidas: 12,
    visitasEmergenciasConvenidas: 4,
  },
  {
    nit: "901333444-5",
    nombre: "Logística del Eje Demo S.A.S.",
    ciudadPrincipal: "Armenia",
    direccionPrincipal: "Parque Logístico del Eje Bodega 44",
    correoEmpresa: "logistica.demo@stack4four.com",
    descripcionEmpresa:
      "Escenario demo con gestión pendiente de aprobación y aspectos por calificar.",
    claseRiesgoPrincipal: ClaseRiesgo.IV,
    codigoActividadEconomica: "4923",
    descripcionActividadEconomica:
      "Transporte de carga por carretera.",
    nombreGerente: "Gerencia Logística Demo",
    correoGerente: "gerencia.logistica.demo@stack4four.com",
    nombreContactoSst: "SST Logística Demo",
    correoContactoSst: "sst.logistica.demo@stack4four.com",
    visitasSstConvenidas: 16,
    visitasEmergenciasConvenidas: 6,
  },
] satisfies Prisma.EmpresaUncheckedCreateInput[];

export const EMPRESAS_DEMO = [
  EMPRESA_DEMO,
  ...EMPRESAS_DEMO_ADICIONALES,
];

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
  adminCliente: {
    nombre: "Andrea Admin Cliente Demo",
    correo:
      "admin.cliente.demo@stack4four.com",
    contrasena:
      "Stack44Cliente2026!",
    rol: RolUsuario.ADMIN_CLIENTE,
  },
} as const;

export interface ContrasenasDemoCifradas {
  superadmin: string;
  coordinador: string;
  profesional: string;
  adminCliente: string;
}
