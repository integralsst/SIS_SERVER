import {
  EstadoPeriodoSgsst,
  EstadoRegistro,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  CrearGestionSgsstInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import {
  convertirFecha,
  ErrorEvaluacion,
} from "../../utils/evaluacion";
import { asegurarAccesoPeriodo } from "./acceso-evaluacion.service";

async function asegurarSinBorradorCreadoPorUsuario(
  periodoId: string,
  usuario: UsuarioSesionEvaluacion
): Promise<void> {
  const borradorExistente =
    await prisma.gestionSgsst.findFirst({
      where: {
        empresaPeriodoId: periodoId,
        usuarioCreadorId: usuario.usuarioId,
        estado: "BORRADOR",
        valida: true,
      },
      select: {
        id: true,
      },
    });

  if (borradorExistente) {
    throw new ErrorEvaluacion(
      "Ya tienes una gestión en borrador creada por ti para este periodo. Puedes participar en otros borradores, pero debes continuar o finalizar la gestión que tú creaste antes de abrir otra propia.",
      409,
      "GESTION_BORRADOR_EXISTENTE"
    );
  }
}

async function obtenerAsignacionProfesional(
  empresaId: string,
  profesionalId: string
) {
  const asignacion = await prisma.empresaProfesional.findFirst({
    where: {
      empresaId,
      profesionalId,
      activo: true,
      OR: [
        {
          fechaFin: null,
        },
        {
          fechaFin: {
            gte: new Date(),
          },
        },
      ],
      profesional: {
        activo: true,
      },
    },
    include: {
      categoriasGestion: {
        select: {
          categoriaGestionId: true,
        },
      },
    },
  });

  if (!asignacion) {
    throw new ErrorEvaluacion(
      "El profesional seleccionado no tiene una asignación activa con esta empresa.",
      409,
      "PROFESIONAL_NO_ASIGNADO"
    );
  }

  return asignacion;
}

export const servicioGestionesSgsst = {
  crear: async (
    periodoId: string,
    data: CrearGestionSgsstInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const periodo = await asegurarAccesoPeriodo(
      usuario,
      periodoId,
      "ESCRITURA"
    );

    if (periodo.estado !== EstadoPeriodoSgsst.ABIERTO) {
      throw new ErrorEvaluacion(
        "No se pueden crear gestiones en un periodo cerrado.",
        409,
        "PERIODO_CERRADO"
      );
    }

    const tipoActividad = data.tipoActividad?.trim();

    if (!tipoActividad) {
      throw new ErrorEvaluacion(
        "Debes indicar el tipo de actividad realizada."
      );
    }

    const fechaGestion = convertirFecha(
      data.fechaGestion,
      "fechaGestion",
      true
    ) as Date;

    await asegurarSinBorradorCreadoPorUsuario(
      periodoId,
      usuario
    );

    if (data.categoriaGestionId) {
      const categoria = await prisma.categoriaGestion.findFirst({
        where: {
          id: data.categoriaGestionId,
          estado: EstadoRegistro.ACTIVO,
        },
        select: {
          id: true,
        },
      });

      if (!categoria) {
        throw new ErrorEvaluacion(
          "La categoría de gestión seleccionada no existe o está inactiva."
        );
      }
    }

    let profesionalId =
      data.profesionalId ?? usuario.profesionalId;

    if (
      usuario.rol === RolUsuario.PROFESIONAL &&
      data.profesionalId &&
      data.profesionalId !== usuario.profesionalId
    ) {
      throw new ErrorEvaluacion(
        "Un profesional no puede crear una gestión a nombre de otro profesional.",
        403,
        "PROFESIONAL_CREACION_NO_AUTORIZADA"
      );
    }

    if (profesionalId) {
      const asignacion = await obtenerAsignacionProfesional(
        periodo.empresaId,
        profesionalId
      );

      if (
        data.categoriaGestionId &&
        asignacion.categoriasGestion.length > 0 &&
        !asignacion.categoriasGestion.some(
          ({ categoriaGestionId }) =>
            categoriaGestionId === data.categoriaGestionId
        )
      ) {
        throw new ErrorEvaluacion(
          "El profesional seleccionado no tiene habilitada la categoría de esta gestión.",
          409,
          "PROFESIONAL_CATEGORIA_NO_AUTORIZADA"
        );
      }
    } else {
      profesionalId = null;
    }

    return prisma.gestionSgsst.create({
      data: {
        empresaPeriodoId: periodoId,
        profesionalId,
        categoriaGestionId:
          data.categoriaGestionId ?? null,
        usuarioCreadorId: usuario.usuarioId,
        fechaGestion,
        modalidad: data.modalidad,
        tipoActividad,
        observacionGeneral:
          data.observacionGeneral?.trim() || null,
        ...(profesionalId
          ? {
              participantes: {
                create: {
                  profesionalId,
                  esLider: true,
                  puedeEvaluar: true,
                  puedeGestionarEvidencias: true,
                  responsabilidad:
                    "Participante inicial de la gestión.",
                  asignadoPorUsuarioId: usuario.usuarioId,
                },
              },
            }
          : {}),
      },
      include: {
        categoriaGestion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        profesional: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },
      },
    });
  },
};
