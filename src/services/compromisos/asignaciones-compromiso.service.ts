import {
  EstadoActividadCompromiso,
  EstadoAsignacionCompromiso,
  EstadoCompromiso,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  ReasignarCompromisoInput,
  RechazarAsignacionCompromisoInput,
} from "../../types/compromisos/operacion-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import {
  asegurarCompromisoEnEjecucion,
  asegurarParticipacionCompromiso,
  asegurarSupervisionCompromiso,
  obtenerCompromisoOperacion,
} from "./acceso-operacion-compromisos.service";
import { registrarHistorialCompromiso } from "./historial-compromiso.service";
import {
  asegurarResponsablesDisponibles,
  listarResponsablesDisponibles,
} from "../evaluacion/compromisos/responsables-disponibles.service";

export async function rechazarAsignacionCompromiso(
  compromisoId: string,
  input: RechazarAsignacionCompromisoInput,
  usuario: UsuarioSesionEvaluacion
) {
  const compromiso = await obtenerCompromisoOperacion(
    compromisoId
  );
  await asegurarParticipacionCompromiso(
    usuario,
    compromiso
  );
  asegurarCompromisoEnEjecucion(compromiso);

  const asignacion =
    await prisma.compromisoResponsable.findFirst({
      where: {
        compromisoId,
        usuarioResponsableId: usuario.usuarioId,
        estado:
          EstadoAsignacionCompromiso.ASIGNADA,
      },
      include: {
        actividad: true,
      },
    });

  if (!asignacion) {
    throw new ErrorEvaluacion(
      "No tienes una asignación activa para rechazar en este compromiso.",
      403,
      "ASIGNACION_COMPROMISO_NO_AUTORIZADA"
    );
  }

  return prisma.$transaction(async (tx) => {
    const rechazada =
      await tx.compromisoResponsable.update({
        where: {
          id: asignacion.id,
        },
        data: {
          estado:
            EstadoAsignacionCompromiso.RECHAZADA,
          rechazadoEn: new Date(),
          motivoRechazo: input.motivo,
        },
      });

    if (asignacion.actividad) {
      await tx.actividadCompromiso.update({
        where: {
          id: asignacion.actividad.id,
        },
        data: {
          estado:
            EstadoActividadCompromiso.ANULADA,
          atendidaEn: null,
          atendidaPorUsuarioId: null,
        },
      });
    }

    await tx.compromiso.update({
      where: {
        id: compromisoId,
      },
      data: {
        estado:
          EstadoCompromiso.PENDIENTE_DE_REASIGNACION,
      },
    });

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "ASIGNACION",
      entidadId: asignacion.id,
      accion: "RECHAZAR_ASIGNACION",
      descripcion: `Se rechazó una asignación. Motivo: ${input.motivo}`,
      usuarioId: usuario.usuarioId,
      datosAntes: asignacion,
      datosDespues: rechazada,
    });

    return {
      asignacionId: rechazada.id,
      estado: rechazada.estado,
      compromisoEstado:
        EstadoCompromiso.PENDIENTE_DE_REASIGNACION,
    };
  });
}

export async function reasignarCompromiso(
  compromisoId: string,
  input: ReasignarCompromisoInput,
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
    EstadoCompromiso.PENDIENTE_DE_REASIGNACION
  ) {
    throw new ErrorEvaluacion(
      "El compromiso no está pendiente de reasignación.",
      409,
      "COMPROMISO_NO_PENDIENTE_REASIGNACION"
    );
  }

  const anterior =
    await prisma.compromisoResponsable.findFirst({
      where: {
        id: input.asignacionRechazadaId,
        compromisoId,
        estado:
          EstadoAsignacionCompromiso.RECHAZADA,
        reemplazadaPor: null,
      },
      include: {
        actividad: true,
      },
    });

  if (!anterior) {
    throw new ErrorEvaluacion(
      "La asignación rechazada ya fue atendida o no pertenece al compromiso.",
      404,
      "ASIGNACION_RECHAZADA_NO_ENCONTRADA"
    );
  }

  if (
    anterior.usuarioResponsableId ===
    input.nuevoUsuarioResponsableId
  ) {
    throw new ErrorEvaluacion(
      "Selecciona una persona diferente para la reasignación.",
      409,
      "MISMO_RESPONSABLE_REASIGNACION"
    );
  }

  const responsablesDisponibles =
    await listarResponsablesDisponibles(
      prisma,
      compromiso.empresaId
    );

  asegurarResponsablesDisponibles(
    responsablesDisponibles,
    [input.nuevoUsuarioResponsableId]
  );

  const asignacionActivaDuplicada =
    await prisma.compromisoResponsable.findFirst({
      where: {
        compromisoId,
        usuarioResponsableId:
          input.nuevoUsuarioResponsableId,
        estado:
          EstadoAsignacionCompromiso.ASIGNADA,
      },
      select: {
        id: true,
      },
    });

  if (asignacionActivaDuplicada) {
    throw new ErrorEvaluacion(
      "La persona seleccionada ya tiene una asignación activa en este compromiso.",
      409,
      "RESPONSABLE_YA_ASIGNADO"
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.compromisoResponsable.update({
      where: {
        id: anterior.id,
      },
      data: {
        estado:
          EstadoAsignacionCompromiso.REEMPLAZADA,
      },
    });

    const nueva =
      await tx.compromisoResponsable.create({
        data: {
          compromisoId,
          usuarioResponsableId:
            input.nuevoUsuarioResponsableId,
          asignadoPorUsuarioId: usuario.usuarioId,
          reemplazaAId: anterior.id,
          tipo: anterior.tipo,
          actividad: {
            create: {
              descripcion:
                anterior.actividad?.descripcion ??
                "Atender el compromiso asignado.",
            },
          },
        },
        include: {
          usuarioResponsable: {
            select: {
              id: true,
              nombre: true,
            },
          },
          actividad: true,
        },
      });

    const pendientes =
      await tx.compromisoResponsable.count({
        where: {
          compromisoId,
          estado:
            EstadoAsignacionCompromiso.RECHAZADA,
          reemplazadaPor: null,
        },
      });

    const compromisoEstado =
      pendientes === 0
        ? EstadoCompromiso.EN_EJECUCION
        : EstadoCompromiso.PENDIENTE_DE_REASIGNACION;

    await tx.compromiso.update({
      where: {
        id: compromisoId,
      },
      data: {
        estado: compromisoEstado,
      },
    });

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "ASIGNACION",
      entidadId: nueva.id,
      accion: "REASIGNAR_COMPROMISO",
      descripcion: `La asignación fue reasignada a ${nueva.usuarioResponsable.nombre}.`,
      usuarioId: usuario.usuarioId,
      datosAntes: anterior,
      datosDespues: nueva,
    });

    return {
      asignacionId: nueva.id,
      responsable: nueva.usuarioResponsable,
      actividad: nueva.actividad,
      compromisoEstado,
    };
  });
}
