import {
  EstadoAprobacionGestion,
  EstadoDecisionNoAplica,
  EstadoGestionSgsst,
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

const ROLES_ADMINISTRADOR: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

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

async function tieneEvaluacionPosterior(
  empresaPeriodoId: string,
  aspectoId: number,
  despuesDe: Date
): Promise<boolean> {
  const posterior = await prisma.evaluacionAspecto.findFirst({
    where: {
      aspectoId,
      createdAt: {
        gt: despuesDe,
      },
      gestion: {
        empresaPeriodoId,
        estado: EstadoGestionSgsst.FINALIZADA,
        valida: true,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(posterior);
}

async function alertasNoAplicaPendientes(
  usuario: UsuarioSesionEvaluacion
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
              asignacionesProfesionales: {
                some: {
                  profesionalId: usuario.profesionalId,
                  activo: true,
                  OR: [
                    {
                      fechaFin: null,
                    },
                    {
                      fechaFin: {
                        gte: ahora,
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      solicitadaEn: "asc",
    },
    take: 100,
    select: {
      id: true,
      solicitadaEn: true,
      solicitadaPor: {
        select: {
          nombre: true,
        },
      },
      evaluacion: {
        select: {
          aspecto: {
            select: {
              id: true,
              nombre: true,
            },
          },
          gestion: {
            select: {
              empresaPeriodo: {
                select: {
                  anio: true,
                  empresa: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return decisiones.map((decision) => {
    const periodo =
      decision.evaluacion.gestion.empresaPeriodo;

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
        ruta: rutaEvaluacion(
          periodo.empresa.id,
          periodo.anio,
          "noAplica"
        ),
      },
    } satisfies AlertaControlEvaluacion;
  });
}

async function alertasNoAplicaRechazadas(
  usuario: UsuarioSesionEvaluacion
): Promise<AlertaControlEvaluacion[]> {
  if (usuario.rol !== RolUsuario.PROFESIONAL) {
    return [];
  }

  const decisiones = await prisma.decisionNoAplica.findMany({
    where: {
      estado: EstadoDecisionNoAplica.RECHAZADO,
      solicitadaPorUsuarioId: usuario.usuarioId,
      decididaEn: {
        not: null,
      },
      evaluacion: {
        gestion: {
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
        },
      },
    },
    orderBy: {
      decididaEn: "desc",
    },
    take: 50,
    select: {
      id: true,
      decididaEn: true,
      observacionDecision: true,
      evaluacion: {
        select: {
          aspectoId: true,
          aspecto: {
            select: {
              id: true,
              nombre: true,
            },
          },
          gestion: {
            select: {
              empresaPeriodoId: true,
              empresaPeriodo: {
                select: {
                  anio: true,
                  empresa: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const alertas: AlertaControlEvaluacion[] = [];

  for (const decision of decisiones) {
    if (!decision.decididaEn) continue;

    const corregida = await tieneEvaluacionPosterior(
      decision.evaluacion.gestion.empresaPeriodoId,
      decision.evaluacion.aspectoId,
      decision.decididaEn
    );

    if (corregida) continue;

    const periodo =
      decision.evaluacion.gestion.empresaPeriodo;

    alertas.push({
      id: `NO_APLICA_RECHAZADO:${decision.id}`,
      compromisoId: decision.id,
      tipo: "NO_APLICA_RECHAZADO",
      nivel: "ALTA",
      titulo: "No aplica rechazado: requiere nueva evaluación",
      descripcion:
        decision.observacionDecision ||
        `${periodo.empresa.nombre}: registra una nueva gestión para corregir “${decision.evaluacion.aspecto.nombre}”.`,
      empresa: periodo.empresa,
      aspecto: decision.evaluacion.aspecto,
      fechaLimite: decision.decididaEn.toISOString(),
      accion: {
        etiqueta: "Revisar decisión",
        ruta: rutaEvaluacion(
          periodo.empresa.id,
          periodo.anio,
          "noAplica"
        ),
      },
    });
  }

  return alertas;
}

async function alertasAprobacionPendientes(
  usuario: UsuarioSesionEvaluacion
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
        usuarioCreadorId: {
          not: usuario.usuarioId,
        },
        empresaPeriodo: {
          empresa: {
            activo: true,
          },
        },
      },
    },
    orderBy: {
      generadaEn: "asc",
    },
    take: 100,
    select: {
      id: true,
      generadaEn: true,
      gestion: {
        select: {
          tipoActividad: true,
          usuarioCreador: {
            select: {
              nombre: true,
            },
          },
          empresaPeriodo: {
            select: {
              anio: true,
              empresa: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
        },
      },
      evaluaciones: {
        take: 1,
        select: {
          evaluacion: {
            select: {
              aspecto: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          evaluaciones: true,
        },
      },
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
        ruta: rutaEvaluacion(
          periodo.empresa.id,
          periodo.anio,
          "aprobaciones"
        ),
      },
    } satisfies AlertaControlEvaluacion;
  });
}

async function alertasAprobacionRechazada(
  usuario: UsuarioSesionEvaluacion
): Promise<AlertaControlEvaluacion[]> {
  const aprobaciones = await prisma.aprobacionGestion.findMany({
    where: {
      estado: EstadoAprobacionGestion.RECHAZADA,
      decididaEn: {
        not: null,
      },
      gestion: {
        usuarioCreadorId: usuario.usuarioId,
        estado: EstadoGestionSgsst.FINALIZADA,
        valida: true,
      },
    },
    orderBy: {
      decididaEn: "desc",
    },
    take: 30,
    select: {
      id: true,
      decididaEn: true,
      observacionDecision: true,
      gestion: {
        select: {
          tipoActividad: true,
          empresaPeriodoId: true,
          empresaPeriodo: {
            select: {
              anio: true,
              empresa: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
        },
      },
      evaluaciones: {
        select: {
          evaluacion: {
            select: {
              aspectoId: true,
              aspecto: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const alertas: AlertaControlEvaluacion[] = [];

  for (const aprobacion of aprobaciones) {
    if (!aprobacion.decididaEn) continue;

    const pendientesCorreccion = [];

    for (const relacion of aprobacion.evaluaciones) {
      const corregida = await tieneEvaluacionPosterior(
        aprobacion.gestion.empresaPeriodoId,
        relacion.evaluacion.aspectoId,
        aprobacion.decididaEn
      );

      if (!corregida) {
        pendientesCorreccion.push(relacion.evaluacion.aspecto);
      }
    }

    if (pendientesCorreccion.length === 0) continue;

    const periodo = aprobacion.gestion.empresaPeriodo;
    const aspecto = pendientesCorreccion[0];

    alertas.push({
      id: `APROBACION_GESTION_RECHAZADA:${aprobacion.id}`,
      compromisoId: aprobacion.id,
      tipo: "APROBACION_GESTION_RECHAZADA",
      nivel: "ALTA",
      titulo: "Gestión rechazada: requiere corrección",
      descripcion:
        aprobacion.observacionDecision ||
        `${periodo.empresa.nombre}: corrige ${pendientesCorreccion.length} evaluación(es) mediante una nueva gestión.`,
      empresa: periodo.empresa,
      aspecto,
      fechaLimite: aprobacion.decididaEn.toISOString(),
      accion: {
        etiqueta: "Revisar rechazo",
        ruta: rutaEvaluacion(
          periodo.empresa.id,
          periodo.anio,
          "aprobaciones"
        ),
      },
    });
  }

  return alertas;
}

export const servicioAlertasControlEvaluacion = {
  listar: async (
    usuario: UsuarioSesionEvaluacion
  ): Promise<AlertaControlEvaluacion[]> => {
    const [
      noAplicaPendientes,
      noAplicaRechazadas,
      aprobacionesPendientes,
      aprobacionesRechazadas,
    ] = await Promise.all([
      alertasNoAplicaPendientes(usuario),
      alertasNoAplicaRechazadas(usuario),
      alertasAprobacionPendientes(usuario),
      alertasAprobacionRechazada(usuario),
    ]);

    return [
      ...noAplicaPendientes,
      ...noAplicaRechazadas,
      ...aprobacionesPendientes,
      ...aprobacionesRechazadas,
    ];
  },
};
