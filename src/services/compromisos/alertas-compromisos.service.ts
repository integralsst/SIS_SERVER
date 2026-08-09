import {
  EstadoActividadCompromiso,
  EstadoAsignacionCompromiso,
  EstadoCompromiso,
  EstadoSolicitudAmpliacionCompromiso,
  EstadoSolicitudCierreCompromiso,
  RolUsuario,
  TipoAprobadorAmpliacionCompromiso,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { resolverResultadoEfectivoEvaluacion } from "../evaluacion/resultado-efectivo-evaluacion.service";
import { construirAccesoListadoCompromisos } from "./acceso-compromisos.service";
import { ESTADOS_COMPROMISO_ABIERTOS } from "./fechas-compromiso.service";

const ROLES_SUPERVISION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
];

const ROLES_ADMINISTRADOR: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

type NivelAlerta = "ALTA" | "MEDIA" | "BAJA";

interface AlertaCompromiso {
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

function esRolSupervisor(rol: RolUsuario): boolean {
  return ROLES_SUPERVISION.includes(rol);
}

function tipoAprobadorAmpliacion(
  rol: RolUsuario
): TipoAprobadorAmpliacionCompromiso | null {
  if (rol === RolUsuario.COORDINADOR) {
    return TipoAprobadorAmpliacionCompromiso.COORDINADOR;
  }

  if (ROLES_ADMINISTRADOR.includes(rol)) {
    return TipoAprobadorAmpliacionCompromiso.ADMINISTRADOR;
  }

  return null;
}

function rutaDetalle(
  compromisoId: string,
  supervisor: boolean
): string {
  return supervisor
    ? `/dashboard/compromisos/${compromisoId}`
    : `/dashboard/mis-compromisos/${compromisoId}`;
}

function diasHasta(fecha: Date, hoy: Date): number {
  return Math.ceil(
    (fecha.getTime() - hoy.getTime()) / 86_400_000
  );
}

function descripcionFecha(
  fechaLimite: Date,
  hoy: Date
): string {
  const dias = diasHasta(fechaLimite, hoy);

  if (dias < 0) {
    return `Venció hace ${Math.abs(dias)} día(s).`;
  }

  if (dias === 0) {
    return "Vence hoy.";
  }

  return `Vence en ${dias} día(s).`;
}

function prioridad(nivel: NivelAlerta): number {
  if (nivel === "ALTA") return 1;
  if (nivel === "MEDIA") return 2;
  return 3;
}

export const servicioAlertasCompromisos = {
  listar: async (usuario: UsuarioSesionEvaluacion) => {
    const supervisor = esRolSupervisor(usuario.rol);
    const tipoAprobador = tipoAprobadorAmpliacion(
      usuario.rol
    );
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);

    const compromisos = await prisma.compromiso.findMany({
      where: {
        AND: [
          construirAccesoListadoCompromisos(
            usuario,
            supervisor
              ? "SUPERVISION"
              : "MIS_COMPROMISOS"
          ),
          {
            estado: {
              in: ESTADOS_COMPROMISO_ABIERTOS,
            },
          },
        ],
      },
      select: {
        id: true,
        descripcion: true,
        estado: true,
        fechaLimite: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
          },
        },
        aspecto: {
          select: {
            id: true,
            nombre: true,
          },
        },
        gestionOrigen: {
          select: {
            empresaPeriodo: {
              select: {
                anio: true,
              },
            },
          },
        },
        evaluacionOrigen: {
          select: {
            supermatrizTareaId: true,
          },
        },
        responsables: {
          where: {
            estado: EstadoAsignacionCompromiso.ASIGNADA,
          },
          select: {
            usuarioResponsableId: true,
            usuarioResponsable: {
              select: {
                nombre: true,
              },
            },
            actividad: {
              select: {
                estado: true,
              },
            },
          },
        },
        evaluacionesSeguimiento: {
          select: {
            evaluacion: {
              select: {
                estadoCumplimiento: true,
                calificacionAdministrativa: true,
                decisionNoAplica: {
                  select: {
                    estado: true,
                    resultadoEfectivo: true,
                  },
                },
                aprobacionGestion: {
                  select: {
                    aprobacionGestion: {
                      select: {
                        estado: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        solicitudesCierre: {
          select: {
            estado: true,
            observacionesDevolucion: true,
            solicitadaPorId: true,
            evaluacionRecalificacion: {
              select: {
                usuarioRegistradorId: true,
              },
            },
          },
          orderBy: {
            numeroIntento: "desc",
          },
          take: 1,
        },
        solicitudesAmpliacion: {
          where: {
            estado:
              EstadoSolicitudAmpliacionCompromiso.PENDIENTE,
          },
          select: {
            id: true,
            fechaLimiteSolicitada: true,
            solicitadaPorId: true,
            decisiones: {
              select: {
                tipoAprobador: true,
              },
            },
          },
          orderBy: {
            numeroSolicitud: "desc",
          },
          take: 1,
        },
      },
      orderBy: [
        {
          fechaLimite: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 100,
    });

    const alertas: AlertaCompromiso[] = [];

    for (const compromiso of compromisos) {
      const ruta = rutaDetalle(
        compromiso.id,
        supervisor
      );
      const asignacionPropia =
        compromiso.responsables.find(
          (responsable) =>
            responsable.usuarioResponsableId ===
            usuario.usuarioId
        );
      const actividadPropiaPendiente =
        asignacionPropia?.actividad?.estado ===
        EstadoActividadCompromiso.PENDIENTE;
      const actividadesPendientes =
        compromiso.responsables.filter(
          (responsable) =>
            responsable.actividad?.estado !==
            EstadoActividadCompromiso.ATENDIDA
        ).length;
      const recalificada =
        compromiso.evaluacionesSeguimiento.some(
          (seguimiento) => {
            const resultado =
              resolverResultadoEfectivoEvaluacion(
                seguimiento.evaluacion
              );

            return (
              !resultado.provisional &&
              resultado.calificacion === 5
            );
          }
        );
      const ultimaSolicitud =
        compromiso.solicitudesCierre[0] ?? null;
      const ampliacionPendiente =
        compromiso.solicitudesAmpliacion[0] ?? null;
      const faltaDecisionAmpliacion = Boolean(
        supervisor &&
          tipoAprobador &&
          ampliacionPendiente &&
          !ampliacionPendiente.decisiones.some(
            (decision) =>
              decision.tipoAprobador === tipoAprobador
          )
      );
      const vencida = compromiso.fechaLimite < hoy;
      const base = {
        compromisoId: compromiso.id,
        empresa: compromiso.empresa,
        aspecto: compromiso.aspecto,
        fechaLimite:
          compromiso.fechaLimite.toISOString(),
      };

      if (
        supervisor &&
        compromiso.estado ===
          EstadoCompromiso.PENDIENTE_DE_REASIGNACION
      ) {
        alertas.push({
          ...base,
          id: `REASIGNAR:${compromiso.id}`,
          tipo: "REASIGNACION",
          nivel: "ALTA",
          titulo: "Hay una asignación rechazada",
          descripcion: `${compromiso.empresa.nombre}: reasigna el compromiso del aspecto “${compromiso.aspecto.nombre}”.`,
          accion: {
            etiqueta: "Reasignar ahora",
            ruta,
          },
        });
        continue;
      }

      if (
        supervisor &&
        compromiso.estado ===
          EstadoCompromiso.SOLICITUD_DE_CIERRE &&
        ultimaSolicitud?.estado ===
          EstadoSolicitudCierreCompromiso.PENDIENTE &&
        ultimaSolicitud.solicitadaPorId !==
          usuario.usuarioId &&
        ultimaSolicitud.evaluacionRecalificacion
          .usuarioRegistradorId !== usuario.usuarioId
      ) {
        alertas.push({
          ...base,
          id: `REVISAR_CIERRE:${compromiso.id}`,
          tipo: "REVISION_CIERRE",
          nivel: "ALTA",
          titulo: "Solicitud de cierre por revisar",
          descripcion: `${compromiso.empresa.nombre}: revisa la evidencia, la recalificación y decide el cierre.`,
          accion: {
            etiqueta: "Revisar solicitud",
            ruta,
          },
        });
        continue;
      }

      if (faltaDecisionAmpliacion && ampliacionPendiente) {
        alertas.push({
          ...base,
          id: `REVISAR_AMPLIACION:${compromiso.id}:${ampliacionPendiente.id}`,
          tipo: "REVISION_AMPLIACION",
          nivel: vencida ? "ALTA" : "MEDIA",
          titulo: "Solicitud de ampliación por revisar",
          descripcion: `${compromiso.empresa.nombre}: revisa la solicitud para ampliar el plazo de “${compromiso.aspecto.nombre}” hasta ${ampliacionPendiente.fechaLimiteSolicitada.toISOString().slice(0, 10)}.`,
          accion: {
            etiqueta: "Revisar ampliación",
            ruta,
          },
        });
        continue;
      }

      if (
        ultimaSolicitud?.solicitadaPorId ===
          usuario.usuarioId &&
        ultimaSolicitud?.estado ===
          EstadoSolicitudCierreCompromiso.DEVUELTA
      ) {
        alertas.push({
          ...base,
          id: `ATENDER_DEVOLUCION:${compromiso.id}`,
          tipo: "DEVOLUCION",
          nivel: "ALTA",
          titulo: "Debes atender una devolución",
          descripcion:
            ultimaSolicitud.observacionesDevolucion ??
            "Corrige la gestión solicitada y vuelve a pedir la revisión del cierre.",
          accion: {
            etiqueta: "Corregir y volver a solicitar",
            ruta,
          },
        });
        continue;
      }

      if (actividadPropiaPendiente) {
        alertas.push({
          ...base,
          id: `COMPLETAR_ACTIVIDAD:${compromiso.id}`,
          tipo: "ACTIVIDAD",
          nivel: vencida ? "ALTA" : "MEDIA",
          titulo: "Tienes una actividad pendiente",
          descripcion: `${compromiso.empresa.nombre}: completa tu actividad en “${compromiso.aspecto.nombre}”. ${descripcionFecha(
            compromiso.fechaLimite,
            hoy
          )}`,
          accion: {
            etiqueta: "Completar actividad",
            ruta,
          },
        });
        continue;
      }

      if (
        actividadesPendientes === 0 &&
        !recalificada &&
        supervisor
      ) {
        const tareaId =
          compromiso.evaluacionOrigen
            .supermatrizTareaId;
        const query = new URLSearchParams({
          anio: String(
            compromiso.gestionOrigen.empresaPeriodo
              .anio
          ),
          compromiso: compromiso.id,
          aspecto: compromiso.aspecto.nombre,
        });

        if (tareaId) {
          query.set("tareaId", String(tareaId));
        }

        alertas.push({
          ...base,
          id: `RECALIFICAR:${compromiso.id}`,
          tipo: "RECALIFICACION",
          nivel: vencida ? "ALTA" : "MEDIA",
          titulo: "El aspecto está listo para recalificar",
          descripcion: `Las actividades están completas. Registra una evaluación posterior con resultado efectivo 5 para “${compromiso.aspecto.nombre}”.`,
          accion: {
            etiqueta: "Ir a recalificar",
            ruta: `/dashboard/empresas/${compromiso.empresa.id}/evaluacion?${query.toString()}`,
          },
        });
        continue;
      }

      if (
        actividadesPendientes === 0 &&
        recalificada &&
        asignacionPropia &&
        compromiso.estado ===
          EstadoCompromiso.EN_EJECUCION
      ) {
        alertas.push({
          ...base,
          id: `SOLICITAR_CIERRE:${compromiso.id}`,
          tipo: "SOLICITUD_CIERRE",
          nivel: "MEDIA",
          titulo: "El compromiso está listo para cierre",
          descripcion:
            "Las actividades están completas y la reevaluación tiene resultado efectivo 5. Envía la solicitud de cierre.",
          accion: {
            etiqueta: "Solicitar revisión",
            ruta,
          },
        });
        continue;
      }
    }

    alertas.sort((primera, segunda) => {
      const nivel =
        prioridad(primera.nivel) -
        prioridad(segunda.nivel);

      if (nivel !== 0) return nivel;

      return primera.fechaLimite.localeCompare(
        segunda.fechaLimite
      );
    });

    return {
      resumen: {
        total: alertas.length,
        urgentes: alertas.filter(
          (alerta) => alerta.nivel === "ALTA"
        ).length,
      },
      alertas: alertas.slice(0, 12),
      generadasEn: new Date().toISOString(),
    };
  },
};
