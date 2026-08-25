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
import { resolverBorradorSeleccionado } from "./borrador-seleccionado.service";
import {
  construirCorteAnual,
  servicioPeriodosEvaluacion,
} from "./periodos-evaluacion.service";

const inclusionEvaluacionDetalle = {
  gestion: {
    include: {
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
          createdAt: "desc" as const,
        },
        take: 1,
        include: {
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
  usuarioRegistrador: {
    select: {
      nombre: true,
    },
  },
  revisionTecnica: {
    include: {
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
} satisfies Prisma.EvaluacionAspectoInclude;

const inclusionHistorial = {
  ...inclusionEvaluacionDetalle,
  aspecto: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  },
  evidencias: {
    where: {
      activo: true,
    },
    select: {
      id: true,
      visibleCliente: true,
    },
  },
} satisfies Prisma.EvaluacionAspectoInclude;

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
  identidadHistorica: string | null,
  codigo: string | null
): Prisma.EvaluacionAspectoWhereInput {
  if (identidadHistorica) {
    return {
      aspecto: {
        identidadHistorica,
      },
    };
  }

  if (codigo) {
    return {
      aspecto: {
        codigo,
      },
    };
  }

  return {
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
      include: {
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
          identidadHistorica: true,
          codigo: true,
          nombre: true,
          configuracion: true,
          configuracionVigencia: true,
          configuracionEvidencia: true,
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
      fechaGestion: true,
      tipoActividad: true,
      estado: true,
    },
  });
}

async function buscarEvaluacionBorrador(
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
    include: inclusionEvaluacionDetalle,
  });
}

async function buscarUltimaFinalizada(
  empresaId: string,
  aspectoId: number,
  identidadHistorica: string | null,
  codigo: string | null,
  fechaCorte: Date
) {
  return prisma.evaluacionAspecto.findFirst({
    where: {
      ...filtroAspectoHistorico(
        aspectoId,
        identidadHistorica,
        codigo
      ),
      gestion: {
        empresaPeriodo: {
          empresaId,
        },
        fechaGestion: {
          lte: fechaCorte,
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
      {
        id: "desc",
      },
    ],
    include: inclusionEvaluacionDetalle,
  });
}

function serializarEvaluacionDetalle(
  evaluacion: Prisma.EvaluacionAspectoGetPayload<{
    include: typeof inclusionEvaluacionDetalle;
  }>,
  esCliente: boolean
) {
  return {
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
    marcadaRevisionTecnica:
      esCliente
        ? false
        : evaluacion.marcadaRevisionTecnica,
    motivoRevisionTecnica:
      esCliente
        ? null
        : evaluacion.motivoRevisionTecnica,
    revisionTecnica:
      !esCliente && evaluacion.revisionTecnica
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
    usuarioRegistrador:
      evaluacion.usuarioRegistrador.nombre,
  };
}

export const servicioDetalleAspectoSecciones = {
  obtenerResumen: async (
    empresaId: string,
    tareaId: number,
    anio: number,
    usuario: UsuarioSesionEvaluacion,
    gestionId?: string | null
  ) => {
    const { empresa, periodo } =
      await resolverEmpresaPeriodo(
        empresaId,
        anio,
        usuario
      );

    const gestionActiva =
      await resolverBorradorSeleccionado(
        periodo.id,
        usuario,
        gestionId
      );
    const fechaCorte =
      gestionActiva?.fechaGestion ?? construirCorteAnual(anio);
    const versionAplicable =
      await servicioPeriodosEvaluacion.resolverVersionParaFecha(
        fechaCorte
      );

    const tarea = await prisma.supermatrizTarea.findFirst({
        where: {
          id: tareaId,
          versionSupermatrizId:
            versionAplicable.id,
          estado: EstadoRegistro.ACTIVO,
        },
        include: {
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
                  id: "asc",
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
        },
      });

    if (!tarea) {
      throw new ErrorEvaluacion(
        "La fila seleccionada no pertenece a la versión de este periodo.",
        404,
        "FILA_NO_ENCONTRADA"
      );
    }

    const [evaluacionBorrador, ultimaFinalizada] =
      await Promise.all([
        buscarEvaluacionBorrador(
          gestionActiva?.id,
          tarea.aspectoId
        ),
        buscarUltimaFinalizada(
          empresaId,
          tarea.aspectoId,
          tarea.aspecto.identidadHistorica,
          tarea.aspecto.codigo,
          fechaCorte
        ),
      ]);

    const esCliente = usuarioEsCliente(usuario);
    const evaluacionObjetivo =
      evaluacionBorrador ?? ultimaFinalizada;
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
          versionAplicable,
      },
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
      evaluacionBorrador: evaluacionBorrador
        ? serializarEvaluacionDetalle(
            evaluacionBorrador,
            esCliente
          )
        : null,
      ultimaEvaluacion: ultimaFinalizada
        ? serializarEvaluacionDetalle(
            ultimaFinalizada,
            esCliente
          )
        : null,
      detalleVigencia:
        serializarDetalleVigencia(detalleVigencia),
      evidenciaObjetivo: evaluacionObjetivo
        ? {
            evaluacionId: evaluacionObjetivo.id,
            esBorrador: Boolean(evaluacionBorrador),
          }
        : null,
      permisos: {
        puedeGestionarEvidencias: Boolean(
          evaluacionBorrador
        ),
        puedeVerRevisionTecnica: !esCliente,
        motivoEvidencias: evaluacionBorrador
          ? null
          : ultimaFinalizada
            ? "Las evidencias de una gestión finalizada son de solo lectura. Crea una nueva gestión y guarda una evaluación para agregar soportes nuevos."
            : "Primero guarda la evaluación del aspecto dentro de la gestión actual para poder agregar evidencias.",
      },
    };
  },

  obtenerHistorial: async (
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
    const fechaCorte = construirCorteAnual(anio);
    const versionAplicable =
      await servicioPeriodosEvaluacion.resolverVersionParaFecha(
        fechaCorte
      );
    const tarea = await resolverTareaMinima(
      tareaId,
      versionAplicable.id
    );
    const esCliente = usuarioEsCliente(usuario);

    const historial =
      await prisma.evaluacionAspecto.findMany({
        where: {
          ...filtroAspectoHistorico(
            tarea.aspectoId,
            tarea.aspecto.identidadHistorica,
            tarea.aspecto.codigo
          ),
          gestion: {
            empresaPeriodo: {
              empresaId,
            },
            fechaGestion: {
              lte: fechaCorte,
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
        take: 100,
        include: inclusionHistorial,
      });

    return {
      historial: historial.map((evaluacion) => ({
        ...serializarEvaluacionDetalle(
          evaluacion,
          esCliente
        ),
        aspectoVersion: {
          id: evaluacion.aspecto.id,
          codigo: evaluacion.aspecto.codigo,
          nombre: evaluacion.aspecto.nombre,
        },
        totalEvidencias: esCliente
          ? evaluacion.evidencias.filter(
              (evidencia) =>
                evidencia.visibleCliente
            ).length
          : evaluacion.evidencias.length,
      })),
    };
  },

  obtenerEvidencias: async (
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

    const [tarea, gestionActiva] = await Promise.all([
      resolverTareaMinima(
        tareaId,
        periodo.versionSupermatrizId
      ),
      buscarGestionActiva(
        periodo.id,
        usuario.usuarioId
      ),
    ]);

    const [evaluacionBorrador, ultimaFinalizada] =
      await Promise.all([
        buscarEvaluacionBorrador(
          gestionActiva?.id,
          tarea.aspectoId
        ),
        buscarUltimaFinalizada(
          empresaId,
          tarea.aspectoId,
          tarea.aspecto.codigo
        ),
      ]);

    const esCliente = usuarioEsCliente(usuario);
    const evaluacionObjetivo =
      evaluacionBorrador ?? ultimaFinalizada;

    const [evidencias, evidenciasCompromiso] =
      await Promise.all([
        evaluacionObjetivo
          ? prisma.evidenciaEvaluacion.findMany({
              where: {
                evaluacionId: evaluacionObjetivo.id,
                activo: true,
                ...(esCliente
                  ? {
                      visibleCliente: true,
                    }
                  : {}),
              },
              include: {
                usuarioCreador: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            })
          : Promise.resolve([]),
        prisma.compromisoEvidencia.findMany({
          where: {
            activa: true,
            ...(esCliente
              ? {
                  visibleCliente: true,
                }
              : {}),
            compromiso: {
              empresaId,
              ...(tarea.aspecto.codigo
                ? {
                    OR: [
                      {
                        aspectoCodigo:
                          tarea.aspecto.codigo,
                      },
                      {
                        aspecto: {
                          codigo:
                            tarea.aspecto.codigo,
                        },
                      },
                    ],
                  }
                : {
                    aspectoId: tarea.aspectoId,
                  }),
              ...(esCliente
                ? {
                    responsables: {
                      some: {
                        usuarioResponsableId:
                          usuario.usuarioId,
                      },
                    },
                  }
                : {}),
            },
          },
          select: {
            id: true,
            nombre: true,
            url: true,
            descripcion: true,
            fechaDocumento: true,
            visibleCliente: true,
            createdAt: true,
            creadoPor: {
              select: {
                id: true,
                nombre: true,
              },
            },
            compromiso: {
              select: {
                id: true,
                descripcion: true,
                estado: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
      ]);

    return {
      evidencias: evidencias.map((evidencia) => ({
        id: evidencia.id,
        evaluacionId: evidencia.evaluacionId,
        nombre: evidencia.nombre,
        url: evidencia.url,
        descripcion: evidencia.descripcion,
        fechaDocumento: serializarFecha(
          evidencia.fechaDocumento
        ),
        visibleCliente:
          evidencia.visibleCliente,
        activo: evidencia.activo,
        creadoPor: evidencia.usuarioCreador,
        createdAt: evidencia.createdAt.toISOString(),
        updatedAt: evidencia.updatedAt.toISOString(),
      })),
      evidenciasCompromiso:
        evidenciasCompromiso.map((evidencia) => ({
          id: evidencia.id,
          nombre: evidencia.nombre,
          url: evidencia.url,
          descripcion: evidencia.descripcion,
          fechaDocumento: serializarFecha(
            evidencia.fechaDocumento
          ),
          visibleCliente:
            evidencia.visibleCliente,
          createdAt: evidencia.createdAt.toISOString(),
          creadoPor: evidencia.creadoPor,
          compromiso: evidencia.compromiso,
        })),
      evidenciaObjetivo: evaluacionObjetivo
        ? {
            evaluacionId: evaluacionObjetivo.id,
            esBorrador: Boolean(evaluacionBorrador),
          }
        : null,
      permisos: {
        puedeGestionarEvidencias: Boolean(
          evaluacionBorrador
        ),
        puedeVerRevisionTecnica: !esCliente,
        motivoEvidencias: evaluacionBorrador
          ? null
          : ultimaFinalizada
            ? "Las evidencias de una gestión finalizada son de solo lectura. Crea una nueva gestión y guarda una evaluación para agregar soportes nuevos."
            : "Primero guarda la evaluación del aspecto dentro de la gestión actual para poder agregar evidencias.",
      },
    };
  },

  obtenerRevisionTecnica: async (
    empresaId: string,
    tareaId: number,
    anio: number,
    usuario: UsuarioSesionEvaluacion
  ) => {
    if (usuarioEsCliente(usuario)) {
      return {
        evaluaciones: [],
      };
    }

    const { periodo } = await resolverEmpresaPeriodo(
      empresaId,
      anio,
      usuario
    );

    const [tarea, gestionActiva] = await Promise.all([
      resolverTareaMinima(
        tareaId,
        periodo.versionSupermatrizId
      ),
      buscarGestionActiva(
        periodo.id,
        usuario.usuarioId
      ),
    ]);

    const [evaluacionBorrador, historial] =
      await Promise.all([
        buscarEvaluacionBorrador(
          gestionActiva?.id,
          tarea.aspectoId
        ),
        prisma.evaluacionAspecto.findMany({
          where: {
            ...filtroAspectoHistorico(
              tarea.aspectoId,
              tarea.aspecto.codigo
            ),
            gestion: {
              empresaPeriodo: {
                empresaId,
              },
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
            },
            OR: [
              {
                marcadaRevisionTecnica: true,
              },
              {
                revisionTecnica: {
                  isNot: null,
                },
              },
            ],
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
          take: 100,
          include: inclusionEvaluacionDetalle,
        }),
      ]);

    const evaluaciones = [
      ...(evaluacionBorrador &&
      (evaluacionBorrador.marcadaRevisionTecnica ||
        evaluacionBorrador.revisionTecnica)
        ? [evaluacionBorrador]
        : []),
      ...historial,
    ];

    return {
      evaluaciones: evaluaciones.map((evaluacion) =>
        serializarEvaluacionDetalle(
          evaluacion,
          false
        )
      ),
    };
  },
};
