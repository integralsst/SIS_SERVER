import {
  CodigoCategoriaGestion,
  CodigoGrupoMinisterial,
  EstadoCumplimientoAspecto,
  EstadoGestionSgsst,
  EstadoRegistro,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { validarAnio } from "../../utils/evaluacion";
import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";
import { resolverResultadoEfectivoEvaluacion } from "./resultado-efectivo-evaluacion.service";

export type FiltroGrupoResultados =
  | "TODOS"
  | CodigoGrupoMinisterial;

export interface OpcionesResultadosEvaluacion {
  categoriasGestion?: CodigoCategoriaGestion[];
}

export const FILTROS_GRUPO_RESULTADOS: FiltroGrupoResultados[] = [
  "TODOS",
  CodigoGrupoMinisterial.ESTANDARES_7,
  CodigoGrupoMinisterial.ESTANDARES_21,
  CodigoGrupoMinisterial.ESTANDARES_60,
];

const CACHE_ESTRUCTURA_RESULTADOS_MS = Number(
  process.env.RESULTADOS_ESTRUCTURA_CACHE_MS ?? 10 * 60 * 1000
);

const NOTA_ADMINISTRATIVA_CUMPLIDO = 5;
const NOTA_ADMINISTRATIVA_PARCIAL = 3;
const TOLERANCIA_NOTA = 0.001;
const TOLERANCIA_PUNTAJE_GRUPO = 0.01;

const seleccionTareaResultados = {
  proceso: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  },
  categoriasGestion: {
    select: {
      categoriaGestion: {
        select: {
          codigo: true,
          nombre: true,
        },
      },
    },
  },
  aspecto: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      orden: true,
      estandar: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          orden: true,
          calificacionMinisterialEsperada: true,
          categoriaEstandar: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              orden: true,
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
            select: {
              grupoMinisterial: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  porcentajeEvaluable: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SupermatrizTareaSelect;

const seleccionEvaluacionResultados = {
  id: true,
  aspectoId: true,
  estadoCumplimiento: true,
  calificacionAdministrativa: true,
  createdAt: true,
  gestion: {
    select: {
      fechaGestion: true,
    },
  },
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
} satisfies Prisma.EvaluacionAspectoSelect;

type TareaResultados = Prisma.SupermatrizTareaGetPayload<{
  select: typeof seleccionTareaResultados;
}>;

type EvaluacionResultados = Prisma.EvaluacionAspectoGetPayload<{
  select: typeof seleccionEvaluacionResultados;
}>;

interface CacheEstructuraResultados {
  venceEn: number;
  tareas: TareaResultados[];
}

interface ConteoEstados {
  cumplidos: number;
  parciales: number;
  noCumplidos: number;
  noAplica: number;
  sinEvaluar: number;
}

interface GrupoDisponibleResultado {
  id: number;
  codigo: CodigoGrupoMinisterial;
  nombre: string;
  porcentajeEvaluable: number;
}

const cacheEstructura = new Map<
  number,
  CacheEstructuraResultados
>();
const cargasEstructura = new Map<
  number,
  Promise<TareaResultados[]>
>();

function ttlValido(valor: number): number {
  return Number.isFinite(valor) && valor > 0
    ? valor
    : 10 * 60 * 1000;
}

function redondear(valor: number, decimales = 2): number {
  return Number(valor.toFixed(decimales));
}

function porcentaje(parte: number, total: number): number {
  return total > 0 ? redondear((parte / total) * 100) : 0;
}

function promedio(
  aspectoIds: Iterable<number>,
  evaluaciones: Map<number, EvaluacionResultados>
): number {
  const notas: number[] = [];

  for (const aspectoId of aspectoIds) {
    const evaluacion = evaluaciones.get(aspectoId);

    if (evaluacion) {
      notas.push(
        resolverResultadoEfectivoEvaluacion(evaluacion)
          .calificacion
      );
    }
  }

  if (notas.length === 0) {
    return 0;
  }

  return redondear(
    notas.reduce((total, nota) => total + nota, 0) /
      notas.length
  );
}

function contarEstados(
  aspectoIds: Iterable<number>,
  evaluaciones: Map<number, EvaluacionResultados>
): ConteoEstados {
  const conteo: ConteoEstados = {
    cumplidos: 0,
    parciales: 0,
    noCumplidos: 0,
    noAplica: 0,
    sinEvaluar: 0,
  };

  for (const aspectoId of aspectoIds) {
    const evaluacion = evaluaciones.get(aspectoId);

    if (!evaluacion) {
      conteo.sinEvaluar += 1;
      continue;
    }

    const resultado =
      resolverResultadoEfectivoEvaluacion(evaluacion);

    if (
      evaluacion.estadoCumplimiento ===
        EstadoCumplimientoAspecto.NO_APLICA &&
      Math.abs(
        resultado.calificacion -
          NOTA_ADMINISTRATIVA_CUMPLIDO
      ) <= TOLERANCIA_NOTA
    ) {
      conteo.noAplica += 1;
      continue;
    }

    if (
      Math.abs(
        resultado.calificacion -
          NOTA_ADMINISTRATIVA_CUMPLIDO
      ) <= TOLERANCIA_NOTA
    ) {
      conteo.cumplidos += 1;
      continue;
    }

    if (
      Math.abs(
        resultado.calificacion -
          NOTA_ADMINISTRATIVA_PARCIAL
      ) <= TOLERANCIA_NOTA
    ) {
      conteo.parciales += 1;
      continue;
    }

    conteo.noCumplidos += 1;
  }

  return conteo;
}

function cumpleMinisterial(
  aspectoIds: Iterable<number>,
  evaluaciones: Map<number, EvaluacionResultados>
): boolean {
  const ids = [...aspectoIds];

  return (
    ids.length > 0 &&
    ids.every((aspectoId) => {
      const evaluacion = evaluaciones.get(aspectoId);

      if (!evaluacion) {
        return false;
      }

      const resultado =
        resolverResultadoEfectivoEvaluacion(evaluacion);

      return (
        !resultado.provisional &&
        Math.abs(
          resultado.calificacion -
            NOTA_ADMINISTRATIVA_CUMPLIDO
        ) <= TOLERANCIA_NOTA
      );
    })
  );
}

async function consultarEstructura(
  versionSupermatrizId: number
): Promise<TareaResultados[]> {
  return prisma.supermatrizTarea.findMany({
    where: {
      versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
      proceso: {
        estado: EstadoRegistro.ACTIVO,
      },
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
    },
    orderBy: [
      {
        orden: "asc",
      },
      {
        id: "asc",
      },
    ],
    select: seleccionTareaResultados,
  });
}

async function obtenerEstructura(
  versionSupermatrizId: number
): Promise<{
  tareas: TareaResultados[];
  cacheHit: boolean;
}> {
  const ahora = Date.now();
  const existente = cacheEstructura.get(versionSupermatrizId);

  if (existente && existente.venceEn > ahora) {
    return {
      tareas: existente.tareas,
      cacheHit: true,
    };
  }

  let carga = cargasEstructura.get(versionSupermatrizId);

  if (!carga) {
    carga = consultarEstructura(versionSupermatrizId);
    cargasEstructura.set(versionSupermatrizId, carga);
  }

  try {
    const tareas = await carga;

    cacheEstructura.set(versionSupermatrizId, {
      tareas,
      venceEn:
        Date.now() +
        ttlValido(CACHE_ESTRUCTURA_RESULTADOS_MS),
    });

    return {
      tareas,
      cacheHit: false,
    };
  } finally {
    cargasEstructura.delete(versionSupermatrizId);
  }
}

async function obtenerUltimasEvaluaciones(
  periodoId: string
): Promise<Map<number, EvaluacionResultados>> {
  const evaluaciones = await prisma.evaluacionAspecto.findMany({
    where: {
      gestion: {
        empresaPeriodoId: periodoId,
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
    select: seleccionEvaluacionResultados,
  });

  const ultimas = new Map<number, EvaluacionResultados>();

  for (const evaluacion of evaluaciones) {
    if (!ultimas.has(evaluacion.aspectoId)) {
      ultimas.set(evaluacion.aspectoId, evaluacion);
    }
  }

  return ultimas;
}

export const servicioResultadosEvaluacion = {
  obtener: async (
    empresaId: string,
    anio: number,
    grupo: FiltroGrupoResultados,
    usuario: UsuarioSesionEvaluacion,
    opciones: OpcionesResultadosEvaluacion = {}
  ) => {
    validarAnio(anio);
    const inicio = process.hrtime.bigint();
    const categoriasGestionAplicadas = [
      ...new Set(opciones.categoriasGestion ?? []),
    ];

    const [empresa, periodo] = await Promise.all([
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
          versionSupermatrizId: true,
          versionSupermatriz: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      }),
    ]);

    if (!periodo) {
      return {
        empresa,
        periodo: null,
        grupo,
        categoriasGestionAplicadas,
        gruposDisponibles: [],
        validacionGrupo: null,
        resumenEmpresa: null,
        procesos: [],
        estandares: [],
        calculadoEn: new Date().toISOString(),
      };
    }

    const [estructuraResultado, evaluaciones] =
      await Promise.all([
        obtenerEstructura(periodo.versionSupermatrizId),
        obtenerUltimasEvaluaciones(periodo.id),
      ]);

    const gruposDisponibles = new Map<
      CodigoGrupoMinisterial,
      GrupoDisponibleResultado
    >();

    for (const tarea of estructuraResultado.tareas) {
      for (const relacion of
        tarea.aspecto.estandar.gruposMinisteriales) {
        const actual = relacion.grupoMinisterial;

        gruposDisponibles.set(actual.codigo, {
          id: actual.id,
          codigo: actual.codigo,
          nombre: actual.nombre,
          porcentajeEvaluable:
            actual.porcentajeEvaluable.toNumber(),
        });
      }
    }

    const tareas = estructuraResultado.tareas.filter((tarea) => {
      const coincideGrupo =
        grupo === "TODOS" ||
        tarea.aspecto.estandar.gruposMinisteriales.some(
          ({ grupoMinisterial }) =>
            grupoMinisterial.codigo === grupo
        );
      const coincideCategoria =
        categoriasGestionAplicadas.length === 0 ||
        tarea.categoriasGestion.some(({ categoriaGestion }) =>
          categoriasGestionAplicadas.includes(
            categoriaGestion.codigo
          )
        );

      return coincideGrupo && coincideCategoria;
    });

    const aspectosEmpresa = new Set<number>();
    const procesosAcumulados = new Map<
      number,
      {
        id: number;
        codigo: string | null;
        nombre: string;
        aspectoIds: Set<number>;
        estandarIds: Set<number>;
      }
    >();
    const estandaresAcumulados = new Map<
      number,
      {
        id: number;
        codigo: string | null;
        nombre: string;
        orden: number;
        esperada: number;
        categoria: {
          id: number;
          codigo: string | null;
          nombre: string;
          orden: number;
        };
        cicloPhva: {
          id: number;
          codigo: string;
          nombre: string;
          orden: number;
        };
        gruposMinisteriales: Array<{
          id: number;
          codigo: CodigoGrupoMinisterial;
          nombre: string;
        }>;
        aspectoIds: Set<number>;
        procesos: Map<
          number,
          { id: number; codigo: string | null; nombre: string }
        >;
      }
    >();

    for (const tarea of tareas) {
      const { proceso, aspecto } = tarea;
      const estandar = aspecto.estandar;

      aspectosEmpresa.add(aspecto.id);

      const procesoActual = procesosAcumulados.get(proceso.id) ?? {
        ...proceso,
        aspectoIds: new Set<number>(),
        estandarIds: new Set<number>(),
      };
      procesoActual.aspectoIds.add(aspecto.id);
      procesoActual.estandarIds.add(estandar.id);
      procesosAcumulados.set(proceso.id, procesoActual);

      const estandarActual = estandaresAcumulados.get(
        estandar.id
      ) ?? {
        id: estandar.id,
        codigo: estandar.codigo,
        nombre: estandar.nombre,
        orden: estandar.orden,
        esperada:
          estandar.calificacionMinisterialEsperada?.toNumber() ??
          0.5,
        categoria: {
          id: estandar.categoriaEstandar.id,
          codigo: estandar.categoriaEstandar.codigo,
          nombre: estandar.categoriaEstandar.nombre,
          orden: estandar.categoriaEstandar.orden,
        },
        cicloPhva: estandar.categoriaEstandar.cicloPhva,
        gruposMinisteriales:
          estandar.gruposMinisteriales.map(
            ({ grupoMinisterial }) => ({
              id: grupoMinisterial.id,
              codigo: grupoMinisterial.codigo,
              nombre: grupoMinisterial.nombre,
            })
          ),
        aspectoIds: new Set<number>(),
        procesos: new Map(),
      };

      estandarActual.aspectoIds.add(aspecto.id);
      estandarActual.procesos.set(proceso.id, proceso);
      estandaresAcumulados.set(estandar.id, estandarActual);
    }

    const resultadosEstandar = [...estandaresAcumulados.values()]
      .map((estandar) => {
        const totalAspectos = estandar.aspectoIds.size;
        const estados = contarEstados(
          estandar.aspectoIds,
          evaluaciones
        );
        const evaluados = totalAspectos - estados.sinEvaluar;
        const cumple = cumpleMinisterial(
          estandar.aspectoIds,
          evaluaciones
        );

        return {
          id: estandar.id,
          codigo: estandar.codigo,
          nombre: estandar.nombre,
          orden: estandar.orden,
          categoria: estandar.categoria,
          cicloPhva: estandar.cicloPhva,
          gruposMinisteriales: estandar.gruposMinisteriales,
          procesos: [...estandar.procesos.values()].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, "es")
          ),
          totalAspectos,
          evaluados,
          coberturaPorcentaje: porcentaje(
            evaluados,
            totalAspectos
          ),
          cumplimientoAdministrativo: promedio(
            estandar.aspectoIds,
            evaluaciones
          ),
          estados,
          estadoMinisterial:
            evaluados === 0
              ? ("SIN_EVALUAR" as const)
              : cumple
                ? ("CUMPLE" as const)
                : ("NO_CUMPLE" as const),
          calificacionMinisterialEsperada: redondear(
            estandar.esperada
          ),
          calificacionMinisterialObtenida: cumple
            ? redondear(estandar.esperada)
            : 0,
        };
      })
      .sort((a, b) =>
        a.cicloPhva.orden - b.cicloPhva.orden ||
        a.categoria.orden - b.categoria.orden ||
        a.orden - b.orden ||
        a.nombre.localeCompare(b.nombre, "es")
      );

    const procesos = [...procesosAcumulados.values()]
      .map((proceso) => {
        const totalAspectos = proceso.aspectoIds.size;
        const estados = contarEstados(
          proceso.aspectoIds,
          evaluaciones
        );
        const evaluados = totalAspectos - estados.sinEvaluar;

        return {
          id: proceso.id,
          codigo: proceso.codigo,
          nombre: proceso.nombre,
          totalAspectos,
          evaluados,
          coberturaPorcentaje: porcentaje(
            evaluados,
            totalAspectos
          ),
          cumplimientoAdministrativo: promedio(
            proceso.aspectoIds,
            evaluaciones
          ),
          estados,
          estandaresRelacionados: proceso.estandarIds.size,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    const estadosEmpresa = contarEstados(
      aspectosEmpresa,
      evaluaciones
    );
    const totalAspectos = aspectosEmpresa.size;
    const evaluados = totalAspectos - estadosEmpresa.sinEvaluar;
    const calificacionMinisterial = resultadosEstandar.reduce(
      (total, estandar) =>
        total + estandar.calificacionMinisterialObtenida,
      0
    );
    const calificacionMinisterialMaxima =
      resultadosEstandar.reduce(
        (total, estandar) =>
          total + estandar.calificacionMinisterialEsperada,
        0
      );
    const grupoConfigurado =
      grupo === "TODOS"
        ? null
        : gruposDisponibles.get(grupo) ?? null;
    const validacionGrupo = grupoConfigurado
      ? {
          codigo: grupoConfigurado.codigo,
          nombre: grupoConfigurado.nombre,
          maximoConfigurado: redondear(
            grupoConfigurado.porcentajeEvaluable
          ),
          maximoCalculado: redondear(
            calificacionMinisterialMaxima
          ),
          coincide:
            Math.abs(
              grupoConfigurado.porcentajeEvaluable -
                calificacionMinisterialMaxima
            ) <= TOLERANCIA_PUNTAJE_GRUPO,
        }
      : null;
    const duracionMs = Number(
      (
        Number(process.hrtime.bigint() - inicio) /
        1_000_000
      ).toFixed(1)
    );

    if (duracionMs >= 750) {
      console.info("[rendimiento] resultados-evaluacion", {
        empresaId,
        anio,
        grupo,
        categoriasGestionAplicadas,
        duracionMs,
        estructuraCacheHit: estructuraResultado.cacheHit,
        totalAspectos,
        totalEstandares: resultadosEstandar.length,
        totalProcesos: procesos.length,
        validacionGrupo,
      });
    }

    return {
      empresa,
      periodo: {
        id: periodo.id,
        anio: periodo.anio,
        estado: periodo.estado,
        fechaApertura: periodo.fechaApertura.toISOString(),
        fechaCierre: periodo.fechaCierre?.toISOString() ?? null,
        versionSupermatriz: periodo.versionSupermatriz,
      },
      grupo,
      categoriasGestionAplicadas,
      gruposDisponibles: [
        ...gruposDisponibles.values(),
      ].sort((a, b) => a.codigo.localeCompare(b.codigo)),
      validacionGrupo,
      resumenEmpresa: {
        totalAspectos,
        evaluados,
        coberturaPorcentaje: porcentaje(
          evaluados,
          totalAspectos
        ),
        cumplimientoAdministrativo: promedio(
          aspectosEmpresa,
          evaluaciones
        ),
        estados: estadosEmpresa,
        totalEstandares: resultadosEstandar.length,
        estandaresCumplidos: resultadosEstandar.filter(
          (estandar) =>
            estandar.estadoMinisterial === "CUMPLE"
        ).length,
        estandaresNoCumplidos: resultadosEstandar.filter(
          (estandar) =>
            estandar.estadoMinisterial === "NO_CUMPLE"
        ).length,
        estandaresSinEvaluar: resultadosEstandar.filter(
          (estandar) =>
            estandar.estadoMinisterial === "SIN_EVALUAR"
        ).length,
        calificacionMinisterial: redondear(
          calificacionMinisterial
        ),
        calificacionMinisterialMaxima: redondear(
          calificacionMinisterialMaxima
        ),
        porcentajeMinisterial: porcentaje(
          calificacionMinisterial,
          calificacionMinisterialMaxima
        ),
      },
      procesos,
      estandares: resultadosEstandar,
      calculadoEn: new Date().toISOString(),
    };
  },
};