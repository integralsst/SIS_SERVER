import {
  EstadoAprobacionGestion,
  EstadoDecisionNoAplica,
  EstadoGestionSgsst,
  Prisma,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";

type NivelAlerta = "ALTA" | "MEDIA" | "BAJA";

export interface AlertaControlEvaluacion {
  id: string;
  compromisoId: string;
  tipo: string;
  nivel: NivelAlerta;
  titulo: string;
  descripcion: string;
  empresa: {
    id: string;
    nombre: string;
  };
  aspecto: {
    id: number;
    nombre: string;
  };
  fechaLimite: string;
  accion: {
    etiqueta: string;
    ruta: string;
  };
}

export interface OpcionesAlertasControlEvaluacion {
  empresaId?: string;
  limiteConsulta?: number | null;
}

interface CondicionCorreccion {
  empresaId: string;
  identidadHistorica: string;
  despuesDe: Date;
}

const ROLES_ADMINISTRADOR: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

function resolverTake(
  opciones: OpcionesAlertasControlEvaluacion,
  predeterminado: number
): number | undefined {
  return opciones.limiteConsulta === null
    ? undefined
    : opciones.limiteConsulta ?? predeterminado;
}

function rutaEvaluacion(
  empresaId: string,
  anio: number,
  panel: "noAplica" | "aprobaciones"
): string {
  const query = new URLSearchParams({
    anio: String(anio),
    [panel]: "1",
  });

  return `/dashboard/empresas/${empresaId}/evaluacion?${query.toString()}`;
}

async function buscarCorreccionesPosteriores(
  condiciones: CondicionCorreccion[]
) {
  if (condiciones.length === 0) return [];

  const whereOr: Prisma.EvaluacionAspectoWhereInput[] =
    condiciones.map((condicion) => ({
      aspecto: {
        identidadHistorica: condicion.identidadHistorica,
      },
      createdAt: { gt: condicion.despuesDe },
      gestion: {
        estado: EstadoGestionSgsst.FINALIZADA,
        valida: true,
        empresaPeriodo: {
          empresaId: condicion.empresaId,
        },
      },
    }));

  return prisma.evaluacionAspecto.findMany({
    where: { OR: whereOr },
    select: {
      createdAt: true,
      aspecto: {
        select: {
          identidadHistorica: true,
        },
      },
      gestion: {
        select: {
          empresaPeriodo: {
            select: {
              empresaId: true,
            },
          },
        },
      },
    },
  });
}

function tieneCorreccionPosterior(
  correcciones: Awaited<ReturnType<typeof buscarCorreccionesPosteriores>>,
  condicion: CondicionCorreccion
): boolean {
  return correcciones.some(
    (correccion) =>
      correccion.aspecto.identidadHistorica ===
        condicion.identidadHistorica &&
      correccion.gestion.empresaPeriodo.empresaId ===
        condicion.empresaId &&
      correccion.createdAt > condicion.despuesDe
  );
}

async function alertasNoAplicaPendientes(
  usuario: UsuarioSesionEvaluacion,
  opciones: OpcionesAlertasControlEvaluacion
): Promise<AlertaControlEvaluacion[]> {
  if (
    usuario.rol !== RolUsuario.COORDINADOR ||
    !usuario.profesionalId
  ) {
    return [];
  }

  const ahora = new Date();
  const decisiones = await prisma.decisionNoAplica.findMany({
    where: {
      estado: EstadoDecisionNoAplica.PENDIENTE,
      evaluacion: {
        gestion: {
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          empresaPeriodo: {
            empresa: {
              activo: true,
              ...(opciones.empresaId
                ? { id: opciones.empresaId }
                : {}),
              asignacionesProfesionales: {
                some: {
                  profesionalId: usuario.profesionalId,
                  activo: true,
                  OR: [
                    { fechaFin: null },
                    { fechaFin: { gte: ahora } },
                  ],
                },
              },
            },
          },
        },
      },
    },
    orderBy: { solicitadaEn: "asc" },
    take: resolverTake(opciones, 100),
    select: {
      id: true,
      solicitadaEn: true,
      solicitadaPor: { select: { nombre: true } },
      evaluacion: {
        select: {
          aspecto: { select: { id: true, nombre: true } },
          gestion: {
            select: {
              empresaPeriodo: {
                select: {
                  anio: true,
                  empresa: { select: { id: true, nombre: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return decisiones.map((decision) => {
    const periodo = decision.evaluacion.gestion.empresaPeriodo;

    return {
      id: `NO_APLICA_REVISAR:${decision.id}`,
      compromisoId: decision.id,
      tipo: "REVISION_NO_APLICA",
      nivel: "MEDIA",
      titulo: "Solicitud de No aplica por revisar",
      descripcion: `${periodo.empresa.nombre}: ${decision.solicitadaPor.nombre} solicita validar No aplica para “${decision.evaluacion.aspecto.nombre}”.`,
      empresa: periodo.empresa,
      aspecto: decision.evaluacion.aspecto,
      fechaLimite: decision.solicitadaEn.toISOString(),
      accion: {
        etiqueta: "Revisar No aplica",
        ruta: rutaEvaluacion(periodo.empresa.id, periodo.anio, "noAplica"),
      },
    } satisfies AlertaControlEvaluacion;
  });
}

async function alertasNoAplicaRechazadas(
  usuario: UsuarioSesionEvaluacion,
  opciones: OpcionesAlertasControlEvaluacion
): Promise<AlertaControlEvaluacion[]> {
  if (usuario.rol !== RolUsuario.PROFESIONAL) {
    return [];
  }

  const decisiones = await prisma.decisionNoAplica.findMany({
    where: {
      estado: EstadoDecisionNoAplica.RECHAZADO,
      solicitadaPorUsuarioId: usuario.usuarioId,
      decididaEn: { not: null },
      evaluacion: {
        gestion: {
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          ...(opciones.empresaId
            ? {
                empresaPeriodo: {
                  empresaId: opciones.empresaId,
                },
              }
            : {}),
        },
      },
    },
    orderBy: { decididaEn: "desc" },
    take: resolverTake(opciones, 50),
    select: {
      id: true,
      decididaEn: true,
      observacionDecision: true,
      evaluacion: {
        select: {
          aspecto: {
            select: {
              id: true,
              identidadHistorica: true,
              nombre: true,
            },
          },
          gestion: {
            select: {
              empresaPeriodo: {
                select: {
                  anio: true,
                  empresa: { select: { id: true, nombre: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const condiciones: CondicionCorreccion[] = decisiones.flatMap(
    (decision) =>
      decision.decididaEn
        ? [
            {
              empresaId:
                decision.evaluacion.gestion.empresaPeriodo.empresa.id,
              identidadHistorica:
                decision.evaluacion.aspecto.identidadHistorica,
              despuesDe: decision.decididaEn,
            },
          ]
        : []
  );
  const correcciones = await buscarCorreccionesPosteriores(condiciones);

  return decisiones.flatMap((decision) => {
    if (!decision.decididaEn) return [];

    const condicion: CondicionCorreccion = {
      empresaId:
        decision.evaluacion.gestion.empresaPeriodo.empresa.id,
      identidadHistorica:
        decision.evaluacion.aspecto.identidadHistorica,
      despuesDe: decision.decididaEn,
    };

    if (tieneCorreccionPosterior(correcciones, condicion)) {
      return [];
    }

    const periodo = decision.evaluacion.gestion.empresaPeriodo;
    const aspecto = {
      id: decision.evaluacion.aspecto.id,
      nombre: decision.evaluacion.aspecto.nombre,
    };

    return [
      {
        id: `NO_APLICA_RECHAZADO:${decision.id}`,
        compromisoId: decision.id,
        tipo: "NO_APLICA_RECHAZADO",
        nivel: "ALTA",
        titulo: "No aplica rechazado: requiere nueva evaluación",
        descripcion:
          decision.observacionDecision ||
          `${periodo.empresa.nombre}: registra una nueva gestión para corregir “${aspecto.nombre}”.`,
        empresa: periodo.empresa,
        aspecto,
        fechaLimite: decision.decididaEn.toISOString(),
        accion: {
          etiqueta: "Revisar decisión",
          ruta: rutaEvaluacion(periodo.empresa.id, periodo.anio, "noAplica"),
        },
      } satisfies AlertaControlEvaluacion,
    ];
  });
}

async function alertasAprobacionPendientes(
  usuario: UsuarioSesionEvaluacion,
  opciones: OpcionesAlertasControlEvaluacion
): Promise<AlertaControlEvaluacion[]> {
  if (!ROLES_ADMINISTRADOR.includes(usuario.rol)) {
    return [];
  }

  const aprobaciones = await prisma.aprobacionGestion.findMany({
    where: {
      estado: EstadoAprobacionGestion.PENDIENTE,
      gestion: {
        estado: EstadoGestionSgsst.FINALIZADA,
        valida: true,
        usuarioCreadorId: { not: usuario.usuarioId },
        empresaPeriodo: {
          empresa: {
            activo: true,
            ...(opciones.empresaId
              ? { id: opciones.empresaId }
              : {}),
          },
        },
      },
    },
    orderBy: { generadaEn: "asc" },
    take: resolverTake(opciones, 100),
    select: {
      id: true,
      generadaEn: true,
      gestion: {
        select: {
          tipoActividad: true,
          usuarioCreador: { select: { nombre: true } },
          empresaPeriodo: {
            select: {
              anio: true,
              empresa: { select: { id: true, nombre: true } },
            },
          },
        },
      },
      evaluaciones: {
        take: 1,
        select: {
          evaluacion: {
            select: {
              aspecto: { select: { id: true, nombre: true } },
            },
          },
        },
      },
      _count: { select: { evaluaciones: true } },
    },
  });

  return aprobaciones.map((aprobacion) => {
    const periodo = aprobacion.gestion.empresaPeriodo;
    const aspecto =
      aprobacion.evaluaciones[0]?.evaluacion.aspecto ?? {
        id: 0,
        nombre: "Gestión SG-SST",
      };

    return {
      id: `APROBACION_GESTION_REVISAR:${aprobacion.id}`,
      compromisoId: aprobacion.id,
      tipo: "APROBACION_GESTION",
      nivel: "MEDIA",
      titulo: "Gestión pendiente de aprobación",
      descripcion: `${periodo.empresa.nombre}: revisa “${aprobacion.gestion.tipoActividad}” de ${aprobacion.gestion.usuarioCreador.nombre}; afecta ${aprobacion._count.evaluaciones} evaluación(es).`,
      empresa: periodo.empresa,
      aspecto,
      fechaLimite: aprobacion.generadaEn.toISOString(),
      accion: {
        etiqueta: "Revisar gestión",
        ruta: rutaEvaluacion(periodo.empresa.id, periodo.anio, "aprobaciones"),
      },
    } satisfies AlertaControlEvaluacion;
  });
}

async function alertasAprobacionRechazada(
  usuario: UsuarioSesionEvaluacion,
  opciones: OpcionesAlertasControlEvaluacion
): Promise<AlertaControlEvaluacion[]> {
  const aprobaciones = await prisma.aprobacionGestion.findMany({
    where: {
      estado: EstadoAprobacionGestion.RECHAZADA,
      decididaEn: { not: null },
      gestion: {
        usuarioCreadorId: usuario.usuarioId,
        estado: EstadoGestionSgsst.FINALIZADA,
        valida: true,
        ...(opciones.empresaId
          ? {
              empresaPeriodo: {
                empresaId: opciones.empresaId,
              },
            }
          : {}),
      },
    },
    orderBy: { decididaEn: "desc" },
    take: resolverTake(opciones, 30),
    select: {
      id: true,
      decididaEn: true,
      observacionDecision: true,
      gestion: {
        select: {
          tipoActividad: true,
          empresaPeriodo: {
            select: {
              anio: true,
              empresa: { select: { id: true, nombre: true } },
            },
          },
        },
      },
      evaluaciones: {
        select: {
          evaluacion: {
            select: {
              aspecto: {
                select: {
                  id: true,
                  identidadHistorica: true,
                  nombre: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const condiciones: CondicionCorreccion[] = aprobaciones.flatMap(
    (aprobacion) =>
      aprobacion.decididaEn
        ? aprobacion.evaluaciones.map((relacion) => ({
            empresaId: aprobacion.gestion.empresaPeriodo.empresa.id,
            identidadHistorica:
              relacion.evaluacion.aspecto.identidadHistorica,
            despuesDe: aprobacion.decididaEn as Date,
          }))
        : []
  );
  const correcciones = await buscarCorreccionesPosteriores(condiciones);

  return aprobaciones.flatMap((aprobacion) => {
    if (!aprobacion.decididaEn) return [];

    const pendientesCorreccion = aprobacion.evaluaciones
      .filter((relacion) =>
        !tieneCorreccionPosterior(correcciones, {
          empresaId: aprobacion.gestion.empresaPeriodo.empresa.id,
          identidadHistorica:
            relacion.evaluacion.aspecto.identidadHistorica,
          despuesDe: aprobacion.decididaEn as Date,
        })
      )
      .map((relacion) => ({
        id: relacion.evaluacion.aspecto.id,
        nombre: relacion.evaluacion.aspecto.nombre,
      }));

    if (pendientesCorreccion.length === 0) return [];

    const periodo = aprobacion.gestion.empresaPeriodo;

    return [
      {
        id: `APROBACION_GESTION_RECHAZADA:${aprobacion.id}`,
        compromisoId: aprobacion.id,
        tipo: "APROBACION_GESTION_RECHAZADA",
        nivel: "ALTA",
        titulo: "Gestión rechazada: requiere corrección",
        descripcion:
          aprobacion.observacionDecision ||
          `${periodo.empresa.nombre}: corrige ${pendientesCorreccion.length} evaluación(es) mediante una nueva gestión.`,
        empresa: periodo.empresa,
        aspecto: pendientesCorreccion[0],
        fechaLimite: aprobacion.decididaEn.toISOString(),
        accion: {
          etiqueta: "Revisar rechazo",
          ruta: rutaEvaluacion(periodo.empresa.id, periodo.anio, "aprobaciones"),
        },
      } satisfies AlertaControlEvaluacion,
    ];
  });
}

export const servicioAlertasControlEvaluacion = {
  listar: async (
    usuario: UsuarioSesionEvaluacion,
    opciones: OpcionesAlertasControlEvaluacion = {}
  ): Promise<AlertaControlEvaluacion[]> => {
    const [
      noAplicaPendientes,
      noAplicaRechazadas,
      aprobacionesPendientes,
      aprobacionesRechazadas,
    ] = await Promise.all([
      alertasNoAplicaPendientes(usuario, opciones),
      alertasNoAplicaRechazadas(usuario, opciones),
      alertasAprobacionPendientes(usuario, opciones),
      alertasAprobacionRechazada(usuario, opciones),
    ]);

    return [
      ...noAplicaPendientes,
      ...noAplicaRechazadas,
      ...aprobacionesPendientes,
      ...aprobacionesRechazadas,
    ];
  },
};
