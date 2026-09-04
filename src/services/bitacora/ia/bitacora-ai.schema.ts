export const SCHEMA_RESPUESTA_BITACORA = {
  type: "object",
  additionalProperties: false,
  properties: {
    propuestas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          aspectoId: { type: "integer" },
          identidadHistorica: { type: "string" },
          relacionSemantica: {
            type: "string",
            enum: ["DIRECTA", "CONTEXTUAL"],
          },
          coberturaRequisito: {
            type: "string",
            enum: ["COMPLETA", "PARCIAL", "INDETERMINADA", "NO_APLICA"],
          },
          elementosEvaluados: {
            type: "array",
            items: { type: "string" },
          },
          elementosNoEvaluados: {
            type: "array",
            items: { type: "string" },
          },
          accion: {
            type: "string",
            enum: [
              "SIN_CAMBIO",
              "PROPONER_EVALUACION",
              "INFORMACION_INSUFICIENTE",
              "REQUIERE_REVISION_HUMANA",
            ],
          },
          estadoActual: {
            anyOf: [
              {
                type: "string",
                enum: ["CUMPLIDO", "PARCIAL", "NO_CUMPLIDO", "NO_APLICA"],
              },
              { type: "null" },
            ],
          },
          estadoPropuesto: {
            anyOf: [
              {
                type: "string",
                enum: ["CUMPLIDO", "PARCIAL", "NO_CUMPLIDO", "NO_APLICA"],
              },
              { type: "null" },
            ],
          },
          calificacionAdministrativaPropuesta: {
            anyOf: [
              { type: "number", enum: [0, 3, 5] },
              { type: "null" },
            ],
          },
          evidenciaBitacora: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          evidenciasUrls: {
            type: "array",
            items: { type: "string" },
          },
          fechaEfectiva: { type: "string" },
          fechaDocumento: {
            anyOf: [
              {
                type: "string",
                pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                description:
                  "Fecha calendario completa y explícita del documento soporte, en formato YYYY-MM-DD. Nunca usar fecha efectiva, vencimiento o mes/año incompleto como sustituto.",
              },
              { type: "null" },
            ],
          },
          justificacionTecnica: { type: "string" },
          reglaAplicada: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          confianza: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          informacionFaltante: {
            type: "array",
            items: { type: "string" },
          },
          requiereEvidenciaDocumental: { type: "boolean" },
          requiereRevisionTecnica: { type: "boolean" },
        },
        required: [
          "aspectoId",
          "identidadHistorica",
          "relacionSemantica",
          "coberturaRequisito",
          "elementosEvaluados",
          "elementosNoEvaluados",
          "accion",
          "estadoActual",
          "estadoPropuesto",
          "calificacionAdministrativaPropuesta",
          "evidenciaBitacora",
          "evidenciasUrls",
          "fechaEfectiva",
          "fechaDocumento",
          "justificacionTecnica",
          "reglaAplicada",
          "confianza",
          "informacionFaltante",
          "requiereEvidenciaDocumental",
          "requiereRevisionTecnica",
        ],
      },
    },
  },
  required: ["propuestas"],
} as const;
