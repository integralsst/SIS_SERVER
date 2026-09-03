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
          fechaEfectiva: { type: "string" },
          fechaDocumento: {
            anyOf: [{ type: "string" }, { type: "null" }],
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
          "accion",
          "estadoActual",
          "estadoPropuesto",
          "calificacionAdministrativaPropuesta",
          "evidenciaBitacora",
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
