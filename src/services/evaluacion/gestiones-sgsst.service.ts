import {
  EstadoPeriodoSgsst,
  EstadoRegistro,
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
import {
  asegurarAccesoGestion,
  asegurarAccesoPeriodo,
} from "./acceso-evaluacion.service";

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

    const borradorExistente =
      await prisma.gestionSgsst.findFirst({
        where: {
          empresaPeriodoId: periodoId,
          usuarioCreadorId: usuario.usuarioId,
          estado: EstadoGestionSgsst.BORRADOR,
          valida: true,
        },
        select: {
          id: true,
        },
      });

    if (borradorExistente) {
      throw new ErrorEvaluacion(
        "Ya tienes una gestión en borrador para este periodo. Continúala o finalízala antes de crear otra.",
        409,
        "GESTION_BORRADOR_EXISTENTE"
      );
    }

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

    if (profesionalId) {
      const asignacion = await prisma.empresaProfesional.findFirst({
        where: {
          empresaId: periodo.empresaId,
          profesionalId,
          activo: true,
        },
        select: {
          id: true,
        },
      });

      if (!asignacion) {
        throw new ErrorEvaluacion(
          "El profesional seleccionado no tiene una asignación activa con esta empresa.",
          409,
          "PROFESIONAL_NO_ASIGNADO"
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
