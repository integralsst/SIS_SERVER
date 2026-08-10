import {
  EstadoGestionSgsst,
  EstadoRevisionTecnica,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";

export type TipoEventoTrazabilidadAspecto =
  | "EVALUACION"
  | "NO_APLICA"
  | "APROBACION_GESTION"
  | "REVISION_TECNICA"
  | "COMPROMISO";

export interface EventoTrazabilidadAspecto {
  id: string;
  tipo: TipoEventoTrazabilidadAspecto;
  titulo: string;
  descripcion: string;
  estado: string | null;
  createdAt: string;
  usuario: {
    id: string;
    nombre: string;
  } | null;
  referencia: {
    evaluacionId: string | null;
    revisionTecnicaId: string | null;
    compromisoId: string | null;
  };
}

interface HistorialBase {
  id: string;
  estadoCumplimiento: string;
  calificacionAdministrativa: number;
  calificacionEfectiva?: number;
  gestion: {
    estado: string;
    finalizadaEn: string | null;
    profesional: string;
  };
  creadaEn: string;
}

interface CompromisoBase {
  id: string;
  eventos: Array<{
    id: string;
    accion: string;
    descripcion: string;
    createdAt: string;
    usuario: {
      id: string;
      nombre: string;
    };
  }>;
}

interface ResultadoHistorialBase<T extends HistorialBase> {
  historial: T[];
  compromisos: CompromisoBase[];
}

function etiquetaEstadoCumplimiento(estado: string): string {
  const etiquetas: Record<string, string> = {
    CUMPLIDO: "Cumplido",
    PARCIAL: "Parcial",
    NO_CUMPLIDO: "No cumplido",
    NO_APLICA: "No aplica",
  };

  return etiquetas[estado] ?? estado.replaceAll("_", " ");
}

function tituloEventoCompromiso(accion: string): string {
  const titulos: Record<string, string> = {
    CREAR_COMPROMISO: "Compromiso creado",
    ACTUALIZAR_ACTIVIDAD: "Actividad de compromiso actualizada",
    ASIGNAR_RESPONSABLE: "Responsable asignado",
    REASIGNAR_RESPONSABLE: "Responsable reasignado",
    REGISTRAR_SEGUIMIENTO: "Seguimiento de compromiso",
    SOLICITAR_CIERRE: "Cierre solicitado",
    DEVOLVER_CIERRE: "Cierre devuelto",
    APROBAR_CIERRE: "Compromiso cerrado",
    SOLICITAR_AMPLIACION: "Ampliación de plazo solicitada",
    APROBAR_AMPLIACION: "Ampliación de plazo aprobada",
    RECHAZAR_AMPLIACION: "Ampliación de plazo rechazada",
    CANCELAR_COMPROMISO: "Compromiso cancelado",
    RELACIONAR_COMPROMISO_ANTERIOR: "Continuidad con compromiso anterior",
  };

  return titulos[accion] ?? "Movimiento del compromiso";
}

function evento(
  data: Omit<EventoTrazabilidadAspecto, "descripcion"> & {
    descripcion?: string | null;
  }
): EventoTrazabilidadAspecto {
  return {
    ...data,
    descripcion:
      data.descripcion?.trim() || "Movimiento registrado en la trazabilidad del aspecto.",
  };
}

export async function enriquecerHistorialConTrazabilidad<
  T extends HistorialBase,
  R extends ResultadoHistorialBase<T>,
>(resultado: R): Promise<R & { trazabilidad: EventoTrazabilidadAspecto[] }> {
  const evaluacionIds = resultado.historial.map((item) => item.id);

  if (evaluacionIds.length === 0 && resultado.compromisos.length === 0) {
    return {
      ...resultado,
      trazabilidad: [],
    };
  }

  const evaluaciones = evaluacionIds.length
    ? await prisma.evaluacionAspecto.findMany({
        where: {
          id: {
            in: evaluacionIds,
          },
        },
        select: {
          id: true,
          aspectoId: true,
          createdAt: true,
          aspecto: {
            select: {
              codigo: true,
            },
          },
          usuarioRegistrador: {
            select: {
              id: true,
              nombre: true,
            },
          },
          gestion: {
            select: {
              estado: true,
              finalizadaEn: true,
              empresaPeriodo: {
                select: {
                  empresaId: true,
                },
              },
            },
          },
          decisionNoAplica: {
            select: {
              id: true,
              estado: true,
              resultadoEfectivo: true,
              observacionDecision: true,
              solicitadaEn: true,
              decididaEn: true,
              solicitadaPor: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
              decididaPor: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
          aprobacionGestion: {
            select: {
              aprobacionGestion: {
                select: {
                  id: true,
                  estado: true,
                  observacionDecision: true,
                  generadaEn: true,
                  decididaEn: true,
                  decididaPor: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                },
              },
            },
          },
          revisionTecnica: {
            select: {
              id: true,
              estado: true,
              motivoSolicitud: true,
              conceptoTecnico: true,
              motivoAnulacion: true,
              solicitadaEn: true,
              revisadaEn: true,
              anuladaEn: true,
              solicitadaPor: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
              revisadaPor: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
        },
      })
    : [];

  const itemPorId = new Map(resultado.historial.map((item) => [item.id, item]));
  const eventos: EventoTrazabilidadAspecto[] = [];

  for (const evaluacion of evaluaciones) {
    const item = itemPorId.get(evaluacion.id);
    if (!item) continue;

    const nota = item.calificacionEfectiva ?? item.calificacionAdministrativa;
    const invalidada = evaluacion.gestion.estado === EstadoGestionSgsst.INVALIDADA;

    eventos.push(
      evento({
        id: `EVALUACION:${evaluacion.id}`,
        tipo: "EVALUACION",
        titulo: invalidada ? "Evaluación invalidada" : "Evaluación registrada",
        descripcion: `${etiquetaEstadoCumplimiento(
          item.estadoCumplimiento
        )} · Nota efectiva ${nota}.`,
        estado: item.estadoCumplimiento,
        createdAt:
          evaluacion.gestion.finalizadaEn?.toISOString() ??
          evaluacion.createdAt.toISOString(),
        usuario: evaluacion.usuarioRegistrador,
        referencia: {
          evaluacionId: evaluacion.id,
          revisionTecnicaId: null,
          compromisoId: null,
        },
      })
    );

    const noAplica = evaluacion.decisionNoAplica;
    if (noAplica) {
      eventos.push(
        evento({
          id: `NO_APLICA_SOLICITUD:${noAplica.id}`,
          tipo: "NO_APLICA",
          titulo: "No aplica solicitado",
          descripcion: "La solicitud quedó pendiente de decisión de Coordinación con resultado efectivo provisional 3.",
          estado: "PENDIENTE",
          createdAt: noAplica.solicitadaEn.toISOString(),
          usuario: noAplica.solicitadaPor,
          referencia: {
            evaluacionId: evaluacion.id,
            revisionTecnicaId: null,
            compromisoId: null,
          },
        })
      );

      if (noAplica.decididaEn) {
        eventos.push(
          evento({
            id: `NO_APLICA_DECISION:${noAplica.id}`,
            tipo: "NO_APLICA",
            titulo:
              noAplica.estado === "APROBADO"
                ? "No aplica aprobado"
                : "No aplica rechazado",
            descripcion: noAplica.observacionDecision
              ? `Resultado efectivo ${noAplica.resultadoEfectivo.toNumber()}. ${noAplica.observacionDecision}`
              : `Resultado efectivo ${noAplica.resultadoEfectivo.toNumber()}.`,
            estado: noAplica.estado,
            createdAt: noAplica.decididaEn.toISOString(),
            usuario: noAplica.decididaPor,
            referencia: {
              evaluacionId: evaluacion.id,
              revisionTecnicaId: null,
              compromisoId: null,
            },
          })
        );
      }
    }

    const aprobacion = evaluacion.aprobacionGestion?.aprobacionGestion;
    if (aprobacion) {
      eventos.push(
        evento({
          id: `APROBACION_GESTION_SOLICITUD:${aprobacion.id}`,
          tipo: "APROBACION_GESTION",
          titulo: "Gestión enviada a aprobación",
          descripcion: "La evaluación quedó sujeta a una regla de aprobación administrativa.",
          estado: "PENDIENTE",
          createdAt: aprobacion.generadaEn.toISOString(),
          usuario: evaluacion.usuarioRegistrador,
          referencia: {
            evaluacionId: evaluacion.id,
            revisionTecnicaId: null,
            compromisoId: null,
          },
        })
      );

      if (aprobacion.decididaEn) {
        eventos.push(
          evento({
            id: `APROBACION_GESTION_DECISION:${aprobacion.id}`,
            tipo: "APROBACION_GESTION",
            titulo:
              aprobacion.estado === "APROBADA"
                ? "Gestión aprobada"
                : "Gestión rechazada",
            descripcion:
              aprobacion.observacionDecision ??
              (aprobacion.estado === "APROBADA"
                ? "La calificación registrada quedó firme."
                : "Las evaluaciones afectadas quedaron con resultado efectivo 3 hasta su corrección."),
            estado: aprobacion.estado,
            createdAt: aprobacion.decididaEn.toISOString(),
            usuario: aprobacion.decididaPor,
            referencia: {
              evaluacionId: evaluacion.id,
              revisionTecnicaId: null,
              compromisoId: null,
            },
          })
        );
      }
    }

    const revision = evaluacion.revisionTecnica;
    if (revision) {
      eventos.push(
        evento({
          id: `REVISION_TECNICA_SOLICITUD:${revision.id}`,
          tipo: "REVISION_TECNICA",
          titulo: "Revisión técnica solicitada",
          descripcion: revision.motivoSolicitud,
          estado: "PENDIENTE",
          createdAt: revision.solicitadaEn.toISOString(),
          usuario: revision.solicitadaPor,
          referencia: {
            evaluacionId: evaluacion.id,
            revisionTecnicaId: revision.id,
            compromisoId: null,
          },
        })
      );

      if (revision.revisadaEn) {
        eventos.push(
          evento({
            id: `REVISION_TECNICA_DECISION:${revision.id}`,
            tipo: "REVISION_TECNICA",
            titulo:
              revision.estado === EstadoRevisionTecnica.APROBADA
                ? "Revisión técnica aprobada"
                : "Revisión técnica requiere ajustes",
            descripcion:
              revision.conceptoTecnico ??
              "Se registró una decisión técnica sobre la evaluación.",
            estado: revision.estado,
            createdAt: revision.revisadaEn.toISOString(),
            usuario: revision.revisadaPor,
            referencia: {
              evaluacionId: evaluacion.id,
              revisionTecnicaId: revision.id,
              compromisoId: null,
            },
          })
        );
      }

      if (revision.anuladaEn) {
        eventos.push(
          evento({
            id: `REVISION_TECNICA_ANULADA:${revision.id}`,
            tipo: "REVISION_TECNICA",
            titulo: "Revisión técnica anulada",
            descripcion: revision.motivoAnulacion,
            estado: "ANULADA",
            createdAt: revision.anuladaEn.toISOString(),
            usuario: revision.revisadaPor,
            referencia: {
              evaluacionId: evaluacion.id,
              revisionTecnicaId: revision.id,
              compromisoId: null,
            },
          })
        );
      }
    }
  }

  for (const compromiso of resultado.compromisos) {
    for (const registro of compromiso.eventos) {
      // La recalificación ya aparece como Evaluación registrada. Evitamos duplicarla.
      if (registro.accion === "RECALIFICAR_ASPECTO") continue;

      eventos.push(
        evento({
          id: `COMPROMISO:${compromiso.id}:${registro.id}`,
          tipo: "COMPROMISO",
          titulo: tituloEventoCompromiso(registro.accion),
          descripcion: registro.descripcion,
          estado: registro.accion,
          createdAt: registro.createdAt,
          usuario: registro.usuario,
          referencia: {
            evaluacionId: null,
            revisionTecnicaId: null,
            compromisoId: compromiso.id,
          },
        })
      );
    }
  }

  eventos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    ...resultado,
    trazabilidad: eventos,
  };
}
