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
  aspectos: ContextoAspectoBitacora[];
}

function agregarInformacionFaltante(
  actual: string[],
  mensaje: string
): string[] {
  return [...new Set([...actual, mensaje])];
}

function aplicarGuardrailSoporteDirecto(
  input: AnalizarRegistroBitacoraIaInput,
  candidato: ContextoAspectoBitacora,
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  if (propuesta.accion !== "PROPONER_EVALUACION") {
    return {
      ...propuesta,
      calificacionAdministrativaPropuesta: null,
    };
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
    fechaDocumento: null,
    justificacionTecnica:
      "Stack44 bloqueó la propuesta de evaluación porque el registro no aporta evidencia directa suficiente sobre este aspecto. La ausencia de mención no constituye incumplimiento.",
    reglaAplicada: "GUARDRAIL_SOPORTE_DIRECTO_V2",
    informacionFaltante: agregarInformacionFaltante(
      propuesta.informacionFaltante,
      "No existe evidencia directa suficiente sobre este aspecto en el registro analizado."
    ),
    requiereEvidenciaDocumental: false,
    requiereRevisionTecnica: false,
  };
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
      propuesta.accion === "PROPONER_EVALUACION" &&
      (propuesta.estadoPropuesto === null ||
        propuesta.calificacionAdministrativaPropuesta === null)
    ) {
      throw new ErrorOpenRouter(
        `La IA propuso evaluar el aspecto ${propuesta.aspectoId} sin estado o calificación administrativa.`,
        502,
        "BITACORA_IA_PROPUESTA_INCOMPLETA"
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
      aplicarGuardrailSoporteDirecto(input, candidato, propuesta)
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
