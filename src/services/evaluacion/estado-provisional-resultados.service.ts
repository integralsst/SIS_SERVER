import {
  CodigoGrupoMinisterial,
  EstadoGestionSgsst,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { resolverResultadoEfectivoEvaluacion } from "./resultado-efectivo-evaluacion.service";

export interface ConteoProvisionalesResultado {
  total: number;
  aprobacionGestion: number;
  noAplica: number;
  revisionTecnica: number;
}

export interface OpcionesEstadoProvisionalResultados {
  aspectoIdsPermitidos?: ReadonlySet<number>;
}

function crearConteoVacio(): ConteoProvisionalesResultado {
  return {
    total: 0,
    aprobacionGestion: 0,
    noAplica: 0,
    revisionTecnica: 0,
  };
}

function acumularCausa(
  conteo: ConteoProvisionalesResultado,
  causa: ReturnType<
    typeof resolverResultadoEfectivoEvaluacion
  >["causa"]
): void {
  conteo.total += 1;

  if (causa === "GESTION_PENDIENTE_APROBACION") {
    conteo.aprobacionGestion += 1;
    return;
  }

  if (causa === "NO_APLICA_PENDIENTE") {
    conteo.noAplica += 1;
    return;
  }

  if (causa === "REVISION_TECNICA_PENDIENTE") {
    conteo.revisionTecnica += 1;
  }
}

export const servicioEstadoProvisionalResultados = {
  obtener: async (
    empresaId: string,
    anio: number,
    grupo: "TODOS" | CodigoGrupoMinisterial,
    opciones: OpcionesEstadoProvisionalResultados = {}
  ) => {
    const periodo = await prisma.empresaPeriodo.findUnique({
      where: {
        empresaId_anio: {
          empresaId,
          anio,
        },
      },
      select: {
        id: true,
      },
    });

    if (!periodo) {
      return {
        resumenEmpresa: crearConteoVacio(),
        estandares: new Map<
          number,
          ConteoProvisionalesResultado
        >(),
      };
    }

    const evaluaciones = await prisma.evaluacionAspecto.findMany({
      where: {
        gestion: {
          empresaPeriodoId: periodo.id,
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
        },
      },
      orderBy: [
        {
          gestion: {
            fechaGestion: "desc",
          },
        },
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        aspectoId: true,
        estadoCumplimiento: true,
        calificacionAdministrativa: true,
        decisionNoAplica: {
          select: {
            estado: true,
            resultadoEfectivo: true,
          },
        },
        revisionTecnica: {
          select: {
            estado: true,
          },
        },
        aprobacionGestion: {
          select: {
            aprobacionGestion: {
              select: {
                estado: true,
              },
            },
          },
        },
        aspecto: {
          select: {
            estandar: {
              select: {
                id: true,
                gruposMinisteriales: {
                  select: {
                    grupoMinisterial: {
                      select: {
                        codigo: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const ultimas = new Map<
      number,
      (typeof evaluaciones)[number]
    >();

    for (const evaluacion of evaluaciones) {
      if (!ultimas.has(evaluacion.aspectoId)) {
        ultimas.set(evaluacion.aspectoId, evaluacion);
      }
    }

    const resumenEmpresa = crearConteoVacio();
    const estandares = new Map<
      number,
      ConteoProvisionalesResultado
    >();

    for (const evaluacion of ultimas.values()) {
      if (
        opciones.aspectoIdsPermitidos &&
        !opciones.aspectoIdsPermitidos.has(evaluacion.aspectoId)
      ) {
        continue;
      }

      const coincideGrupo =
        grupo === "TODOS" ||
        evaluacion.aspecto.estandar.gruposMinisteriales.some(
          ({ grupoMinisterial }) =>
            grupoMinisterial.codigo === grupo
        );

      if (!coincideGrupo) {
        continue;
      }

      const resultado =
        resolverResultadoEfectivoEvaluacion(evaluacion);

      if (!resultado.provisional) {
        continue;
      }

      acumularCausa(resumenEmpresa, resultado.causa);

      const estandarId = evaluacion.aspecto.estandar.id;
      const conteoEstandar =
        estandares.get(estandarId) ?? crearConteoVacio();

      acumularCausa(conteoEstandar, resultado.causa);
      estandares.set(estandarId, conteoEstandar);
    }

    return {
      resumenEmpresa,
      estandares,
    };
  },
};
