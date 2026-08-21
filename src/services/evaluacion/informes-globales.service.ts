import {
  CodigoCategoriaGestion,
  CodigoGrupoMinisterial,
  RolUsuario,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";

export type GrupoInformeGlobal = "TODOS" | CodigoGrupoMinisterial;
export type CategoriaInformeGlobal =
  | "TODAS"
  | CodigoCategoriaGestion;

export interface FiltrosInformesGlobales {
  buscar?: string | null;
  empresaId?: string | null;
  anio?: number | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  grupo?: GrupoInformeGlobal | null;
  categoria?: CategoriaInformeGlobal | null;
  pagina?: number | null;
  limite?: number | null;
}

const ROLES_INTERNOS = new Set<RolUsuario>([
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
]);

const ROLES_CLIENTE = new Set<RolUsuario>([
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
]);

const GRUPOS_VALIDOS = new Set<string>([
  "TODOS",
  ...Object.values(CodigoGrupoMinisterial),
]);

const CATEGORIAS_VALIDAS = new Set<string>([
  "TODAS",
  ...Object.values(CodigoCategoriaGestion),
]);

const seleccionInformeGlobal = {
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
  empresaPeriodo: {
    select: {
      id: true,
      anio: true,
      empresa: {
        select: {
          id: true,
          nit: true,
          nombre: true,
          ciudadPrincipal: true,
        },
      },
    },
  },
} satisfies Prisma.InformePeriodoSgsstSelect;

type InformeGlobal = Prisma.InformePeriodoSgsstGetPayload<{
  select: typeof seleccionInformeGlobal;
}>;

function construirFiltroEmpresa(
  usuario: UsuarioSesionEvaluacion
): Prisma.EmpresaWhereInput {
  if (ROLES_INTERNOS.has(usuario.rol)) {
    return {
      activo: true,
    };
  }

  if (
    usuario.rol === RolUsuario.PROFESIONAL ||
    usuario.rol === RolUsuario.COORDINADOR
  ) {
    if (!usuario.profesionalId) {
      throw new ErrorEvaluacion(
        "Tu usuario no tiene un perfil profesional asociado.",
        403,
        "PROFESIONAL_NO_ASOCIADO"
      );
    }

    return {
      activo: true,
      asignacionesProfesionales: {
        some: {
          profesionalId: usuario.profesionalId,
          activo: true,
          OR: [
            {
              fechaFin: null,
            },
            {
              fechaFin: {
                gte: new Date(),
              },
            },
          ],
        },
      },
    };
  }

  if (ROLES_CLIENTE.has(usuario.rol)) {
    if (!usuario.empresaId) {
      throw new ErrorEvaluacion(
        "Tu usuario no tiene una empresa asociada.",
        403,
        "USUARIO_CLIENTE_SIN_EMPRESA"
      );
    }

    return {
      id: usuario.empresaId,
      activo: true,
    };
  }

  throw new ErrorEvaluacion(
    "Tu rol no tiene acceso al módulo de informes.",
    403,
    "ROL_INFORMES_NO_AUTORIZADO"
  );
}

function normalizarTexto(value: string | null | undefined): string {
  return value?.trim().slice(0, 120) ?? "";
}

function normalizarEntero(
  value: number | null | undefined,
  fallback: number,
  minimo: number,
  maximo: number
): number {
  if (!Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(Math.max(value as number, minimo), maximo);
}

function normalizarAnio(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 2000 || value > 2100) {
    throw new ErrorEvaluacion(
      "El año solicitado no es válido.",
      400,
      "ANIO_INFORME_INVALIDO"
    );
  }

  return value;
}

function normalizarGrupo(
  value: GrupoInformeGlobal | null | undefined
): GrupoInformeGlobal | null {
  if (!value) {
    return null;
  }

  if (!GRUPOS_VALIDOS.has(value)) {
    throw new ErrorEvaluacion(
      "El grupo ministerial solicitado no es válido.",
      400,
      "GRUPO_INFORME_INVALIDO"
    );
  }

  return value;
}

function normalizarCategoria(
  value: CategoriaInformeGlobal | null | undefined
): CategoriaInformeGlobal | null {
  if (!value) {
    return null;
  }

  if (!CATEGORIAS_VALIDAS.has(value)) {
    throw new ErrorEvaluacion(
      "La categoría de gestión solicitada no es válida.",
      400,
      "CATEGORIA_INFORME_INVALIDA"
    );
  }

  return value;
}

function parsearFecha(
  value: string | null | undefined,
  finDelDia: boolean
): Date | null {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ErrorEvaluacion(
      "El filtro de fecha no es válido.",
      400,
      "FECHA_INFORME_INVALIDA"
    );
  }

  const fecha = new Date(
    `${value}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}Z`
  );

  if (Number.isNaN(fecha.getTime())) {
    throw new ErrorEvaluacion(
      "El filtro de fecha no es válido.",
      400,
      "FECHA_INFORME_INVALIDA"
    );
  }

  return fecha;
}

function categoriasDesdeJson(
  value: Prisma.JsonValue
): CodigoCategoriaGestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is CodigoCategoriaGestion =>
      typeof item === "string" &&
      Object.values(CodigoCategoriaGestion).includes(
        item as CodigoCategoriaGestion
      )
  );
}

function coincideCategoria(
  categorias: CodigoCategoriaGestion[],
  filtro: CategoriaInformeGlobal | null
): boolean {
  if (!filtro) {
    return true;
  }

  if (filtro === "TODAS") {
    return categorias.length === 0;
  }

  return categorias.length === 0 || categorias.includes(filtro);
}

function decimalANumero(
  value: Prisma.Decimal | null
): number | null {
  return value?.toNumber() ?? null;
}

function serializarInforme(informe: InformeGlobal) {
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
    cumplimientoAdministrativo: decimalANumero(
      informe.cumplimientoAdministrativo
    ),
    calificacionMinisterial: decimalANumero(
      informe.calificacionMinisterial
    ),
    calificacionMinisterialMaxima: decimalANumero(
      informe.calificacionMinisterialMaxima
    ),
    coberturaPorcentaje: decimalANumero(
      informe.coberturaPorcentaje
    ),
    generadoPor: informe.generadoPor,
    createdAt: informe.createdAt.toISOString(),
    periodo: {
      id: informe.empresaPeriodo.id,
      anio: informe.empresaPeriodo.anio,
    },
    empresa: informe.empresaPeriodo.empresa,
  };
}

export const servicioInformesGlobales = {
  listar: async (
    filtros: FiltrosInformesGlobales,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const filtroEmpresa = construirFiltroEmpresa(usuario);
    const buscar = normalizarTexto(filtros.buscar);
    const empresaId = normalizarTexto(filtros.empresaId) || null;
    const anio = normalizarAnio(filtros.anio);
    const grupo = normalizarGrupo(filtros.grupo);
    const categoria = normalizarCategoria(filtros.categoria);
    const fechaDesde = parsearFecha(filtros.fechaDesde, false);
    const fechaHasta = parsearFecha(filtros.fechaHasta, true);
    const paginaSolicitada = normalizarEntero(
      filtros.pagina,
      1,
      1,
      100000
    );
    const limite = normalizarEntero(filtros.limite, 12, 6, 50);

    if (
      fechaDesde &&
      fechaHasta &&
      fechaDesde.getTime() > fechaHasta.getTime()
    ) {
      throw new ErrorEvaluacion(
        "La fecha inicial no puede ser posterior a la fecha final.",
        400,
        "RANGO_FECHAS_INFORME_INVALIDO"
      );
    }

    const and: Prisma.InformePeriodoSgsstWhereInput[] = [
      {
        empresaPeriodo: {
          is: {
            empresa: {
              is: filtroEmpresa,
            },
            ...(empresaId ? { empresaId } : {}),
            ...(anio ? { anio } : {}),
          },
        },
      },
    ];

    if (grupo) {
      and.push({
        grupoMinisterial:
          grupo === "TODOS" ? null : grupo,
      });
    }

    if (fechaDesde || fechaHasta) {
      and.push({
        fechaCorte: {
          ...(fechaDesde ? { gte: fechaDesde } : {}),
          ...(fechaHasta ? { lte: fechaHasta } : {}),
        },
      });
    }

    if (buscar) {
      and.push({
        OR: [
          {
            titulo: {
              contains: buscar,
            },
          },
          {
            empresaPeriodo: {
              is: {
                empresa: {
                  is: {
                    nombre: {
                      contains: buscar,
                    },
                  },
                },
              },
            },
          },
          {
            empresaPeriodo: {
              is: {
                empresa: {
                  is: {
                    nit: {
                      contains: buscar,
                    },
                  },
                },
              },
            },
          },
          {
            generadoPor: {
              is: {
                nombre: {
                  contains: buscar,
                },
              },
            },
          },
        ],
      });
    }

    const where = {
      AND: and,
    } satisfies Prisma.InformePeriodoSgsstWhereInput;

    const [informes, empresas, categorias] = await Promise.all([
      prisma.informePeriodoSgsst.findMany({
        where,
        orderBy: [
          {
            fechaCorte: "desc",
          },
          {
            numeroVersion: "desc",
          },
        ],
        select: seleccionInformeGlobal,
      }),
      prisma.empresa.findMany({
        where: filtroEmpresa,
        orderBy: {
          nombre: "asc",
        },
        select: {
          id: true,
          nit: true,
          nombre: true,
          ciudadPrincipal: true,
          periodosSgsst: {
            orderBy: {
              anio: "desc",
            },
            select: {
              id: true,
              anio: true,
            },
          },
        },
      }),
      prisma.categoriaGestion.findMany({
        where: {
          estado: "ACTIVO",
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

    const versionesFiltradas = informes
      .map(serializarInforme)
      .filter((version) =>
        coincideCategoria(version.categoriasGestion, categoria)
      );
    const total = versionesFiltradas.length;
    const totalPaginas = Math.max(1, Math.ceil(total / limite));
    const pagina = Math.min(paginaSolicitada, totalPaginas);
    const inicio = (pagina - 1) * limite;
    const versiones = versionesFiltradas.slice(
      inicio,
      inicio + limite
    );
    const empresasConInformes = new Set(
      versionesFiltradas.map((version) => version.empresa.id)
    ).size;
    const aniosDisponibles = [
      ...new Set(
        empresas.flatMap((empresa) =>
          empresa.periodosSgsst.map((periodo) => periodo.anio)
        )
      ),
    ].sort((a, b) => b - a);

    return {
      resumen: {
        totalVersiones: total,
        empresasConInformes,
        ultimaGeneracion:
          versionesFiltradas[0]?.fechaCorte ?? null,
      },
      empresas: empresas.map((empresa) => ({
        id: empresa.id,
        nit: empresa.nit,
        nombre: empresa.nombre,
        ciudadPrincipal: empresa.ciudadPrincipal,
        periodos: empresa.periodosSgsst,
      })),
      categorias,
      aniosDisponibles,
      versiones,
      paginacion: {
        pagina,
        limite,
        total,
        totalPaginas,
      },
      filtrosAplicados: {
        buscar,
        empresaId,
        anio,
        fechaDesde: filtros.fechaDesde ?? null,
        fechaHasta: filtros.fechaHasta ?? null,
        grupo,
        categoria,
      },
    };
  },
};