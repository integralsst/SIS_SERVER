import {
  EstadoGestionSgsst,
  EstadoRegistro,
  Prisma,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  ErrorEvaluacion,
  validarAnio,
} from "../../utils/evaluacion";
import {
  resolverVigenciaEvaluacion,
  type ResultadoVigenciaEvaluacion,
} from "../../utils/vigencia-evaluacion";
import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";
import { servicioEstadoAspectosAlCorte } from "./estado-aspectos-al-corte.service";
import {
  construirCorteAnual,
  servicioPeriodosEvaluacion,
} from "./periodos-evaluacion.service";
import { resolverResultadoEfectivoEvaluacion } from "./resultado-efectivo-evaluacion.service";

const inclusionTareas = {
  proceso: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  },
  categoriasGestion: {
    include: {
      categoriaGestion: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
        },
      },
    },
  },
  aspecto: {
    include: {
      planAccionEspecifico: {
        select: {
          descripcion: true,
        },
      },
      configuracion: true,
      configuracionVigencia: true,
      configuracionEvidencia: true,
      configuracionRevision: true,
      estandar: {
        include: {
          categoriaEstandar: {
            include: {
              cicloPhva: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  orden: true,
                },
              },
            },
          },
          gruposMinisteriales: {
            include: {
              grupoMinisterial: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SupermatrizTareaInclude;

const seleccionEvaluacion = {
  id: true,
  aspectoId: true,
  estadoCumplimiento: true,
  calificacionAdministrativa: true,
  observacion: true,
  fechaDocumento: true,
  fechaVencimientoCalculada: true,
  justificacionNoAplica: true,
  marcadaRevisionTecnica: true,
  motivoRevisionTecnica: true,
  createdAt: true,
  updatedAt: true,
  gestion: {
    select: {
      id: true,
      fechaGestion: true,
      tipoActividad: true,
      estado: true,
      empresaPeriodo: {
        select: {
          anio: true,
        },
      },
    },
  },
  revisionTecnica: {
    select: {
      id: true,
      estado: true,
      motivoSolicitud: true,
      conceptoTecnico: true,
      motivoAnulacion: true,
      solicitadaEn: true,
      revisadaEn: true,
      anuladaEn: true,
      solicitadaPor: {
        select: {
          id: true,
          nombre: true,
        },
      },
      revisadaPor: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
  decisionNoAplica: {
    select: {
      id: true,
      estado: true,
      resultadoEfectivo: true,
      observacionDecision: true,
      solicitadaEn: true,
      decididaEn: true,
      solicitadaPor: {
        select: {
          id: true,
          nombre: true,
        },
      },
      decididaPor: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
  aprobacionGestion: {
    select: {
      aprobacionGestion: {
        select: {
          id: true,
          estado: true,
          observacionDecision: true,
          generadaEn: true,
          decididaEn: true,
          decididaPor: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.EvaluacionAspectoSelect;

type TareaMatriz = Prisma.SupermatrizTareaGetPayload<{
  include: typeof inclusionTareas;
}>;

type EvaluacionMatriz = Prisma.EvaluacionAspectoGetPayload<{
  select: typeof seleccionEvaluacion;
}>;

function serializarFecha(
  value: Date | null | undefined
): string | null {
  return value ? value.toISOString() : null;
}

function serializarDetalleVigencia(
  detalle: ResultadoVigenciaEvaluacion
) {
  return {
    ...detalle,
    fechaVencimiento: serializarFecha(detalle.fechaVencimiento),
  };
}

function serializarEvaluacion(
  evaluacion: EvaluacionMatriz,
  incluirRevisionTecnica: boolean
) {
  const efectivo = resolverResultadoEfectivoEvaluacion(evaluacion);

  return {
    id: evaluacion.id,
    estadoCumplimiento: evaluacion.estadoCumplimiento,
    calificacionAdministrativa:
      evaluacion.calificacionAdministrativa.toNumber(),
    calificacionEfectiva: efectivo.calificacion,
    resultadoProvisional: efectivo.provisional,
    causaResultadoEfectivo: efectivo.causa,
    observacion: evaluacion.observacion,
    fechaDocumento: serializarFecha(evaluacion.fechaDocumento),
    fechaVencimientoCalculada: serializarFecha(
      evaluacion.fechaVencimientoCalculada
    ),
    justificacionNoAplica: evaluacion.justificacionNoAplica,
    decisionNoAplica: evaluacion.decisionNoAplica
      ? {
          id: evaluacion.decisionNoAplica.id,
          estado: evaluacion.decisionNoAplica.estado,
          resultadoEfectivo:
            evaluacion.decisionNoAplica.resultadoEfectivo.toNumber(),
          observacionDecision:
            evaluacion.decisionNoAplica.observacionDecision,
          solicitadaEn:
            evaluacion.decisionNoAplica.solicitadaEn.toISOString(),
          decididaEn: serializarFecha(
            evaluacion.decisionNoAplica.decididaEn
          ),
          solicitadaPor: evaluacion.decisionNoAplica.solicitadaPor,
          decididaPor: evaluacion.decisionNoAplica.decididaPor,
        }
      : null,
    aprobacionGestion: evaluacion.aprobacionGestion
      ? {
          id: evaluacion.aprobacionGestion.aprobacionGestion.id,
          estado:
            evaluacion.aprobacionGestion.aprobacionGestion.estado,
          observacionDecision:
            evaluacion.aprobacionGestion.aprobacionGestion
              .observacionDecision,
          generadaEn:
            evaluacion.aprobacionGestion.aprobacionGestion
              .generadaEn.toISOString(),
          decididaEn: serializarFecha(
            evaluacion.aprobacionGestion.aprobacionGestion.decididaEn
          ),
          decididaPor:
            evaluacion.aprobacionGestion.aprobacionGestion.decididaPor,
        }
      : null,
    marcadaRevisionTecnica: incluirRevisionTecnica
      ? evaluacion.marcadaRevisionTecnica
      : false,
    motivoRevisionTecnica: incluirRevisionTecnica
      ? evaluacion.motivoRevisionTecnica
      : null,
    revisionTecnica:
      incluirRevisionTecnica && evaluacion.revisionTecnica
        ? {
            id: evaluacion.revisionTecnica.id,
            estado: evaluacion.revisionTecnica.estado,
            motivoSolicitud:
              evaluacion.revisionTecnica.motivoSolicitud,
            conceptoTecnico:
              evaluacion.revisionTecnica.conceptoTecnico,
            motivoAnulacion:
              evaluacion.revisionTecnica.motivoAnulacion,
            solicitadaEn:
              evaluacion.revisionTecnica.solicitadaEn.toISOString(),
            revisadaEn: serializarFecha(
              evaluacion.revisionTecnica.revisadaEn
            ),
            anuladaEn: serializarFecha(
              evaluacion.revisionTecnica.anuladaEn
            ),
            solicitadaPor:
              evaluacion.revisionTecnica.solicitadaPor,
            revisadaPor: evaluacion.revisionTecnica.revisadaPor,
          }
        : null,
    creadaEn: evaluacion.createdAt.toISOString(),
    actualizadaEn: evaluacion.updatedAt.toISOString(),
    anioOrigen: evaluacion.gestion.empresaPeriodo.anio,
    gestion: {
      id: evaluacion.gestion.id,
      fechaGestion: evaluacion.gestion.fechaGestion.toISOString(),
      tipoActividad: evaluacion.gestion.tipoActividad,
      estado: evaluacion.gestion.estado,
    },
  };
}

function construirResumenVacio() {
  return {
    totalAspectos: 0,
    evaluados: 0,
    sinRevision: 0,
    vigentes: 0,
    porVencer: 0,
    vencidos: 0,
    pendientesVigencia: 0,
    cumplimientoAdministrativo: 0,
    calificacionMinisterial: 0,
    calificacionMinisterialMaxima: 0,
  };
}

async function cargarTareas(
  versionSupermatrizId: number
): Promise<TareaMatriz[]> {
  return prisma.supermatrizTarea.findMany({
    where: {
      versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
      aspecto: {
        estado: EstadoRegistro.ACTIVO,
        estandar: {
          estado: EstadoRegistro.ACTIVO,
          categoriaEstandar: {
            estado: EstadoRegistro.ACTIVO,
            cicloPhva: {
              estado: EstadoRegistro.ACTIVO,
            },
          },
        },
      },
      proceso: {
        estado: EstadoRegistro.ACTIVO,
      },
    },
    orderBy: [
      { orden: "asc" },
      { id: "asc" },
    ],
    include: inclusionTareas,
  });
}

export const servicioMatrizEvaluacionDirecta = {
  obtenerContexto: async (
    empresaId: string,
    anio: number,
    usuario: UsuarioSesionEvaluacion
  ) => {
    validarAnio(anio);

    const [empresa, periodo, categoriasGestion] = await Promise.all([
      asegurarAccesoEmpresa(usuario, empresaId, "LECTURA"),
      prisma.empresaPeriodo.findUnique({
        where: {
          empresaId_anio: {
            empresaId,
            anio,
          },
        },
        select: {
          id: true,
          anio: true,
          estado: true,
          fechaApertura: true,
          fechaCierre: true,
        },
      }),
      prisma.categoriaGestion.findMany({
        where: { estado: EstadoRegistro.ACTIVO },
        orderBy: { id: "asc" },
        select: {
          id: true,
          codigo: true,
          nombre: true,
        },
      }),
    ]);

    const fechaCorte = construirCorteAnual(anio);
    let versionAplicable: Awaited<
      ReturnType<typeof servicioPeriodosEvaluacion.resolverVersionParaFecha>
    > | null = null;

    try {
      versionAplicable =
        await servicioPeriodosEvaluacion.resolverVersionParaFecha(
          fechaCorte
        );
    } catch (error) {
      if (
        !(
          error instanceof ErrorEvaluacion &&
          error.code === "VERSION_NO_DISPONIBLE"
        )
      ) {
        throw error;
      }
    }

    if (!versionAplicable) {
      return {
        empresa,
        anio,
        fechaCorte: fechaCorte.toISOString(),
        periodo: periodo
          ? {
              ...periodo,
              fechaApertura: periodo.fechaApertura.toISOString(),
              fechaCierre: serializarFecha(periodo.fechaCierre),
              versionSupermatriz: null,
            }
          : null,
        versionDisponible: null,
        gestionActiva: null,
        gestionesActivas: [],
        categoriasGestion,
        filas: [],
        resumen: construirResumenVacio(),
      };
    }

    const tareas = await cargarTareas(versionAplicable.id);
    const aspectosReferencia = Array.from(
      new Map(
        tareas.map((tarea) => [
          tarea.aspecto.id,
          {
            id: tarea.aspecto.id,
            identidadHistorica: tarea.aspecto.identidadHistorica,
          },
        ])
      ).values()
    );
    const ultimaPorAspecto =
      (await servicioEstadoAspectosAlCorte.obtenerUltimasEvaluaciones(
        empresaId,
        aspectosReferencia,
        fechaCorte,
        seleccionEvaluacion
      )) as Map<number, EvaluacionMatriz>;
    const esCliente =
      usuario.rol === RolUsuario.ADMIN_CLIENTE ||
      usuario.rol === RolUsuario.USUARIO_CLIENTE;

    const filas = tareas.map((tarea) => {
      const ultimaEvaluacion =
        ultimaPorAspecto.get(tarea.aspectoId) ?? null;
      const esEvergreen =
        tarea.aspecto.configuracion?.esEvergreen ?? false;
      const detalleVigencia = resolverVigenciaEvaluacion({
        evaluacion: ultimaEvaluacion,
        configuracion: tarea.aspecto.configuracionVigencia,
        esEvergreen,
        provisional: false,
      });

      return {
        tareaId: tarea.id,
        orden: tarea.orden,
        codigo: tarea.codigo,
        ejecucion: tarea.ejecucion,
        proceso: tarea.proceso,
        categoriasGestion: tarea.categoriasGestion.map(
          ({ categoriaGestion }) => categoriaGestion
        ),
        cicloPhva:
          tarea.aspecto.estandar.categoriaEstandar.cicloPhva,
        categoriaEstandar: {
          id: tarea.aspecto.estandar.categoriaEstandar.id,
          codigo: tarea.aspecto.estandar.categoriaEstandar.codigo,
          nombre: tarea.aspecto.estandar.categoriaEstandar.nombre,
        },
        estandar: {
          id: tarea.aspecto.estandar.id,
          codigo: tarea.aspecto.estandar.codigo,
          nombre: tarea.aspecto.estandar.nombre,
          calificacionMinisterialEsperada:
            tarea.aspecto.estandar.calificacionMinisterialEsperada
              ?.toNumber() ?? 0.5,
          gruposMinisteriales:
            tarea.aspecto.estandar.gruposMinisteriales.map(
              ({ grupoMinisterial }) => grupoMinisterial
            ),
        },
        aspecto: {
          id: tarea.aspecto.id,
          codigo: tarea.aspecto.codigo,
          nombre: tarea.aspecto.nombre,
          identidadHistorica: tarea.aspecto.identidadHistorica,
          planAccionEspecifico:
            tarea.aspecto.planAccionEspecifico?.descripcion ?? null,
          configuracion: tarea.aspecto.configuracion,
          configuracionVigencia:
            tarea.aspecto.configuracionVigencia,
          configuracionEvidencia:
            tarea.aspecto.configuracionEvidencia,
          configuracionRevision:
            tarea.aspecto.configuracionRevision,
        },
        ultimaEvaluacion: ultimaEvaluacion
          ? serializarEvaluacion(ultimaEvaluacion, !esCliente)
          : null,
        evaluacionGestionActiva: null,
        estadoVigencia: detalleVigencia.estado,
        detalleVigencia: serializarDetalleVigencia(detalleVigencia),
        estadoVigenciaOficial: detalleVigencia.estado,
      };
    });

    const aspectosUnicos = new Map<
      number,
      (typeof filas)[number]
    >();

    for (const fila of filas) {
      if (!aspectosUnicos.has(fila.aspecto.id)) {
        aspectosUnicos.set(fila.aspecto.id, fila);
      }
    }

    const filasAspectos = [...aspectosUnicos.values()];
    const evaluadas = filasAspectos.filter((fila) =>
      Boolean(fila.ultimaEvaluacion)
    );
    const cumplimientoAdministrativo =
      evaluadas.length > 0
        ? evaluadas.reduce(
            (acumulado, fila) =>
              acumulado +
              (fila.ultimaEvaluacion?.calificacionEfectiva ?? 0),
            0
          ) / evaluadas.length
        : 0;

    const estandares = new Map<
      number,
      {
        esperada: number;
        aspectos: Set<number>;
      }
    >();

    for (const fila of filasAspectos) {
      const actual = estandares.get(fila.estandar.id) ?? {
        esperada: fila.estandar.calificacionMinisterialEsperada,
        aspectos: new Set<number>(),
      };
      actual.aspectos.add(fila.aspecto.id);
      estandares.set(fila.estandar.id, actual);
    }

    let calificacionMinisterial = 0;
    let calificacionMinisterialMaxima = 0;

    for (const estandar of estandares.values()) {
      calificacionMinisterialMaxima += estandar.esperada;
      const cumpleCompleto = [...estandar.aspectos].every(
        (aspectoId) => {
          const evaluacion = ultimaPorAspecto.get(aspectoId);
          if (!evaluacion) return false;
          const efectivo = resolverResultadoEfectivoEvaluacion(evaluacion);
          return !efectivo.provisional && efectivo.calificacion === 5;
        }
      );

      if (cumpleCompleto) {
        calificacionMinisterial += estandar.esperada;
      }
    }

    const contarVigencia = (estado: string) =>
      filasAspectos.filter(
        (fila) => fila.estadoVigenciaOficial === estado
      ).length;
    const versionSerializada = {
      id: versionAplicable.id,
      nombre: versionAplicable.nombre,
      estado: versionAplicable.estado,
      vigenteDesde: serializarFecha(versionAplicable.vigenteDesde),
      vigenteHasta: serializarFecha(versionAplicable.vigenteHasta),
    };

    return {
      empresa,
      anio,
      fechaCorte: fechaCorte.toISOString(),
      periodo: periodo
        ? {
            ...periodo,
            fechaApertura: periodo.fechaApertura.toISOString(),
            fechaCierre: serializarFecha(periodo.fechaCierre),
            versionSupermatriz: versionSerializada,
          }
        : null,
      versionDisponible: !periodo ? versionSerializada : null,
      gestionActiva: null,
      gestionesActivas: [],
      categoriasGestion,
      filas,
      resumen: {
        totalAspectos: filasAspectos.length,
        evaluados: evaluadas.length,
        sinRevision: contarVigencia("SIN_REVISION"),
        vigentes:
          contarVigencia("VIGENTE") +
          contarVigencia("VIGENTE_PERMANENTE") +
          contarVigencia("NO_APLICA"),
        porVencer: contarVigencia("POR_VENCER"),
        vencidos: contarVigencia("VENCIDO"),
        pendientesVigencia:
          contarVigencia("FALTA_FECHA_DOCUMENTO") +
          contarVigencia("PERIODICIDAD_NO_CONFIGURADA"),
        cumplimientoAdministrativo: Number(
          cumplimientoAdministrativo.toFixed(2)
        ),
        calificacionMinisterial: Number(
          calificacionMinisterial.toFixed(2)
        ),
        calificacionMinisterialMaxima: Number(
          calificacionMinisterialMaxima.toFixed(2)
        ),
      },
    };
  },
};