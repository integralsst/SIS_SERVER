export type NivelAccionCentro = "ALTA" | "MEDIA" | "BAJA";

export type CategoriaAccionCentro =
  | "COMPROMISOS"
  | "EVIDENCIAS"
  | "REVISION_TECNICA"
  | "NO_APLICA"
  | "APROBACIONES"
  | "AUDITORIAS"
  | "OTROS";

export type PrioridadConsultaAcciones =
  | "TODAS"
  | "URGENTE"
  | "PENDIENTE";

export interface AccionCentro {
  id: string;
  categoria: CategoriaAccionCentro;
  tipo: string;
  nivel: NivelAccionCentro;
  titulo: string;
  descripcion: string;
  empresa: {
    id: string;
    nombre: string;
  };
  aspecto: {
    id: number;
    nombre: string;
  };
  referencia: {
    tipo: CategoriaAccionCentro;
    id: string;
  };
  fechaReferencia: string;
  accion: {
    etiqueta: string;
    ruta: string;
  };
}

export interface ConsultaCentroAcciones {
  busqueda: string;
  categoria: CategoriaAccionCentro | "TODAS";
  prioridad: PrioridadConsultaAcciones;
  pagina: number;
  limite: number;
}
