import {
  EstadoGestionSgsst,
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

  finalizar: async (
    gestionId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const gestion = await asegurarAccesoGestion(
      usuario,
      gestionId,
      "ESCRITURA"
    );

    if (!gestion.valida) {
      throw new ErrorEvaluacion(
        "La gestión está invalidada y no puede finalizarse.",
        409,
        "GESTION_INVALIDADA"
      );
    }

    if (gestion.estado !== EstadoGestionSgsst.BORRADOR) {
      throw new ErrorEvaluacion(
        "Solo se puede finalizar una gestión que esté en borrador.",
        409,
        "GESTION_NO_EDITABLE"
      );
    }

    return prisma.$transaction(async (tx) => {
      const evaluacionesGestion =
        await tx.evaluacionAspecto.findMany({
          where: {
            gestionId,
          },
          select: {
            id: true,
            usuarioRegistradorId: true,
            marcadaRevisionTecnica: true,
            motivoRevisionTecnica: true,
            aspecto: {
              select: {
                nombre: true,
                configuracionRevision: {
                  select: {
                    requiereRevisionTecnica: true,
                    observaciones: true,
                  },
                },
              },
            },
          },
        });

      const evaluacionesParaRevision =
        evaluacionesGestion.filter(
          (evaluacion) =>
            evaluacion.marcadaRevisionTecnica ||
            Boolean(
              evaluacion.aspecto.configuracionRevision
                ?.requiereRevisionTecnica
            )
        );

      const actualizada = await tx.gestionSgsst.update({
        where: {
          id: gestionId,
        },
        data: {
          estado: EstadoGestionSgsst.FINALIZADA,
          finalizadaEn: new Date(),
        },
      });

      if (evaluacionesParaRevision.length > 0) {
        await tx.revisionTecnicaEvaluacion.createMany({
          data: evaluacionesParaRevision.map(
            (evaluacion) => ({
              evaluacionId: evaluacion.id,
              solicitadaPorUsuarioId:
                evaluacion.usuarioRegistradorId,
              motivoSolicitud:
                evaluacion.motivoRevisionTecnica?.trim() ||
                evaluacion.aspecto.configuracionRevision
                  ?.observaciones?.trim() ||
                (evaluacion.aspecto.configuracionRevision
                  ?.requiereRevisionTecnica
                  ? "Revisión técnica obligatoria configurada en la Supermatriz."
                  : "Evaluación marcada para revisión técnica antes de finalizar la gestión."),
            })
          ),
          skipDuplicates: true,
        });

        await tx.historialEvaluacion.createMany({
          data: evaluacionesParaRevision.map(
            (evaluacion) => ({
              gestionId,
              evaluacionId: evaluacion.id,
              usuarioId:
                evaluacion.usuarioRegistradorId,
              accion: "SOLICITAR_REVISION_TECNICA",
              descripcion: `Se solicitó revisión técnica para el aspecto ${evaluacion.aspecto.nombre}.`,
            })
          ),
        });
      }

      await tx.historialEvaluacion.create({
        data: {
          gestionId,
          usuarioId: usuario.usuarioId,
          accion: "FINALIZAR_GESTION",
          descripcion:
            evaluacionesParaRevision.length > 0
              ? `La gestión fue finalizada. Se generaron ${evaluacionesParaRevision.length} revisión(es) técnica(s) pendiente(s).`
              : "La gestión fue finalizada y sus evaluaciones pasaron a formar parte del estado vigente de la empresa.",
        },
      });

      return {
        ...actualizada,
        revisionesTecnicasCreadas:
          evaluacionesParaRevision.length,
      };
    });
  },
};
