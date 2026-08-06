import {
  EstadoCompromiso,
} from "@prisma/client";

export type AlcanceConsultaCompromisos =
  | "SUPERVISION"
  | "MIS_COMPROMISOS";

export type FiltroEstadoCompromiso =
  | EstadoCompromiso
  | "ABIERTOS";

export type FiltroVencimientoCompromiso =
  | "TODOS"
  | "VENCIDOS"
  | "PROXIMOS_30_DIAS"
  | "VIGENTES"
  | "CERRADOS";

export interface ConsultaCompromisosInput {
  alcance: AlcanceConsultaCompromisos;
  pagina: number;
  limite: number;
  busqueda: string | null;
  empresaId: string | null;
  responsableId: string | null;
  estado: FiltroEstadoCompromiso | null;
  vencimiento: FiltroVencimientoCompromiso;
}
