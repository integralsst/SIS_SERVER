const PREFIJO_VINCULO_CORRECCION =
  "CORREGIR_REVISION_TECNICA:";

export function accionVinculoCorreccionRevision(
  revisionId: string
): string {
  return `${PREFIJO_VINCULO_CORRECCION}${revisionId}`;
}

export function revisionIdDesdeAccionVinculo(
  accion: string
): string | null {
  if (!accion.startsWith(PREFIJO_VINCULO_CORRECCION)) {
    return null;
  }

  const revisionId = accion
    .slice(PREFIJO_VINCULO_CORRECCION.length)
    .trim();

  return revisionId || null;
}
