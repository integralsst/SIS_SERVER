import type {
  ContextoAspectoBitacora,
  PropuestaAspectoBitacora,
  ResultadoAnalisisBitacora,
} from "../../../types/bitacora.types";
import {
  PROMPT_SISTEMA_BITACORA,
  VERSION_PROMPT_BITACORA,
} from "../bitacora-ai.prompt";
import {
  calcularSoporteDirectoBitacora,
  tieneSoporteDirectoBitacora,
} from "../recuperacion/relevancia-textual.service";
import { SCHEMA_RESPUESTA_BITACORA } from "./bitacora-ai.schema";
import {
  ErrorOpenRouter,
  solicitarJsonEstructuradoOpenRouter,
} from "./openrouter.client";

interface RespuestaModeloBitacora {
  propuestas: PropuestaAspectoBitacora[];
}

export interface AnalizarRegistroBitacoraIaInput {
  registroBitacoraId: string;
  fechaEfectiva: string;
  contenidoOriginal: string;
  urlsDisponibles?: string[];
  aspectos: ContextoAspectoBitacora[];
}

function agregarInformacionFaltante(
  actual: string[],
  mensaje: string
): string[] {
  return [...new Set([...actual, mensaje])];
}

function normalizarAccionSinEvaluacion(
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  if (propuesta.accion === "PROPONER_EVALUACION") {
    return propuesta;
  }

  return {
    ...propuesta,
    estadoPropuesto: candidato.estadoActual,
    calificacionAdministrativaPropuesta: null,
    evidenciasUrls: [],
  };
}

function aplicarGuardrailSoporteDirecto(
  input: AnalizarRegistroBitacoraIaInput,
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  if (propuesta.accion !== "PROPONER_EVALUACION") {
    return normalizarAccionSinEvaluacion(candidato, propuesta);
  }

  const soporteDirecto = calcularSoporteDirectoBitacora({
    contenidoBitacora: input.contenidoOriginal,
    codigo: candidato.codigo,
    nombre: candidato.nombre,
    palabrasClave: candidato.palabrasClave,
  });

  if (tieneSoporteDirectoBitacora(soporteDirecto)) {
    return propuesta;
  }

  console.warn("[BITACORA-IA-GUARDRAIL] propuesta-degradada", {
    aspectoId: candidato.aspectoId,
    motivo: "SIN_SOPORTE_DIRECTO",
    accionOriginal: propuesta.accion,
    puntajeSoporteDirecto: soporteDirecto.puntaje,
    conflictoEntidad: soporteDirecto.conflictoEntidad,
    senalesDirectas: soporteDirecto.senales,
  });

  return {
    ...propuesta,
    accion: "SIN_CAMBIO",
    estadoPropuesto: candidato.estadoActual,
    calificacionAdministrativaPropuesta: null,
    evidenciaBitacora: null,
    evidenciasUrls: [],
    fechaDocumento: null,
    justificacionTecnica:
      "Stack44 bloqueó la propuesta de evaluación porque el registro no aporta evidencia directa suficiente sobre este aspecto. La ausencia de mención no constituye incumplimiento.",
    reglaAplicada: "GUARDRAIL_SOPORTE_DIRECTO_V2_1",
    informacionFaltante: agregarInformacionFaltante(
      propuesta.informacionFaltante,
      "No existe evidencia directa suficiente sobre este aspecto en el registro analizado."
    ),
    requiereEvidenciaDocumental: false,
    requiereRevisionTecnica: false,
  };
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
    estadoPropuesto: candidato.estadoActual,
    calificacionAdministrativaPropuesta: null,
    evidenciasUrls: [],
    justificacionTecnica: `${propuesta.justificacionTecnica} Stack44 no permitió convertir esta interpretación en propuesta de evaluación porque el modelo no entregó estado y calificación completos.`.trim(),
    reglaAplicada: "GUARDRAIL_PROPUESTA_INCOMPLETA_V2_1",
    informacionFaltante: agregarInformacionFaltante(
      propuesta.informacionFaltante,
      "La interpretación requiere revisión humana porque no fue posible determinar de forma completa el estado y la calificación administrativa."
    ),
    requiereRevisionTecnica: true,
  };
}

function validarUrlsPropuesta(
  input: AnalizarRegistroBitacoraIaInput,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  const disponibles = new Set(input.urlsDisponibles ?? []);
  const recibidas = Array.isArray(propuesta.evidenciasUrls)
    ? propuesta.evidenciasUrls
    : [];
  const normalizadas = [...new Set(recibidas.map((url) => url.trim()).filter(Boolean))];

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
    evidenciasUrls:
      propuesta.accion === "PROPONER_EVALUACION" ? normalizadas : [],
  };
}

function normalizarPropuestaModelo(
  input: AnalizarRegistroBitacoraIaInput,
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  const conUrlsValidadas = validarUrlsPropuesta(input, propuesta);
  const conSoporteValidado = aplicarGuardrailSoporteDirecto(
    input,
    candidato,
    conUrlsValidadas
  );

  return aplicarGuardrailPropuestaCompleta(
    candidato,
    conSoporteValidado
  );
}

function validarPropuestasModelo(
  input: AnalizarRegistroBitacoraIaInput,
  propuestas: PropuestaAspectoBitacora[]
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
      normalizarPropuestaModelo(input, candidato, propuesta)
    );
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
      versionPrompt: VERSION_PROMPT_BITACORA,
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
        content: PROMPT_SISTEMA_BITACORA,
      },
      {
        role: "user",
        content: JSON.stringify(contextoUsuario),
      },
    ],
    schemaName: "stack44_bitacora_analisis",
    schema: SCHEMA_RESPUESTA_BITACORA,
  });

  return {
    registroBitacoraId: input.registroBitacoraId,
    modelo: respuesta.modelo,
    versionPrompt: VERSION_PROMPT_BITACORA,
    propuestas: validarPropuestasModelo(input, respuesta.datos.propuestas),
  };
}
