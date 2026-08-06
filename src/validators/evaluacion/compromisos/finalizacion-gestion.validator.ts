import {
  TipoResponsableCompromiso,
} from "@prisma/client";

import type {
  CompromisoFinalizacionInput,
  FinalizarGestionSgsstInput,
  ResponsableCompromisoFinalizacionInput,
} from "../../../types/evaluacion/compromisos/finalizacion-gestion.types";
import { ErrorEvaluacion } from "../../../utils/evaluacion";

function comoRegistro(
  value: unknown,
  mensaje: string
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new ErrorEvaluacion(mensaje);
  }

  return value as Record<string, unknown>;
}

function textoObligatorio(
  value: unknown,
  campo: string,
  minimo: number,
  maximo: number
): string {
  const texto =
    typeof value === "string" ? value.trim() : "";

  if (texto.length < minimo) {
    throw new ErrorEvaluacion(
      `El campo ${campo} debe tener al menos ${minimo} caracteres.`
    );
  }

  if (texto.length > maximo) {
    throw new ErrorEvaluacion(
      `El campo ${campo} no puede superar ${maximo} caracteres.`
    );
  }

  return texto;
}

function textoOpcional(
  value: unknown,
  campo: string,
  maximo: number
): string | null {
  if (value == null || value === "") {
    return null;
  }

  const texto =
    typeof value === "string" ? value.trim() : "";

  if (texto.length > maximo) {
    throw new ErrorEvaluacion(
      `El campo ${campo} no puede superar ${maximo} caracteres.`
    );
  }

  return texto || null;
}

function normalizarResponsable(
  value: unknown
): ResponsableCompromisoFinalizacionInput {
  const registro = comoRegistro(
    value,
    "Cada responsable del compromiso debe ser un objeto válido."
  );
  const usuarioResponsableId = textoObligatorio(
    registro.usuarioResponsableId,
    "usuarioResponsableId",
    1,
    191
  );
  const tipo = registro.tipo;

  if (
    tipo !== TipoResponsableCompromiso.PRINCIPAL &&
    tipo !== TipoResponsableCompromiso.APOYO
  ) {
    throw new ErrorEvaluacion(
      "El tipo de responsable debe ser PRINCIPAL o APOYO."
    );
  }

  return {
    usuarioResponsableId,
    tipo,
    actividad: textoObligatorio(
      registro.actividad,
      "actividad",
      5,
      2000
    ),
  };
}

function normalizarCompromiso(
  value: unknown
): CompromisoFinalizacionInput {
  const registro = comoRegistro(
    value,
    "Cada compromiso debe ser un objeto válido."
  );
  const responsables = Array.isArray(
    registro.responsables
  )
    ? registro.responsables.map(normalizarResponsable)
    : [];

  if (responsables.length === 0) {
    throw new ErrorEvaluacion(
      "Cada compromiso debe tener al menos un responsable."
    );
  }

  const principales = responsables.filter(
    (responsable) =>
      responsable.tipo ===
      TipoResponsableCompromiso.PRINCIPAL
  );

  if (principales.length !== 1) {
    throw new ErrorEvaluacion(
      "Cada compromiso debe tener exactamente un responsable principal."
    );
  }

  const ids = responsables.map(
    (responsable) =>
      responsable.usuarioResponsableId
  );

  if (new Set(ids).size !== ids.length) {
    throw new ErrorEvaluacion(
      "Un usuario no puede aparecer dos veces como responsable del mismo compromiso."
    );
  }

  return {
    evaluacionId: textoObligatorio(
      registro.evaluacionId,
      "evaluacionId",
      1,
      191
    ),
    descripcion: textoObligatorio(
      registro.descripcion,
      "descripción",
      10,
      4000
    ),
    recursos: textoOpcional(
      registro.recursos,
      "recursos",
      2000
    ),
    fechaLimite: textoObligatorio(
      registro.fechaLimite,
      "fecha límite",
      10,
      10
    ),
    responsables,
  };
}

export function normalizarFinalizacionGestion(
  value: unknown
): FinalizarGestionSgsstInput {
  if (value == null) {
    return {
      compromisos: [],
    };
  }

  const registro = comoRegistro(
    value,
    "La información de finalización no es válida."
  );
  const compromisos =
    registro.compromisos == null
      ? []
      : Array.isArray(registro.compromisos)
        ? registro.compromisos.map(
            normalizarCompromiso
          )
        : (() => {
            throw new ErrorEvaluacion(
              "El campo compromisos debe ser una lista."
            );
          })();

  const evaluacionIds = compromisos.map(
    (compromiso) => compromiso.evaluacionId
  );

  if (
    new Set(evaluacionIds).size !==
    evaluacionIds.length
  ) {
    throw new ErrorEvaluacion(
      "Una evaluación no puede tener más de un compromiso en la misma finalización."
    );
  }

  return {
    compromisos,
  };
}
