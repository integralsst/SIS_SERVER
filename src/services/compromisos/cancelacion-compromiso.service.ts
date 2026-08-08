import {
  EstadoCompromiso,
  EstadoSolicitudAmpliacionCompromiso,
  EstadoSolicitudCierreCompromiso,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { CancelarCompromisoInput } from "../../types/compromisos/operacion-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import {
  asegurarSupervisionCompromiso,
  obtenerCompromisoOperacion,
} from "./acceso-operacion-compromisos.service";
import { registrarHistorialCompromiso } from "./historial-compromiso.service";

export async function cancelarCompromiso(
  compromisoId: string,
  input: CancelarCompromisoInput,
  usuario: UsuarioSesionEvaluacion
) {
  const compromiso = await obtenerCompromisoOperacion(
    compromisoId
  );

  await asegurarSupervisionCompromiso(
    usuario,
    compromiso
  );

  if (compromiso.estado === EstadoCompromiso.CUMPLIDO) {
    throw new ErrorEvaluacion(
      "Un compromiso cumplido no se puede cancelar.",
      409,
      "COMPROMISO_CUMPLIDO_NO_CANCELABLE"
    );
  }

  if (compromiso.estado === EstadoCompromiso.CANCELADO) {
    throw new ErrorEvaluacion(
      "El compromiso ya está cancelado.",
      409,
      "COMPROMISO_YA_CANCELADO"
    );
  }

  return prisma.$transaction(async (tx) => {
    const ahora = new Date();

    await tx.solicitudCierreCompromiso.updateMany({
      where: {
        compromisoId,
        estado:
          EstadoSolicitudCierreCompromiso.PENDIENTE,
      },
      data: {
        estado:
          EstadoSolicitudCierreCompromiso.DEVUELTA,
        decididaPorId: usuario.usuarioId,
        decididaEn: ahora,
        observacionesDevolucion: `Solicitud terminada por cancelación administrativa del compromiso: ${input.motivo}`,
      },
    });

    await tx.solicitudAmpliacionCompromiso.updateMany({
      where: {
        compromisoId,
        estado:
          EstadoSolicitudAmpliacionCompromiso.PENDIENTE,
      },
      data: {
        estado:
          EstadoSolicitudAmpliacionCompromiso.RECHAZADA,
        resueltaEn: ahora,
      },
    });

    const actualizado = await tx.compromiso.update({
      where: {
        id: compromisoId,
      },
      data: {
        estado: EstadoCompromiso.CANCELADO,
        canceladoEn: ahora,
        canceladoPorUsuarioId: usuario.usuarioId,
        motivoCancelacion: input.motivo,
        cerradoEn: null,
      },
      select: {
        id: true,
        estado: true,
        canceladoEn: true,
        motivoCancelacion: true,
      },
    });

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "COMPROMISO",
      entidadId: compromisoId,
      accion: "CANCELAR_COMPROMISO",
      descripcion: `Se canceló administrativamente el compromiso. Motivo: ${input.motivo}`,
      usuarioId: usuario.usuarioId,
      datosAntes: compromiso,
      datosDespues: actualizado,
    });

    return {
      ...actualizado,
      canceladoEn:
        actualizado.canceladoEn?.toISOString() ?? null,
    };
  });
}
