import {
  EstadoCumplimientoAspecto,
  EstadoRevisionTecnica,
  ModalidadGestion,
  RolUsuario,
} from "@prisma/client";

export interface UsuarioSesionEvaluacion {
  usuarioId: string;
  rol: RolUsuario;
  empresaId: string | null;
  profesionalId: string | null;
}

export interface AbrirPeriodoEvaluacionInput {
  anio: number;
  versionSupermatrizId?: number;
}

export interface CrearGestionSgsstInput {
  fechaGestion: string;
  modalidad: ModalidadGestion;
  tipoActividad: string;
  observacionGeneral?: string | null;
  categoriaGestionId?: number | null;
  profesionalId?: string | null;
}

export interface InvalidarGestionSgsstInput {
  motivo: string;
}

export interface EvaluacionAspectoInput {
  aspectoId: number;
  supermatrizTareaId?: number | null;
  estadoCumplimiento: EstadoCumplimientoAspecto;
  calificacionAdministrativa: number;
  observacion?: string | null;
  fechaDocumento?: string | null;
  justificacionNoAplica?: string | null;
  marcadaRevisionTecnica?: boolean;
  motivoRevisionTecnica?: string | null;
}

export interface GuardarEvaluacionesLoteInput {
  evaluaciones: EvaluacionAspectoInput[];
}

export interface CrearEvidenciaEvaluacionInput {
  nombre: string;
  url: string;
  descripcion?: string | null;
  fechaDocumento?: string | null;
  visibleCliente?: boolean;
}

export interface ActualizarEvidenciaEvaluacionInput {
  nombre?: string;
  url?: string;
  descripcion?: string | null;
  fechaDocumento?: string | null;
  visibleCliente?: boolean;
}

export type EstadoResolucionRevisionTecnica = Extract<
  EstadoRevisionTecnica,
  "APROBADA" | "REQUIERE_AJUSTES"
>;

export interface ResolverRevisionTecnicaInput {
  estado: EstadoResolucionRevisionTecnica;
  conceptoTecnico: string;
}
