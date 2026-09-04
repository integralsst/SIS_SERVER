import type {
  ContextoAspectoBitacora,
  PropuestaAspectoBitacora,
  ResultadoAnalisisBitacora,
} from "../../../types/bitacora.types";
import { PROMPT_SISTEMA_BITACORA } from "../bitacora-ai.prompt";
import {
  PROMPT_RECONCILIACION_GLOBAL,
  VERSION_PROMPT_BITACORA_RECONCILIADA,
} from "../bitacora-ai-reconciliacion.prompt";
import { SCHEMA_RESPUESTA_BITACORA } from "./bitacora-ai.schema";
import {
  ErrorOpenRouter,
  solicitarJsonEstructuradoOpenRouter,
} from "./openrouter.client";

interface AsignacionEvidenciaFinalModelo {
  url: string;
  aspectoIds: number[];
}

interface RespuestaModeloBitacora {
  aspectosDirectosFinales: number[];
  asignacionesEvidenciaFinales: AsignacionEvidenciaFinalModelo[];
  justificacionAdjudicacionGlobal: string;
  propuestas: PropuestaAspectoBitacora[];
}

export interface AnalizarRegistroBitacoraIaInput {
  registroBitacoraId: string;
  fechaEfectiva: string;
  contenidoOriginal: string;
  urlsDisponibles?: string[];
  aspectos: ContextoAspectoBitacora[];
}

const MARCADOR_PASO_2 = "PASO 2 · COBERTURA DEL REQUISITO";

const PROMPT_SISTEMA_BITACORA_RECONCILIADO = (() => {
  if (!PROMPT_SISTEMA_BITACORA.includes(MARCADOR_PASO_2)) {
    throw new Error(
      "El prompt base de Bitácora no contiene el marcador esperado para insertar la reconciliación antes de cobertura."
    );
  }

  return PROMPT_SISTEMA_BITACORA.replace(
    MARCADOR_PASO_2,
    `${PROMPT_RECONCILIACION_GLOBAL}\n\n${MARCADOR_PASO_2}`
  );
})();

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

function agregarInformacionFaltante(
  actual: string[],
  mensaje: string
): string[] {
  return [...new Set([...actual, mensaje])];
}

function construirFechaIso(
  anio: number,
  mes: number,
  dia: number
): string | null {
  if (
    !Number.isInteger(anio) ||
    !Number.isInteger(mes) ||
    !Number.isInteger(dia) ||
    anio < 1900 ||
    anio > 2200 ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31
  ) {
    return null;
  }

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

function extraerFechasCalendarioExplicitas(contenido: string): Set<string> {
  const fechas = new Set<string>();
  const normalizado = contenido
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const agregar = (anio: number, mes: number, dia: number) => {
    const iso = construirFechaIso(anio, mes, dia);
    if (iso) fechas.add(iso);
  };

  for (const coincidencia of normalizado.matchAll(
    /(?:^|\D)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/g
  )) {
    agregar(
      Number(coincidencia[1]),
      Number(coincidencia[2]),
      Number(coincidencia[3])
    );
  }

  for (const coincidencia of normalizado.matchAll(
    /(?:^|\D)(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?!\d)/g
  )) {
    agregar(
      Number(coincidencia[3]),
      Number(coincidencia[2]),
      Number(coincidencia[1])
    );
  }

  for (const coincidencia of normalizado.matchAll(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/g
  )) {
    agregar(
      Number(coincidencia[3]),
      MESES_ES[coincidencia[2]],
      Number(coincidencia[1])
    );
  }

  return fechas;
}

function normalizarContextual(
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  return {
    ...propuesta,
    relacionSemantica: "CONTEXTUAL",
    coberturaRequisito: "NO_APLICA",
    elementosEvaluados: [],
    elementosNoEvaluados: [],
    accion: "SIN_CAMBIO",
    estadoActual: candidato.estadoActual,
    estadoPropuesto: candidato.estadoActual,
    calificacionAdministrativaPropuesta: null,
    evidenciaBitacora: null,
    evidenciasUrls: [],
    fechaDocumento: null,
    requiereEvidenciaDocumental: false,
    requiereRevisionTecnica: false,
  };
}

function aplicarGuardrailAlcance(
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  if (propuesta.alcanceEvaluacion !== "EXCLUIDO") {
    return {
      ...propuesta,
      alcanceEvaluacion: "EVALUADO",
    };
  }

  if (
    propuesta.relacionSemantica !== "CONTEXTUAL" ||
    propuesta.accion !== "SIN_CAMBIO" ||
    propuesta.calificacionAdministrativaPropuesta !== null ||
    propuesta.evidenciasUrls.length > 0 ||
    propuesta.fechaDocumento !== null
  ) {
    console.warn("[BITACORA-IA-GUARDRAIL] alcance-excluido-normalizado", {
      aspectoId: candidato.aspectoId,
      relacionOriginal: propuesta.relacionSemantica,
      accionOriginal: propuesta.accion,
      calificacionOriginal: propuesta.calificacionAdministrativaPropuesta,
    });
  }

  return normalizarContextual(candidato, {
    ...propuesta,
    alcanceEvaluacion: "EXCLUIDO",
  });
}

function normalizarAccionSinEvaluacion(
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  if (propuesta.accion === "PROPONER_EVALUACION") {
    return propuesta;
  }

  if (propuesta.relacionSemantica === "CONTEXTUAL") {
    return normalizarContextual(candidato, propuesta);
  }

  return {
    ...propuesta,
    estadoActual: candidato.estadoActual,
    estadoPropuesto: candidato.estadoActual,
    calificacionAdministrativaPropuesta: null,
  };
}

function aplicarGuardrailAdjudicacion(
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  if (propuesta.relacionSemantica === "CONTEXTUAL") {
    if (
      propuesta.accion !== "SIN_CAMBIO" ||
      propuesta.coberturaRequisito !== "NO_APLICA"
    ) {
      console.warn("[BITACORA-IA-GUARDRAIL] adjudicacion-normalizada", {
        aspectoId: candidato.aspectoId,
        motivo: "CONTEXTUAL_NO_EVALUABLE",
        accionOriginal: propuesta.accion,
        coberturaOriginal: propuesta.coberturaRequisito,
      });
    }

    return normalizarContextual(candidato, propuesta);
  }

  const coberturaRequisito =
    propuesta.coberturaRequisito === "NO_APLICA"
      ? "INDETERMINADA"
      : propuesta.coberturaRequisito;

  const directa = {
    ...propuesta,
    relacionSemantica: "DIRECTA" as const,
    coberturaRequisito,
    estadoActual: candidato.estadoActual,
  };

  if (
    directa.accion === "PROPONER_EVALUACION" &&
    directa.coberturaRequisito === "INDETERMINADA"
  ) {
    console.warn("[BITACORA-IA-GUARDRAIL] propuesta-degradada", {
      aspectoId: candidato.aspectoId,
      motivo: "COBERTURA_INDETERMINADA",
      accionOriginal: directa.accion,
    });

    return {
      ...directa,
      accion: "INFORMACION_INSUFICIENTE",
      estadoPropuesto: candidato.estadoActual,
      calificacionAdministrativaPropuesta: null,
      informacionFaltante: agregarInformacionFaltante(
        directa.informacionFaltante,
        "La anotación se refiere directamente al requisito, pero la cobertura disponible es indeterminada para proponer una calificación automática."
      ),
    };
  }

  return directa;
}

function aplicarGuardrailPropuestaCompleta(
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  if (propuesta.accion !== "PROPONER_EVALUACION") {
    return normalizarAccionSinEvaluacion(candidato, propuesta);
  }

  if (
    propuesta.estadoPropuesto !== null &&
    propuesta.calificacionAdministrativaPropuesta !== null
  ) {
    return propuesta;
  }

  console.warn("[BITACORA-IA-GUARDRAIL] propuesta-degradada", {
    aspectoId: candidato.aspectoId,
    motivo: "PROPUESTA_INCOMPLETA",
    accionOriginal: propuesta.accion,
    tieneEstadoPropuesto: propuesta.estadoPropuesto !== null,
    tieneCalificacion:
      propuesta.calificacionAdministrativaPropuesta !== null,
  });

  return {
    ...propuesta,
    accion: "REQUIERE_REVISION_HUMANA",
    estadoActual: candidato.estadoActual,
    estadoPropuesto: candidato.estadoActual,
    calificacionAdministrativaPropuesta: null,
    justificacionTecnica: `${propuesta.justificacionTecnica} Stack44 no permitió convertir esta interpretación en propuesta de evaluación porque el modelo no entregó estado y calificación completos.`.trim(),
    reglaAplicada: "GUARDRAIL_PROPUESTA_INCOMPLETA_V3_7",
    informacionFaltante: agregarInformacionFaltante(
      propuesta.informacionFaltante,
      "La interpretación requiere revisión humana porque no fue posible determinar de forma completa el estado y la calificación administrativa."
    ),
    requiereRevisionTecnica: true,
  };
}

function validarFechaDocumentoPropuesta(
  input: AnalizarRegistroBitacoraIaInput,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  if (propuesta.relacionSemantica === "CONTEXTUAL") {
    return {
      ...propuesta,
      fechaDocumento: null,
    };
  }

  const fechaDocumento = propuesta.fechaDocumento?.trim() || null;
  if (!fechaDocumento) {
    return {
      ...propuesta,
      fechaDocumento: null,
    };
  }

  const formatoIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaDocumento);
  const fechaValida = formatoIso
    ? construirFechaIso(
        Number(formatoIso[1]),
        Number(formatoIso[2]),
        Number(formatoIso[3])
      )
    : null;
  const fechasExplicitas = extraerFechasCalendarioExplicitas(
    input.contenidoOriginal
  );

  if (fechaValida === fechaDocumento && fechasExplicitas.has(fechaDocumento)) {
    return {
      ...propuesta,
      fechaDocumento,
    };
  }

  console.warn("[BITACORA-IA-GUARDRAIL] fecha-documental-descartada", {
    aspectoId: propuesta.aspectoId,
    fechaDocumentoPropuesta: fechaDocumento,
    motivo: fechaValida
      ? "FECHA_NO_EXPLICITA_EN_BITACORA"
      : "FECHA_DOCUMENTO_INVALIDA",
    fechasExplicitasDetectadas: [...fechasExplicitas],
  });

  return {
    ...propuesta,
    fechaDocumento: null,
    informacionFaltante: agregarInformacionFaltante(
      propuesta.informacionFaltante,
      "La fecha documental exacta no quedó sustentada por una fecha calendario completa y explícita en la Bitácora; la vigencia se mantendrá pendiente de fecha documental cuando la configuración del aspecto la requiera."
    ),
  };
}

function validarUrlsPropuesta(
  input: AnalizarRegistroBitacoraIaInput,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  if (propuesta.relacionSemantica === "CONTEXTUAL") {
    return {
      ...propuesta,
      evidenciasUrls: [],
    };
  }

  const disponibles = new Set(input.urlsDisponibles ?? []);
  const recibidas = Array.isArray(propuesta.evidenciasUrls)
    ? propuesta.evidenciasUrls
    : [];
  const normalizadas = [
    ...new Set(recibidas.map((url) => url.trim()).filter(Boolean)),
  ];

  for (const url of normalizadas) {
    if (!disponibles.has(url)) {
      throw new ErrorOpenRouter(
        `La IA intentó asociar una URL que no pertenece al registro de bitácora: ${url}.`,
        502,
        "BITACORA_IA_URL_NO_AUTORIZADA"
      );
    }
  }

  return {
    ...propuesta,
    evidenciasUrls: normalizadas,
  };
}

function validarAspectosDirectosFinales(
  input: AnalizarRegistroBitacoraIaInput,
  aspectosDirectosFinales: number[]
): Set<number> {
  if (!Array.isArray(aspectosDirectosFinales)) {
    throw new ErrorOpenRouter(
      "La respuesta de IA no contiene una adjudicación global válida.",
      502,
      "BITACORA_IA_ADJUDICACION_GLOBAL_INVALIDA"
    );
  }

  const candidatosAutorizados = new Set(
    input.aspectos.map((aspecto) => aspecto.aspectoId)
  );
  const finales = new Set<number>();

  for (const aspectoId of aspectosDirectosFinales) {
    if (!Number.isInteger(aspectoId)) {
      throw new ErrorOpenRouter(
        "La adjudicación global contiene un identificador de aspecto inválido.",
        502,
        "BITACORA_IA_ADJUDICACION_GLOBAL_INVALIDA"
      );
    }

    if (!candidatosAutorizados.has(aspectoId)) {
      throw new ErrorOpenRouter(
        `La adjudicación global incluyó un aspecto fuera del contexto autorizado: ${aspectoId}.`,
        502,
        "BITACORA_IA_ADJUDICACION_GLOBAL_NO_AUTORIZADA"
      );
    }

    if (finales.has(aspectoId)) {
      throw new ErrorOpenRouter(
        `La adjudicación global repitió el aspecto ${aspectoId}.`,
        502,
        "BITACORA_IA_ADJUDICACION_GLOBAL_DUPLICADA"
      );
    }

    finales.add(aspectoId);
  }

  return finales;
}

function obtenerAspectosExcluidosDeAlcance(
  propuestas: PropuestaAspectoBitacora[]
): Set<number> {
  if (!Array.isArray(propuestas)) {
    throw new ErrorOpenRouter(
      "La respuesta de IA no contiene una lista de propuestas válida.",
      502,
      "BITACORA_IA_RESPUESTA_INVALIDA"
    );
  }

  const excluidos = new Set<number>();

  for (const propuesta of propuestas) {
    if (
      propuesta.alcanceEvaluacion !== "EVALUADO" &&
      propuesta.alcanceEvaluacion !== "EXCLUIDO"
    ) {
      throw new ErrorOpenRouter(
        `La IA devolvió un alcance de evaluación inválido para el aspecto ${propuesta.aspectoId}.`,
        502,
        "BITACORA_IA_ALCANCE_INVALIDO"
      );
    }

    if (
      propuesta.alcanceEvaluacion === "EXCLUIDO" &&
      Number.isInteger(propuesta.aspectoId)
    ) {
      excluidos.add(propuesta.aspectoId);
    }
  }

  return excluidos;
}

function aplicarAlcanceGlobalAAspectosDirectos(
  aspectosDirectosFinales: Set<number>,
  aspectosExcluidos: Set<number>
): Set<number> {
  const filtrados = new Set(
    [...aspectosDirectosFinales].filter(
      (aspectoId) => !aspectosExcluidos.has(aspectoId)
    )
  );

  const removidos = [...aspectosDirectosFinales].filter((aspectoId) =>
    aspectosExcluidos.has(aspectoId)
  );

  if (removidos.length > 0) {
    console.warn("[BITACORA-IA-GUARDRAIL] alcance-global-excluido", {
      motivo: "ASPECTO_EXCLUIDO_NO_PUEDE_SER_DIRECTO",
      aspectoIds: removidos,
    });
  }

  return filtrados;
}

function aplicarAlcanceGlobalAAsignaciones(
  asignaciones: AsignacionEvidenciaFinalModelo[],
  aspectosExcluidos: Set<number>
): AsignacionEvidenciaFinalModelo[] {
  if (!Array.isArray(asignaciones) || aspectosExcluidos.size === 0) {
    return asignaciones;
  }

  return asignaciones.flatMap((asignacion) => {
    if (!asignacion || !Array.isArray(asignacion.aspectoIds)) {
      return [asignacion];
    }

    const aspectoIds = asignacion.aspectoIds.filter(
      (aspectoId) => !aspectosExcluidos.has(aspectoId)
    );

    if (aspectoIds.length !== asignacion.aspectoIds.length) {
      console.warn("[BITACORA-IA-GUARDRAIL] evidencia-excluida-por-alcance", {
        url: asignacion.url,
        aspectoIdsOriginales: asignacion.aspectoIds,
        aspectoIdsFinales: aspectoIds,
      });
    }

    if (aspectoIds.length === 0) {
      return [];
    }

    return [
      {
        ...asignacion,
        aspectoIds,
      },
    ];
  });
}

function validarAsignacionesEvidenciaFinales(
  input: AnalizarRegistroBitacoraIaInput,
  asignaciones: AsignacionEvidenciaFinalModelo[],
  aspectosDirectosFinales: Set<number>
): Map<number, string[]> {
  if (!Array.isArray(asignaciones)) {
    throw new ErrorOpenRouter(
      "La respuesta de IA no contiene una reconciliación global de evidencias válida.",
      502,
      "BITACORA_IA_EVIDENCIAS_GLOBALES_INVALIDAS"
    );
  }

  const urlsUnicas = [
    ...new Set((input.urlsDisponibles ?? []).map((url) => url.trim()).filter(Boolean)),
  ];
  const contenidoNormalizado = input.contenidoOriginal
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const declaraAmbiguedadExplicita = contenidoNormalizado
    .split(/[.!?;\n]+/)
    .some(
      (fragmento) =>
        /\b(enlace|url|evidencia|soporte|adjunto)\b/.test(fragmento) &&
        /(no\s+(?:es|fue)\s+posible\s+(?:determinar|establecer|identificar)|no\s+se\s+puede\s+(?:determinar|establecer|identificar)|no\s+queda\s+claro|no\s+esta\s+claro)/.test(
          fragmento
        ) &&
        /(correspond|pertenec|asoci|vincul|asign)/.test(fragmento)
    );

  if (
    urlsUnicas.length === 1 &&
    aspectosDirectosFinales.size > 1 &&
    declaraAmbiguedadExplicita
  ) {
    console.warn("[BITACORA-IA-GUARDRAIL] evidencia-global-descartada", {
      motivo: "URL_UNICA_CON_AMBIGUEDAD_EXPLICITA",
      url: urlsUnicas[0],
      aspectosDirectosFinales: [...aspectosDirectosFinales],
    });

    return new Map<number, string[]>();
  }

  const urlsDisponibles = new Set(input.urlsDisponibles ?? []);
  const urlsVistas = new Set<string>();
  const urlsPorAspecto = new Map<number, string[]>();

  for (const asignacion of asignaciones) {
    if (
      !asignacion ||
      typeof asignacion.url !== "string" ||
      !Array.isArray(asignacion.aspectoIds)
    ) {
      throw new ErrorOpenRouter(
        "La reconciliación global contiene una asignación de evidencia inválida.",
        502,
        "BITACORA_IA_EVIDENCIAS_GLOBALES_INVALIDAS"
      );
    }

    const url = asignacion.url.trim();
    if (!url || !urlsDisponibles.has(url)) {
      throw new ErrorOpenRouter(
        `La reconciliación global intentó usar una URL no autorizada: ${url || "(vacía)"}.`,
        502,
        "BITACORA_IA_EVIDENCIA_GLOBAL_NO_AUTORIZADA"
      );
    }

    if (urlsVistas.has(url)) {
      throw new ErrorOpenRouter(
        `La reconciliación global repitió la URL ${url}.`,
        502,
        "BITACORA_IA_EVIDENCIA_GLOBAL_DUPLICADA"
      );
    }
    urlsVistas.add(url);

    if (asignacion.aspectoIds.length === 0) {
      throw new ErrorOpenRouter(
        `La reconciliación global devolvió una asignación vacía para la URL ${url}.`,
        502,
        "BITACORA_IA_EVIDENCIA_GLOBAL_SIN_ASPECTO"
      );
    }

    const idsVistos = new Set<number>();
    for (const aspectoId of asignacion.aspectoIds) {
      if (!Number.isInteger(aspectoId)) {
        throw new ErrorOpenRouter(
          `La reconciliación global devolvió un aspecto inválido para la URL ${url}.`,
          502,
          "BITACORA_IA_EVIDENCIA_GLOBAL_ASPECTO_INVALIDO"
        );
      }

      if (!aspectosDirectosFinales.has(aspectoId)) {
        throw new ErrorOpenRouter(
          `La reconciliación global intentó vincular la URL ${url} a un aspecto que no quedó DIRECTO: ${aspectoId}.`,
          502,
          "BITACORA_IA_EVIDENCIA_GLOBAL_ASPECTO_NO_DIRECTO"
        );
      }

      if (idsVistos.has(aspectoId)) {
        throw new ErrorOpenRouter(
          `La reconciliación global repitió el aspecto ${aspectoId} para la URL ${url}.`,
          502,
          "BITACORA_IA_EVIDENCIA_GLOBAL_ASPECTO_DUPLICADO"
        );
      }
      idsVistos.add(aspectoId);

      const actuales = urlsPorAspecto.get(aspectoId) ?? [];
      urlsPorAspecto.set(aspectoId, [...actuales, url]);
    }
  }

  return urlsPorAspecto;
}

function aplicarReconciliacionGlobal(
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora,
  aspectosDirectosFinales: Set<number>
): PropuestaAspectoBitacora {
  const seleccionadaGlobalmente = aspectosDirectosFinales.has(
    propuesta.aspectoId
  );

  if (!seleccionadaGlobalmente) {
    if (propuesta.relacionSemantica === "DIRECTA") {
      console.warn("[BITACORA-IA-GUARDRAIL] directa-degradada-por-reconciliacion", {
        aspectoId: candidato.aspectoId,
        motivo: "NO_INCLUIDA_EN_CONJUNTO_DIRECTO_FINAL",
        accionOriginal: propuesta.accion,
      });
    }

    return normalizarContextual(candidato, propuesta);
  }

  if (propuesta.relacionSemantica !== "DIRECTA") {
    console.warn("[BITACORA-IA-GUARDRAIL] adjudicacion-global-inconsistente", {
      aspectoId: candidato.aspectoId,
      motivo: "INCLUIDA_GLOBALMENTE_PERO_PROPUESTA_CONTEXTUAL",
    });

    // Precisión > recall: el cierre global nunca promueve una propuesta
    // que individualmente no quedó sustentada como DIRECTA.
    return normalizarContextual(candidato, propuesta);
  }

  return propuesta;
}

function normalizarPropuestaModelo(
  input: AnalizarRegistroBitacoraIaInput,
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora,
  aspectosDirectosFinales: Set<number>,
  urlsFinalesPorAspecto: Map<number, string[]>
): PropuestaAspectoBitacora {
  const conAlcance = aplicarGuardrailAlcance(candidato, propuesta);
  const reconciliada = aplicarReconciliacionGlobal(
    candidato,
    conAlcance,
    aspectosDirectosFinales
  );
  const adjudicada = aplicarGuardrailAdjudicacion(candidato, reconciliada);
  const completa = aplicarGuardrailPropuestaCompleta(candidato, adjudicada);
  const conUrlsValidadas = validarUrlsPropuesta(input, completa);
  const urlsGlobales = urlsFinalesPorAspecto.get(candidato.aspectoId) ?? [];
  const conUrlsReconciliadas = {
    ...conUrlsValidadas,
    evidenciasUrls:
      conUrlsValidadas.relacionSemantica === "DIRECTA" ? urlsGlobales : [],
  };

  return validarFechaDocumentoPropuesta(input, conUrlsReconciliadas);
}

function validarPropuestasModelo(
  input: AnalizarRegistroBitacoraIaInput,
  propuestas: PropuestaAspectoBitacora[],
  aspectosDirectosFinales: Set<number>,
  urlsFinalesPorAspecto: Map<number, string[]>
): PropuestaAspectoBitacora[] {
  if (!Array.isArray(propuestas)) {
    throw new ErrorOpenRouter(
      "La respuesta de IA no contiene una lista de propuestas válida.",
      502,
      "BITACORA_IA_RESPUESTA_INVALIDA"
    );
  }

  const candidatos = new Map(
    input.aspectos.map((aspecto) => [aspecto.aspectoId, aspecto])
  );
  const idsVistos = new Set<number>();
  const validadas: PropuestaAspectoBitacora[] = [];

  for (const propuesta of propuestas) {
    const candidato = candidatos.get(propuesta.aspectoId);

    if (!candidato) {
      throw new ErrorOpenRouter(
        `La IA intentó relacionar un aspecto fuera del contexto autorizado: ${propuesta.aspectoId}.`,
        502,
        "BITACORA_IA_ASPECTO_NO_AUTORIZADO"
      );
    }

    if (idsVistos.has(propuesta.aspectoId)) {
      throw new ErrorOpenRouter(
        `La IA devolvió el aspecto ${propuesta.aspectoId} más de una vez.`,
        502,
        "BITACORA_IA_ASPECTO_DUPLICADO"
      );
    }

    idsVistos.add(propuesta.aspectoId);

    if (
      propuesta.alcanceEvaluacion !== "EVALUADO" &&
      propuesta.alcanceEvaluacion !== "EXCLUIDO"
    ) {
      throw new ErrorOpenRouter(
        `La IA devolvió un alcance de evaluación inválido para el aspecto ${propuesta.aspectoId}.`,
        502,
        "BITACORA_IA_ALCANCE_INVALIDO"
      );
    }

    if (propuesta.identidadHistorica !== candidato.identidadHistorica) {
      throw new ErrorOpenRouter(
        `La identidad histórica del aspecto ${propuesta.aspectoId} no coincide con Stack44.`,
        502,
        "BITACORA_IA_IDENTIDAD_INVALIDA"
      );
    }

    if (propuesta.fechaEfectiva !== input.fechaEfectiva) {
      throw new ErrorOpenRouter(
        `La IA alteró la fecha efectiva del registro para el aspecto ${propuesta.aspectoId}.`,
        502,
        "BITACORA_IA_FECHA_EFECTIVA_INVALIDA"
      );
    }

    if (![0, 3, 5, null].includes(propuesta.calificacionAdministrativaPropuesta)) {
      throw new ErrorOpenRouter(
        `La IA propuso una calificación administrativa inválida para el aspecto ${propuesta.aspectoId}.`,
        502,
        "BITACORA_IA_CALIFICACION_INVALIDA"
      );
    }

    if (
      typeof propuesta.confianza !== "number" ||
      propuesta.confianza < 0 ||
      propuesta.confianza > 1
    ) {
      throw new ErrorOpenRouter(
        `La IA devolvió una confianza inválida para el aspecto ${propuesta.aspectoId}.`,
        502,
        "BITACORA_IA_CONFIANZA_INVALIDA"
      );
    }

    validadas.push(
      normalizarPropuestaModelo(
        input,
        candidato,
        propuesta,
        aspectosDirectosFinales,
        urlsFinalesPorAspecto
      )
    );
  }

  for (const aspectoId of aspectosDirectosFinales) {
    if (!idsVistos.has(aspectoId)) {
      throw new ErrorOpenRouter(
        `La adjudicación global marcó como DIRECTO el aspecto ${aspectoId}, pero no existe una propuesta correspondiente.`,
        502,
        "BITACORA_IA_ADJUDICACION_GLOBAL_SIN_PROPUESTA"
      );
    }
  }

  return validadas;
}

export async function analizarRegistroBitacoraConIa(
  input: AnalizarRegistroBitacoraIaInput
): Promise<ResultadoAnalisisBitacora> {
  if (input.aspectos.length === 0) {
    return {
      registroBitacoraId: input.registroBitacoraId,
      modelo: "sin-modelo-candidatos-vacios",
      versionPrompt: VERSION_PROMPT_BITACORA_RECONCILIADA,
      propuestas: [],
    };
  }

  const contextoUsuario = {
    registro: {
      id: input.registroBitacoraId,
      fechaEfectiva: input.fechaEfectiva,
      contenidoOriginal: input.contenidoOriginal,
      enlacesDetectados: input.urlsDisponibles ?? [],
    },
    aspectosCandidatos: input.aspectos,
  };

  const respuesta = await solicitarJsonEstructuradoOpenRouter<RespuestaModeloBitacora>({
    mensajes: [
      {
        role: "system",
        content: PROMPT_SISTEMA_BITACORA_RECONCILIADO,
      },
      {
        role: "user",
        content: JSON.stringify(contextoUsuario),
      },
    ],
    schemaName: "stack44_bitacora_analisis_v312",
    schema: SCHEMA_RESPUESTA_BITACORA,
  });

  if (
    typeof respuesta.datos.justificacionAdjudicacionGlobal !== "string" ||
    respuesta.datos.justificacionAdjudicacionGlobal.trim().length === 0
  ) {
    throw new ErrorOpenRouter(
      "La respuesta de IA no justificó la adjudicación global final.",
      502,
      "BITACORA_IA_ADJUDICACION_GLOBAL_SIN_JUSTIFICACION"
    );
  }

  const aspectosDirectosDeclarados = validarAspectosDirectosFinales(
    input,
    respuesta.datos.aspectosDirectosFinales
  );
  const aspectosExcluidos = obtenerAspectosExcluidosDeAlcance(
    respuesta.datos.propuestas
  );
  const aspectosDirectosFinales = aplicarAlcanceGlobalAAspectosDirectos(
    aspectosDirectosDeclarados,
    aspectosExcluidos
  );
  const asignacionesEvidenciaConAlcance = aplicarAlcanceGlobalAAsignaciones(
    respuesta.datos.asignacionesEvidenciaFinales,
    aspectosExcluidos
  );
  const urlsFinalesPorAspecto = validarAsignacionesEvidenciaFinales(
    input,
    asignacionesEvidenciaConAlcance,
    aspectosDirectosFinales
  );

  return {
    registroBitacoraId: input.registroBitacoraId,
    modelo: respuesta.modelo,
    versionPrompt: VERSION_PROMPT_BITACORA_RECONCILIADA,
    propuestas: validarPropuestasModelo(
      input,
      respuesta.datos.propuestas,
      aspectosDirectosFinales,
      urlsFinalesPorAspecto
    ),
  };
}
