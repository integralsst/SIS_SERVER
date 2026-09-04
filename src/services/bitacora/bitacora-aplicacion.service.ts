import {
  EstadoAprobacionGestion,
  EstadoCumplimientoAspecto,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  AplicarRegistroBitacoraInput,
  PropuestaAspectoBitacora,
  ResultadoAnalisisBitacora,
} from "../../types/bitacora.types";
import type {
  EvaluacionAspectoInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import { ErrorValidacionBitacora } from "../../validators/bitacora/bitacora.validator";
import { servicioEvaluacionDirecta } from "../evaluacion/evaluacion-directa.service";
import { TIPO_ACTIVIDAD_BITACORA_INTERNA } from "./bitacora.constants";
import {
  construirUrlsConfirmadasPorAspecto,
  prepararUrlsParaConfirmacionHumana,
  validarDecisionesEvidenciaBitacora,
} from "./bitacora-evidencias-confirmacion.service";
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

function limitarTexto(texto: string, maximo: number): string {
  const limpio = texto.trim().replace(/\s+/g, " ");
  if (limpio.length <= maximo) {
    return limpio;
  }

  return `${limpio.slice(0, Math.max(0, maximo - 1)).trimEnd()}…`;
}

function fechaLegible(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split("-");
  if (!anio || !mes || !dia) {
    return fechaIso;
  }

  return `${dia}/${mes}/${anio}`;
}

function construirMetadataEvidencia(
  snapshot: SnapshotBitacoraIa,
  registroId: string,
  propuesta: PropuestaAspectoBitacora
): { nombre: string; descripcion: string } {
  const candidato = snapshot.recuperacion.aspectosCandidatos.find(
    (item) => item.aspectoId === propuesta.aspectoId
  );
  const codigo = candidato?.codigo?.trim() || String(propuesta.aspectoId);
  const nombreAspecto =
    candidato?.nombre?.trim() || `Aspecto ${propuesta.aspectoId}`;
  const confianza = Number.isFinite(propuesta.confianza)
    ? `${Math.round(propuesta.confianza * 100)}%`
    : null;
  const evidenciaInterpretada = propuesta.evidenciaBitacora?.trim() || null;

  const nombre = limitarTexto(
    `Evidencia · ${codigo} · ${nombreAspecto}`,
    191
  );
  const descripcion = [
    `Origen: Bitácora del ${fechaLegible(snapshot.fechaEfectiva)}.`,
    `Aspecto: ${codigo} · ${nombreAspecto}.`,
    evidenciaInterpretada
      ? `Evidencia identificada: ${evidenciaInterpretada}`
      : null,
    `Vinculada mediante análisis IA aprobado y confirmación humana${
      confianza ? ` · Confianza ${confianza}` : ""
    }.`,
    `Registro de Bitácora: ${registroId}.`,
  ]
    .filter((valor): valor is string => Boolean(valor))
    .join("\n");

  return {
    nombre,
    descripcion,
  };
}

async function enriquecerEvidenciasDesdeBitacora(params: {
  snapshot: SnapshotBitacoraIa;
  registroId: string;
  propuestas: PropuestaAspectoBitacora[];
  evaluaciones: Array<{
    id: string;
    aspectoId: number;
  }>;
  urlsPorAspecto: Record<string, string[]>;
}): Promise<void> {
  const {
    snapshot,
    registroId,
    propuestas,
    evaluaciones,
    urlsPorAspecto,
  } = params;

  for (const propuesta of propuestas) {
    const evaluacion = evaluaciones.find(
      (item) => item.aspectoId === propuesta.aspectoId
    );
    if (!evaluacion) {
      continue;
    }

    const urls = [
      ...new Set(
        (urlsPorAspecto[String(propuesta.aspectoId)] ?? [])
          .map((url) => url.trim())
          .filter(Boolean)
      ),
    ];
    if (urls.length === 0) {
      continue;
    }

    const metadata = construirMetadataEvidencia(
      snapshot,
      registroId,
      propuesta
    );

    for (const url of urls) {
      await prisma.evidenciaEvaluacion.updateMany({
        where: {
          evaluacionId: evaluacion.id,
          url,
          activo: true,
        },
        data: metadata,
      });
    }
  }
}

function reconstruirPendientesConfirmacion(
  snapshot: SnapshotBitacoraIa,
  registroId: string
) {
  const analisis: ResultadoAnalisisBitacora = {
    registroBitacoraId: registroId,
    modelo: snapshot.analisis.modelo ?? "desconocido",
    versionPrompt: snapshot.analisis.versionPrompt ?? "desconocido",
    unidadesVerificacion: snapshot.analisis.unidadesVerificacion,
    propuestas: snapshot.analisis.propuestas,
  };

  return (
    prepararUrlsParaConfirmacionHumana(
      analisis,
      snapshot.urlsDetectadas ?? []
    ).evidenciasPendientesConfirmacion ?? []
  );
}

function totalUrlsConfirmadas(
  urlsPorAspecto: Record<string, string[]>
): number {
  return Object.values(urlsPorAspecto).reduce(
    (total, urls) => total + new Set(urls).size,
    0
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
    const excluidosPrevios = new Set(snapshot.aplicacion.aspectoIdsExcluidos);
    const propuestasAplicadas = snapshot.analisis.propuestas.filter(
      (propuesta) =>
        propuesta.accion === "PROPONER_EVALUACION" &&
        !excluidosPrevios.has(propuesta.aspectoId)
    );
    const urlsPorAspecto = construirUrlsConfirmadasPorAspecto(
      snapshot.aplicacion.evidenciasDecididas ?? []
    );

    await enriquecerEvidenciasDesdeBitacora({
      snapshot,
      registroId,
      propuestas: propuestasAplicadas,
      evaluaciones: snapshot.aplicacion.evaluaciones,
      urlsPorAspecto,
    });

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

  const pendientes = reconstruirPendientesConfirmacion(snapshot, registroId);
  const evidenciasDecididas = validarDecisionesEvidenciaBitacora({
    pendientes,
    propuestas: snapshot.analisis.propuestas,
    aspectoIdsExcluidos: exclusiones,
    decisiones: input?.decisionesEvidencia,
  });
  const urlsPorAspecto =
    construirUrlsConfirmadasPorAspecto(evidenciasDecididas);

  const evaluaciones = seleccionadas.map((propuesta) =>
    convertirPropuesta(registroId, propuesta)
  );

  console.info("[BITACORA-ASISTIDA] aplicacion-inicio", {
    empresaId,
    registroId,
    usuarioId: usuario.usuarioId,
    totalPropuestas: evaluaciones.length,
    exclusiones,
    totalUrlsRevisadas: evidenciasDecididas.length,
    totalUrlsConfirmadas: evidenciasDecididas.filter(
      (decision) => decision.decision === "CONFIRMAR"
    ).length,
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

  await enriquecerEvidenciasDesdeBitacora({
    snapshot,
    registroId,
    propuestas: seleccionadas,
    evaluaciones: resultado.evaluaciones,
    urlsPorAspecto,
  });

  const totalEvidenciasVinculadas = totalUrlsConfirmadas(urlsPorAspecto);
  const aplicadaEn = new Date().toISOString();
  const aplicacion: NonNullable<SnapshotBitacoraIa["aplicacion"]> = {
    aplicadaEn,
    aplicadaPorUsuarioId: usuario.usuarioId,
    aspectoIdsExcluidos: exclusiones,
    evidenciasDecididas,
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
        detalle: `${resultado.evaluaciones.length} evaluación(es) aplicadas desde la Bitácora con ${totalEvidenciasVinculadas} enlace(s) confirmado(s) como evidencia.`,
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
        "Resumen de Bitácora IA aprobado y aplicado en lote al motor oficial de evaluación; los enlaces fueron decididos explícitamente por el usuario.",
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
