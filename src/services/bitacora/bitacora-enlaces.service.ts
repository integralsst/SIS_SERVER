const URL_REGEX = /https?:\/\/[^\s<>{}\[\]"']+/gi;
const MAX_URLS_BITACORA = 20;

function limpiarPuntuacionFinal(url: string): string {
  return url.replace(/[),.;:!?]+$/g, "");
}

export function extraerUrlsBitacora(contenido: string): string[] {
  const encontradas = contenido.match(URL_REGEX) ?? [];
  const unicas = new Set<string>();

  for (const candidata of encontradas) {
    const limpia = limpiarPuntuacionFinal(candidata.trim());

    try {
      const url = new URL(limpia);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        continue;
      }

      unicas.add(url.toString());
    } catch {
      continue;
    }

    if (unicas.size >= MAX_URLS_BITACORA) {
      break;
    }
  }

  return [...unicas];
}

export function normalizarUrlsBitacora(urls: string[]): string[] {
  const unicas = new Set<string>();

  for (const candidata of urls) {
    try {
      const url = new URL(candidata.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        continue;
      }
      unicas.add(url.toString());
    } catch {
      continue;
    }
  }

  return [...unicas];
}
