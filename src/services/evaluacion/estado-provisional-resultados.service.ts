import {
  CodigoGrupoMinisterial,
  EstadoRegistro,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { servicioEstadoAspectosAlCorte } from "./estado-aspectos-al-corte.service";
import {
  construirCorteAnual,
  servicioPeriodosEvaluacion,
} from "./periodos-evaluacion.service";
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

const seleccionEvaluacionProvisional = {
  id: true,
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
} as const;

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

    const fechaCorte = construirCorteAnual(anio);
    const version =
      await servicioPeriodosEvaluacion.resolverVersionParaFecha(
        fechaCorte
      );
    const tareas = await prisma.supermatrizTarea.findMany({
      where: {
        versionSupermatrizId: version.id,
        estado: EstadoRegistro.ACTIVO,
        aspecto: {
          estado: EstadoRegistro.ACTIVO,
          estandar: {
            estado: EstadoRegistro.ACTIVO,
          },
        },
      },
      select: {
        aspecto: {
          select: {
            id: true,
            identidadHistorica: true,
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
    const aspectosActuales = new Map(
      tareas.map(({ aspecto }) => [aspecto.id, aspecto])
    );
    const evaluaciones =
      await servicioEstadoAspectosAlCorte.obtenerUltimasEvaluaciones(
        empresaId,
        [...aspectosActuales.values()].map((aspecto) => ({
          id: aspecto.id,
          identidadHistorica: aspecto.identidadHistorica,
        })),
        fechaCorte,
        seleccionEvaluacionProvisional
      );

    const resumenEmpresa = crearConteoVacio();
    const estandares = new Map<
      number,
      ConteoProvisionalesResultado
    >();

    for (const [aspectoId, evaluacion] of evaluaciones) {
      if (
        opciones.aspectoIdsPermitidos &&
        !opciones.aspectoIdsPermitidos.has(aspectoId)
      ) {
        continue;
      }

      const aspecto = aspectosActuales.get(aspectoId);
      if (!aspecto) continue;

      const coincideGrupo =
        grupo === "TODOS" ||
        aspecto.estandar.gruposMinisteriales.some(
          ({ grupoMinisterial }) =>
            grupoMinisterial.codigo === grupo
        );

      if (!coincideGrupo) {
        continue;
      }

      const resultado =
        resolverResultadoEfectivoEvaluacion(
          evaluacion as Parameters<
            typeof resolverResultadoEfectivoEvaluacion
          >[0]
        );

      if (!resultado.provisional) {
        continue;
      }

      acumularCausa(resumenEmpresa, resultado.causa);

      const estandarId = aspecto.estandar.id;
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
