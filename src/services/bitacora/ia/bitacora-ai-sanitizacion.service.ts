const MARCADOR_REDACTADO = "[DATO_SENSIBLE_REDACTADO]";

const PATRONES_ETIQUETADOS: RegExp[] = [
  /\b(clave|contrasena|contraseña|password|passphrase|api[_\s-]?key|secret|secreto|token)\b(\s*[:=]\s*)([^\s,;]+)/giu,
  /\b(authorization)\b(\s*[:=]\s*bearer\s+)([^\s,;]+)/giu,
];

const PATRONES_SECRETOS_CONOCIDOS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bAIza[A-Za-z0-9_-]{20,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
];

export interface ResultadoSanitizacionBitacoraIa {
  contenido: string;
  totalRedacciones: number;
}

/**
 * Sanitiza únicamente la copia que se envía al proveedor de IA.
 * El registro original de Bitácora permanece intacto como historial técnico.
 */
export function sanitizarContenidoBitacoraParaIa(
  contenidoOriginal: string
): ResultadoSanitizacionBitacoraIa {
  let contenido = contenidoOriginal;
  let totalRedacciones = 0;

  for (const patron of PATRONES_ETIQUETADOS) {
    contenido = contenido.replace(
      patron,
      (_coincidencia, etiqueta: string, separador: string) => {
        totalRedacciones += 1;
        return `${etiqueta}${separador}${MARCADOR_REDACTADO}`;
      }
    );
  }

  for (const patron of PATRONES_SECRETOS_CONOCIDOS) {
    contenido = contenido.replace(patron, () => {
      totalRedacciones += 1;
      return MARCADOR_REDACTADO;
    });
  }

  return {
    contenido,
    totalRedacciones,
  };
}
