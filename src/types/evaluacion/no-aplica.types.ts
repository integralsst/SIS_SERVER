export interface DecidirNoAplicaInput {
  decision: "APROBAR" | "RECHAZAR";
  observacion?: string | null;
}
