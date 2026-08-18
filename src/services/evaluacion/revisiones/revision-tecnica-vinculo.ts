export const PREFIJO_VINCULO_CORRECCION_REVISION =
  "CORREGIR_REVISION_TECNICA:";

export function accionVinculoCorreccionRevision(
  revisionId: string
): string {
  return `${PREFIJO_VINCULO_CORRECCION_REVISION}${revisionId}`;
}

export function revisionIdDesdeAccionVinculo(
  accion: string
): string | null {
  if (!accion.startsWith(PREFIJO_VINCULO_CORRECCION_REVISION)) {
    return null;
  }

  const revisionId = accion
    .slice(PREFIJO_VINCULO_CORRECCION_REVISION.length)
    .trim();

  return revisionId || null;
}
