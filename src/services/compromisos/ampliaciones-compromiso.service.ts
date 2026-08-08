import {
  DecisionAmpliacionCompromiso,
  EstadoCompromiso,
  EstadoSolicitudAmpliacionCompromiso,
  RolUsuario,
  TipoAprobadorAmpliacionCompromiso,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  DecidirAmpliacionCompromisoInput,
  SolicitarAmpliacionCompromisoInput,
} from "../../types/compromisos/operacion-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  convertirFecha,
  ErrorEvaluacion,
} from "../../utils/evaluacion";
import {
  asegurarCompromisoEnEjecucion,
  asegurarResponsableActivoCompromiso,
  asegurarSupervisionCompromiso,
  obtenerCompromisoOperacion,
} from "./acceso-operacion-compromisos.service";
import { registrarHistorialCompromiso } from "./historial-compromiso.service";

const ROLES_ADMINISTRADOR: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

function tipoAprobadorParaUsuario(
  usuario: UsuarioSesionEvaluacion
): TipoAprobadorAmpliacionCompromiso {
  if (usuario.rol === RolUsuario.COORDINADOR) {
    return TipoAprobadorAmpliacionCompromiso.COORDINADOR;
  }

  if (ROLES_ADMINISTRADOR.includes(usuario.rol)) {
    return TipoAprobadorAmpliacionCompromiso.ADMINISTRADOR;
  }

  throw new ErrorEvaluacion(
    "Tu rol no puede decidir ampliaciones de compromisos.",
    403,
    "APROBACION_AMPLIACION_NO_AUTORIZADA"
  );
}

export async function solicitarAmpliacionCompromiso(
  compromisoId: string,
  input: SolicitarAmpliacionCompromisoInput,
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

  const actual = await prisma.compromiso.findUnique({
    where: {
      id: compromisoId,
    },
    select: {
      fechaLimite: true,
    },
  });

  if (!actual) {
    throw new ErrorEvaluacion(
      "El compromiso seleccionado no existe.",
      404,
      "COMPROMISO_NO_ENCONTRADO"
    );
  }

  const fechaSolicitada = convertirFecha(
    input.fechaLimiteSolicitada,
    "fechaLimiteSolicitada",
    true
  ) as Date;

  if (fechaSolicitada <= actual.fechaLimite) {
    throw new ErrorEvaluacion(
      "La nueva fecha límite debe ser posterior a la fecha límite vigente.",
      400,
      "FECHA_AMPLIACION_INVALIDA"
    );
  }

  const pendiente =
    await prisma.solicitudAmpliacionCompromiso.findFirst({
      where: {
        compromisoId,
        estado:
          EstadoSolicitudAmpliacionCompromiso.PENDIENTE,
      },
      select: {
        id: true,
      },
    });

  if (pendiente) {
    throw new ErrorEvaluacion(
      "El compromiso ya tiene una solicitud de ampliación pendiente.",
      409,
      "SOLICITUD_AMPLIACION_YA_PENDIENTE"
    );
  }

  return prisma.$transaction(async (tx) => {
    const ultima =
      await tx.solicitudAmpliacionCompromiso.aggregate({
        where: {
          compromisoId,
        },
        _max: {
          numeroSolicitud: true,
        },
      });

    const solicitud =
      await tx.solicitudAmpliacionCompromiso.create({
        data: {
          compromisoId,
          solicitadaPorId: usuario.usuarioId,
          numeroSolicitud:
            (ultima._max.numeroSolicitud ?? 0) + 1,
          fechaLimiteAnterior: actual.fechaLimite,
          fechaLimiteSolicitada: fechaSolicitada,
          justificacion: input.justificacion,
        },
      });

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "SOLICITUD_AMPLIACION",
      entidadId: solicitud.id,
      accion: "SOLICITAR_AMPLIACION",
      descripcion: `Se solicitó ampliar la fecha límite del compromiso al ${input.fechaLimiteSolicitada}.`,
      usuarioId: usuario.usuarioId,
      datosDespues: solicitud,
    });

    return {
      id: solicitud.id,
      numeroSolicitud: solicitud.numeroSolicitud,
      estado: solicitud.estado,
      fechaLimiteAnterior:
        solicitud.fechaLimiteAnterior.toISOString(),
      fechaLimiteSolicitada:
        solicitud.fechaLimiteSolicitada.toISOString(),
    };
  });
}

export async function decidirAmpliacionCompromiso(
  compromisoId: string,
  solicitudId: string,
  input: DecidirAmpliacionCompromisoInput,
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
    compromiso.estado === EstadoCompromiso.CUMPLIDO ||
    compromiso.estado === EstadoCompromiso.CANCELADO
  ) {
    throw new ErrorEvaluacion(
      "Un compromiso cerrado o cancelado no admite decisiones de ampliación.",
      409,
      "COMPROMISO_NO_AMPLIABLE"
    );
  }

  const tipoAprobador = tipoAprobadorParaUsuario(usuario);
  const solicitud =
    await prisma.solicitudAmpliacionCompromiso.findFirst({
      where: {
        id: solicitudId,
        compromisoId,
        estado:
          EstadoSolicitudAmpliacionCompromiso.PENDIENTE,
      },
      include: {
        decisiones: true,
      },
    });

  if (!solicitud) {
    throw new ErrorEvaluacion(
      "La solicitud de ampliación no existe o ya fue resuelta.",
      404,
      "SOLICITUD_AMPLIACION_NO_ENCONTRADA"
    );
  }

  if (
    solicitud.decisiones.some(
      (decision) =>
        decision.tipoAprobador === tipoAprobador
    )
  ) {
    throw new ErrorEvaluacion(
      "Ya existe una decisión para este tipo de aprobador.",
      409,
      "APROBACION_AMPLIACION_DUPLICADA"
    );
  }

  const decision =
    input.decision === "APROBAR"
      ? DecisionAmpliacionCompromiso.APROBADA
      : DecisionAmpliacionCompromiso.RECHAZADA;

  return prisma.$transaction(async (tx) => {
    const aprobacion =
      await tx.aprobacionAmpliacionCompromiso.create({
        data: {
          solicitudId,
          decididaPorId: usuario.usuarioId,
          tipoAprobador,
          decision,
          observacion: input.observacion,
        },
      });

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "SOLICITUD_AMPLIACION",
      entidadId: solicitudId,
      accion:
        decision === DecisionAmpliacionCompromiso.APROBADA
          ? "APROBAR_AMPLIACION_PARCIAL"
          : "RECHAZAR_AMPLIACION",
      descripcion:
        decision === DecisionAmpliacionCompromiso.APROBADA
          ? `${tipoAprobador} aprobó la solicitud de ampliación.`
          : `${tipoAprobador} rechazó la solicitud de ampliación.`,
      usuarioId: usuario.usuarioId,
      datosDespues: aprobacion,
    });

    if (decision === DecisionAmpliacionCompromiso.RECHAZADA) {
      const resuelta =
        await tx.solicitudAmpliacionCompromiso.update({
          where: {
            id: solicitudId,
          },
          data: {
            estado:
              EstadoSolicitudAmpliacionCompromiso.RECHAZADA,
            resueltaEn: new Date(),
          },
        });

      return {
        solicitudId,
        solicitudEstado: resuelta.estado,
        fechaLimiteActualizada: false,
      };
    }

    const tiposAprobados = new Set([
      ...solicitud.decisiones
        .filter(
          (registro) =>
            registro.decision ===
            DecisionAmpliacionCompromiso.APROBADA
        )
        .map((registro) => registro.tipoAprobador),
      tipoAprobador,
    ]);

    const aprobacionCompleta =
      tiposAprobados.has(
        TipoAprobadorAmpliacionCompromiso.COORDINADOR
      ) &&
      tiposAprobados.has(
        TipoAprobadorAmpliacionCompromiso.ADMINISTRADOR
      );

    if (!aprobacionCompleta) {
      return {
        solicitudId,
        solicitudEstado:
          EstadoSolicitudAmpliacionCompromiso.PENDIENTE,
        fechaLimiteActualizada: false,
      };
    }

    const [resuelta, compromisoActualizado] =
      await Promise.all([
        tx.solicitudAmpliacionCompromiso.update({
          where: {
            id: solicitudId,
          },
          data: {
            estado:
              EstadoSolicitudAmpliacionCompromiso.APROBADA,
            resueltaEn: new Date(),
          },
        }),
        tx.compromiso.update({
          where: {
            id: compromisoId,
          },
          data: {
            fechaLimite:
              solicitud.fechaLimiteSolicitada,
          },
        }),
      ]);

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "COMPROMISO",
      entidadId: compromisoId,
      accion: "APLICAR_AMPLIACION",
      descripcion: `La ampliación quedó aprobada por coordinación y administración. Nueva fecha límite: ${solicitud.fechaLimiteSolicitada.toISOString().slice(0, 10)}.`,
      usuarioId: usuario.usuarioId,
      datosAntes: {
        fechaLimite: solicitud.fechaLimiteAnterior,
      },
      datosDespues: {
        fechaLimite: compromisoActualizado.fechaLimite,
      },
    });

    return {
      solicitudId,
      solicitudEstado: resuelta.estado,
      fechaLimiteActualizada: true,
      fechaLimite:
        compromisoActualizado.fechaLimite.toISOString(),
    };
  });
}
