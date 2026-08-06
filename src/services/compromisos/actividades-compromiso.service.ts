import {
  EstadoActividadCompromiso,
  EstadoAsignacionCompromiso,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { CambiarEstadoActividadCompromisoInput } from "../../types/compromisos/operacion-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import {
  asegurarCompromisoEnEjecucion,
  asegurarParticipacionCompromiso,
  esRolSupervisorCompromiso,
  obtenerCompromisoOperacion,
} from "./acceso-operacion-compromisos.service";
import { registrarHistorialCompromiso } from "./historial-compromiso.service";

export async function cambiarEstadoActividadCompromiso(
  compromisoId: string,
  actividadId: string,
  input: CambiarEstadoActividadCompromisoInput,
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

  const actividad =
    await prisma.actividadCompromiso.findFirst({
      where: {
        id: actividadId,
        compromisoResponsable: {
          compromisoId,
          estado:
            EstadoAsignacionCompromiso.ASIGNADA,
        },
      },
      include: {
        compromisoResponsable: {
          select: {
            usuarioResponsableId: true,
          },
        },
      },
    });

  if (!actividad) {
    throw new ErrorEvaluacion(
      "La actividad seleccionada no pertenece a una asignación activa del compromiso.",
      404,
      "ACTIVIDAD_COMPROMISO_NO_ENCONTRADA"
    );
  }

  if (
    !esRolSupervisorCompromiso(usuario.rol) &&
    actividad.compromisoResponsable
      .usuarioResponsableId !== usuario.usuarioId
  ) {
    throw new ErrorEvaluacion(
      "Solo puedes actualizar tu propia actividad.",
      403,
      "ACTIVIDAD_DE_OTRO_RESPONSABLE"
    );
  }

  const siguienteEstado = input.atendida
    ? EstadoActividadCompromiso.ATENDIDA
    : EstadoActividadCompromiso.PENDIENTE;

  return prisma.$transaction(async (tx) => {
    const actualizada =
      await tx.actividadCompromiso.update({
        where: {
          id: actividadId,
        },
        data: {
          estado: siguienteEstado,
          atendidaEn: input.atendida
            ? new Date()
            : null,
          atendidaPorUsuarioId: input.atendida
            ? usuario.usuarioId
            : null,
        },
      });

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "ACTIVIDAD",
      entidadId: actividadId,
      accion: input.atendida
        ? "MARCAR_ACTIVIDAD_ATENDIDA"
        : "REABRIR_ACTIVIDAD",
      descripcion: input.atendida
        ? "Se marcó una actividad como atendida."
        : "Se devolvió una actividad al estado pendiente.",
      usuarioId: usuario.usuarioId,
      datosAntes: actividad,
      datosDespues: actualizada,
    });

    return {
      ...actualizada,
      atendidaEn:
        actualizada.atendidaEn?.toISOString() ??
        null,
    };
  });
}
