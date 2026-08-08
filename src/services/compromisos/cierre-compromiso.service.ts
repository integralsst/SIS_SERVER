import {
  EstadoActividadCompromiso,
  EstadoAsignacionCompromiso,
  EstadoCompromiso,
  EstadoCumplimientoAspecto,
  EstadoSolicitudCierreCompromiso,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { DecidirCierreCompromisoInput } from "../../types/compromisos/operacion-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import {
  asegurarCompromisoEnEjecucion,
  asegurarResponsableActivoCompromiso,
  asegurarSupervisionCompromiso,
  obtenerCompromisoOperacion,
} from "./acceso-operacion-compromisos.service";
import { registrarHistorialCompromiso } from "./historial-compromiso.service";

async function obtenerRecalificacionCumplida(
  compromisoId: string
) {
  return prisma.compromisoEvaluacionSeguimiento.findFirst({
    where: {
      compromisoId,
      evaluacion: {
        estadoCumplimiento:
          EstadoCumplimientoAspecto.CUMPLIDO,
        calificacionAdministrativa: 5,
      },
    },
    select: {
      evaluacion: {
        select: {
          id: true,
          usuarioRegistradorId: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      evaluacion: {
        createdAt: "desc",
      },
    },
  });
}

async function obtenerActividadesPendientes(
  compromisoId: string
): Promise<number> {
  return prisma.actividadCompromiso.count({
    where: {
      compromisoResponsable: {
        compromisoId,
        estado:
          EstadoAsignacionCompromiso.ASIGNADA,
      },
      estado: {
        not: EstadoActividadCompromiso.ATENDIDA,
      },
    },
  });
}

async function asegurarRequisitosCierre(
  compromisoId: string
) {
  const [actividadesPendientes, recalificacion] =
    await Promise.all([
      obtenerActividadesPendientes(compromisoId),
      obtenerRecalificacionCumplida(compromisoId),
    ]);

  if (actividadesPendientes > 0) {
    throw new ErrorEvaluacion(
      "Todas las actividades activas deben estar atendidas antes de solicitar el cierre.",
      409,
      "ACTIVIDADES_COMPROMISO_PENDIENTES"
    );
  }

  if (!recalificacion) {
    throw new ErrorEvaluacion(
      "El aspecto debe contar con una evaluación posterior calificada en 5 antes de solicitar el cierre.",
      409,
      "RECALIFICACION_CUMPLIDA_REQUERIDA"
    );
  }

  return recalificacion.evaluacion;
}

export async function solicitarCierreCompromiso(
  compromisoId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const compromiso = await obtenerCompromisoOperacion(
    compromisoId
  );

  await asegurarResponsableActivoCompromiso(
    usuario,
    compromiso
  );
  asegurarCompromisoEnEjecucion(compromiso);

  const recalificacion =
    await asegurarRequisitosCierre(compromisoId);

  const solicitudPendiente =
    await prisma.solicitudCierreCompromiso.findFirst({
      where: {
        compromisoId,
        estado:
          EstadoSolicitudCierreCompromiso.PENDIENTE,
      },
      select: {
        id: true,
      },
    });

  if (solicitudPendiente) {
    throw new ErrorEvaluacion(
      "El compromiso ya tiene una solicitud de cierre pendiente.",
      409,
      "SOLICITUD_CIERRE_YA_PENDIENTE"
    );
  }

  return prisma.$transaction(async (tx) => {
    const ultimoIntento =
      await tx.solicitudCierreCompromiso.aggregate({
        where: {
          compromisoId,
        },
        _max: {
          numeroIntento: true,
        },
      });

    const solicitud =
      await tx.solicitudCierreCompromiso.create({
        data: {
          compromisoId,
          solicitadaPorId: usuario.usuarioId,
          evaluacionRecalificacionId:
            recalificacion.id,
          numeroIntento:
            (ultimoIntento._max.numeroIntento ?? 0) + 1,
        },
      });

    await tx.compromiso.update({
      where: {
        id: compromisoId,
      },
      data: {
        estado:
          EstadoCompromiso.SOLICITUD_DE_CIERRE,
      },
    });

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "SOLICITUD_CIERRE",
      entidadId: solicitud.id,
      accion: "SOLICITAR_CIERRE",
      descripcion: `Se solicitó el cierre en el intento ${solicitud.numeroIntento}.`,
      usuarioId: usuario.usuarioId,
      datosDespues: solicitud,
    });

    return {
      id: solicitud.id,
      numeroIntento: solicitud.numeroIntento,
      estado: solicitud.estado,
      compromisoEstado:
        EstadoCompromiso.SOLICITUD_DE_CIERRE,
    };
  });
}

export async function decidirCierreCompromiso(
  compromisoId: string,
  solicitudId: string,
  input: DecidirCierreCompromisoInput,
  usuario: UsuarioSesionEvaluacion
) {
  const compromiso = await obtenerCompromisoOperacion(
    compromisoId
  );

  await asegurarSupervisionCompromiso(
    usuario,
    compromiso
  );

  if (
    compromiso.estado !==
    EstadoCompromiso.SOLICITUD_DE_CIERRE
  ) {
    throw new ErrorEvaluacion(
      "El compromiso no tiene una solicitud de cierre pendiente.",
      409,
      "COMPROMISO_SIN_SOLICITUD_CIERRE"
    );
  }

  const solicitud =
    await prisma.solicitudCierreCompromiso.findFirst({
      where: {
        id: solicitudId,
        compromisoId,
        estado:
          EstadoSolicitudCierreCompromiso.PENDIENTE,
      },
      include: {
        evaluacionRecalificacion: {
          select: {
            usuarioRegistradorId: true,
          },
        },
      },
    });

  if (!solicitud) {
    throw new ErrorEvaluacion(
      "La solicitud de cierre no existe o ya fue decidida.",
      404,
      "SOLICITUD_CIERRE_NO_ENCONTRADA"
    );
  }

  if (
    solicitud.solicitadaPorId === usuario.usuarioId ||
    solicitud.evaluacionRecalificacion
      .usuarioRegistradorId === usuario.usuarioId
  ) {
    throw new ErrorEvaluacion(
      "No puedes decidir una solicitud de cierre que presentaste o cuya recalificación registraste.",
      403,
      "CIERRE_SIN_SEPARACION_FUNCIONES"
    );
  }

  if (input.decision === "APROBAR") {
    const recalificacionActual =
      await asegurarRequisitosCierre(compromisoId);

    if (
      recalificacionActual.id !==
      solicitud.evaluacionRecalificacionId
    ) {
      throw new ErrorEvaluacion(
        "La recalificación cambió después de la solicitud. Devuelve el cierre para que sea solicitado nuevamente.",
        409,
        "RECALIFICACION_CIERRE_DESACTUALIZADA"
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const aprobada = input.decision === "APROBAR";
    const ahora = new Date();
    const solicitudActualizada =
      await tx.solicitudCierreCompromiso.update({
        where: {
          id: solicitudId,
        },
        data: {
          estado: aprobada
            ? EstadoSolicitudCierreCompromiso.APROBADA
            : EstadoSolicitudCierreCompromiso.DEVUELTA,
          decididaPorId: usuario.usuarioId,
          decididaEn: ahora,
          mensajeCierre: aprobada
            ? input.mensaje
            : null,
          observacionesDevolucion: aprobada
            ? null
            : input.mensaje,
        },
      });

    const compromisoEstado = aprobada
      ? EstadoCompromiso.CUMPLIDO
      : EstadoCompromiso.EN_EJECUCION;

    await tx.compromiso.update({
      where: {
        id: compromisoId,
      },
      data: {
        estado: compromisoEstado,
        cerradoEn: aprobada ? ahora : null,
      },
    });

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "SOLICITUD_CIERRE",
      entidadId: solicitudId,
      accion: aprobada
        ? "APROBAR_CIERRE"
        : "DEVOLVER_CIERRE",
      descripcion: aprobada
        ? `Se aprobó el cierre. ${input.mensaje}`
        : `Se devolvió la solicitud de cierre. ${input.mensaje}`,
      usuarioId: usuario.usuarioId,
      datosAntes: solicitud,
      datosDespues: solicitudActualizada,
    });

    return {
      solicitudId,
      solicitudEstado:
        solicitudActualizada.estado,
      compromisoEstado,
    };
  });
}

export async function obtenerProgresoCompromiso(
  compromisoId: string
) {
  const [actividades, evidencias, recalificacion] =
    await Promise.all([
      prisma.actividadCompromiso.findMany({
        where: {
          compromisoResponsable: {
            compromisoId,
            estado:
              EstadoAsignacionCompromiso.ASIGNADA,
          },
        },
        select: {
          estado: true,
        },
      }),
      prisma.compromisoEvidencia.count({
        where: {
          compromisoId,
          activa: true,
        },
      }),
      obtenerRecalificacionCumplida(compromisoId),
    ]);

  const atendidas = actividades.filter(
    (actividad) =>
      actividad.estado ===
      EstadoActividadCompromiso.ATENDIDA
  ).length;

  return {
    actividadesTotal: actividades.length,
    actividadesAtendidas: atendidas,
    actividadesPendientes:
      actividades.length - atendidas,
    evidencias,
    aspectoRecalificadoEnCinco:
      Boolean(recalificacion),
    evaluacionRecalificacionId:
      recalificacion?.evaluacion.id ?? null,
    listoParaSolicitarCierre:
      actividades.length > 0 &&
      atendidas === actividades.length &&
      Boolean(recalificacion),
  };
}
