import {
  CodigoGrupoMinisterial,
  EstadoRegistro,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { resolverEstadoEvidenciaAspecto } from "./estado-evidencia-aspecto.service";
import { servicioEstadoAspectosAlCorte } from "./estado-aspectos-al-corte.service";
import {
  construirCorteAnual,
  servicioPeriodosEvaluacion,
} from "./periodos-evaluacion.service";

export interface OpcionesEstadoDocumentalInformes {
  aspectoIdsPermitidos?: ReadonlySet<number>;
}

export interface AspectoEvidenciaPendienteInforme {
  evaluacionId: string;
  aspectoId: number;
  aspectoCodigo: string | null;
  aspectoNombre: string;
  estandar: {
    id: number;
    codigo: string | null;
    nombre: string;
  };
}

export interface EstadoDocumentalInforme {
  evidenciasPendientes: number;
  aspectosPendientes: AspectoEvidenciaPendienteInforme[];
}

const seleccionEvaluacionDocumental = {
  id: true,
  aspectoId: true,
  estadoCumplimiento: true,
  calificacionAdministrativa: true,
  evidencias: {
    where: {
      activo: true,
    },
    select: {
      id: true,
    },
    take: 1,
  },
  seguimientosCompromiso: {
    select: {
      compromiso: {
        select: {
          id: true,
          evidencias: {
            where: {
              activa: true,
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      },
    },
  },
} as const;

export const servicioEstadoDocumentalInformes = {
  obtener: async (
    empresaId: string,
    anio: number,
    grupo: "TODOS" | CodigoGrupoMinisterial,
    opciones: OpcionesEstadoDocumentalInformes = {}
  ): Promise<EstadoDocumentalInforme> => {
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
        evidenciasPendientes: 0,
        aspectosPendientes: [],
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
          configuracionEvidencia: {
            requiereEvidencia: true,
          },
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
            codigo: true,
            nombre: true,
            estandar: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
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
        seleccionEvaluacionDocumental
      );

    const aspectosPendientes: AspectoEvidenciaPendienteInforme[] = [];

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

      const evaluacionDocumental = evaluacion as {
        id: string;
        estadoCumplimiento: Parameters<
          typeof resolverEstadoEvidenciaAspecto
        >[0]["estadoCumplimiento"];
        calificacionAdministrativa: { toNumber(): number };
        evidencias: Array<{ id: string }>;
        seguimientosCompromiso: Array<{
          compromiso: {
            id: string;
            evidencias: Array<{ id: string }>;
          };
        }>;
      };
      const estadoEvidencia = resolverEstadoEvidenciaAspecto({
        requiereEvidencia: true,
        estadoCumplimiento: evaluacionDocumental.estadoCumplimiento,
        calificacionAdministrativa:
          evaluacionDocumental.calificacionAdministrativa.toNumber(),
        gestionFinalizadaValida: true,
        tieneEvidenciaEvaluacion:
          evaluacionDocumental.evidencias.length > 0,
        compromisosConSoporte:
          evaluacionDocumental.seguimientosCompromiso
            .filter(
              ({ compromiso }) =>
                compromiso.evidencias.length > 0
            )
            .map(({ compromiso }) => compromiso.id),
      });

      if (!estadoEvidencia.evidenciaPendiente) {
        continue;
      }

      aspectosPendientes.push({
        evaluacionId: evaluacionDocumental.id,
        aspectoId,
        aspectoCodigo: aspecto.codigo,
        aspectoNombre: aspecto.nombre,
        estandar: {
          id: aspecto.estandar.id,
          codigo: aspecto.estandar.codigo,
          nombre: aspecto.estandar.nombre,
        },
      });
    }

    aspectosPendientes.sort((a, b) =>
      (a.aspectoCodigo ?? a.aspectoNombre).localeCompare(
        b.aspectoCodigo ?? b.aspectoNombre,
        "es",
        { numeric: true }
      )
    );

    return {
      evidenciasPendientes: aspectosPendientes.length,
      aspectosPendientes,
    };
  },
};
