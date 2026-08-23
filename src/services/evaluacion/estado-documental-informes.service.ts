import {
  CodigoGrupoMinisterial,
  EstadoGestionSgsst,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { resolverEstadoEvidenciaAspecto } from "./estado-evidencia-aspecto.service";

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

    const evaluaciones = await prisma.evaluacionAspecto.findMany({
      where: {
        aspecto: {
          configuracionEvidencia: {
            requiereEvidencia: true,
          },
        },
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
        aspecto: {
          select: {
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

    const ultimas = new Map<
      number,
      (typeof evaluaciones)[number]
    >();

    for (const evaluacion of evaluaciones) {
      if (!ultimas.has(evaluacion.aspectoId)) {
        ultimas.set(evaluacion.aspectoId, evaluacion);
      }
    }

    const aspectosPendientes: AspectoEvidenciaPendienteInforme[] = [];

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

      const estadoEvidencia = resolverEstadoEvidenciaAspecto({
        requiereEvidencia: true,
        estadoCumplimiento: evaluacion.estadoCumplimiento,
        calificacionAdministrativa:
          evaluacion.calificacionAdministrativa.toNumber(),
        gestionFinalizadaValida: true,
        tieneEvidenciaEvaluacion: evaluacion.evidencias.length > 0,
        compromisosConSoporte: evaluacion.seguimientosCompromiso
          .filter(
            ({ compromiso }) => compromiso.evidencias.length > 0
          )
          .map(({ compromiso }) => compromiso.id),
      });

      if (!estadoEvidencia.evidenciaPendiente) {
        continue;
      }

      aspectosPendientes.push({
        evaluacionId: evaluacion.id,
        aspectoId: evaluacion.aspectoId,
        aspectoCodigo: evaluacion.aspecto.codigo,
        aspectoNombre: evaluacion.aspecto.nombre,
        estandar: {
          id: evaluacion.aspecto.estandar.id,
          codigo: evaluacion.aspecto.estandar.codigo,
          nombre: evaluacion.aspecto.estandar.nombre,
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
