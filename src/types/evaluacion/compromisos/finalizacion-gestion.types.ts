import type {
  EstadoCumplimientoAspecto,
  TipoResponsableCompromiso,
} from "@prisma/client";

export interface ResponsableCompromisoFinalizacionInput {
  usuarioResponsableId: string;
  tipo: TipoResponsableCompromiso;
  actividad: string;
}

export interface CompromisoFinalizacionInput {
  evaluacionId: string;
  descripcion: string;
  recursos?: string | null;
  fechaLimite: string;
  responsables: ResponsableCompromisoFinalizacionInput[];
}

export interface FinalizarGestionSgsstInput {
  compromisos?: CompromisoFinalizacionInput[];
}

export type AccionPreparacionCompromiso =
  | "CREAR"
  | "VINCULAR_EXISTENTE";

export interface EvaluacionPreparacionCompromiso {
  evaluacionId: string;
  aspectoId: number;
  aspectoCodigo: string | null;
  aspectoNombre: string;
  estadoCumplimiento: EstadoCumplimientoAspecto;
  calificacionAdministrativa: number;
  accion: AccionPreparacionCompromiso;
  compromisoAbierto: {
    id: string;
    descripcion: string;
    fechaLimite: string;
    estado: string;
  } | null;
}

export interface ResponsableDisponibleCompromiso {
  id: string;
  nombre: string;
  rol: string;
  tipoActor: "INTERNO" | "CLIENTE";
}
