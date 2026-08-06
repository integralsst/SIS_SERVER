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
  const grupos = await prisma.compromiso.groupBy({
    by: ["estado", "fechaLimite"],
    where: filtrosBase,
    _count: {
      _all: true,
    },
  });

  let total = 0;
  let abiertos = 0;
  let vencidos = 0;
  let proximos = 0;
  let cumplidos = 0;

  for (const grupo of grupos) {
    const cantidad = grupo._count._all;
    const abierto =
      ESTADOS_COMPROMISO_ABIERTOS.includes(
        grupo.estado
      );

    total += cantidad;

    if (abierto) {
      abiertos += cantidad;

      if (grupo.fechaLimite < hoy) {
        vencidos += cantidad;
      } else if (
        grupo.fechaLimite <= limiteProximo
      ) {
        proximos += cantidad;
      }
    }

    if (
      grupo.estado === EstadoCompromiso.CUMPLIDO
    ) {
      cumplidos += cantidad;
    }
  }

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
