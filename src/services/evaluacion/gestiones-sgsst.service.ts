import {
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  EstadoRegistro,
  EstadoRevisionTecnica,
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
import { servicioPeriodosEvaluacion } from "./periodos-evaluacion.service";
import { accionVinculoCorreccionRevision } from "./revisiones/revision-tecnica-vinculo";

async function asegurarSinBorradorCreadoPorUsuario(
  periodoId: string,
  usuario: UsuarioSesionEvaluacion
): Promise<void> {
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

async function obtenerRevisionTecnicaOrigen(
  periodoId: string,
  revisionId: string
) {
  const revision =
    await prisma.revisionTecnicaEvaluacion.findFirst({
      where: {
        id: revisionId,
        estado: EstadoRevisionTecnica.REQUIERE_AJUSTES,
        evaluacion: {
          gestion: {
            empresaPeriodoId: periodoId,
            estado: EstadoGestionSgsst.FINALIZADA,
            valida: true,
          },
        },
      },
      select: {
        id: true,
        evaluacionId: true,
        evaluacion: {
          select: {
            aspectoId: true,
            aspecto: {
              select: {
                nombre: true,
              },
            },
            gestionId: true,
          },
        },
      },
    });

  if (!revision) {
    throw new ErrorEvaluacion(
      "La revisión técnica seleccionada no está disponible para corrección en este periodo.",
      409,
      "REVISION_TECNICA_NO_CORREGIBLE"
    );
  }

  const accionVinculo =
    accionVinculoCorreccionRevision(revision.id);
  const gestionCorrectivaExistente =
    await prisma.historialEvaluacion.findFirst({
      where: {
        accion: accionVinculo,
        gestion: {
          empresaPeriodoId: periodoId,
          valida: true,
          estado: {
            in: [
              EstadoGestionSgsst.BORRADOR,
              EstadoGestionSgsst.FINALIZADA,
            ],
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        gestion: {
          select: {
            id: true,
            estado: true,
          },
        },
      },
    });

  if (gestionCorrectivaExistente) {
    throw new ErrorEvaluacion(
      gestionCorrectivaExistente.gestion.estado ===
        EstadoGestionSgsst.BORRADOR
        ? "Esta revisión técnica ya tiene una gestión correctiva en borrador. Continúa esa gestión en lugar de crear otra."
        : "Esta revisión técnica ya fue atendida mediante una gestión correctiva finalizada.",
      409,
      gestionCorrectivaExistente.gestion.estado ===
        EstadoGestionSgsst.BORRADOR
        ? "REVISION_TECNICA_CORRECCION_EN_CURSO"
        : "REVISION_TECNICA_YA_SUBSANADA"
    );
  }

  return revision;
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

    if (fechaGestion.getUTCFullYear() !== periodo.anio) {
      throw new ErrorEvaluacion(
        `La fecha de la gestión debe pertenecer al periodo ${periodo.anio}.`,
        409,
        "FECHA_GESTION_FUERA_PERIODO"
      );
    }

    // La estructura aplicable depende de la fecha real de la gestión,
    // no de una versión anual fijada al abrir el periodo.
    await servicioPeriodosEvaluacion.resolverVersionParaFecha(
      fechaGestion
    );

    await asegurarSinBorradorCreadoPorUsuario(
      periodoId,
      usuario
    );

    const revisionTecnicaOrigenId =
      data.revisionTecnicaOrigenId?.trim() || null;
    const revisionTecnicaOrigen = revisionTecnicaOrigenId
      ? await obtenerRevisionTecnicaOrigen(
          periodoId,
          revisionTecnicaOrigenId
        )
      : null;

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

    return prisma.$transaction(async (tx) => {
      const gestion = await tx.gestionSgsst.create({
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

      if (revisionTecnicaOrigen) {
        await tx.historialEvaluacion.create({
          data: {
            gestionId: gestion.id,
            usuarioId: usuario.usuarioId,
            accion: accionVinculoCorreccionRevision(
              revisionTecnicaOrigen.id
            ),
            descripcion: `Se vinculó esta gestión como corrección de la revisión técnica del aspecto ${revisionTecnicaOrigen.evaluacion.aspecto.nombre}.`,
            datosDespues: {
              revisionTecnicaId: revisionTecnicaOrigen.id,
              evaluacionOrigenId:
                revisionTecnicaOrigen.evaluacionId,
              gestionOrigenId:
                revisionTecnicaOrigen.evaluacion.gestionId,
              aspectoId:
                revisionTecnicaOrigen.evaluacion.aspectoId,
              gestionCorreccionId: gestion.id,
            },
          },
        });
      }

      return gestion;
    });
  },
};
