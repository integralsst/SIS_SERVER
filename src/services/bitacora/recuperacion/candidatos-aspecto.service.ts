import { EstadoRegistro } from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import {
  calcularSoporteDirectoBitacora,
  extraerTerminosBitacora,
  normalizarTextoBitacora,
} from "./relevancia-textual.service";

const LIMITE_CANDIDATOS_DEFAULT = 20;
const LIMITE_CANDIDATOS_MAXIMO = 20;
const LIMITE_CANDIDATOS_POR_SEGMENTO = 4;
const LIMITE_CANDIDATOS_FALLBACK_GLOBAL = 6;
const LIMITE_SEGMENTOS_RECUPERACION = 60;
const MIN_LONGITUD_ORACION = 18;

export interface SegmentoRecuperacionBitacora {
  id: string;
  texto: string;
}

function limpiarSegmento(valor: string): string {
  return valor.replace(/\s+/g, " ").trim();
}

function extraerOraciones(valor: string): string[] {
  return (valor.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [])
    .map(limpiarSegmento)
    .filter((oracion) => oracion.length >= MIN_LONGITUD_ORACION);
}

/**
 * Segmentación determinística para recuperación. No interpreta cumplimiento ni
 * crea unidades de verificación: únicamente evita que todos los temas de una
 * Bitácora compitan por un único top global antes de llegar a la IA.
 */
export function segmentarBitacoraParaRecuperacion(
  contenidoBitacora: string
): SegmentoRecuperacionBitacora[] {
  const parrafos = contenidoBitacora
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map(limpiarSegmento)
    .filter(Boolean);
  const segmentos: SegmentoRecuperacionBitacora[] = [];
  const textosVistos = new Set<string>();

  const agregar = (id: string, texto: string) => {
    const limpio = limpiarSegmento(texto);
    if (!limpio || textosVistos.has(limpio)) return;

    textosVistos.add(limpio);
    segmentos.push({ id, texto: limpio });
  };

  parrafos.forEach((parrafo, indiceParrafo) => {
    const idParrafo = `P-${indiceParrafo + 1}`;
    agregar(idParrafo, parrafo);

    const oraciones = extraerOraciones(parrafo);
    if (oraciones.length > 1) {
      oraciones.forEach((oracion, indiceOracion) => {
        agregar(`${idParrafo}-O-${indiceOracion + 1}`, oracion);
      });
    }
  });

  if (segmentos.length === 0) {
    agregar("P-1", contenidoBitacora);
  }

  return segmentos.slice(0, LIMITE_SEGMENTOS_RECUPERACION);
}

function calcularCoincidencias(
  textoRegistro: string,
  terminoRegistro: Set<string>,
  valoresAspecto: Array<string | null | undefined>
): number {
  let puntaje = 0;

  for (const valor of valoresAspecto) {
    if (!valor) {
      continue;
    }

    const normalizado = normalizarTextoBitacora(valor);

    if (!normalizado) {
      continue;
    }

    if (textoRegistro.includes(normalizado) && normalizado.length >= 4) {
      puntaje += 8;
    }

    for (const termino of extraerTerminosBitacora(normalizado)) {
      if (terminoRegistro.has(termino)) {
        puntaje += 1;
      }
    }
  }

  return puntaje;
}

export interface CandidatoAspectoBitacora {
  aspectoId: number;
  identidadHistorica: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  planAccionEspecifico: string | null;
  palabrasClave: string[];
  requisitosNormativos: string[];
  puntajeRecuperacion: number;
  puntajeSoporteDirecto: number;
  senalesDirectas: string[];
  conflictoEntidad: boolean;
  segmentoRecuperacionIds: string[];
}

interface AspectoPreparado {
  aspectoId: number;
  identidadHistorica: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  planAccionEspecifico: string | null;
  palabrasClave: string[];
  requisitosNormativos: string[];
}

interface ResultadoRecuperacionAspecto {
  puntajeRecuperacion: number;
  puntajeSoporteDirecto: number;
  senalesDirectas: string[];
  conflictoEntidad: boolean;
}

function evaluarAspectoEnTexto(
  aspecto: AspectoPreparado,
  contenidoBitacora: string
): ResultadoRecuperacionAspecto {
  const textoRegistro = normalizarTextoBitacora(contenidoBitacora);
  const terminosRegistro = extraerTerminosBitacora(contenidoBitacora);

  if (!textoRegistro || terminosRegistro.size === 0) {
    return {
      puntajeRecuperacion: 0,
      puntajeSoporteDirecto: 0,
      senalesDirectas: [],
      conflictoEntidad: false,
    };
  }

  let puntajeRecuperacion = calcularCoincidencias(
    textoRegistro,
    terminosRegistro,
    [
      aspecto.nombre,
      aspecto.descripcion,
      aspecto.planAccionEspecifico,
      ...aspecto.palabrasClave,
      ...aspecto.requisitosNormativos,
    ]
  );

  const codigoNormalizado = aspecto.codigo
    ? normalizarTextoBitacora(aspecto.codigo)
    : "";

  if (
    codigoNormalizado.length >= 2 &&
    textoRegistro.includes(codigoNormalizado)
  ) {
    puntajeRecuperacion += 25;
  }

  const soporteDirecto = calcularSoporteDirectoBitacora({
    contenidoBitacora,
    codigo: aspecto.codigo,
    nombre: aspecto.nombre,
    palabrasClave: aspecto.palabrasClave,
  });

  if (soporteDirecto.conflictoEntidad) {
    puntajeRecuperacion = Math.max(0, puntajeRecuperacion - 12);
  } else {
    puntajeRecuperacion += Math.min(soporteDirecto.puntaje, 20);
  }

  return {
    puntajeRecuperacion,
    puntajeSoporteDirecto: soporteDirecto.puntaje,
    senalesDirectas: soporteDirecto.senales,
    conflictoEntidad: soporteDirecto.conflictoEntidad,
  };
}

function compararResultados(
  a: Pick<CandidatoAspectoBitacora, "aspectoId" | "puntajeSoporteDirecto" | "puntajeRecuperacion">,
  b: Pick<CandidatoAspectoBitacora, "aspectoId" | "puntajeSoporteDirecto" | "puntajeRecuperacion">
): number {
  if (b.puntajeSoporteDirecto !== a.puntajeSoporteDirecto) {
    return b.puntajeSoporteDirecto - a.puntajeSoporteDirecto;
  }

  if (b.puntajeRecuperacion !== a.puntajeRecuperacion) {
    return b.puntajeRecuperacion - a.puntajeRecuperacion;
  }

  return a.aspectoId - b.aspectoId;
}

function construirCandidato(
  aspecto: AspectoPreparado,
  resultado: ResultadoRecuperacionAspecto,
  segmentoRecuperacionIds: string[]
): CandidatoAspectoBitacora {
  return {
    ...aspecto,
    ...resultado,
    segmentoRecuperacionIds,
  };
}

export async function buscarCandidatosAspectoBitacora(params: {
  versionSupermatrizId: number;
  contenidoBitacora: string;
  limite?: number;
}): Promise<CandidatoAspectoBitacora[]> {
  const limite = Math.min(
    Math.max(params.limite ?? LIMITE_CANDIDATOS_DEFAULT, 1),
    LIMITE_CANDIDATOS_MAXIMO
  );
  const textoRegistro = normalizarTextoBitacora(params.contenidoBitacora);
  const terminosRegistro = extraerTerminosBitacora(params.contenidoBitacora);

  if (!textoRegistro || terminosRegistro.size === 0) {
    return [];
  }

  const aspectos = await prisma.aspecto.findMany({
    where: {
      versionSupermatrizId: params.versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
    },
    select: {
      id: true,
      identidadHistorica: true,
      codigo: true,
      nombre: true,
      descripcion: true,
      planAccionEspecifico: {
        select: {
          descripcion: true,
        },
      },
      palabrasClave: {
        select: {
          palabraClave: {
            select: {
              nombre: true,
            },
          },
        },
      },
      requisitosNormativos: {
        select: {
          requisitoNormativo: {
            select: {
              clave: true,
              norma: true,
              articulo: true,
              descripcion: true,
            },
          },
        },
      },
    },
  });

  const preparados: AspectoPreparado[] = aspectos.map((aspecto) => ({
    aspectoId: aspecto.id,
    identidadHistorica: aspecto.identidadHistorica,
    codigo: aspecto.codigo,
    nombre: aspecto.nombre,
    descripcion: aspecto.descripcion,
    planAccionEspecifico: aspecto.planAccionEspecifico?.descripcion ?? null,
    palabrasClave: aspecto.palabrasClave.map(
      (relacion) => relacion.palabraClave.nombre
    ),
    requisitosNormativos: aspecto.requisitosNormativos.map((relacion) => {
      const requisito = relacion.requisitoNormativo;
      return [
        requisito.clave,
        requisito.norma,
        requisito.articulo,
        requisito.descripcion,
      ]
        .filter(Boolean)
        .join(" · ");
    }),
  }));

  const segmentos = segmentarBitacoraParaRecuperacion(
    params.contenidoBitacora
  );

  const rankingsPorSegmento = segmentos.map((segmento) => ({
    segmento,
    candidatos: preparados
      .map((aspecto) =>
        construirCandidato(
          aspecto,
          evaluarAspectoEnTexto(aspecto, segmento.texto),
          [segmento.id]
        )
      )
      .filter((aspecto) => aspecto.puntajeRecuperacion > 0)
      .sort(compararResultados)
      .slice(0, LIMITE_CANDIDATOS_POR_SEGMENTO),
  }));

  const seleccionados = new Map<number, CandidatoAspectoBitacora>();

  const incorporar = (
    candidato: CandidatoAspectoBitacora,
    segmentoId: string
  ) => {
    const existente = seleccionados.get(candidato.aspectoId);

    if (!existente) {
      if (seleccionados.size >= limite) return;
      seleccionados.set(candidato.aspectoId, {
        ...candidato,
        segmentoRecuperacionIds: [segmentoId],
      });
      return;
    }

    seleccionados.set(candidato.aspectoId, {
      ...existente,
      puntajeRecuperacion: Math.max(
        existente.puntajeRecuperacion,
        candidato.puntajeRecuperacion
      ),
      puntajeSoporteDirecto: Math.max(
        existente.puntajeSoporteDirecto,
        candidato.puntajeSoporteDirecto
      ),
      senalesDirectas: [
        ...new Set([
          ...existente.senalesDirectas,
          ...candidato.senalesDirectas,
        ]),
      ],
      conflictoEntidad:
        existente.conflictoEntidad && candidato.conflictoEntidad,
      segmentoRecuperacionIds: [
        ...new Set([
          ...existente.segmentoRecuperacionIds,
          segmentoId,
        ]),
      ],
    });
  };

  // Round-robin: primero protege cobertura temática de cada segmento y después
  // completa profundidad. Así un tema corto no puede ser desplazado por muchos
  // vecinos de otro párrafo antes de llegar a la IA.
  for (
    let posicion = 0;
    posicion < LIMITE_CANDIDATOS_POR_SEGMENTO;
    posicion += 1
  ) {
    for (const ranking of rankingsPorSegmento) {
      const candidato = ranking.candidatos[posicion];
      if (candidato) {
        incorporar(candidato, ranking.segmento.id);
      }
    }
  }

  // Fallback global conservador para requisitos cuyo significado se completa
  // entre varios segmentos. Solo llena cupos restantes; nunca desplaza la
  // cobertura local ya reservada.
  if (seleccionados.size < limite) {
    preparados
      .map((aspecto) =>
        construirCandidato(
          aspecto,
          evaluarAspectoEnTexto(aspecto, params.contenidoBitacora),
          ["GLOBAL"]
        )
      )
      .filter((aspecto) => aspecto.puntajeRecuperacion > 0)
      .sort(compararResultados)
      .slice(0, LIMITE_CANDIDATOS_FALLBACK_GLOBAL)
      .forEach((candidato) => incorporar(candidato, "GLOBAL"));
  }

  const resultado = [...seleccionados.values()].sort(compararResultados);

  console.info("[BITACORA-RECUPERACION] candidatos-diversificados", {
    totalSegmentos: segmentos.length,
    limite,
    totalCandidatos: resultado.length,
    candidatos: resultado.map((candidato) => ({
      aspectoId: candidato.aspectoId,
      codigo: candidato.codigo,
      puntajeRecuperacion: candidato.puntajeRecuperacion,
      puntajeSoporteDirecto: candidato.puntajeSoporteDirecto,
      segmentoRecuperacionIds: candidato.segmentoRecuperacionIds,
    })),
  });

  return resultado;
}
