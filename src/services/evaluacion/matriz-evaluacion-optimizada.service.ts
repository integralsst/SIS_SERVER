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
import { servicioPeriodosEvaluacion } from "./periodos-evaluacion.service";
import { resolverResultadoEfectivoEvaluacion } from "./resultado-efectivo-evaluacion.service";

const CACHE_ESTRUCTURA_MS = Number(
  process.env.MATRIZ_ESTRUCTURA_CACHE_MS ?? 10 * 60 * 1000
);

const CACHE_CATEGORIAS_MS = Number(
  process.env.MATRIZ_CATEGORIAS_CACHE_MS ?? 10 * 60 * 1000
);

const inclusionTareasMatriz = {
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

const seleccionEvaluacionMatriz = {
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

const seleccionCategoriasGestion = {
  id: true,
  codigo: true,
  nombre: true,
} satisfies Prisma.CategoriaGestionSelect;

type TareaMatriz = Prisma.SupermatrizTareaGetPayload<{
  include: typeof inclusionTareasMatriz;
}>;

type EvaluacionMatriz = Prisma.EvaluacionAspectoGetPayload<{
  select: typeof seleccionEvaluacionMatriz;
}>;

type CategoriaGestionMatriz = Prisma.CategoriaGestionGetPayload<{
  select: typeof seleccionCategoriasGestion;
}>;

interface CacheEstructura {
  venceEn: number;
  tareas: TareaMatriz[];
}

interface CacheCategorias {
  venceEn: number;
  categorias: CategoriaGestionMatriz[];
}

const cacheEstructura = new Map<number, CacheEstructura>();
const cargasEstructura = new Map<number, Promise<TareaMatriz[]>>();
let cacheCategorias: CacheCategorias | null = null;
let cargaCategorias: Promise<CategoriaGestionMatriz[]> | null = null;

function ttlValido(valor: number, fallback: number): number {
  return Number.isFinite(valor) && valor > 0 ? valor : fallback;
}

function milisegundosDesde(inicio: bigint): number {
  return Number(
    (
      Number(process.hrtime.bigint() - inicio) /
      1_000_000
    ).toFixed(1)
  );
}

function serializarFecha(
  value: Date | null | undefined
): string | null {
  return value ? value.toISOString() : null;
}

function serializarEvaluacion(
  evaluacion: EvaluacionMatriz,
  incluirRevisionTecnica: boolean
) {
  const resultadoEfectivo =
    resolverResultadoEfectivoEvaluacion(evaluacion);

  return {
    id: evaluacion.id,
    estadoCumplimiento: evaluacion.estadoCumplimiento,
    calificacionAdministrativa:
      evaluacion.calificacionAdministrativa.toNumber(),
    calificacionEfectiva: resultadoEfectivo.calificacion,
    resultadoProvisional: resultadoEfectivo.provisional,
    causaResultadoEfectivo: resultadoEfectivo.causa,
    observacion: evaluacion.observacion,
    fechaDocumento: serializarFecha(evaluacion.fechaDocumento),
    fechaVencimientoCalculada: serializarFecha(
      evaluacion.fechaVencimientoCalculada
    ),
    justificacionNoAplica:
      evaluacion.justificacionNoAplica,
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
          solicitadaPor:
            evaluacion.decisionNoAplica.solicitadaPor,
          decididaPor:
            evaluacion.decisionNoAplica.decididaPor,
        }
      : null,
    aprobacionGestion:
      evaluacion.aprobacionGestion
        ? {
            id: evaluacion.aprobacionGestion.aprobacionGestion.id,
            estado:
              evaluacion.aprobacionGestion.aprobacionGestion.estado,
            observacionDecision:
              evaluacion.aprobacionGestion.aprobacionGestion.observacionDecision,
            generadaEn:
              evaluacion.aprobacionGestion.aprobacionGestion.generadaEn.toISOString(),
            decididaEn: serializarFecha(
              evaluacion.aprobacionGestion.aprobacionGestion.decididaEn
            ),
            decididaPor:
              evaluacion.aprobacionGestion.aprobacionGestion.decididaPor,
          }
        : null,
    marcadaRevisionTecnica:
      incluirRevisionTecnica
        ? evaluacion.marcadaRevisionTecnica
        : false,
    motivoRevisionTecnica:
      incluirRevisionTecnica
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
            revisadaPor:
              evaluacion.revisionTecnica.revisadaPor,
          }
        : null,
    creadaEn: evaluacion.createdAt.toISOString(),
    actualizadaEn: evaluacion.updatedAt.toISOString(),
    gestion: {
      id: evaluacion.gestion.id,
      fechaGestion:
        evaluacion.gestion.fechaGestion.toISOString(),
      tipoActividad: evaluacion.gestion.tipoActividad,
      estado: evaluacion.gestion.estado,
    },
  };
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

async function consultarTareas(
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
      {
        orden: "asc",
      },
      {
        id: "asc",
      },
    ],
    include: inclusionTareasMatriz,
  });
}

async function obtenerTareasCacheadas(
  versionSupermatrizId: number
): Promise<{
  tareas: TareaMatriz[];
  cacheHit: boolean;
}> {
  const ahora = Date.now();
  const existente = cacheEstructura.get(
    versionSupermatrizId
  );

  if (existente && existente.venceEn > ahora) {
    return {
      tareas: existente.tareas,
      cacheHit: true,
    };
  }

  let carga = cargasEstructura.get(versionSupermatrizId);

  if (!carga) {
    carga = consultarTareas(versionSupermatrizId);
    cargasEstructura.set(versionSupermatrizId, carga);
  }

  try {
    const tareas = await carga;
    cacheEstructura.set(versionSupermatrizId, {
      tareas,
      venceEn:
        Date.now() +
        ttlValido(
          CACHE_ESTRUCTURA_MS,
          10 * 60 * 1000
        ),
    });

    return {
      tareas,
      cacheHit: false,
    };
  } finally {
    cargasEstructura.delete(versionSupermatrizId);
  }
}

async function consultarCategoriasGestion(): Promise<
  CategoriaGestionMatriz[]
> {
  return prisma.categoriaGestion.findMany({
    where: {
      estado: EstadoRegistro.ACTIVO,
    },
    orderBy: {
      id: "asc",
    },
    select: seleccionCategoriasGestion,
  });
}

async function obtenerCategoriasCacheadas(): Promise<{
  categorias: CategoriaGestionMatriz[];
  cacheHit: boolean;
}> {
  const ahora = Date.now();

  if (
    cacheCategorias &&
    cacheCategorias.venceEn > ahora
  ) {
    return {
      categorias: cacheCategorias.categorias,
      cacheHit: true,
    };
  }

  if (!cargaCategorias) {
    cargaCategorias = consultarCategoriasGestion();
  }

  try {
    const categorias = await cargaCategorias;
    cacheCategorias = {
      categorias,
      venceEn:
        Date.now() +
        ttlValido(
          CACHE_CATEGORIAS_MS,
          10 * 60 * 1000
        ),
    };

    return {
      categorias,
      cacheHit: false,
    };
  } finally {
    cargaCategorias = null;
  }
}

async function buscarGestionActiva(
  periodoId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const esProfesionalOperativo =
    (usuario.rol === RolUsuario.PROFESIONAL ||
      usuario.rol === RolUsuario.COORDINADOR) &&
    Boolean(usuario.profesionalId);

  return prisma.gestionSgsst.findFirst({
    where: {
      empresaPeriodoId: periodoId,
      estado: EstadoGestionSgsst.BORRADOR,
      valida: true,
      ...(esProfesionalOperativo
        ? {
            participantes: {
              some: {
                profesionalId: usuario.profesionalId!,
                activo: true,
              },
            },
          }
        : {
            usuarioCreadorId: usuario.usuarioId,
          }),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      fechaGestion: true,
      modalidad: true,
      tipoActividad: true,
      observacionGeneral: true,
      estado: true,
      categoriaGestion: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
        },
      },
      profesional: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
        },
      },
      participantes: {
        where: usuario.profesionalId
          ? {
              profesionalId: usuario.profesionalId,
              activo: true,
            }
          : {
              id: "__sin_participacion__",
            },
        select: {
          id: true,
          esLider: true,
          puedeEvaluar: true,
          puedeGestionarEvidencias: true,
        },
        take: 1,
      },
    },
  });
}

async function buscarEvaluacionesFinalizadas(
  periodoId: string
): Promise<EvaluacionMatriz[]> {
  return prisma.evaluacionAspecto.findMany({
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
    select: seleccionEvaluacionMatriz,
  });
}

async function buscarEvaluacionesBorrador(
  gestionId: string
): Promise<EvaluacionMatriz[]> {
  return prisma.evaluacionAspecto.findMany({
    where: {
      gestionId,
    },
    select: seleccionEvaluacionMatriz,
  });
}

export const servicioMatrizEvaluacionOptimizada = {
  obtenerContexto: async (
    empresaId: string,
    anio: number,
    usuario: UsuarioSesionEvaluacion
  ) => {
    validarAnio(anio);

    const inicioTotal = process.hrtime.bigint();
    const inicioInicial = process.hrtime.bigint();

    const [empresa, periodo, categoriasResultado] =
      await Promise.all([
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
            fechaApertura: true,
            fechaCierre: true,
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
        obtenerCategoriasCacheadas(),
      ]);

    const inicialMs = milisegundosDesde(inicioInicial);
    const esCliente =
      usuario.rol === "ADMIN_CLIENTE" ||
      usuario.rol === "USUARIO_CLIENTE";

    let versionDisponible: {
      id: number;
      nombre: string;
      estado: string;
      vigenteDesde: Date | null;
      vigenteHasta: Date | null;
    } | null = null;

    if (!periodo) {
      try {
        versionDisponible =
          await servicioPeriodosEvaluacion.obtenerVersionDisponible(
            anio
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
    }

    const versionSupermatrizId =
      periodo?.versionSupermatrizId ??
      versionDisponible?.id ??
      null;

    if (!versionSupermatrizId) {
      return {
        empresa,
        anio,
        periodo: null,
        versionDisponible: null,
        gestionActiva: null,
        categoriasGestion: categoriasResultado.categorias,
        filas: [],
        resumen: {
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
        },
      };
    }

    const inicioPrincipal = process.hrtime.bigint();

    const [
      gestionActiva,
      estructuraResultado,
      evaluacionesFinalizadas,
    ] = await Promise.all([
      periodo
        ? buscarGestionActiva(periodo.id, usuario)
        : Promise.resolve(null),
      obtenerTareasCacheadas(versionSupermatrizId),
      periodo
        ? buscarEvaluacionesFinalizadas(periodo.id)
        : Promise.resolve([] as EvaluacionMatriz[]),
    ]);

    const principalMs = milisegundosDesde(inicioPrincipal);
    const inicioBorrador = process.hrtime.bigint();

    const evaluacionesBorrador = gestionActiva
      ? await buscarEvaluacionesBorrador(
          gestionActiva.id
        )
      : [];

    const borradorMs = milisegundosDesde(inicioBorrador);
    const inicioArmado = process.hrtime.bigint();

    const ultimaPorAspecto = new Map<
      number,
      EvaluacionMatriz
    >();

    for (const evaluacion of evaluacionesFinalizadas) {
      if (!ultimaPorAspecto.has(evaluacion.aspectoId)) {
        ultimaPorAspecto.set(
          evaluacion.aspectoId,
          evaluacion
        );
      }
    }

    const borradorPorAspecto = new Map<
      number,
      EvaluacionMatriz
    >(
      evaluacionesBorrador.map((evaluacion) => [
        evaluacion.aspectoId,
        evaluacion,
      ])
    );

    const filas = estructuraResultado.tareas.map((tarea) => {
      const ultimaEvaluacion =
        ultimaPorAspecto.get(tarea.aspectoId) ?? null;
      const evaluacionGestionActiva =
        borradorPorAspecto.get(tarea.aspectoId) ?? null;
      const esEvergreen =
        tarea.aspecto.configuracion?.esEvergreen ?? false;
      const evaluacionParaVista =
        evaluacionGestionActiva ?? ultimaEvaluacion;

      const detalleVigencia = resolverVigenciaEvaluacion({
        evaluacion: evaluacionParaVista,
        configuracion:
          tarea.aspecto.configuracionVigencia,
        esEvergreen,
        provisional: Boolean(
          evaluacionGestionActiva
        ),
      });

      const detalleVigenciaOficial =
        resolverVigenciaEvaluacion({
          evaluacion: ultimaEvaluacion,
          configuracion:
            tarea.aspecto.configuracionVigencia,
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
          tarea.aspecto.estandar.categoriaEstandar
            .cicloPhva,
        categoriaEstandar: {
          id: tarea.aspecto.estandar.categoriaEstandar.id,
          codigo:
            tarea.aspecto.estandar.categoriaEstandar.codigo,
          nombre:
            tarea.aspecto.estandar.categoriaEstandar.nombre,
        },
        estandar: {
          id: tarea.aspecto.estandar.id,
          codigo: tarea.aspecto.estandar.codigo,
          nombre: tarea.aspecto.estandar.nombre,
          calificacionMinisterialEsperada:
            tarea.aspecto.estandar
              .calificacionMinisterialEsperada?.toNumber() ??
            0.5,
          gruposMinisteriales:
            tarea.aspecto.estandar.gruposMinisteriales.map(
              ({ grupoMinisterial }) => grupoMinisterial
            ),
        },
        aspecto: {
          id: tarea.aspecto.id,
          codigo: tarea.aspecto.codigo,
          nombre: tarea.aspecto.nombre,
          planAccionEspecifico:
            tarea.aspecto.planAccionEspecifico
              ?.descripcion ?? null,
          configuracion: tarea.aspecto.configuracion,
          configuracionVigencia:
            tarea.aspecto.configuracionVigencia,
          configuracionEvidencia:
            tarea.aspecto.configuracionEvidencia,
          configuracionRevision:
            tarea.aspecto.configuracionRevision,
        },
        ultimaEvaluacion: ultimaEvaluacion
          ? serializarEvaluacion(
              ultimaEvaluacion,
              !esCliente
            )
          : null,
        evaluacionGestionActiva: evaluacionGestionActiva
          ? serializarEvaluacion(
              evaluacionGestionActiva,
              !esCliente
            )
          : null,
        estadoVigencia: detalleVigencia.estado,
        detalleVigencia:
          serializarDetalleVigencia(detalleVigencia),
        estadoVigenciaOficial:
          detalleVigenciaOficial.estado,
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
    const evaluadas = filasAspectos.filter(
      (fila) => Boolean(fila.ultimaEvaluacion)
    );

    const promedioAdministrativo =
      evaluadas.length > 0
        ? evaluadas.reduce(
            (acumulado, fila) =>
              acumulado +
              (fila.ultimaEvaluacion
                ?.calificacionEfectiva ?? 0),
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
        esperada:
          fila.estandar.calificacionMinisterialEsperada,
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

          const resultado =
            resolverResultadoEfectivoEvaluacion(evaluacion);

          return (
            !resultado.provisional &&
            resultado.calificacion === 5
          );
        }
      );

      if (cumpleCompleto) {
        calificacionMinisterial += estandar.esperada;
      }
    }

    const contarVigencia = (
      estado: (typeof filasAspectos)[number]["estadoVigenciaOficial"]
    ) =>
      filasAspectos.filter(
        (fila) =>
          fila.estadoVigenciaOficial === estado
      ).length;

    const armadoMs = milisegundosDesde(inicioArmado);
    const totalMs = milisegundosDesde(inicioTotal);

    if (totalMs >= 750) {
      console.info(
        "[rendimiento] contexto-evaluacion-etapas",
        {
          empresaId,
          anio,
          inicialMs,
          principalMs,
          borradorMs,
          armadoMs,
          totalMs,
          estructuraCacheHit:
            estructuraResultado.cacheHit,
          categoriasCacheHit:
            categoriasResultado.cacheHit,
          totalFilas: filas.length,
          evaluacionesFinalizadas:
            evaluacionesFinalizadas.length,
          evaluacionesBorrador:
            evaluacionesBorrador.length,
        }
      );
    }

    const participacionActual =
      gestionActiva?.participantes[0] ?? null;

    return {
      empresa,
      anio,
      periodo: periodo
        ? {
            id: periodo.id,
            anio: periodo.anio,
            estado: periodo.estado,
            fechaApertura:
              periodo.fechaApertura.toISOString(),
            fechaCierre: serializarFecha(
              periodo.fechaCierre
            ),
            versionSupermatriz:
              periodo.versionSupermatriz,
          }
        : null,
      versionDisponible: versionDisponible
        ? {
            ...versionDisponible,
            vigenteDesde: serializarFecha(
              versionDisponible.vigenteDesde
            ),
            vigenteHasta: serializarFecha(
              versionDisponible.vigenteHasta
            ),
          }
        : null,
      gestionActiva: gestionActiva
        ? {
            id: gestionActiva.id,
            fechaGestion:
              gestionActiva.fechaGestion.toISOString(),
            modalidad: gestionActiva.modalidad,
            tipoActividad: gestionActiva.tipoActividad,
            observacionGeneral:
              gestionActiva.observacionGeneral,
            estado: gestionActiva.estado,
            categoriaGestion:
              gestionActiva.categoriaGestion,
            profesional: gestionActiva.profesional,
            participacionActual,
          }
        : null,
      categoriasGestion: categoriasResultado.categorias,
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
          contarVigencia(
            "PERIODICIDAD_NO_CONFIGURADA"
          ),
        cumplimientoAdministrativo: Number(
          promedioAdministrativo.toFixed(2)
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
