import type {
  ContextoAspectoBitacora,
  PropuestaAspectoBitacora,
  ResultadoAnalisisBitacora,
} from "../../../types/bitacora.types";
import {
  PROMPT_SISTEMA_BITACORA,
  VERSION_PROMPT_BITACORA,
} from "../bitacora-ai.prompt";
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
  }

  return propuestas;
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
