import {
  EstadoAsignacionCompromiso,
  Prisma,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import { construirAccesoDetalleCompromiso } from "./acceso-compromisos.service";
import { obtenerVentanaVencimiento } from "./fechas-compromiso.service";
import {
  seleccionCompromisoListado,
  serializarCompromisoListado,
} from "./presentacion-compromiso.service";
import { obtenerProgresoCompromiso } from "./cierre-compromiso.service";
import { esRolSupervisorCompromiso } from "./acceso-operacion-compromisos.service";
import { listarResponsablesDisponibles } from "../evaluacion/compromisos/responsables-disponibles.service";

const ROLES_CLIENTE_DETALLE: RolUsuario[] = [
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
];

export async function obtenerDetalleCompromiso(
  compromisoId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const esUsuarioCliente =
    ROLES_CLIENTE_DETALLE.includes(usuario.rol);

  const compromiso =
    await prisma.compromiso.findFirst({
      where: {
        AND: [
          {
            id: compromisoId,
          },
          construirAccesoDetalleCompromiso(
            usuario
          ),
        ],
      },
      select: {
        ...seleccionCompromisoListado,
        responsables: {
          select: {
            id: true,
            tipo: true,
            estado: true,
            asignadoEn: true,
            rechazadoEn: true,
            motivoRechazo: true,
            reemplazaAId: true,
            usuarioResponsable: {
              select: {
                id: true,
                nombre: true,
                correo: true,
                rol: true,
              },
            },
            actividad: {
              select: {
                id: true,
                descripcion: true,
                estado: true,
                atendidaEn: true,
              },
            },
          },
          orderBy: {
            asignadoEn: "asc",
          },
        },
        evaluacionOrigen: {
          select: {
            id: true,
            supermatrizTarea: {
              select: {
                proceso: {
                  select: {
                    id: true,
                    codigo: true,
                    nombre: true,
                  },
                },
              },
            },
            estadoCumplimiento: true,
            calificacionAdministrativa: true,
            observacion: true,
            createdAt: true,
          },
        },
        evaluacionesSeguimiento: {
          select: {
            createdAt: true,
            evaluacion: {
              select: {
                id: true,
                estadoCumplimiento: true,
                calificacionAdministrativa: true,
                observacion: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        seguimientos: {
          where: esUsuarioCliente
            ? {
                OR: [
                  {
                    visibleCliente: true,
                  },
                  {
                    usuarioId: usuario.usuarioId,
                  },
                ],
              }
            : undefined,
          select: {
            id: true,
            fechaSeguimiento: true,
            descripcion: true,
            origen: true,
            visibleCliente: true,
            actividadId: true,
            usuario: {
              select: {
                id: true,
                nombre: true,
                rol: true,
              },
            },
          },
          orderBy: {
            fechaSeguimiento: "desc",
          },
          take: 50,
        },
        evidencias: {
          where: {
            activa: true,
            ...(esUsuarioCliente
              ? {
                  OR: [
                    {
                      visibleCliente: true,
                    },
                    {
                      creadoPorUsuarioId:
                        usuario.usuarioId,
                    },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            nombre: true,
            url: true,
            descripcion: true,
            fechaDocumento: true,
            visibleCliente: true,
            createdAt: true,
            creadoPor: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        historial: {
          where: esUsuarioCliente
            ? {
                usuarioId: usuario.usuarioId,
              }
            : undefined,
          select: {
            id: true,
            entidadTipo: true,
            entidadId: true,
            accion: true,
            descripcion: true,
            createdAt: true,
            usuario: {
              select: {
                id: true,
                nombre: true,
                rol: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
        },
        solicitudesCierre: {
          select: {
            id: true,
            numeroIntento: true,
            estado: true,
            solicitadaEn: true,
            decididaEn: true,
            mensajeCierre: true,
            observacionesDevolucion: true,
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
            evaluacionRecalificacion: {
              select: {
                id: true,
                calificacionAdministrativa: true,
                estadoCumplimiento: true,
                createdAt: true,
                usuarioRegistradorId: true,
              },
            },
          },
          orderBy: {
            numeroIntento: "desc",
          },
        },
      },
    });

  if (!compromiso) {
    throw new ErrorEvaluacion(
      "El compromiso no existe o no está dentro de tu alcance.",
      404,
      "COMPROMISO_NO_ENCONTRADO"
    );
  }

  const {
    hoy,
    limiteProximo,
  } = obtenerVentanaVencimiento();

  const progreso = await obtenerProgresoCompromiso(
    compromisoId
  );
  const supervisor =
    esRolSupervisorCompromiso(usuario.rol);
  const asignacionActiva = compromiso.responsables.find(
    (responsable) =>
      responsable.estado ===
        EstadoAsignacionCompromiso.ASIGNADA &&
      responsable.usuarioResponsable.id ===
        usuario.usuarioId
  );
  const solicitudPendiente =
    compromiso.solicitudesCierre.find(
      (solicitud) =>
        solicitud.estado === "PENDIENTE"
    ) ?? null;
  const estadoEditable = [
    "EN_EJECUCION",
    "PENDIENTE_DE_REASIGNACION",
  ].includes(compromiso.estado);
  const puedeDecidirCierre = Boolean(
    supervisor &&
      compromiso.estado ===
        "SOLICITUD_DE_CIERRE" &&
      solicitudPendiente &&
      solicitudPendiente.solicitadaPor.id !==
        usuario.usuarioId &&
      solicitudPendiente.evaluacionRecalificacion
        .usuarioRegistradorId !== usuario.usuarioId
  );

  const responsablesDisponibles = supervisor
    ? await listarResponsablesDisponibles(
        prisma,
        compromiso.empresa.id
      )
    : [];

  return {
    ...serializarCompromisoListado(
      compromiso,
      hoy,
      limiteProximo
    ),
    evaluacionOrigen: {
      id: compromiso.evaluacionOrigen.id,
      estadoCumplimiento:
        compromiso.evaluacionOrigen.estadoCumplimiento,
      observacion:
        compromiso.evaluacionOrigen.observacion,
      calificacionAdministrativa:
        compromiso.evaluacionOrigen.calificacionAdministrativa.toNumber(),
      createdAt:
        compromiso.evaluacionOrigen.createdAt.toISOString(),
    },
    evaluacionesSeguimiento:
      compromiso.evaluacionesSeguimiento.map(
        (seguimiento) => ({
          ...seguimiento,
          createdAt:
            seguimiento.createdAt.toISOString(),
          evaluacion: {
            ...seguimiento.evaluacion,
            calificacionAdministrativa:
              seguimiento.evaluacion.calificacionAdministrativa.toNumber(),
            createdAt:
              seguimiento.evaluacion.createdAt.toISOString(),
          },
        })
      ),
    seguimientos:
      compromiso.seguimientos.map(
        (seguimiento) => ({
          ...seguimiento,
          fechaSeguimiento:
            seguimiento.fechaSeguimiento.toISOString(),
        })
      ),
    evidencias:
      compromiso.evidencias.map(
        (evidencia) => ({
          ...evidencia,
          fechaDocumento:
            evidencia.fechaDocumento?.toISOString() ??
            null,
          createdAt:
            evidencia.createdAt.toISOString(),
        })
      ),
    historial:
      compromiso.historial.map(
        (registro) => ({
          ...registro,
          createdAt:
            registro.createdAt.toISOString(),
        })
      ),
    solicitudesCierre:
      compromiso.solicitudesCierre.map(
        (solicitud) => ({
          ...solicitud,
          solicitadaEn:
            solicitud.solicitadaEn.toISOString(),
          decididaEn:
            solicitud.decididaEn?.toISOString() ??
            null,
          evaluacionRecalificacion: {
            id: solicitud.evaluacionRecalificacion.id,
            calificacionAdministrativa:
              solicitud.evaluacionRecalificacion.calificacionAdministrativa.toNumber(),
            estadoCumplimiento:
              solicitud.evaluacionRecalificacion.estadoCumplimiento,
            createdAt:
              solicitud.evaluacionRecalificacion.createdAt.toISOString(),
          },
        })
      ),
    progreso,
    operacion: {
      puedeRegistrarSeguimiento:
        estadoEditable &&
        Boolean(supervisor || asignacionActiva),
      puedeCargarEvidencia:
        estadoEditable &&
        Boolean(supervisor || asignacionActiva),
      puedeGestionarActividades:
        compromiso.estado === "EN_EJECUCION" &&
        Boolean(asignacionActiva),
      puedeRechazarAsignacion:
        compromiso.estado === "EN_EJECUCION" &&
        !esUsuarioCliente &&
        Boolean(asignacionActiva),
      puedeReasignar:
        supervisor &&
        compromiso.estado ===
          "PENDIENTE_DE_REASIGNACION",
      puedeSolicitarCierre:
        compromiso.estado === "EN_EJECUCION" &&
        Boolean(asignacionActiva) &&
        progreso.listoParaSolicitarCierre,
      puedeDecidirCierre,
      esSupervisor: supervisor,
      esUsuarioCliente,
      usuarioId: usuario.usuarioId,
      motivoBloqueoCierre: progreso.listoParaSolicitarCierre
        ? null
        : progreso.actividadesPendientes > 0
          ? "Todavía hay actividades pendientes."
          : !progreso.aspectoRecalificadoEnCinco
            ? "El aspecto debe ser recalificado en 5 en una evaluación posterior."
            : "El compromiso todavía no reúne los requisitos de cierre.",
    },
    responsablesDisponibles,
  };
}
