export interface DecidirAprobacionGestionInput {
  decision: "APROBAR" | "RECHAZAR";
  observacion?: string | null;
}
