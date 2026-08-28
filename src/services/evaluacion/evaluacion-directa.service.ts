import {
  EstadoCumplimientoAspecto,
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  EstadoRegistro,
  ModalidadGestion,
  Prisma,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  EvaluacionAspectoInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import {
  comoJsonPrismaEvaluacion,
  convertirFecha,
  ErrorEvaluacion,
  validarAnio,
} from "../../utils/evaluacion";
import { calcularFechaVencimientoEvaluacion } from "../../utils/vigencia-evaluacion";
import { validarCalificacionAdministrativa } from "../../validators/evaluacion/calificacion-administrativa.validator";
import { normalizarJustificacionNoAplica } from "../../validators/evaluacion/no-aplica.validator";
import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";
import { registrarControlesFinalizacion } from "./controles-finalizacion.service";
import { TIPO_ACTIVIDAD_EVALUACION_DIRECTA } from "./evaluacion-directa.constants";
import {
  construirCorteAnual,
  servicioPeriodosEvaluacion,
} from "./periodos-evaluacion.service";

export interface GuardarEvaluacionesDirectasInput {
  anio: number;
  evaluaciones: EvaluacionAspectoInput[];
}

async function obtenerCategoriasAsignadas(
  empresaId: string,
  usuario: UsuarioSesionEvaluacion
): Promise<Set<number> | null> {
  if (
    usuario.rol !== RolUsuario.PROFESIONAL &&
    usuario.rol !== RolUsuario.COORDINADOR
  ) {
    return null;
  }

  if (!usuario.profesionalId) {
    throw new ErrorEvaluacion(
      "Tu usuario no tiene un perfil profesional asociado.",
      403,
      "PROFESIONAL_NO_ASOCIADO"
    );
  }

  const asignacion = await prisma.empresaProfesional.findFirst({
    where: {
      empresaId,
      profesionalId: usuario.profesionalId,
      activo: true,
      OR: [
        { fechaFin: null },
        { fechaFin: { gte: new Date() } },
      ],
    },
    select: {
      categoriasGestion: {
        select: {
          categoriaGestionId: true,
        },
      },
    },
  });

  if (!asignacion) {
    throw new ErrorEvaluacion(
      "No tienes una asignación activa para evaluar esta empresa.",
      403,
      "EMPRESA_NO_ASIGNADA"
    );
  }

  if (asignacion.categoriasGestion.length === 0) {
    // Compatibilidad con asignaciones históricas sin categorías configuradas.
    return null;
  }

  return new Set(
    asignacion.categoriasGestion.map(
      ({ categoriaGestionId }) => categoriaGestionId
    )
  );
}

function validarLote(data: GuardarEvaluacionesDirectasInput): void {
  validarAnio(data.anio);

  if (!Array.isArray(data.evaluaciones) || data.evaluaciones.length === 0) {
    throw new ErrorEvaluacion(
      "Debes enviar al menos una evaluación para registrar."
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
}

async function registrarEvaluacionDirecta(
  tx: Prisma.TransactionClient,
  empresaId: string,
  empresaPeriodoId: string,
  versionSupermatrizId: number,
  fechaEvaluacion: Date,
  input: EvaluacionAspectoInput,
  usuario: UsuarioSesionEvaluacion,
  categoriasAsignadas: Set<number> | null
) {
  const tarea = await tx.supermatrizTarea.findFirst({
    where: {
      versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
      aspectoId: input.aspectoId,
      ...(input.supermatrizTareaId
        ? { id: input.supermatrizTareaId }
        : {}),
    },
    include: {
      categoriasGestion: {
        select: {
          categoriaGestionId: true,
        },
      },
      aspecto: {
        include: {
          configuracion: true,
          configuracionVigencia: true,
          configuracionRevision: true,
        },
      },
    },
  });

  if (!tarea || tarea.aspecto.estado !== EstadoRegistro.ACTIVO) {
    throw new ErrorEvaluacion(
      `El aspecto ${input.aspectoId} no pertenece a la versión de la Supermatriz aplicable a la fecha de evaluación.`,
      409,
      "ASPECTO_FUERA_VERSION_APLICABLE"
    );
  }

  if (categoriasAsignadas) {
    const compatible = tarea.categoriasGestion.some(
      ({ categoriaGestionId }) =>
        categoriasAsignadas.has(categoriaGestionId)
    );

    if (!compatible) {
      throw new ErrorEvaluacion(
        `Tu perfil profesional no tiene habilitada la categoría necesaria para evaluar el aspecto "${tarea.aspecto.nombre}".`,
        403,
        "PROFESIONAL_CATEGORIA_NO_AUTORIZADA"
      );
    }
  }

  const contexto = tarea.aspecto;

  if (
    input.estadoCumplimiento === EstadoCumplimientoAspecto.NO_APLICA &&
    usuario.rol !== RolUsuario.PROFESIONAL
  ) {
    throw new ErrorEvaluacion(
      `El No aplica del aspecto "${contexto.nombre}" debe ser propuesto por un profesional.`,
      403,
      "NO_APLICA_REQUIERE_PROFESIONAL"
    );
  }

  if (
    input.estadoCumplimiento === EstadoCumplimientoAspecto.NO_APLICA &&
    contexto.configuracion?.permiteNoAplica === false
  ) {
    throw new ErrorEvaluacion(
      `El aspecto "${contexto.nombre}" no permite marcarse como No aplica.`
    );
  }

  const justificacionNoAplica =
    input.estadoCumplimiento === EstadoCumplimientoAspecto.NO_APLICA
      ? normalizarJustificacionNoAplica(
          input.justificacionNoAplica,
          contexto.nombre
        )
      : null;

  const revisionObligatoria =
    contexto.configuracionRevision?.requiereRevisionTecnica ?? false;
  const marcadaRevisionTecnica =
    revisionObligatoria || Boolean(input.marcadaRevisionTecnica);
  const motivoRevisionTecnica = marcadaRevisionTecnica
    ? input.motivoRevisionTecnica?.trim() ||
      contexto.configuracionRevision?.observaciones?.trim() ||
      (revisionObligatoria
        ? "Revisión técnica obligatoria configurada en la Supermatriz."
        : null)
    : null;

  if (marcadaRevisionTecnica && !motivoRevisionTecnica) {
    throw new ErrorEvaluacion(
      `Debes explicar por qué el aspecto "${contexto.nombre}" requiere revisión técnica.`
    );
  }

  if (
    motivoRevisionTecnica &&
    (motivoRevisionTecnica.length < 10 ||
      motivoRevisionTecnica.length > 2000)
  ) {
    throw new ErrorEvaluacion(
      `El motivo de revisión técnica del aspecto "${contexto.nombre}" debe tener entre 10 y 2000 caracteres.`
    );
  }

  const fechaDocumento = convertirFecha(
    input.fechaDocumento,
    "fechaDocumento"
  );
  const calificacionAdministrativa =
    validarCalificacionAdministrativa(
      input.estadoCumplimiento,
      input.estadoCumplimiento === EstadoCumplimientoAspecto.NO_APLICA
        ? 5
        : input.calificacionAdministrativa
    );
  const fechaVencimientoCalculada =
    calcularFechaVencimientoEvaluacion(
      fechaEvaluacion,
      fechaDocumento,
      contexto.configuracionVigencia,
      contexto.configuracion?.esEvergreen ?? false,
      input.estadoCumplimiento
    );

  const evaluacionAnterior = await tx.evaluacionAspecto.findFirst({
    where: {
      aspecto: {
        identidadHistorica: contexto.identidadHistorica,
      },
      gestion: {
        empresaPeriodo: {
          empresaId,
        },
        estado: EstadoGestionSgsst.FINALIZADA,
        valida: true,
        fechaGestion: {
          lte: fechaEvaluacion,
        },
      },
    },
    orderBy: [
      { gestion: { fechaGestion: "desc" } },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    select: {
      id: true,
      estadoCumplimiento: true,
      calificacionAdministrativa: true,
      observacion: true,
      fechaDocumento: true,
      createdAt: true,
      usuarioRegistrador: {
        select: {
          id: true,
          nombre: true,
          rol: true,
        },
      },
    },
  });

  const gestion = await tx.gestionSgsst.create({
    data: {
      empresaPeriodoId,
      profesionalId: usuario.profesionalId,
      categoriaGestionId: null,
      usuarioCreadorId: usuario.usuarioId,
      fechaGestion: fechaEvaluacion,
      modalidad: ModalidadGestion.SEGUIMIENTO_PUNTUAL,
      tipoActividad: TIPO_ACTIVIDAD_EVALUACION_DIRECTA,
      observacionGeneral: null,
      estado: EstadoGestionSgsst.FINALIZADA,
      valida: true,
      finalizadaEn: new Date(),
    },
  });

  const evaluacion = await tx.evaluacionAspecto.create({
    data: {
      gestionId: gestion.id,
      aspectoId: input.aspectoId,
      supermatrizTareaId: input.supermatrizTareaId ?? tarea.id,
      usuarioRegistradorId: usuario.usuarioId,
      estadoCumplimiento: input.estadoCumplimiento,
      calificacionAdministrativa,
      observacion: input.observacion?.trim() || null,
      fechaDocumento,
      fechaVencimientoCalculada,
      justificacionNoAplica,
      marcadaRevisionTecnica,
      motivoRevisionTecnica,
    },
  });

  await tx.historialEvaluacion.create({
    data: {
      gestionId: gestion.id,
      evaluacionId: evaluacion.id,
      usuarioId: usuario.usuarioId,
      accion: "CREAR_EVALUACION_DIRECTA",
      descripcion: evaluacionAnterior
        ? `Se registró una nueva evaluación directa del aspecto ${contexto.nombre}, conservando la evaluación anterior en el historial.`
        : `Se registró la primera evaluación directa del aspecto ${contexto.nombre}.`,
      datosAntes: evaluacionAnterior
        ? (comoJsonPrismaEvaluacion(evaluacionAnterior) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      datosDespues:
        comoJsonPrismaEvaluacion(evaluacion) as Prisma.InputJsonValue,
    },
  });

  if (marcadaRevisionTecnica) {
    const revision = await tx.revisionTecnicaEvaluacion.create({
      data: {
        evaluacionId: evaluacion.id,
        solicitadaPorUsuarioId: usuario.usuarioId,
        motivoSolicitud:
          motivoRevisionTecnica ??
          "Revisión técnica solicitada desde evaluación directa.",
      },
    });

    await tx.historialEvaluacion.create({
      data: {
        gestionId: gestion.id,
        evaluacionId: evaluacion.id,
        usuarioId: usuario.usuarioId,
        accion: "SOLICITAR_REVISION_TECNICA",
        descripcion: `Se solicitó revisión técnica para el aspecto ${contexto.nombre}.`,
        datosDespues: {
          revisionTecnicaId: revision.id,
        } as Prisma.InputJsonValue,
      },
    });
  }

  await registrarControlesFinalizacion(
    tx,
    {
      id: gestion.id,
      fechaGestion: gestion.fechaGestion,
      modalidad: gestion.modalidad,
      tipoActividad: gestion.tipoActividad,
    },
    [
      {
        id: evaluacion.id,
        aspectoId: evaluacion.aspectoId,
        usuarioRegistradorId: evaluacion.usuarioRegistradorId,
        estadoCumplimiento: evaluacion.estadoCumplimiento,
        aspecto: {
          nombre: contexto.nombre,
        },
      },
    ],
    usuario
  );

  return {
    ...evaluacion,
    gestionId: gestion.id,
  };
}

export const servicioEvaluacionDirecta = {
  guardarLote: async (
    empresaId: string,
    data: GuardarEvaluacionesDirectasInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    validarLote(data);

    await asegurarAccesoEmpresa(usuario, empresaId, "ESCRITURA");

    const periodo = await prisma.empresaPeriodo.findUnique({
      where: {
        empresaId_anio: {
          empresaId,
          anio: data.anio,
        },
      },
    });

    if (!periodo) {
      throw new ErrorEvaluacion(
        "El periodo seleccionado todavía no está abierto.",
        404,
        "PERIODO_NO_ENCONTRADO"
      );
    }

    if (periodo.estado !== EstadoPeriodoSgsst.ABIERTO) {
      throw new ErrorEvaluacion(
        "El periodo está cerrado.",
        409,
        "PERIODO_CERRADO"
      );
    }

    const fechaEvaluacion = construirCorteAnual(data.anio);
    const versionAplicable =
      await servicioPeriodosEvaluacion.resolverVersionParaFecha(
        fechaEvaluacion
      );
    const categoriasAsignadas = await obtenerCategoriasAsignadas(
      empresaId,
      usuario
    );

    const guardadas = await prisma.$transaction(
      async (tx) => {
        const resultado = [];

        for (const evaluacion of data.evaluaciones) {
          resultado.push(
            await registrarEvaluacionDirecta(
              tx,
              empresaId,
              periodo.id,
              versionAplicable.id,
              fechaEvaluacion,
              evaluacion,
              usuario,
              categoriasAsignadas
            )
          );
        }

        return resultado;
      },
      {
        maxWait: 5000,
        timeout: 30000,
      }
    );

    return {
      total: guardadas.length,
      fechaEvaluacion: fechaEvaluacion.toISOString(),
      versionSupermatriz: versionAplicable,
      evaluaciones: guardadas,
    };
  },
};
