import {
  EstadoCompromiso,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  ConsultaCompromisosInput,
} from "../../types/compromisos/consulta-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  ESTADOS_COMPROMISO_ABIERTOS,
  construirFiltroVencimiento,
  obtenerVentanaVencimiento,
} from "./fechas-compromiso.service";
import {
  construirFiltroEstadoCompromiso,
  construirFiltrosBaseCompromisos,
} from "./filtros-consulta-compromisos.service";
import { obtenerDetalleCompromiso } from "./detalle-compromiso.service";
import {
  seleccionCompromisoListado,
  serializarCompromisoListado,
} from "./presentacion-compromiso.service";

async function calcularResumen(
  filtrosBase: Prisma.CompromisoWhereInput,
  hoy: Date,
  limiteProximo: Date
) {
  const [
    total,
    abiertos,
    vencidos,
    proximos,
    cumplidos,
  ] = await prisma.$transaction([
    prisma.compromiso.count({
      where: filtrosBase,
    }),
    prisma.compromiso.count({
      where: {
        AND: [
          filtrosBase,
          {
            estado: {
              in: ESTADOS_COMPROMISO_ABIERTOS,
            },
          },
        ],
      },
    }),
    prisma.compromiso.count({
      where: {
        AND: [
          filtrosBase,
          {
            estado: {
              in: ESTADOS_COMPROMISO_ABIERTOS,
            },
            fechaLimite: {
              lt: hoy,
            },
          },
        ],
      },
    }),
    prisma.compromiso.count({
      where: {
        AND: [
          filtrosBase,
          {
            estado: {
              in: ESTADOS_COMPROMISO_ABIERTOS,
            },
            fechaLimite: {
              gte: hoy,
              lte: limiteProximo,
            },
          },
        ],
      },
    }),
    prisma.compromiso.count({
      where: {
        AND: [
          filtrosBase,
          {
            estado:
              EstadoCompromiso.CUMPLIDO,
          },
        ],
      },
    }),
  ]);

  return {
    total,
    abiertos,
    vencidos,
    proximosAVencer: proximos,
    cumplidos,
  };
}

async function listarCompromisos(
  consulta: ConsultaCompromisosInput,
  usuario: UsuarioSesionEvaluacion
) {
  const {
    hoy,
    limiteProximo,
  } = obtenerVentanaVencimiento();

  const filtrosBase =
    construirFiltrosBaseCompromisos(
      consulta,
      usuario
    );

  const whereListado: Prisma.CompromisoWhereInput =
    {
      AND: [
        filtrosBase,
        construirFiltroEstadoCompromiso(
          consulta
        ),
        construirFiltroVencimiento(
          consulta.vencimiento,
          hoy,
          limiteProximo
        ),
      ],
    };

  const [
    compromisos,
    totalFiltrado,
    resumen,
  ] = await Promise.all([
    prisma.compromiso.findMany({
      where: whereListado,
      select: seleccionCompromisoListado,
      orderBy: [
        {
          fechaLimite: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      skip:
        (consulta.pagina - 1) *
        consulta.limite,
      take: consulta.limite,
    }),
    prisma.compromiso.count({
      where: whereListado,
    }),
    calcularResumen(
      filtrosBase,
      hoy,
      limiteProximo
    ),
  ]);

  return {
    alcance: consulta.alcance,
    resumen,
    paginacion: {
      pagina: consulta.pagina,
      limite: consulta.limite,
      total: totalFiltrado,
      totalPaginas: Math.max(
        1,
        Math.ceil(
          totalFiltrado / consulta.limite
        )
      ),
    },
    compromisos: compromisos.map(
      (compromiso) =>
        serializarCompromisoListado(
          compromiso,
          hoy,
          limiteProximo
        )
    ),
  };
}

export const servicioConsultaCompromisos = {
  listar: listarCompromisos,
  obtenerDetalle:
    obtenerDetalleCompromiso,
};
