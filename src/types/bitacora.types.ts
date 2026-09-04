import type {
  EstadoCumplimientoAspecto,
  ModalidadGestion,
  RolUsuario,
} from "@prisma/client";

export type EstadoProcesamientoBitacora =
  | "PENDIENTE"
  | "ANALIZANDO"
  | "ANALIZADA"
  | "REQUIERE_REVISION"
  | "APLICADA"
  | "ERROR";

export type AccionAnalisisBitacora =
  | "SIN_CAMBIO"
  | "PROPONER_EVALUACION"
  | "INFORMACION_INSUFICIENTE"
  | "REQUIERE_REVISION_HUMANA";

export type RelacionSemanticaBitacora = "DIRECTA" | "CONTEXTUAL";

export type AlcanceEvaluacionBitacora = "EVALUADO" | "EXCLUIDO";

export type TipoUnidadVerificacionBitacora = "EVALUACION" | "EXCLUSION";

export type TipoUrlBitacora =
  | "EVIDENCIA_DIRECTA"
  | "RECURSO_ACCION"
  | "REFERENCIA"
  | "CONTACTO";

export type DecisionEvidenciaBitacora = "CONFIRMAR" | "DESCARTAR";

export type CoberturaRequisitoBitacora =
  | "COMPLETA"
  | "PARCIAL"
  | "INDETERMINADA"
  | "NO_APLICA";

export interface CrearRegistroBitacoraInput {
  fechaEfectiva: string;
  contenido: string;
  modalidad?: ModalidadGestion | null;
  tipoActividad?: string | null;
}

export interface DecisionEvidenciaBitacoraInput {
  url: string;
  decision: DecisionEvidenciaBitacora;
  aspectoIds?: number[];
}

export interface AplicarRegistroBitacoraInput {
  excluirAspectoIds?: number[];
  decisionesEvidencia?: DecisionEvidenciaBitacoraInput[];
}

export interface AutorBitacora {
  usuarioId: string;
  profesionalId: string | null;
  nombre: string;
  rol: RolUsuario;
}

export interface RegistroBitacoraDto {
  id: string;
  empresaId: string;
  fechaEfectiva: string;
  contenidoOriginal: string;
  modalidad: ModalidadGestion | null;
  tipoActividad: string | null;
  autor: AutorBitacora;
  estadoProcesamiento: EstadoProcesamientoBitacora;
  creadoEn: string;
}

export interface ContextoAspectoBitacora {
  aspectoId: number;
  identidadHistorica: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  planAccionEspecifico: string | null;
  palabrasClave: string[];
  requisitosNormativos: string[];
  estadoActual: EstadoCumplimientoAspecto | null;
  calificacionActual: number | null;
  observacionActual: string | null;
  fechaDocumentoActual: string | null;
  evidenciasUrlsActuales: string[];
  requiereEvidencia: boolean;
  descripcionEvidencia: string | null;
  requiereRevisionTecnica: boolean;
  logicaEvaluacion: string | null;
}

export interface UnidadVerificacionBitacora {
  id: string;
  tipo: TipoUnidadVerificacionBitacora;
  objetoTecnico: string;
  fragmentoBitacora: string;
  resultadoObservado: string;
}

export interface ClasificacionUrlBitacora {
  url: string;
  tipo: TipoUrlBitacora;
  unidadVerificacionIds: string[];
  descripcion: string;
}

export interface EvidenciaPendienteConfirmacionBitacora {
  url: string;
  tipoSugerido: TipoUrlBitacora;
  descripcionSugerida: string;
  aspectoIdsSugeridos: number[];
  unidadVerificacionIds: string[];
}

export interface PropuestaAspectoBitacora {
  aspectoId: number;
  identidadHistorica: string;
  alcanceEvaluacion: AlcanceEvaluacionBitacora;
  relacionSemantica: RelacionSemanticaBitacora;
  unidadVerificacionIds?: string[];
  coberturaRequisito: CoberturaRequisitoBitacora;
  elementosEvaluados: string[];
  elementosNoEvaluados: string[];
  accion: AccionAnalisisBitacora;
  estadoActual: EstadoCumplimientoAspecto | null;
  estadoPropuesto: EstadoCumplimientoAspecto | null;
  calificacionAdministrativaPropuesta: 0 | 3 | 5 | null;
  evidenciaBitacora: string | null;
  evidenciasUrls: string[];
  clasificacionUrls: ClasificacionUrlBitacora[];
  fechaEfectiva: string;
  fechaDocumento: string | null;
  justificacionTecnica: string;
  reglaAplicada: string | null;
  confianza: number;
  informacionFaltante: string[];
  requiereEvidenciaDocumental: boolean;
  requiereRevisionTecnica: boolean;
}

export interface ResultadoAnalisisBitacora {
  registroBitacoraId: string;
  modelo: string;
  versionPrompt: string;
  unidadesVerificacion?: UnidadVerificacionBitacora[];
  evidenciasPendientesConfirmacion?: EvidenciaPendienteConfirmacionBitacora[];
  propuestas: PropuestaAspectoBitacora[];
}
