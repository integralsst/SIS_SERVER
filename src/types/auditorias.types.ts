import {
  EstadoAuditoriaSgsst,
  EstadoHallazgoAuditoria,
  EstadoRecomendacionAuditoria,
  TipoHallazgoAuditoria,
} from "@prisma/client";

export interface ConsultaAuditorias {
  busqueda: string;
  empresaId?: string;
  anio?: number;
  estado?: EstadoAuditoriaSgsst;
  pagina: number;
  limite: number;
}

export interface CrearAuditoriaInput {
  empresaId: string;
  anio: number;
  titulo: string;
  objetivo?: string | null;
  alcance?: string | null;
  fechaAuditoria: string;
}

export interface ActualizarAuditoriaInput {
  titulo?: string;
  objetivo?: string | null;
  alcance?: string | null;
  fechaAuditoria?: string;
}

export interface CambiarEstadoAuditoriaInput {
  estado: EstadoAuditoriaSgsst;
  motivo?: string | null;
}

export interface CrearHallazgoAuditoriaInput {
  aspectoId?: number | null;
  tipo: TipoHallazgoAuditoria;
  titulo: string;
  descripcion: string;
  evidencia?: string | null;
  responsableUsuarioId?: string | null;
  fechaObjetivo?: string | null;
}

export interface ActualizarHallazgoAuditoriaInput {
  aspectoId?: number | null;
  tipo?: TipoHallazgoAuditoria;
  titulo?: string;
  descripcion?: string;
  evidencia?: string | null;
  responsableUsuarioId?: string | null;
  fechaObjetivo?: string | null;
}

export interface CrearRecomendacionAuditoriaInput {
  descripcion: string;
  responsableUsuarioId?: string | null;
  fechaObjetivo?: string | null;
}

export interface ActualizarRecomendacionAuditoriaInput {
  descripcion?: string;
  responsableUsuarioId?: string | null;
  fechaObjetivo?: string | null;
}

export interface CrearSeguimientoAuditoriaInput {
  descripcion: string;
  recomendacionId?: string | null;
  estadoHallazgo?: EstadoHallazgoAuditoria | null;
  estadoRecomendacion?: EstadoRecomendacionAuditoria | null;
}
