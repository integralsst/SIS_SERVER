import { prisma } from "../../lib/prisma";
import type { CrearEvidenciaCompromisoInput } from "../../types/compromisos/operacion-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  convertirFecha,
  ErrorEvaluacion,
} from "../../utils/evaluacion";
import {
  asegurarCompromisoEditable,
  asegurarParticipacionCompromiso,
  obtenerCompromisoOperacion,
} from "./acceso-operacion-compromisos.service";
import { registrarHistorialCompromiso } from "./historial-compromiso.service";

export async function crearEvidenciaCompromiso(
  compromisoId: string,
  input: CrearEvidenciaCompromisoInput,
  usuario: UsuarioSesionEvaluacion
) {
  const compromiso = await obtenerCompromisoOperacion(
    compromisoId
  );

  await asegurarParticipacionCompromiso(
    usuario,
    compromiso
  );
  asegurarCompromisoEditable(compromiso);

  if (input.seguimientoId) {
    const seguimiento =
      await prisma.seguimientoCompromiso.findFirst({
        where: {
          id: input.seguimientoId,
          compromisoId,
        },
        select: {
          id: true,
        },
      });

    if (!seguimiento) {
      throw new ErrorEvaluacion(
        "El seguimiento seleccionado no pertenece al compromiso.",
        404,
        "SEGUIMIENTO_COMPROMISO_NO_ENCONTRADO"
      );
    }
  }

  const fechaDocumento = convertirFecha(
    input.fechaDocumento,
    "fechaDocumento"
  );

  return prisma.$transaction(async (tx) => {
    const evidencia =
      await tx.compromisoEvidencia.create({
        data: {
          compromisoId,
          seguimientoId: input.seguimientoId,
          creadoPorUsuarioId: usuario.usuarioId,
          nombre: input.nombre,
          url: input.url,
          descripcion: input.descripcion,
          fechaDocumento,
          visibleCliente: input.visibleCliente,
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
      });

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "EVIDENCIA",
      entidadId: evidencia.id,
      accion: "AGREGAR_EVIDENCIA",
      descripcion: `Se agregó la evidencia ${evidencia.nombre}.`,
      usuarioId: usuario.usuarioId,
      datosDespues: evidencia,
    });

    return {
      ...evidencia,
      fechaDocumento:
        evidencia.fechaDocumento?.toISOString() ??
        null,
      createdAt: evidencia.createdAt.toISOString(),
    };
  });
}
