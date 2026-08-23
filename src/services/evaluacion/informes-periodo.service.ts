import {
  CodigoCategoriaGestion,
  CodigoGrupoMinisterial,
  EstadoGestionSgsst,
  EstadoRegistro,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  comoJsonPrismaEvaluacion,
  ErrorEvaluacion,
  validarAnio,
} from "../../utils/evaluacion";
import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";
import { servicioEstadoDocumentalInformes } from "./estado-documental-informes.service";
import { servicioEstadoProvisionalResultados } from "./estado-provisional-resultados.service";
import {
  FILTROS_GRUPO_RESULTADOS,
  servicioResultadosEvaluacion,
  type FiltroGrupoResultados,
} from "./resultados-evaluacion.service";

export interface GenerarInformePeriodoInput {
  titulo?: string | null;
  grupo?: FiltroGrupoResultados | null;
  categoriasGestion?: CodigoCategoriaGestion[] | null;
  motivoVersion?: string | null;
}

const CODIGOS_CATEGORIA = new Set<string>(
  Object.values(CodigoCategoriaGestion)
);

const SIN_PROVISIONALES = {
  total: 0,
  aprobacionGestion: 0,
  noAplica: 0,
  revisionTecnica: 0,
};

function limpiarTexto(
  value: string | null | undefined,
  maximo: number
): string | null {
  const texto = value?.trim() ?? "";

  if (!texto) {
    return null;
  }

  if (texto.length > maximo) {
    throw new ErrorEvaluacion(
      `El texto no puede superar ${maximo} caracteres.`
    );
  }

  return texto;
}

function normalizarGrupo(
  value: FiltroGrupoResultados | null | undefined
): FiltroGrupoResultados {
  const grupo = value ?? "TODOS";

  if (!FILTROS_GRUPO_RESULTADOS.includes(grupo)) {
    throw new ErrorEvaluacion(
      "El grupo ministerial solicitado no es válido.",
      400,
      "GRUPO_INFORME_INVALIDO"
    );
  }

  return grupo;
}

function normalizarCategorias(
  values: CodigoCategoriaGestion[] | null | undefined
): CodigoCategoriaGestion[] {
  const unicas = [...new Set(values ?? [])];

  for (const value of unicas) {
    if (!CODIGOS_CATEGORIA.has(value)) {
      throw new ErrorEvaluacion(
        "Una de las categorías de gestión no es válida.",
        400,
        "CATEGORIA_INFORME_INVALIDA"
      );
    }
  }

  return unicas.sort((a, b) => a.localeCompare(b));
}

function categoriasDesdeJson(
  value: Prisma.JsonValue
): CodigoCategoriaGestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is CodigoCategoriaGestion =>
      typeof item === "string" && CODIGOS_CATEGORIA.has(item)
  );
}

function numeroDecimal(
  value: Prisma.Decimal | null
): number | null {
  return value?.toNumber() ?? null;
}

function serializarInformeListado(informe: {
  id: string;
  numeroVersion: number;
  titulo: string;
  grupoMinisterial: CodigoGrupoMinisterial | null;
  categoriasGestion: Prisma.JsonValue;
  motivoVersion: string | null;
  fechaCorte: Date;
  ultimaActualizacionFuente: Date | null;
  totalGestionesFuente: number;
  totalEvaluacionesFuente: number;
  registrosHistoricosPosteriores: number;
  cumplimientoAdministrativo: Prisma.Decimal | null;
  calificacionMinisterial: Prisma.Decimal | null;
  calificacionMinisterialMaxima: Prisma.Decimal | null;
  coberturaPorcentaje: Prisma.Decimal | null;
  createdAt: Date;
  generadoPor: {
    id: string;
    nombre: string;
    correo: string;
  };
}) {
  return {
    id: informe.id,
    numeroVersion: informe.numeroVersion,
    titulo: informe.titulo,
    grupo: informe.grupoMinisterial ?? "TODOS",
    categoriasGestion: categoriasDesdeJson(
      informe.categoriasGestion
    ),
    motivoVersion: informe.motivoVersion,
    fechaCorte: informe.fechaCorte.toISOString(),
    ultimaActualizacionFuente:
      informe.ultimaActualizacionFuente?.toISOString() ?? null,
    totalGestionesFuente: informe.totalGestionesFuente,
    totalEvaluacionesFuente: informe.totalEvaluacionesFuente,
    registrosHistoricosPosteriores:
      informe.registrosHistoricosPosteriores,
    cumplimientoAdministrativo: numeroDecimal(
      informe.cumplimientoAdministrativo
    ),
    calificacionMinisterial: numeroDecimal(
      informe.calificacionMinisterial
    ),
    calificacionMinisterialMaxima: numeroDecimal(
      informe.calificacionMinisterialMaxima
    ),
    coberturaPorcentaje: numeroDecimal(
      informe.coberturaPorcentaje
    ),
    generadoPor: informe.generadoPor,
    createdAt: informe.createdAt.toISOString(),
  };
}

const seleccionInformeListado = {
  id: true,
  numeroVersion: true,
  titulo: true,
  grupoMinisterial: true,
  categoriasGestion: true,
  motivoVersion: true,
  fechaCorte: true,
  ultimaActualizacionFuente: true,
  totalGestionesFuente: true,
  totalEvaluacionesFuente: true,
  registrosHistoricosPosteriores: true,
  cumplimientoAdministrativo: true,
  calificacionMinisterial: true,
  calificacionMinisterialMaxima: true,
  coberturaPorcentaje: true,
  createdAt: true,
  generadoPor: {
    select: {
      id: true,
      nombre: true,
      correo: true,
    },
  },
} satisfies Prisma.InformePeriodoSgsstSelect;

async function obtenerEstadisticasFuente(
  periodoId: string,
  anio: number
) {
  const whereGestion = {
    empresaPeriodoId: periodoId,
    estado: EstadoGestionSgsst.FINALIZADA,
    valida: true,
  } satisfies Prisma.GestionSgsstWhereInput;
  const inicioAnioSiguiente = new Date(
    Date.UTC(anio + 1, 0, 1)
  );

  const [
    gestiones,
    evaluaciones,
    evidenciasEvaluacion,
    evidenciasCompromiso,
    historicas,
  ] = await Promise.all([
    prisma.gestionSgsst.aggregate({
      where: whereGestion,
      _count: {
        _all: true,
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.evaluacionAspecto.aggregate({
      where: {
        gestion: whereGestion,
      },
      _count: {
        _all: true,
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.evidenciaEvaluacion.aggregate({
      where: {
        evaluacion: {
          gestion: whereGestion,
        },
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.compromisoEvidencia.aggregate({
      where: {
        compromiso: {
          gestionOrigen: whereGestion,
        },
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.gestionSgsst.count({
      where: {
        ...whereGestion,
        createdAt: {
          gte: inicioAnioSiguiente,
        },
      },
    }),
  ]);

  const fechas = [
    gestiones._max.updatedAt,
    evaluaciones._max.updatedAt,
    evidenciasEvaluacion._max.updatedAt,
    evidenciasCompromiso._max.updatedAt,
  ].filter((value): value is Date => Boolean(value));
  const ultimaActualizacionFuente = fechas.length
    ? new Date(Math.max(...fechas.map((value) => value.getTime())))
    : null;

  return {
    totalGestionesFuente: gestiones._count._all,
    totalEvaluacionesRegistradas: evaluaciones._count._all,
    registrosHistoricosPosteriores: historicas,
    ultimaActualizacionFuente,
  };
}

async function obtenerAspectosPermitidosPorCategorias(
  versionSupermatrizId: number,
  categoriasGestion: CodigoCategoriaGestion[]
): Promise<ReadonlySet<number> | undefined> {
  if (categoriasGestion.length === 0) {
    return undefined;
  }

  const tareas = await prisma.supermatrizTarea.findMany({
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
      categoriasGestion: {
        some: {
          categoriaGestion: {
            codigo: {
              in: categoriasGestion,
            },
            estado: EstadoRegistro.ACTIVO,
          },
        },
      },
    },
    select: {
      aspectoId: true,
    },
  });

  return new Set(tareas.map((tarea) => tarea.aspectoId));
}

async function crearVersionConsecutiva(data: {
  empresaPeriodoId: string;
  titulo: string;
  grupo: FiltroGrupoResultados;
  categoriasGestion: CodigoCategoriaGestion[];
  motivoVersion: string | null;
  fechaCorte: Date;
  ultimaActualizacionFuente: Date | null;
  totalGestionesFuente: number;
  totalEvaluacionesFuente: number;
  registrosHistoricosPosteriores: number;
  cumplimientoAdministrativo: number | null;
  calificacionMinisterial: number | null;
  calificacionMinisterialMaxima: number | null;
  coberturaPorcentaje: number | null;
  snapshot: Prisma.InputJsonValue;
  generadoPorUsuarioId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const ultima = await tx.informePeriodoSgsst.findFirst({
      where: {
        empresaPeriodoId: data.empresaPeriodoId,
      },
      orderBy: {
        numeroVersion: "desc",
      },
      select: {
        numeroVersion: true,
      },
    });
    const numeroVersion = (ultima?.numeroVersion ?? 0) + 1;

    return tx.informePeriodoSgsst.create({
      data: {
        empresaPeriodoId: data.empresaPeriodoId,
        numeroVersion,
        titulo: data.titulo,
        grupoMinisterial:
          data.grupo === "TODOS" ? null : data.grupo,
        categoriasGestion: comoJsonPrismaEvaluacion(
          data.categoriasGestion
        ),
        motivoVersion:
          data.motivoVersion ??
          (numeroVersion > 1
            ? "Nueva versión por actualización de información."
            : null),
        fechaCorte: data.fechaCorte,
        ultimaActualizacionFuente:
          data.ultimaActualizacionFuente,
        totalGestionesFuente: data.totalGestionesFuente,
        totalEvaluacionesFuente: data.totalEvaluacionesFuente,
        registrosHistoricosPosteriores:
          data.registrosHistoricosPosteriores,
        cumplimientoAdministrativo:
          data.cumplimientoAdministrativo,
        calificacionMinisterial:
          data.calificacionMinisterial,
        calificacionMinisterialMaxima:
          data.calificacionMinisterialMaxima,
        coberturaPorcentaje: data.coberturaPorcentaje,
        snapshot: data.snapshot,
        generadoPorUsuarioId: data.generadoPorUsuarioId,
      },
      select: seleccionInformeListado,
    });
  });
}

export const servicioInformesPeriodo = {
  listar: async (
    empresaId: string,
    anio: number,
    usuario: UsuarioSesionEvaluacion
  ) => {
    validarAnio(anio);
    const empresa = await asegurarAccesoEmpresa(
      usuario,
      empresaId,
      "LECTURA"
    );

    const [periodo, categorias] = await Promise.all([
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
          versionSupermatriz: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      }),
      prisma.categoriaGestion.findMany({
        where: {
          estado: EstadoRegistro.ACTIVO,
        },
        orderBy: {
          nombre: "asc",
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
        },
      }),
    ]);

    if (!periodo) {
      return {
        empresa,
        periodo: null,
        categorias,
        versiones: [],
      };
    }

    const versiones = await prisma.informePeriodoSgsst.findMany({
      where: {
        empresaPeriodoId: periodo.id,
      },
      orderBy: {
        numeroVersion: "desc",
      },
      select: seleccionInformeListado,
    });

    return {
      empresa,
      periodo: {
        ...periodo,
        fechaApertura: periodo.fechaApertura.toISOString(),
      },
      categorias,
      versiones: versiones.map(serializarInformeListado),
    };
  },

  generar: async (
    empresaId: string,
    anio: number,
    input: GenerarInformePeriodoInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    validarAnio(anio);
    await asegurarAccesoEmpresa(usuario, empresaId, "ESCRITURA");

    const grupo = normalizarGrupo(input.grupo);
    const categoriasGestion = normalizarCategorias(
      input.categoriasGestion
    );
    const titulo =
      limpiarTexto(input.titulo, 191) ??
      `Informe SG-SST enero a diciembre ${anio}`;
    const motivoVersion = limpiarTexto(
      input.motivoVersion,
      3000
    );

    const resultado = await servicioResultadosEvaluacion.obtener(
      empresaId,
      anio,
      grupo,
      usuario,
      {
        categoriasGestion,
      }
    );

    if (!resultado.periodo) {
      throw new ErrorEvaluacion(
        `El periodo ${anio} todavía no existe para esta empresa.`,
        409,
        "PERIODO_INFORME_NO_EXISTE"
      );
    }

    const aspectoIdsPermitidos =
      await obtenerAspectosPermitidosPorCategorias(
        resultado.periodo.versionSupermatriz.id,
        categoriasGestion
      );
    const [provisionales, estadoDocumental] = await Promise.all([
      servicioEstadoProvisionalResultados.obtener(
        empresaId,
        anio,
        grupo,
        {
          aspectoIdsPermitidos,
        }
      ),
      servicioEstadoDocumentalInformes.obtener(
        empresaId,
        anio,
        grupo,
        {
          aspectoIdsPermitidos,
        }
      ),
    ]);
    const resultadoConProvisionales = {
      ...resultado,
      resumenEmpresa: resultado.resumenEmpresa
        ? {
            ...resultado.resumenEmpresa,
            provisionales: provisionales.resumenEmpresa,
          }
        : null,
      estandares: resultado.estandares.map((estandar) => ({
        ...estandar,
        provisionales:
          provisionales.estandares.get(estandar.id) ??
          SIN_PROVISIONALES,
      })),
    };

    const fechaCorte = new Date();
    const fuente = await obtenerEstadisticasFuente(
      resultado.periodo.id,
      anio
    );
    const resumen = resultadoConProvisionales.resumenEmpresa;
    const snapshot = comoJsonPrismaEvaluacion({
      schemaVersion: 3,
      tipo: "INFORME_PERIODO_SGSST",
      fechaCorte: fechaCorte.toISOString(),
      filtros: {
        grupo,
        categoriasGestion,
      },
      fuente: {
        ...fuente,
        ultimaActualizacionFuente:
          fuente.ultimaActualizacionFuente?.toISOString() ?? null,
      },
      resultado: resultadoConProvisionales,
      estadoDocumental,
    });

    const informe = await crearVersionConsecutiva({
      empresaPeriodoId: resultado.periodo.id,
      titulo,
      grupo,
      categoriasGestion,
      motivoVersion,
      fechaCorte,
      ultimaActualizacionFuente:
        fuente.ultimaActualizacionFuente,
      totalGestionesFuente: fuente.totalGestionesFuente,
      totalEvaluacionesFuente: resumen?.evaluados ?? 0,
      registrosHistoricosPosteriores:
        fuente.registrosHistoricosPosteriores,
      cumplimientoAdministrativo:
        resumen?.cumplimientoAdministrativo ?? null,
      calificacionMinisterial:
        resumen?.calificacionMinisterial ?? null,
      calificacionMinisterialMaxima:
        resumen?.calificacionMinisterialMaxima ?? null,
      coberturaPorcentaje:
        resumen?.coberturaPorcentaje ?? null,
      snapshot,
      generadoPorUsuarioId: usuario.usuarioId,
    });

    return serializarInformeListado(informe);
  },

  obtenerDetalle: async (
    informeId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const informe = await prisma.informePeriodoSgsst.findUnique({
      where: {
        id: informeId,
      },
      select: {
        ...seleccionInformeListado,
        snapshot: true,
        empresaPeriodo: {
          select: {
            empresaId: true,
            anio: true,
          },
        },
      },
    });

    if (!informe) {
      throw new ErrorEvaluacion(
        "La versión de informe solicitada no existe.",
        404,
        "INFORME_NO_ENCONTRADO"
      );
    }

    await asegurarAccesoEmpresa(
      usuario,
      informe.empresaPeriodo.empresaId,
      "LECTURA"
    );

    return {
      ...serializarInformeListado(informe),
      anio: informe.empresaPeriodo.anio,
      snapshot: informe.snapshot,
    };
  },
};
