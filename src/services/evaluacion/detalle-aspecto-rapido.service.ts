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

const LIMITE_HISTORIAL = 20;
const CACHE_CONFIGURACION_MS = Number(
  process.env.DETALLE_CONFIG_CACHE_MS ?? 10 * 60 * 1000
);

const inclusionConfiguracion = {
  versionSupermatriz: {
    select: {
      id: true,
      nombre: true,
      estado: true,
    },
  },
  proceso: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      descripcion: true,
    },
  },
  categoriasGestion: {
    include: {
      categoriaGestion: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          descripcion: true,
        },
      },
    },
  },
  aspecto: {
    include: {
      planAccionEspecifico: true,
      configuracion: true,
      configuracionVigencia: true,
      configuracionTareaCotidiana: true,
      configuracionEvidencia: true,
      configuracionRevision: true,
      reglasAprobacion: {
        orderBy: {
          id: "asc" as const,
        },
      },
      palabrasClave: {
        include: {
          palabraClave: true,
        },
      },
      requisitosNormativos: {
        include: {
          requisitoNormativo: true,
        },
      },
      estandar: {
        include: {
          categoriaEstandar: {
            include: {
              cicloPhva: true,
            },
          },
          gruposMinisteriales: {
            include: {
              grupoMinisterial: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SupermatrizTareaInclude;

type ConfiguracionTareaCacheada =
  Prisma.SupermatrizTareaGetPayload<{
    include: typeof inclusionConfiguracion;
  }>;

const cacheConfiguracion = new Map<
  string,
  {
    venceEn: number;
    valor: ConfiguracionTareaCacheada;
  }
>();

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
    fechaVencimiento: serializarFecha(
      detalle.fechaVencimiento
    ),
  };
}

function nombrePersona(
  nombres: string | null | undefined,
  apellidos: string | null | undefined,
  fallback: string
): string {
  const nombre = [nombres, apellidos]
    .filter(Boolean)
    .join(" ")
    .trim();

  return nombre || fallback;
}

function usuarioEsCliente(
  usuario: UsuarioSesionEvaluacion
): boolean {
  return (
    usuario.rol === RolUsuario.ADMIN_CLIENTE ||
    usuario.rol === RolUsuario.USUARIO_CLIENTE
  );
}

function filtroAspectoHistorico(
  aspectoId: number,
  codigo: string | null
): Prisma.EvaluacionAspectoWhereInput {
  return codigo
    ? {
        aspecto: {
          codigo,
        },
      }
    : {
        aspectoId,
      };
}

async function resolverEmpresaPeriodo(
  empresaId: string,
  anio: number,
  usuario: UsuarioSesionEvaluacion
) {
  validarAnio(anio);

  const [empresa, periodo] = await Promise.all([
    asegurarAccesoEmpresa(
      usuario,
      empresaId,
      "LECTURA"
    ),
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
        versionSupermatrizId: true,
        versionSupermatriz: {
          select: {
            id: true,
            nombre: true,
            estado: true,
          },
        },
      },
    }),
  ]);

  if (!periodo) {
    throw new ErrorEvaluacion(
      "El periodo seleccionado todavía no está abierto.",
      404,
      "PERIODO_NO_ENCONTRADO"
    );
  }

  return {
    empresa,
    periodo,
  };
}

async function buscarGestionActiva(
  periodoId: string,
  usuarioId: string
) {
  return prisma.gestionSgsst.findFirst({
    where: {
      empresaPeriodoId: periodoId,
      usuarioCreadorId: usuarioId,
      estado: EstadoGestionSgsst.BORRADOR,
      valida: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
    },
  });
}

const seleccionEvaluacionVigencia = {
  id: true,
  estadoCumplimiento: true,
  fechaDocumento: true,
  fechaVencimientoCalculada: true,
} satisfies Prisma.EvaluacionAspectoSelect;

async function buscarEvaluacionBorradorVigencia(
  gestionId: string | undefined,
  aspectoId: number
) {
  if (!gestionId) return null;

  return prisma.evaluacionAspecto.findUnique({
    where: {
      gestionId_aspectoId: {
        gestionId,
        aspectoId,
      },
    },
    select: seleccionEvaluacionVigencia,
  });
}

async function buscarUltimaEvaluacionVigencia(
  empresaId: string,
  aspectoId: number,
  codigo: string | null
) {
  return prisma.evaluacionAspecto.findFirst({
    where: {
      ...filtroAspectoHistorico(aspectoId, codigo),
      gestion: {
        empresaPeriodo: {
          empresaId,
        },
        valida: true,
        estado: EstadoGestionSgsst.FINALIZADA,
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
    ],
    select: seleccionEvaluacionVigencia,
  });
}

async function resolverTareaMinima(
  tareaId: number,
  versionSupermatrizId: number
) {
  const tarea = await prisma.supermatrizTarea.findFirst({
    where: {
      id: tareaId,
      versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
    },
    select: {
      id: true,
      aspectoId: true,
      aspecto: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
        },
      },
    },
  });

  if (!tarea) {
    throw new ErrorEvaluacion(
      "La fila seleccionada no pertenece a la versión de este periodo.",
      404,
      "FILA_NO_ENCONTRADA"
    );
  }

  return tarea;
}

function limpiarCacheVencida(): void {
  const ahora = Date.now();

  for (const [clave, item] of cacheConfiguracion) {
    if (item.venceEn <= ahora) {
      cacheConfiguracion.delete(clave);
    }
  }

  if (cacheConfiguracion.size > 500) {
    const primeraClave = cacheConfiguracion.keys().next().value;
    if (typeof primeraClave === "string") {
      cacheConfiguracion.delete(primeraClave);
    }
  }
}

async function obtenerConfiguracionCacheada(
  tareaId: number,
  versionSupermatrizId: number
): Promise<ConfiguracionTareaCacheada> {
  limpiarCacheVencida();

  const clave = `${versionSupermatrizId}:${tareaId}`;
  const cache = cacheConfiguracion.get(clave);

  if (cache && cache.venceEn > Date.now()) {
    return cache.valor;
  }

  const tarea = await prisma.supermatrizTarea.findFirst({
    where: {
      id: tareaId,
      versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
    },
    include: inclusionConfiguracion,
  });

  if (!tarea) {
    throw new ErrorEvaluacion(
      "La fila seleccionada no pertenece a la versión de este periodo.",
      404,
      "FILA_NO_ENCONTRADA"
    );
  }

  cacheConfiguracion.set(clave, {
    valor: tarea,
    venceEn:
      Date.now() +
      (Number.isFinite(CACHE_CONFIGURACION_MS) &&
      CACHE_CONFIGURACION_MS > 0
        ? CACHE_CONFIGURACION_MS
        : 10 * 60 * 1000),
  });

  return tarea;
}

export const servicioDetalleAspectoRapido = {
  obtenerResumenRapido: async (
    empresaId: string,
    tareaId: number,
    anio: number,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const { empresa, periodo } =
      await resolverEmpresaPeriodo(
        empresaId,
        anio,
        usuario
      );

    const [tarea, gestionActiva] = await Promise.all([
      prisma.supermatrizTarea.findFirst({
        where: {
          id: tareaId,
          versionSupermatrizId:
            periodo.versionSupermatrizId,
          estado: EstadoRegistro.ACTIVO,
        },
        select: {
          id: true,
          codigo: true,
          orden: true,
          aspectoId: true,
          versionSupermatriz: {
            select: {
              id: true,
              nombre: true,
              estado: true,
            },
          },
          proceso: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              descripcion: true,
            },
          },
          categoriasGestion: {
            select: {
              categoriaGestion: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  descripcion: true,
                },
              },
            },
          },
          aspecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              configuracion: {
                select: {
                  esEvergreen: true,
                },
              },
              configuracionVigencia: true,
            },
          },
        },
      }),
      buscarGestionActiva(
        periodo.id,
        usuario.usuarioId
      ),
    ]);

    if (!tarea) {
      throw new ErrorEvaluacion(
        "La fila seleccionada no pertenece a la versión de este periodo.",
        404,
        "FILA_NO_ENCONTRADA"
      );
    }

    const [evaluacionBorrador, ultimaEvaluacion] =
      await Promise.all([
        buscarEvaluacionBorradorVigencia(
          gestionActiva?.id,
          tarea.aspectoId
        ),
        buscarUltimaEvaluacionVigencia(
          empresaId,
          tarea.aspectoId,
          tarea.aspecto.codigo
        ),
      ]);

    const evaluacionObjetivo =
      evaluacionBorrador ?? ultimaEvaluacion;
    const detalleVigencia = resolverVigenciaEvaluacion({
      evaluacion: evaluacionObjetivo,
      configuracion:
        tarea.aspecto.configuracionVigencia,
      esEvergreen:
        tarea.aspecto.configuracion?.esEvergreen ?? false,
      provisional: Boolean(evaluacionBorrador),
    });

    return {
      empresa,
      periodo: {
        id: periodo.id,
        anio: periodo.anio,
        estado: periodo.estado,
        versionSupermatriz:
          periodo.versionSupermatriz,
      },
      tarea: {
        id: tarea.id,
        codigo: tarea.codigo,
        orden: tarea.orden,
        versionSupermatriz:
          tarea.versionSupermatriz,
        proceso: tarea.proceso,
        categoriasGestion:
          tarea.categoriasGestion.map(
            ({ categoriaGestion }) =>
              categoriaGestion
          ),
        aspecto: {
          id: tarea.aspecto.id,
          codigo: tarea.aspecto.codigo,
          nombre: tarea.aspecto.nombre,
        },
      },
      detalleVigencia:
        serializarDetalleVigencia(detalleVigencia),
      permisos: {
        puedeVerRevisionTecnica:
          !usuarioEsCliente(usuario),
      },
    };
  },

  obtenerConfiguracion: async (
    empresaId: string,
    tareaId: number,
    anio: number,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const { periodo } = await resolverEmpresaPeriodo(
      empresaId,
      anio,
      usuario
    );
    const tarea = await obtenerConfiguracionCacheada(
      tareaId,
      periodo.versionSupermatrizId
    );

    return {
      tarea: {
        id: tarea.id,
        codigo: tarea.codigo,
        orden: tarea.orden,
        ejecucion: tarea.ejecucion,
        fundamentosSoportes:
          tarea.fundamentosSoportes,
        responsableActividad:
          tarea.responsableActividad,
        metasEstandar: tarea.metasEstandar,
        recursosAdministrativos:
          tarea.recursosAdministrativos,
        createdAt: tarea.createdAt.toISOString(),
        updatedAt: tarea.updatedAt.toISOString(),
        versionSupermatriz:
          tarea.versionSupermatriz,
        proceso: tarea.proceso,
        categoriasGestion:
          tarea.categoriasGestion.map(
            ({ categoriaGestion }) =>
              categoriaGestion
          ),
        aspecto: {
          id: tarea.aspecto.id,
          codigo: tarea.aspecto.codigo,
          nombre: tarea.aspecto.nombre,
          descripcion:
            tarea.aspecto.descripcion,
          planAccionEspecifico:
            tarea.aspecto.planAccionEspecifico,
          configuracion:
            tarea.aspecto.configuracion,
          configuracionVigencia:
            tarea.aspecto.configuracionVigencia,
          configuracionTareaCotidiana:
            tarea.aspecto.configuracionTareaCotidiana,
          configuracionEvidencia:
            tarea.aspecto.configuracionEvidencia,
          configuracionRevision:
            tarea.aspecto.configuracionRevision,
          reglasAprobacion:
            tarea.aspecto.reglasAprobacion,
          palabrasClave:
            tarea.aspecto.palabrasClave.map(
              ({ palabraClave }) => ({
                id: palabraClave.id,
                nombre: palabraClave.nombre,
              })
            ),
          requisitosNormativos:
            tarea.aspecto.requisitosNormativos.map(
              ({ requisitoNormativo }) => ({
                id: requisitoNormativo.id,
                clave: requisitoNormativo.clave,
                norma: requisitoNormativo.norma,
                articulo:
                  requisitoNormativo.articulo,
                descripcion:
                  requisitoNormativo.descripcion,
              })
            ),
          estandar: {
            id: tarea.aspecto.estandar.id,
            codigo:
              tarea.aspecto.estandar.codigo,
            nombre:
              tarea.aspecto.estandar.nombre,
            descripcion:
              tarea.aspecto.estandar.descripcion,
            gruposMinisteriales:
              tarea.aspecto.estandar.gruposMinisteriales.map(
                ({ grupoMinisterial }) => ({
                  id: grupoMinisterial.id,
                  codigo: grupoMinisterial.codigo,
                  nombre: grupoMinisterial.nombre,
                })
              ),
            categoriaEstandar: {
              id: tarea.aspecto.estandar
                .categoriaEstandar.id,
              codigo:
                tarea.aspecto.estandar
                  .categoriaEstandar.codigo,
              nombre:
                tarea.aspecto.estandar
                  .categoriaEstandar.nombre,
              cicloPhva: {
                id: tarea.aspecto.estandar
                  .categoriaEstandar.cicloPhva.id,
                codigo:
                  tarea.aspecto.estandar
                    .categoriaEstandar.cicloPhva.codigo,
                nombre:
                  tarea.aspecto.estandar
                    .categoriaEstandar.cicloPhva.nombre,
              },
            },
          },
        },
      },
      cache: {
        ttlMs:
          Number.isFinite(CACHE_CONFIGURACION_MS) &&
          CACHE_CONFIGURACION_MS > 0
            ? CACHE_CONFIGURACION_MS
            : 10 * 60 * 1000,
      },
    };
  },

  obtenerHistorialPaginado: async (
    empresaId: string,
    tareaId: number,
    anio: number,
    pagina: number,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const paginaValida =
      Number.isInteger(pagina) && pagina > 0
        ? pagina
        : 1;
    const { periodo } = await resolverEmpresaPeriodo(
      empresaId,
      anio,
      usuario
    );
    const tarea = await resolverTareaMinima(
      tareaId,
      periodo.versionSupermatrizId
    );
    const esCliente = usuarioEsCliente(usuario);

    const registros =
      await prisma.evaluacionAspecto.findMany({
        where: {
          ...filtroAspectoHistorico(
            tarea.aspectoId,
            tarea.aspecto.codigo
          ),
          gestion: {
            empresaPeriodo: {
              empresaId,
            },
            ...(esCliente
              ? {
                  valida: true,
                  estado: EstadoGestionSgsst.FINALIZADA,
                }
              : {
                  OR: [
                    {
                      valida: true,
                      estado: EstadoGestionSgsst.FINALIZADA,
                    },
                    {
                      valida: false,
                      estado: EstadoGestionSgsst.INVALIDADA,
                    },
                  ],
                }),
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
        ],
        skip: (paginaValida - 1) * LIMITE_HISTORIAL,
        take: LIMITE_HISTORIAL + 1,
        select: {
          id: true,
          estadoCumplimiento: true,
          calificacionAdministrativa: true,
          observacion: true,
          fechaDocumento: true,
          fechaVencimientoCalculada: true,
          justificacionNoAplica: true,
          createdAt: true,
          updatedAt: true,
          aspecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
          gestion: {
            select: {
              id: true,
              fechaGestion: true,
              tipoActividad: true,
              modalidad: true,
              estado: true,
              valida: true,
              finalizadaEn: true,
              invalidadaEn: true,
              motivoInvalidacion: true,
              profesional: {
                select: {
                  nombres: true,
                  apellidos: true,
                },
              },
              usuarioCreador: {
                select: {
                  nombre: true,
                },
              },
              categoriaGestion: {
                select: {
                  nombre: true,
                },
              },
              empresaPeriodo: {
                select: {
                  anio: true,
                },
              },
              historial: {
                where: {
                  accion: "INVALIDAR_GESTION",
                },
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
                select: {
                  usuario: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                },
              },
            },
          },
          evidencias: {
            where: {
              activo: true,
              ...(esCliente
                ? {
                    visibleCliente: true,
                  }
                : {}),
            },
            select: {
              id: true,
            },
          },
        },
      });

    const hayMas = registros.length > LIMITE_HISTORIAL;
    const historial = registros.slice(
      0,
      LIMITE_HISTORIAL
    );

    return {
      historial: historial.map((evaluacion) => ({
        id: evaluacion.id,
        estadoCumplimiento:
          evaluacion.estadoCumplimiento,
        calificacionAdministrativa:
          evaluacion.calificacionAdministrativa.toNumber(),
        observacion: evaluacion.observacion,
        fechaDocumento: serializarFecha(
          evaluacion.fechaDocumento
        ),
        fechaVencimientoCalculada:
          serializarFecha(
            evaluacion.fechaVencimientoCalculada
          ),
        justificacionNoAplica:
          evaluacion.justificacionNoAplica,
        creadaEn: evaluacion.createdAt.toISOString(),
        actualizadaEn:
          evaluacion.updatedAt.toISOString(),
        anio: evaluacion.gestion.empresaPeriodo.anio,
        gestion: {
          id: evaluacion.gestion.id,
          fechaGestion:
            evaluacion.gestion.fechaGestion.toISOString(),
          tipoActividad:
            evaluacion.gestion.tipoActividad,
          modalidad: evaluacion.gestion.modalidad,
          categoriaGestion:
            evaluacion.gestion.categoriaGestion
              ?.nombre ?? null,
          profesional: nombrePersona(
            evaluacion.gestion.profesional?.nombres,
            evaluacion.gestion.profesional?.apellidos,
            evaluacion.gestion.usuarioCreador.nombre
          ),
          estado: evaluacion.gestion.estado,
          valida: evaluacion.gestion.valida,
          finalizadaEn: serializarFecha(
            evaluacion.gestion.finalizadaEn
          ),
          invalidadaEn: serializarFecha(
            evaluacion.gestion.invalidadaEn
          ),
          motivoInvalidacion:
            evaluacion.gestion.motivoInvalidacion,
          invalidadaPor:
            evaluacion.gestion.historial[0]?.usuario ?? null,
        },
        aspectoVersion: {
          id: evaluacion.aspecto.id,
          codigo: evaluacion.aspecto.codigo,
          nombre: evaluacion.aspecto.nombre,
        },
        totalEvidencias:
          evaluacion.evidencias.length,
      })),
      paginacion: {
        pagina: paginaValida,
        limite: LIMITE_HISTORIAL,
        hayMas,
        paginaSiguiente: hayMas
          ? paginaValida + 1
          : null,
      },
    };
  },
};
