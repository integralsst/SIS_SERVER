const TERMINOS_GENERICOS = new Set([
  "administrativa",
  "administrativo",
  "actividad",
  "actividades",
  "actual",
  "actualizacion",
  "ano",
  "anual",
  "aspecto",
  "aspectos",
  "cuenta",
  "cumplimiento",
  "debe",
  "deben",
  "documental",
  "documento",
  "documentos",
  "empresa",
  "evidencia",
  "evidencias",
  "gestion",
  "gestionar",
  "informacion",
  "registro",
  "registros",
  "requerido",
  "requerida",
  "requeridos",
  "requeridas",
  "sgsst",
  "sistema",
  "soporte",
  "soportes",
  "trabajo",
  "ultimo",
  "ultima",
]);

const FAMILIAS_ENTIDAD = [
  {
    id: "COPASST",
    aliases: ["copasst", "vigia ocupacional", "vigia"],
  },
  {
    id: "COMITE_CONVIVENCIA",
    aliases: ["comite de convivencia", "convivencia laboral", "convivencia"],
  },
  {
    id: "BRIGADA_EMERGENCIAS",
    aliases: ["brigada de emergencia", "brigada de emergencias", "brigadista"],
  },
  {
    id: "PESV",
    aliases: ["pesv", "plan estrategico de seguridad vial"],
  },
] as const;

export const UMBRAL_SOPORTE_DIRECTO_BITACORA = 5;

export function normalizarTextoBitacora(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extraerTerminosBitacora(valor: string): Set<string> {
  return new Set(
    normalizarTextoBitacora(valor)
      .split(" ")
      .filter((termino) => termino.length >= 3)
  );
}

function esTerminoGenerico(termino: string): boolean {
  return TERMINOS_GENERICOS.has(termino);
}

function pesoTerminoDirecto(termino: string): number {
  if (esTerminoGenerico(termino)) {
    return 0;
  }

  if (termino.length >= 6) {
    return 3;
  }

  if (termino.length >= 4) {
    return 2;
  }

  return 1;
}

function detectarFamilias(textoNormalizado: string): Set<string> {
  const detectadas = new Set<string>();

  for (const familia of FAMILIAS_ENTIDAD) {
    if (
      familia.aliases.some((alias) =>
        textoNormalizado.includes(normalizarTextoBitacora(alias))
      )
    ) {
      detectadas.add(familia.id);
    }
  }

  return detectadas;
}

export interface ResultadoSoporteDirectoBitacora {
  puntaje: number;
  senales: string[];
  conflictoEntidad: boolean;
  familiasRegistro: string[];
  familiasAspecto: string[];
}

export function calcularSoporteDirectoBitacora(params: {
  contenidoBitacora: string;
  codigo?: string | null;
  nombre: string;
  palabrasClave?: string[];
}): ResultadoSoporteDirectoBitacora {
  const textoRegistro = normalizarTextoBitacora(params.contenidoBitacora);
  const terminosRegistro = extraerTerminosBitacora(params.contenidoBitacora);
  const textoAspecto = normalizarTextoBitacora(
    [params.nombre, ...(params.palabrasClave ?? [])].join(" ")
  );

  const familiasRegistro = detectarFamilias(textoRegistro);
  const familiasAspecto = detectarFamilias(textoAspecto);
  const conflictoEntidad =
    familiasRegistro.size > 0 &&
    familiasAspecto.size > 0 &&
    ![...familiasAspecto].some((familia) => familiasRegistro.has(familia));

  if (conflictoEntidad) {
    return {
      puntaje: 0,
      senales: [],
      conflictoEntidad: true,
      familiasRegistro: [...familiasRegistro],
      familiasAspecto: [...familiasAspecto],
    };
  }

  let puntaje = 0;
  const senales = new Set<string>();

  const codigoNormalizado = params.codigo
    ? normalizarTextoBitacora(params.codigo)
    : "";

  if (
    codigoNormalizado.length >= 2 &&
    textoRegistro.includes(codigoNormalizado)
  ) {
    puntaje += 25;
    senales.add(`codigo:${codigoNormalizado}`);
  }

  const valoresDirectos = [params.nombre, ...(params.palabrasClave ?? [])];
  const terminosAspecto = new Set<string>();

  for (const valor of valoresDirectos) {
    const normalizado = normalizarTextoBitacora(valor);
    const terminos = [...extraerTerminosBitacora(valor)];

    if (
      terminos.length >= 2 &&
      normalizado.length >= 8 &&
      textoRegistro.includes(normalizado)
    ) {
      puntaje += 10;
      senales.add(`frase:${normalizado}`);
    }

    for (const termino of terminos) {
      terminosAspecto.add(termino);
    }
  }

  for (const termino of terminosAspecto) {
    if (!terminosRegistro.has(termino)) {
      continue;
    }

    const peso = pesoTerminoDirecto(termino);

    if (peso > 0) {
      puntaje += peso;
      senales.add(termino);
    }
  }

  return {
    puntaje,
    senales: [...senales],
    conflictoEntidad: false,
    familiasRegistro: [...familiasRegistro],
    familiasAspecto: [...familiasAspecto],
  };
}

export function tieneSoporteDirectoBitacora(
  resultado: Pick<ResultadoSoporteDirectoBitacora, "puntaje" | "conflictoEntidad">
): boolean {
  return (
    !resultado.conflictoEntidad &&
    resultado.puntaje >= UMBRAL_SOPORTE_DIRECTO_BITACORA
  );
}
