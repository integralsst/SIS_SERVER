import {
  EstadoCumplimientoAspecto,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  ContextoAspectoBitacora,
  PropuestaAspectoBitacora,
  UnidadVerificacionBitacora,
} from "../../types/bitacora.types";
import { extraerUrlsBitacora } from "./bitacora-enlaces.service";
import {
  guardarYAnalizarBitacora,
  leerSnapshotBitacora,
  type SnapshotBitacoraIa,
} from "./bitacora-registros.service";
import { buscarCandidatosAspectoBitacora } from "./recuperacion/candidatos-aspecto.service";
import { cargarContextoAspectosBitacora } from "./recuperacion/contexto-aspecto.service";
import { calcularSoporteDirectoBitacora } from "./recuperacion/relevancia-textual.service";
import type { CrearRegistroBitacoraInput } from "../../types/bitacora.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";

const MESES_ES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const MARGEN_COMPATIBILIDAD_UNIDAD_MINIMO = 2;
const PORCENTAJE_MARGEN_COMPATIBILIDAD_UNIDAD = 0.25;

function aJsonPrisma(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function construirFechaIso(
  anio: number,
  mes: number,
  dia: number
): string | null {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }

  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function normalizarTexto(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function fechaPareceVencimiento(texto: string, indice: number): boolean {
  const prefijo = texto.slice(Math.max(0, indice - 42), indice);
  return /(?:vigente\s+hasta|vigencia\s+hasta|vence|vencimiento|hasta\s+el)\s*$/i.test(
    prefijo
  );
}

function contextoPareceDocumental(
  texto: string,
  indice: number,
  longitud: number
): boolean {
  const ventana = texto.slice(
    Math.max(0, indice - 110),
    Math.min(texto.length, indice + longitud + 110)
  );

  return /(acta|documento|certificado|licencia|resolucion|soporte|constancia|informe|formato|matriz|plan|programa|politica|procedimiento|fecha\s+(?:del|de)|emitid|expedid|elaborad|suscrit)/i.test(
    ventana
  );
}

function extraerFechaDocumentalSegura(contenido: string): string | null {
  const texto = normalizarTexto(contenido);
  const fechas = new Set<string>();

  const agregar = (
    indice: number,
    longitud: number,
    anio: number,
    mes: number,
    dia: number
  ) => {
    if (
      fechaPareceVencimiento(texto, indice) ||
      !contextoPareceDocumental(texto, indice, longitud)
    ) {
      return;
    }

    const iso = construirFechaIso(anio, mes, dia);
    if (iso) fechas.add(iso);
  };

  for (const match of texto.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})/g)) {
    agregar(
      match.index ?? 0,
      match[0].length,
      Number(match[1]),
      Number(match[2]),
      Number(match[3])
    );
  }

  for (const match of texto.matchAll(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/g)) {
    agregar(
      match.index ?? 0,
      match[0].length,
      Number(match[3]),
      Number(match[2]),
      Number(match[1])
    );
  }

  for (const match of texto.matchAll(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/g
  )) {
    agregar(
      match.index ?? 0,
      match[0].length,
      Number(match[3]),
      MESES_ES[match[2]],
      Number(match[1])
    );
  }

  return fechas.size === 1 ? [...fechas][0] : null;
}

function calificacionPorEstado(
  estado: EstadoCumplimientoAspecto | null
): 0 | 3 | 5 | null {
  switch (estado) {
    case EstadoCumplimientoAspecto.CUMPLIDO:
      return 5;
    case EstadoCumplimientoAspecto.PARCIAL:
      return 3;
    case EstadoCumplimientoAspecto.NO_CUMPLIDO:
      return 0;
    default:
      return null;
  }
}

function urlsCanonicas(urls: string[]): string[] {
  const normalizadas = new Set<string>();

  for (const candidata of urls) {
    try {
      const url = new URL(candidata.trim());
      if (url.protocol === "http:" || url.protocol === "https:") {
        normalizadas.add(url.toString());
      }
    } catch {
      // La URL inválida se ignora; nunca se inventa una alternativa.
    }
  }

  return [...normalizadas];
}

function normalizarContextualPorCompatibilidad(
  contexto: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  return {
    ...propuesta,
    relacionSemantica: "CONTEXTUAL",
    coberturaRequisito: "NO_APLICA",
    elementosEvaluados: [],
    elementosNoEvaluados: [],
    accion: "SIN_CAMBIO",
    estadoActual: contexto.estadoActual,
    estadoPropuesto: contexto.estadoActual,
    calificacionAdministrativaPropuesta: null,
    evidenciaBitacora: null,
    evidenciasUrls: [],
    fechaDocumento: null,
    justificacionTecnica: `${propuesta.justificacionTecnica} Stack44 descartó el reconocimiento directo porque ninguna unidad de verificación referenciada quedó suficientemente próxima al mejor ajuste local entre los candidatos recuperados.`.trim(),
    reglaAplicada: propuesta.reglaAplicada?.trim()
      ? `${propuesta.reglaAplicada.trim()} | GUARDRAIL_COMPATIBILIDAD_UNIDAD_ASPECTO_V1`
      : "GUARDRAIL_COMPATIBILIDAD_UNIDAD_ASPECTO_V1",
    requiereEvidenciaDocumental: false,
    requiereRevisionTecnica: false,
  };
}

function construirCompatibilidadUnidades(params: {
  unidades: UnidadVerificacionBitacora[];
  candidatos: Awaited<ReturnType<typeof buscarCandidatosAspectoBitacora>>;
}): Map<string, Set<number>> {
  const compatiblesPorUnidad = new Map<string, Set<number>>();

  for (const unidad of params.unidades) {
    if (unidad.tipo !== "EVALUACION") {
      compatiblesPorUnidad.set(unidad.id, new Set<number>());
      continue;
    }

    const resultados = params.candidatos.map((candidato) => {
      const soporte = calcularSoporteDirectoBitacora({
        // La compatibilidad se calcula sobre el fragmento literal, no sobre el
        // objetoTecnico generado por el modelo. Así una etiqueta incorrecta de
        // la IA no puede convertir una unidad vecina en evidencia válida.
        contenidoBitacora: unidad.fragmentoBitacora,
        codigo: candidato.codigo,
        nombre: candidato.nombre,
        palabrasClave: candidato.palabrasClave,
      });

      return {
        aspectoId: candidato.aspectoId,
        puntaje: soporte.puntaje,
        conflictoEntidad: soporte.conflictoEntidad,
      };
    });

    const elegibles = resultados.filter(
      (resultado) => !resultado.conflictoEntidad && resultado.puntaje > 0
    );
    const mejorPuntaje = elegibles.reduce(
      (maximo, resultado) => Math.max(maximo, resultado.puntaje),
      0
    );

    if (mejorPuntaje === 0) {
      compatiblesPorUnidad.set(unidad.id, new Set<number>());
      continue;
    }

    const margen = Math.max(
      MARGEN_COMPATIBILIDAD_UNIDAD_MINIMO,
      Math.ceil(mejorPuntaje * PORCENTAJE_MARGEN_COMPATIBILIDAD_UNIDAD)
    );
    const umbralRelativo = Math.max(1, mejorPuntaje - margen);
    const compatibles = new Set(
      elegibles
        .filter((resultado) => resultado.puntaje >= umbralRelativo)
        .map((resultado) => resultado.aspectoId)
    );

    compatiblesPorUnidad.set(unidad.id, compatibles);

    console.info("[BITACORA-IA-GUARDRAIL] compatibilidad-unidad", {
      unidadId: unidad.id,
      mejorPuntaje,
      umbralRelativo,
      aspectoIdsCompatibles: [...compatibles],
    });
  }

  return compatiblesPorUnidad;
}

function aplicarGuardrailCompatibilidadUnidad(params: {
  propuesta: PropuestaAspectoBitacora;
  contexto: ContextoAspectoBitacora;
  unidadesPorId: Map<string, UnidadVerificacionBitacora>;
  compatiblesPorUnidad: Map<string, Set<number>>;
}): PropuestaAspectoBitacora {
  const { propuesta, contexto, unidadesPorId, compatiblesPorUnidad } = params;

  if (propuesta.relacionSemantica !== "DIRECTA") {
    return propuesta;
  }

  const unidadIds = propuesta.unidadVerificacionIds ?? [];
  const tieneUnidadCompatible = unidadIds.some((unidadId) => {
    const unidad = unidadesPorId.get(unidadId);
    return (
      unidad?.tipo === "EVALUACION" &&
      compatiblesPorUnidad.get(unidadId)?.has(propuesta.aspectoId)
    );
  });

  if (tieneUnidadCompatible) {
    return propuesta;
  }

  console.warn("[BITACORA-IA-GUARDRAIL] directa-degradada-por-compatibilidad-unidad", {
    aspectoId: propuesta.aspectoId,
    unidadVerificacionIds: unidadIds,
    motivo: "SIN_UNIDAD_LOCALMENTE_COMPATIBLE",
  });

  return normalizarContextualPorCompatibilidad(contexto, propuesta);
}

function resolverAccionPorComparacionEstado(
  contexto: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  if (
    propuesta.relacionSemantica !== "DIRECTA" ||
    propuesta.accion !== "PROPONER_EVALUACION" ||
    propuesta.estadoPropuesto === null ||
    propuesta.calificacionAdministrativaPropuesta === null
  ) {
    return propuesta;
  }

  const calificacionEsperada = calificacionPorEstado(propuesta.estadoPropuesto);
  if (
    calificacionEsperada === null ||
    calificacionEsperada !== propuesta.calificacionAdministrativaPropuesta
  ) {
    return propuesta;
  }

  if (
    contexto.estadoActual === null ||
    contexto.estadoActual !== propuesta.estadoPropuesto
  ) {
    return {
      ...propuesta,
      estadoActual: contexto.estadoActual,
    };
  }

  return {
    ...propuesta,
    accion: "SIN_CAMBIO",
    estadoActual: contexto.estadoActual,
    estadoPropuesto: contexto.estadoActual,
    calificacionAdministrativaPropuesta: null,
    justificacionTecnica: `${propuesta.justificacionTecnica} Stack44 comparó determinísticamente el resultado técnico nuevo contra el estado vigente y confirmó que la calificación administrativa no cambia.`.trim(),
    reglaAplicada: propuesta.reglaAplicada?.trim()
      ? `${propuesta.reglaAplicada.trim()} | COMPARACION_ESTADO_BACKEND_V1`
      : "COMPARACION_ESTADO_BACKEND_V1",
  };
}

function construirResumen(
  propuestas: PropuestaAspectoBitacora[],
  reconocidosIds: Set<number>
) {
  const evaluaciones = propuestas.filter(
    (propuesta) => propuesta.accion === "PROPONER_EVALUACION"
  );
  const requierenRevision = propuestas.filter(
    (propuesta) =>
      propuesta.accion === "INFORMACION_INSUFICIENTE" ||
      propuesta.accion === "REQUIERE_REVISION_HUMANA"
  );
  const sinCambio = propuestas.filter(
    (propuesta) => propuesta.accion === "SIN_CAMBIO"
  );
  const aspectosReconocidos = propuestas.filter((propuesta) =>
    reconocidosIds.has(propuesta.aspectoId)
  );
  const evidenciasUrls = [
    ...new Set(evaluaciones.flatMap((propuesta) => propuesta.evidenciasUrls)),
  ];

  return {
    totalAspectosAnalizados: propuestas.length,
    totalAspectosReconocidos: aspectosReconocidos.length,
    totalEvaluacionesPropuestas: evaluaciones.length,
    totalRequierenRevision: requierenRevision.length,
    totalSinCambio: sinCambio.length,
    totalEvidenciasDetectadas: evidenciasUrls.length,
    evaluaciones,
    aspectosReconocidos,
    sinCambio,
    requierenRevision,
    evidenciasUrls,
  };
}

function enriquecerPropuestas(params: {
  contenido: string;
  propuestas: PropuestaAspectoBitacora[];
  unidadesVerificacion: UnidadVerificacionBitacora[];
  contextos: ContextoAspectoBitacora[];
  candidatos: Awaited<ReturnType<typeof buscarCandidatosAspectoBitacora>>;
}) {
  const {
    contenido,
    propuestas,
    unidadesVerificacion,
    contextos,
    candidatos,
  } = params;
  const contextoPorId = new Map(
    contextos.map((contexto) => [contexto.aspectoId, contexto])
  );
  const candidatoPorId = new Map(
    candidatos.map((candidato) => [candidato.aspectoId, candidato])
  );
  const unidadesPorId = new Map(
    unidadesVerificacion.map((unidad) => [unidad.id, unidad])
  );
  const compatiblesPorUnidad = construirCompatibilidadUnidades({
    unidades: unidadesVerificacion,
    candidatos,
  });
  const propuestasCompatibles = propuestas.map((propuesta) => {
    const contexto = contextoPorId.get(propuesta.aspectoId);
    if (!contexto || !candidatoPorId.has(propuesta.aspectoId)) {
      return propuesta;
    }

    return aplicarGuardrailCompatibilidadUnidad({
      propuesta,
      contexto,
      unidadesPorId,
      compatiblesPorUnidad,
    });
  });
  const reconocidosIds = new Set<number>();

  for (const propuesta of propuestasCompatibles) {
    if (
      candidatoPorId.has(propuesta.aspectoId) &&
      propuesta.relacionSemantica === "DIRECTA"
    ) {
      reconocidosIds.add(propuesta.aspectoId);
    }
  }

  const urlsDetectadas = urlsCanonicas(extraerUrlsBitacora(contenido));
  const fechaDocumental = extraerFechaDocumentalSegura(contenido);
  const reconocidos = propuestasCompatibles.filter((propuesta) =>
    reconocidosIds.has(propuesta.aspectoId)
  );
  const aspectoUrlUnica =
    urlsDetectadas.length === 1 && reconocidos.length === 1
      ? reconocidos[0].aspectoId
      : null;
  const aspectoFechaUnica =
    fechaDocumental && reconocidos.length === 1
      ? reconocidos[0].aspectoId
      : null;

  const enriquecidas = propuestasCompatibles.map((propuesta) => {
    if (!reconocidosIds.has(propuesta.aspectoId)) {
      return propuesta;
    }

    const contexto = contextoPorId.get(propuesta.aspectoId);
    if (!contexto) return propuesta;

    const propuestaComparada = resolverAccionPorComparacionEstado(
      contexto,
      propuesta
    );

    const urlsModelo = urlsCanonicas(
      propuestaComparada.evidenciasUrls ?? []
    ).filter((url) => urlsDetectadas.includes(url));
    const evidenciasUrls =
      urlsModelo.length > 0
        ? urlsModelo
        : aspectoUrlUnica === propuestaComparada.aspectoId
          ? urlsDetectadas
          : [];
    const fechaDocumento =
      propuestaComparada.fechaDocumento ??
      (aspectoFechaUnica === propuestaComparada.aspectoId
        ? fechaDocumental
        : null);

    if (propuestaComparada.accion !== "SIN_CAMBIO") {
      return {
        ...propuestaComparada,
        evidenciasUrls,
        fechaDocumento,
      };
    }

    const calificacionActual = calificacionPorEstado(contexto.estadoActual);
    const urlsActuales = new Set(
      urlsCanonicas(contexto.evidenciasUrlsActuales ?? [])
    );
    const aportaUrlNueva = evidenciasUrls.some(
      (url) => !urlsActuales.has(url)
    );
    const aportaFechaNueva = Boolean(
      fechaDocumento && fechaDocumento !== contexto.fechaDocumentoActual
    );
    const aportaSoporteNuevo = aportaUrlNueva || aportaFechaNueva;

    if (!aportaSoporteNuevo || calificacionActual === null) {
      return {
        ...propuestaComparada,
        evidenciasUrls,
        fechaDocumento,
      };
    }

    return {
      ...propuestaComparada,
      accion: "PROPONER_EVALUACION" as const,
      estadoPropuesto: contexto.estadoActual,
      calificacionAdministrativaPropuesta: calificacionActual,
      evidenciaBitacora:
        propuestaComparada.evidenciaBitacora?.trim() ||
        "La Bitácora aporta soporte documental nuevo para el aspecto sin modificar su calificación vigente.",
      evidenciasUrls,
      fechaDocumento,
      justificacionTecnica:
        "La información confirma el estado vigente y aporta soporte documental nuevo. Stack44 registra una nueva evaluación histórica con la misma calificación para conservar inmutabilidad y actualizar evidencia/vigencia.",
      reglaAplicada: "ACTUALIZACION_SOPORTE_DIRECTO_SIN_CAMBIO_V2",
      informacionFaltante: [],
      requiereRevisionTecnica: contexto.requiereRevisionTecnica,
    } satisfies PropuestaAspectoBitacora;
  });

  return {
    propuestas: enriquecidas,
    reconocidosIds,
  };
}

export async function guardarYAnalizarBitacoraOperativa(
  empresaId: string,
  input: CrearRegistroBitacoraInput,
  usuario: UsuarioSesionEvaluacion
) {
  const resultado = await guardarYAnalizarBitacora(
    empresaId,
    input,
    usuario
  );

  const candidatos = await buscarCandidatosAspectoBitacora({
    versionSupermatrizId: resultado.versionSupermatriz.id,
    contenidoBitacora: resultado.registro.contenidoOriginal,
  });
  const contextos = await cargarContextoAspectosBitacora({
    empresaId,
    versionSupermatrizId: resultado.versionSupermatriz.id,
    fechaEfectiva: new Date(`${resultado.registro.fechaEfectiva}T12:00:00.000Z`),
    candidatos,
  });
  const enriquecido = enriquecerPropuestas({
    contenido: resultado.registro.contenidoOriginal,
    propuestas: resultado.analisis.propuestas,
    unidadesVerificacion: resultado.analisis.unidadesVerificacion ?? [],
    contextos,
    candidatos,
  });

  const registro = await prisma.gestionSgsst.findUnique({
    where: { id: resultado.registro.id },
    include: { aprobacion: true },
  });

  const aspectosDirectosFinales = enriquecido.propuestas
    .filter((propuesta) => propuesta.relacionSemantica === "DIRECTA")
    .map((propuesta) => propuesta.aspectoId);

  if (!registro?.aprobacion) {
    return {
      ...resultado,
      analisis: {
        ...resultado.analisis,
        aspectosDirectosFinales,
        propuestas: enriquecido.propuestas,
      },
      resumen: construirResumen(
        enriquecido.propuestas,
        enriquecido.reconocidosIds
      ),
    };
  }

  const snapshot = leerSnapshotBitacora(
    registro.aprobacion.reglasAplicadas
  );
  const snapshotActualizado: SnapshotBitacoraIa = {
    ...snapshot,
    analisis: {
      ...snapshot.analisis,
      unidadesVerificacion:
        resultado.analisis.unidadesVerificacion ??
        snapshot.analisis.unidadesVerificacion ??
        [],
      aspectosDirectosFinales,
      propuestas: enriquecido.propuestas,
    },
  };

  await prisma.aprobacionGestion.update({
    where: { id: registro.aprobacion.id },
    data: {
      reglasAplicadas: aJsonPrisma(snapshotActualizado),
    },
  });

  return {
    ...resultado,
    analisis: {
      ...resultado.analisis,
      aspectosDirectosFinales,
      propuestas: enriquecido.propuestas,
    },
    resumen: construirResumen(
      enriquecido.propuestas,
      enriquecido.reconocidosIds
    ),
  };
}
