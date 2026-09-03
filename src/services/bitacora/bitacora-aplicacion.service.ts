import {
  EstadoAprobacionGestion,
  EstadoCumplimientoAspecto,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  AplicarRegistroBitacoraInput,
  PropuestaAspectoBitacora,
} from "../../types/bitacora.types";
import type {
  EvaluacionAspectoInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import { ErrorValidacionBitacora } from "../../validators/bitacora/bitacora.validator";
import { servicioEvaluacionDirecta } from "../evaluacion/evaluacion-directa.service";
import { TIPO_ACTIVIDAD_BITACORA_INTERNA } from "./bitacora.constants";
import { asegurarAccesoBitacoraEmpresa } from "./bitacora-permisos.service";
import {
  leerSnapshotBitacora,
  type SnapshotBitacoraIa,
} from "./bitacora-registros.service";

function aJsonPrisma(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function validarExclusiones(input: AplicarRegistroBitacoraInput): number[] {
  if (!input?.excluirAspectoIds) {
    return [];
  }

  if (!Array.isArray(input.excluirAspectoIds)) {
    throw new ErrorValidacionBitacora(
      "La lista de aspectos excluidos no es válida.",
      400,
      "BITACORA_EXCLUSIONES_INVALIDAS"
    );
  }

  const ids = [...new Set(input.excluirAspectoIds)];
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new ErrorValidacionBitacora(
      "Los aspectos excluidos deben ser identificadores enteros válidos.",
      400,
      "BITACORA_EXCLUSIONES_INVALIDAS"
    );
  }

  return ids;
}

function esEstadoAplicable(
  value: unknown
): value is EstadoCumplimientoAspecto {
  return Object.values(EstadoCumplimientoAspecto).includes(
    value as EstadoCumplimientoAspecto
  );
}

function convertirPropuesta(
  registroId: string,
  propuesta: PropuestaAspectoBitacora
): EvaluacionAspectoInput {
  if (
    propuesta.accion !== "PROPONER_EVALUACION" ||
    !esEstadoAplicable(propuesta.estadoPropuesto) ||
    propuesta.calificacionAdministrativaPropuesta === null
  ) {
    throw new ErrorValidacionBitacora(
      `La propuesta del aspecto ${propuesta.aspectoId} no está completa para aplicar.`,
      409,
      "BITACORA_PROPUESTA_NO_APLICABLE"
    );
  }

  const observacion = [
    propuesta.evidenciaBitacora,
    propuesta.justificacionTecnica,
    `Origen: Bitácora ${registroId}.`,
  ]
    .filter((valor): valor is string => Boolean(valor?.trim()))
    .join("\n\n");

  return {
    aspectoId: propuesta.aspectoId,
    estadoCumplimiento: propuesta.estadoPropuesto,
    calificacionAdministrativa:
      propuesta.calificacionAdministrativaPropuesta,
    observacion,
    fechaDocumento: propuesta.fechaDocumento,
    marcadaRevisionTecnica: propuesta.requiereRevisionTecnica,
    motivoRevisionTecnica: propuesta.requiereRevisionTecnica
      ? propuesta.justificacionTecnica
      : null,
  };
}

function construirUrlsPorAspecto(
  propuestas: PropuestaAspectoBitacora[]
): Record<string, string[]> {
  return Object.fromEntries(
    propuestas.map((propuesta) => [
      String(propuesta.aspectoId),
      [...new Set(propuesta.evidenciasUrls)],
    ])
  );
}

export async function aplicarBitacoraCompleta(
  empresaId: string,
  registroId: string,
  input: AplicarRegistroBitacoraInput,
  usuario: UsuarioSesionEvaluacion
) {
  await asegurarAccesoBitacoraEmpresa(usuario, empresaId);
  const exclusiones = validarExclusiones(input ?? {});

  const registro = await prisma.gestionSgsst.findFirst({
    where: {
      id: registroId,
      empresaPeriodo: {
        empresaId,
      },
      tipoActividad: TIPO_ACTIVIDAD_BITACORA_INTERNA,
      valida: false,
    },
    include: {
      aprobacion: true,
    },
  });

  if (!registro || !registro.aprobacion) {
    throw new ErrorValidacionBitacora(
      "No se encontró el registro de Bitácora solicitado.",
      404,
      "BITACORA_REGISTRO_NO_ENCONTRADO"
    );
  }

  const snapshot = leerSnapshotBitacora(
    registro.aprobacion.reglasAplicadas
  );

  if (
    registro.aprobacion.estado === EstadoAprobacionGestion.APROBADA &&
    snapshot.aplicacion
  ) {
    return {
      registroId,
      estado: "APLICADA" as const,
      idempotente: true,
      ...snapshot.aplicacion,
    };
  }

  if (snapshot.estadoProcesamiento !== "ANALIZADA") {
    throw new ErrorValidacionBitacora(
      "La Bitácora debe tener un análisis completo antes de aplicarse.",
      409,
      "BITACORA_ANALISIS_NO_LISTO"
    );
  }

  const excluidos = new Set(exclusiones);
  const seleccionadas = snapshot.analisis.propuestas.filter(
    (propuesta) =>
      propuesta.accion === "PROPONER_EVALUACION" &&
      !excluidos.has(propuesta.aspectoId)
  );

  if (seleccionadas.length === 0) {
    throw new ErrorValidacionBitacora(
      "La Bitácora no contiene evaluaciones propuestas para aplicar.",
      409,
      "BITACORA_SIN_PROPUESTAS_APLICABLES"
    );
  }

  const evaluaciones = seleccionadas.map((propuesta) =>
    convertirPropuesta(registroId, propuesta)
  );
  const urlsPorAspecto = construirUrlsPorAspecto(seleccionadas);

  console.info("[BITACORA-ASISTIDA] aplicacion-inicio", {
    empresaId,
    registroId,
    usuarioId: usuario.usuarioId,
    totalPropuestas: evaluaciones.length,
    exclusiones,
  });

  const resultado = await servicioEvaluacionDirecta.guardarLoteEnFecha(
    empresaId,
    {
      fechaEfectiva: snapshot.fechaEfectiva,
      bitacoraRegistroId: registroId,
      evaluaciones,
      evidenciasUrlsPorAspecto: urlsPorAspecto,
    },
    usuario
  );

  const totalEvidenciasVinculadas = seleccionadas.reduce(
    (total, propuesta) => total + new Set(propuesta.evidenciasUrls).size,
    0
  );
  const aplicadaEn = new Date().toISOString();
  const aplicacion: NonNullable<SnapshotBitacoraIa["aplicacion"]> = {
    aplicadaEn,
    aplicadaPorUsuarioId: usuario.usuarioId,
    aspectoIdsExcluidos: exclusiones,
    evaluaciones: resultado.evaluaciones.map((evaluacion) => ({
      id: evaluacion.id,
      aspectoId: evaluacion.aspectoId,
      gestionId: evaluacion.gestionId,
    })),
    totalEvidenciasVinculadas,
  };
  const snapshotAplicado: SnapshotBitacoraIa = {
    ...snapshot,
    estadoProcesamiento: "APLICADA",
    aplicacion,
    historial: [
      ...snapshot.historial,
      {
        accion: "APLICACION_COMPLETADA",
        fecha: aplicadaEn,
        usuarioId: usuario.usuarioId,
        detalle: `${resultado.evaluaciones.length} evaluación(es) aplicadas desde la Bitácora.`,
      },
    ],
  };

  await prisma.aprobacionGestion.update({
    where: { id: registro.aprobacion.id },
    data: {
      estado: EstadoAprobacionGestion.APROBADA,
      decididaPorUsuarioId: usuario.usuarioId,
      decididaEn: new Date(),
      observacionDecision:
        "Resumen de Bitácora IA aprobado y aplicado en lote al motor oficial de evaluación.",
      reglasAplicadas: aJsonPrisma(snapshotAplicado),
    },
  });

  console.info("[BITACORA-ASISTIDA] aplicacion-completada", {
    empresaId,
    registroId,
    totalEvaluaciones: resultado.evaluaciones.length,
    totalEvidenciasVinculadas,
  });

  return {
    registroId,
    estado: "APLICADA" as const,
    idempotente: false,
    ...aplicacion,
  };
}
