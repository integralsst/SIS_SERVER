import {
  EstadoCumplimientoAspecto,
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  EstadoRegistro,
  Prisma,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  GuardarEvaluacionesLoteInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import {
  comoJsonPrismaEvaluacion,
  convertirFecha,
  ErrorEvaluacion,
} from "../../utils/evaluacion";
import { calcularFechaVencimientoEvaluacion } from "../../utils/vigencia-evaluacion";
import { validarCalificacionAdministrativa } from "../../validators/evaluacion/calificacion-administrativa.validator";
import {
  asegurarAccesoGestion,
  asegurarCapacidadParticipanteGestion,
} from "./acceso-evaluacion.service";

async function guardarUnaEvaluacion(
  tx: Prisma.TransactionClient,
  gestion: Awaited<ReturnType<typeof asegurarAccesoGestion>>,
  input: GuardarEvaluacionesLoteInput["evaluaciones"][number],
  usuario: UsuarioSesionEvaluacion
) {
  const contexto = await tx.aspecto.findFirst({
    where: {
      id: input.aspectoId,
      versionSupermatrizId:
        gestion.empresaPeriodo.versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
      tareas: {
        some: {
          versionSupermatrizId:
            gestion.empresaPeriodo.versionSupermatrizId,
          estado: EstadoRegistro.ACTIVO,
          ...(input.supermatrizTareaId
            ? {
                id: input.supermatrizTareaId,
              }
            : {}),
        },
      },
    },
    include: {
      configuracion: true,
      configuracionVigencia: true,
      configuracionRevision: true,
    },
  });

  if (!contexto) {
    throw new ErrorEvaluacion(
      `El aspecto ${input.aspectoId} no pertenece a la versión utilizada por el periodo.`
    );
  }

  if (
    input.estadoCumplimiento ===
      EstadoCumplimientoAspecto.NO_APLICA &&
    usuario.rol !== RolUsuario.PROFESIONAL
  ) {
    throw new ErrorEvaluacion(
      `El No aplica del aspecto "${contexto.nombre}" debe ser propuesto por un profesional.`,
      403,
      "NO_APLICA_REQUIERE_PROFESIONAL"
    );
  }

  if (
    input.estadoCumplimiento ===
      EstadoCumplimientoAspecto.NO_APLICA &&
    contexto.configuracion?.permiteNoAplica === false
  ) {
    throw new ErrorEvaluacion(
      `El aspecto "${contexto.nombre}" no permite marcarse como No aplica.`
    );
  }

  const justificacionNoAplica =
    input.justificacionNoAplica?.trim() || null;

  if (
    input.estadoCumplimiento ===
      EstadoCumplimientoAspecto.NO_APLICA &&
    !justificacionNoAplica
  ) {
    throw new ErrorEvaluacion(
      `Debes justificar por qué el aspecto "${contexto.nombre}" no aplica.`
    );
  }

  const revisionObligatoria =
    contexto.configuracionRevision
      ?.requiereRevisionTecnica ?? false;

  const marcadaRevisionTecnica =
    revisionObligatoria ||
    Boolean(input.marcadaRevisionTecnica);

  const motivoRevisionIngresado =
    input.motivoRevisionTecnica?.trim() || null;

  const motivoRevisionTecnica =
    marcadaRevisionTecnica
      ? motivoRevisionIngresado ||
        contexto.configuracionRevision?.observaciones?.trim() ||
        (revisionObligatoria
          ? "Revisión técnica obligatoria configurada en la Supermatriz."
          : null)
      : null;

  if (
    marcadaRevisionTecnica &&
    !motivoRevisionTecnica
  ) {
    throw new ErrorEvaluacion(
      `Debes explicar por qué el aspecto "${contexto.nombre}" requiere revisión técnica.`
    );
  }

  if (
    motivoRevisionTecnica &&
    motivoRevisionTecnica.length < 10
  ) {
    throw new ErrorEvaluacion(
      `El motivo de revisión técnica del aspecto "${contexto.nombre}" debe tener al menos 10 caracteres.`
    );
  }

  if (
    motivoRevisionTecnica &&
    motivoRevisionTecnica.length > 2000
  ) {
    throw new ErrorEvaluacion(
      `El motivo de revisión técnica del aspecto "${contexto.nombre}" no puede superar los 2000 caracteres.`
    );
  }

  const fechaDocumento = convertirFecha(
    input.fechaDocumento,
    "fechaDocumento"
  );

  const calificacionAdministrativa =
    validarCalificacionAdministrativa(
      input.estadoCumplimiento,
      input.estadoCumplimiento ===
        EstadoCumplimientoAspecto.NO_APLICA
        ? 5
        : input.calificacionAdministrativa
    );

  const fechaVencimientoCalculada =
    calcularFechaVencimientoEvaluacion(
      gestion.fechaGestion,
      fechaDocumento,
      contexto.configuracionVigencia,
      contexto.configuracion?.esEvergreen ?? false,
      input.estadoCumplimiento
    );

  const anterior = await tx.evaluacionAspecto.findUnique({
    where: {
      gestionId_aspectoId: {
        gestionId: gestion.id,
        aspectoId: input.aspectoId,
      },
    },
  });

  const guardada = await tx.evaluacionAspecto.upsert({
    where: {
      gestionId_aspectoId: {
        gestionId: gestion.id,
        aspectoId: input.aspectoId,
      },
    },
    create: {
      gestionId: gestion.id,
      aspectoId: input.aspectoId,
      supermatrizTareaId:
        input.supermatrizTareaId ?? null,
      usuarioRegistradorId: usuario.usuarioId,
      estadoCumplimiento: input.estadoCumplimiento,
      calificacionAdministrativa,
      observacion: input.observacion?.trim() || null,
      fechaDocumento,
      fechaVencimientoCalculada,
      justificacionNoAplica:
        input.estadoCumplimiento ===
        EstadoCumplimientoAspecto.NO_APLICA
          ? justificacionNoAplica
          : null,
      marcadaRevisionTecnica,
      motivoRevisionTecnica,
    },
    update: {
      supermatrizTareaId:
        input.supermatrizTareaId ?? null,
      usuarioRegistradorId: usuario.usuarioId,
      estadoCumplimiento: input.estadoCumplimiento,
      calificacionAdministrativa,
      observacion: input.observacion?.trim() || null,
      fechaDocumento,
      fechaVencimientoCalculada,
      justificacionNoAplica:
        input.estadoCumplimiento ===
        EstadoCumplimientoAspecto.NO_APLICA
          ? justificacionNoAplica
          : null,
      marcadaRevisionTecnica,
      motivoRevisionTecnica,
    },
  });

  await tx.historialEvaluacion.create({
    data: {
      gestionId: gestion.id,
      evaluacionId: guardada.id,
      usuarioId: usuario.usuarioId,
      accion: anterior
        ? "ACTUALIZAR_EVALUACION"
        : "CREAR_EVALUACION",
      descripcion: anterior
        ? `Se actualizó la evaluación del aspecto ${contexto.nombre}.`
        : `Se registró la evaluación del aspecto ${contexto.nombre}.`,
      datosAntes: anterior
        ? comoJsonPrismaEvaluacion(anterior)
        : undefined,
      datosDespues:
        comoJsonPrismaEvaluacion(guardada),
    },
  });

  return guardada;
}

export const servicioEvaluacionesAspecto = {
  guardarLote: async (
    gestionId: string,
    data: GuardarEvaluacionesLoteInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const gestion = await asegurarAccesoGestion(
      usuario,
      gestionId,
      "ESCRITURA"
    );

    await asegurarCapacidadParticipanteGestion(
      usuario,
      gestionId,
      "EVALUAR"
    );

    if (!gestion.valida) {
      throw new ErrorEvaluacion(
        "La gestión está invalidada.",
        409,
        "GESTION_INVALIDADA"
      );
    }

    if (gestion.estado !== EstadoGestionSgsst.BORRADOR) {
      throw new ErrorEvaluacion(
        "Solo se pueden modificar evaluaciones de una gestión en borrador.",
        409,
        "GESTION_NO_EDITABLE"
      );
    }

    if (
      gestion.empresaPeriodo.estado !==
      EstadoPeriodoSgsst.ABIERTO
    ) {
      throw new ErrorEvaluacion(
        "El periodo está cerrado.",
        409,
        "PERIODO_CERRADO"
      );
    }

    if (
      !Array.isArray(data.evaluaciones) ||
      data.evaluaciones.length === 0
    ) {
      throw new ErrorEvaluacion(
        "Debes enviar al menos una evaluación para guardar."
      );
    }

    const aspectoIds = data.evaluaciones.map(
      (evaluacion) => evaluacion.aspectoId
    );

    if (new Set(aspectoIds).size !== aspectoIds.length) {
      throw new ErrorEvaluacion(
        "El lote contiene el mismo aspecto más de una vez."
      );
    }

    /*
     * La base de Stack44 es remota. Guardamos en bloques pequeños para
     * evitar una transacción interactiva demasiado larga. El endpoint es
     * idempotente porque cada bloque usa upsert por gestión + aspecto.
     */
    const TAMANO_BLOQUE = 40;
    const guardadas = [];

    for (
      let inicio = 0;
      inicio < data.evaluaciones.length;
      inicio += TAMANO_BLOQUE
    ) {
      const bloque = data.evaluaciones.slice(
        inicio,
        inicio + TAMANO_BLOQUE
      );

      const resultadoBloque = await prisma.$transaction(
        async (tx) => {
          const resultado = [];

          for (const evaluacion of bloque) {
            resultado.push(
              await guardarUnaEvaluacion(
                tx,
                gestion,
                evaluacion,
                usuario
              )
            );
          }

          return resultado;
        }
      );

      guardadas.push(...resultadoBloque);
    }

    return {
      total: guardadas.length,
      evaluaciones: guardadas,
    };
  },

  eliminarBorrador: async (
    gestionId: string,
    aspectoId: number,
    usuario: UsuarioSesionEvaluacion
  ) => {
    if (!Number.isInteger(aspectoId) || aspectoId <= 0) {
      throw new ErrorEvaluacion(
        "El aspecto indicado no es válido."
      );
    }

    const gestion = await asegurarAccesoGestion(
      usuario,
      gestionId,
      "ESCRITURA"
    );

    await asegurarCapacidadParticipanteGestion(
      usuario,
      gestionId,
      "EVALUAR"
    );

    if (!gestion.valida) {
      throw new ErrorEvaluacion(
        "La gestión está invalidada.",
        409,
        "GESTION_INVALIDADA"
      );
    }

    if (gestion.estado !== EstadoGestionSgsst.BORRADOR) {
      throw new ErrorEvaluacion(
        "Solo se pueden quitar evaluaciones de una gestión en borrador.",
        409,
        "GESTION_NO_EDITABLE"
      );
    }

    if (
      gestion.empresaPeriodo.estado !==
      EstadoPeriodoSgsst.ABIERTO
    ) {
      throw new ErrorEvaluacion(
        "El periodo está cerrado.",
        409,
        "PERIODO_CERRADO"
      );
    }

    return prisma.$transaction(async (tx) => {
      const evaluacion = await tx.evaluacionAspecto.findUnique({
        where: {
          gestionId_aspectoId: {
            gestionId,
            aspectoId,
          },
        },
        include: {
          aspecto: {
            select: {
              nombre: true,
            },
          },
          evidencias: {
            select: {
              id: true,
            },
            take: 1,
          },
          revisionTecnica: {
            select: {
              id: true,
            },
          },
          decisionNoAplica: {
            select: {
              id: true,
            },
          },
          aprobacionGestion: {
            select: {
              evaluacionId: true,
            },
          },
          compromisoOrigen: {
            select: {
              id: true,
            },
          },
          seguimientosCompromiso: {
            select: {
              id: true,
            },
            take: 1,
          },
          solicitudesCierreCompromiso: {
            select: {
              id: true,
            },
            take: 1,
          },
        },
      });

      if (!evaluacion) {
        throw new ErrorEvaluacion(
          "La evaluación guardada ya no existe en esta gestión.",
          404,
          "EVALUACION_BORRADOR_NO_ENCONTRADA"
        );
      }

      const tieneDependencias =
        evaluacion.evidencias.length > 0 ||
        Boolean(evaluacion.revisionTecnica) ||
        Boolean(evaluacion.decisionNoAplica) ||
        Boolean(evaluacion.aprobacionGestion) ||
        Boolean(evaluacion.compromisoOrigen) ||
        evaluacion.seguimientosCompromiso.length > 0 ||
        evaluacion.solicitudesCierreCompromiso.length > 0;

      if (tieneDependencias) {
        throw new ErrorEvaluacion(
          `No se puede quitar la evaluación del aspecto "${evaluacion.aspecto.nombre}" porque ya tiene información relacionada. Retira primero sus evidencias o relaciones pendientes.`,
          409,
          "EVALUACION_BORRADOR_CON_DEPENDENCIAS"
        );
      }

      await tx.historialEvaluacion.create({
        data: {
          gestionId,
          evaluacionId: evaluacion.id,
          usuarioId: usuario.usuarioId,
          accion: "ELIMINAR_EVALUACION_BORRADOR",
          descripcion: `Se quitó del borrador la evaluación del aspecto ${evaluacion.aspecto.nombre}.`,
          datosAntes: comoJsonPrismaEvaluacion(evaluacion),
        },
      });

      await tx.evaluacionAspecto.delete({
        where: {
          id: evaluacion.id,
        },
      });

      return {
        eliminada: true,
        aspectoId,
      };
    });
  },
};
