import { EstadoRegistro } from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import {
  calcularSoporteDirectoBitacora,
  extraerTerminosBitacora,
  normalizarTextoBitacora,
} from "./relevancia-textual.service";

const LIMITE_CANDIDATOS_DEFAULT = 10;
const LIMITE_CANDIDATOS_MAXIMO = 20;

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

  return aspectos
    .map((aspecto) => {
      const palabrasClave = aspecto.palabrasClave.map(
        (relacion) => relacion.palabraClave.nombre
      );
      const requisitosNormativos = aspecto.requisitosNormativos.map(
        (relacion) => {
          const requisito = relacion.requisitoNormativo;
          return [
            requisito.clave,
            requisito.norma,
            requisito.articulo,
            requisito.descripcion,
          ]
            .filter(Boolean)
            .join(" · ");
        }
      );

      let puntajeRecuperacion = calcularCoincidencias(
        textoRegistro,
        terminosRegistro,
        [
          aspecto.nombre,
          aspecto.descripcion,
          aspecto.planAccionEspecifico?.descripcion,
          ...palabrasClave,
          ...requisitosNormativos,
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
        contenidoBitacora: params.contenidoBitacora,
        codigo: aspecto.codigo,
        nombre: aspecto.nombre,
        palabrasClave,
      });

      if (soporteDirecto.conflictoEntidad) {
        puntajeRecuperacion = Math.max(0, puntajeRecuperacion - 12);
      } else {
        puntajeRecuperacion += Math.min(soporteDirecto.puntaje, 20);
      }

      return {
        aspectoId: aspecto.id,
        identidadHistorica: aspecto.identidadHistorica,
        codigo: aspecto.codigo,
        nombre: aspecto.nombre,
        descripcion: aspecto.descripcion,
        planAccionEspecifico:
          aspecto.planAccionEspecifico?.descripcion ?? null,
        palabrasClave,
        requisitosNormativos,
        puntajeRecuperacion,
        puntajeSoporteDirecto: soporteDirecto.puntaje,
        senalesDirectas: soporteDirecto.senales,
        conflictoEntidad: soporteDirecto.conflictoEntidad,
      } satisfies CandidatoAspectoBitacora;
    })
    .filter((aspecto) => aspecto.puntajeRecuperacion > 0)
    .sort((a, b) => {
      if (b.puntajeSoporteDirecto !== a.puntajeSoporteDirecto) {
        return b.puntajeSoporteDirecto - a.puntajeSoporteDirecto;
      }

      if (b.puntajeRecuperacion !== a.puntajeRecuperacion) {
        return b.puntajeRecuperacion - a.puntajeRecuperacion;
      }

      return a.aspectoId - b.aspectoId;
    })
    .slice(0, limite);
}
