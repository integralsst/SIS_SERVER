import {
  EstadoCumplimientoAspecto,
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

export interface EvaluacionAspectoInput {
  aspectoId: number;
  supermatrizTareaId?: number | null;
  estadoCumplimiento: EstadoCumplimientoAspecto;
  calificacionAdministrativa: number;
  observacion?: string | null;
  fechaDocumento?: string | null;
  justificacionNoAplica?: string | null;
  marcadaRevisionTecnica?: boolean;
}

export interface GuardarEvaluacionesLoteInput {
  evaluaciones: EvaluacionAspectoInput[];
}
