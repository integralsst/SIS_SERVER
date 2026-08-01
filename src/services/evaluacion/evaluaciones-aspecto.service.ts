import {
  EstadoCumplimientoAspecto,
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  EstadoRegistro,
  Prisma,
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
import { asegurarAccesoGestion } from "./acceso-evaluacion.service";

async function guardarUnaEvaluacion(
  tx: Prisma.TransactionClient,
  gestion: Awaited<ReturnType<typeof asegurarAccesoGestion>>,
  input: GuardarEvaluacionesLoteInput["evaluaciones"][number],
  usuario: UsuarioSesionEvaluacion
) {
  if (
    !Number.isFinite(input.calificacionAdministrativa) ||
    input.calificacionAdministrativa < 0 ||
    input.calificacionAdministrativa > 5
  ) {
    throw new ErrorEvaluacion(
      "La calificación administrativa debe estar entre 0 y 5."
    );
  }

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

  const fechaDocumento = convertirFecha(
    input.fechaDocumento,
    "fechaDocumento"
  );

  const calificacionAdministrativa =
    input.estadoCumplimiento ===
    EstadoCumplimientoAspecto.NO_APLICA
      ? 5
      : input.calificacionAdministrativa;

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
      marcadaRevisionTecnica:
        input.marcadaRevisionTecnica ?? false,
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
      marcadaRevisionTecnica:
        input.marcadaRevisionTecnica ?? false,
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
};
