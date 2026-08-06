export interface CrearSeguimientoCompromisoInput {
  descripcion: string;
  actividadId: string | null;
  visibleCliente: boolean;
}

export interface CambiarEstadoActividadCompromisoInput {
  atendida: boolean;
}

export interface CrearEvidenciaCompromisoInput {
  nombre: string;
  url: string;
  descripcion: string | null;
  fechaDocumento: string | null;
  visibleCliente: boolean;
  seguimientoId: string | null;
}

export interface RechazarAsignacionCompromisoInput {
  motivo: string;
}

export interface ReasignarCompromisoInput {
  asignacionRechazadaId: string;
  nuevoUsuarioResponsableId: string;
}

export interface DecidirCierreCompromisoInput {
  decision: "APROBAR" | "DEVOLVER";
  mensaje: string;
}
