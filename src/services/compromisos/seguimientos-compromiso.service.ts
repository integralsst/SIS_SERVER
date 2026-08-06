import {
  OrigenSeguimientoCompromiso,
  EstadoAsignacionCompromiso,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { CrearSeguimientoCompromisoInput } from "../../types/compromisos/operacion-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import {
  asegurarCompromisoEditable,
  asegurarParticipacionCompromiso,
  esRolClienteCompromiso,
  esRolSupervisorCompromiso,
  obtenerCompromisoOperacion,
} from "./acceso-operacion-compromisos.service";
import { registrarHistorialCompromiso } from "./historial-compromiso.service";

export async function crearSeguimientoCompromiso(
  compromisoId: string,
  input: CrearSeguimientoCompromisoInput,
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

  if (input.actividadId) {
    const actividad =
      await prisma.actividadCompromiso.findFirst({
        where: {
          id: input.actividadId,
          compromisoResponsable: {
            compromisoId,
            estado:
              EstadoAsignacionCompromiso.ASIGNADA,
          },
        },
        select: {
          id: true,
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
        "Solo puedes registrar seguimientos sobre tu propia actividad.",
        403,
        "ACTIVIDAD_DE_OTRO_RESPONSABLE"
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const seguimiento =
      await tx.seguimientoCompromiso.create({
        data: {
          compromisoId,
          actividadId: input.actividadId,
          usuarioId: usuario.usuarioId,
          descripcion: input.descripcion,
          origen: esRolClienteCompromiso(usuario.rol)
            ? OrigenSeguimientoCompromiso.CLIENTE
            : OrigenSeguimientoCompromiso.INTERNO,
          visibleCliente:
            esRolClienteCompromiso(usuario.rol) ||
            input.visibleCliente,
        },
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
      });

    await registrarHistorialCompromiso(tx, {
      compromisoId,
      entidadTipo: "SEGUIMIENTO",
      entidadId: seguimiento.id,
      accion: "REGISTRAR_SEGUIMIENTO",
      descripcion:
        "Se registró un seguimiento del compromiso.",
      usuarioId: usuario.usuarioId,
      datosDespues: seguimiento,
    });

    return {
      ...seguimiento,
      fechaSeguimiento:
        seguimiento.fechaSeguimiento.toISOString(),
    };
  });
}
