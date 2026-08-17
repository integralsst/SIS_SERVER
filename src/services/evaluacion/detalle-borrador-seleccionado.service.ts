import {
  EstadoGestionSgsst,
  EstadoRegistro,
  Prisma,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import { resolverBorradorSeleccionado } from "./borrador-seleccionado.service";

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

type EvaluacionDetalle = Prisma.EvaluacionAspectoGetPayload<{
  include: typeof inclusionEvaluacionDetalle;
}>;

function usuarioEsCliente(
  usuario: UsuarioSesionEvaluacion
): boolean {
  return (
    usuario.rol === RolUsuario.ADMIN_CLIENTE ||
    usuario.rol === RolUsuario.USUARIO_CLIENTE
  );
}

function serializarFecha(
  value: Date | null | undefined
): string | null {
  return value ? value.toISOString() : null;
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

async function resolverPeriodoYTarea(
  empresaId: string,
  tareaId: number,
  anio: number
) {
  const periodo = await prisma.empresaPeriodo.findUnique({
    where: {
      empresaId_anio: {
        empresaId,
        anio,
      },
    },
    select: {
      id: true,
      versionSupermatrizId: true,
    },
  });

  if (!periodo) {
    throw new ErrorEvaluacion(
      "El periodo seleccionado todavía no está abierto.",
      404,
      "PERIODO_NO_ENCONTRADO"
    );
  }

  const tarea = await prisma.supermatrizTarea.findFirst({
    where: {
      id: tareaId,
      versionSupermatrizId: periodo.versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
    },
    select: {
      aspectoId: true,
      aspecto: {
        select: {
          codigo: true,
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

  return {
    periodo,
    tarea,
  };
}

async function buscarEvaluacionBorrador(
  gestionId: string | null,
  aspectoId: number
): Promise<EvaluacionDetalle | null> {
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
  codigo: string | null
): Promise<EvaluacionDetalle | null> {
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
    include: inclusionEvaluacionDetalle,
  });
}

function serializarEvaluacionDetalle(
  evaluacion: EvaluacionDetalle
) {
  return {
    id: evaluacion.id,
    estadoCumplimiento: evaluacion.estadoCumplimiento,
    calificacionAdministrativa:
      evaluacion.calificacionAdministrativa.toNumber(),
    observacion: evaluacion.observacion,
    fechaDocumento: serializarFecha(evaluacion.fechaDocumento),
    fechaVencimientoCalculada: serializarFecha(
      evaluacion.fechaVencimientoCalculada
    ),
    justificacionNoAplica: evaluacion.justificacionNoAplica,
    marcadaRevisionTecnica:
      evaluacion.marcadaRevisionTecnica,
    motivoRevisionTecnica:
      evaluacion.motivoRevisionTecnica,
    revisionTecnica: evaluacion.revisionTecnica
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
    anio: evaluacion.gestion.empresaPeriodo.anio,
    gestion: {
      id: evaluacion.gestion.id,
      fechaGestion:
        evaluacion.gestion.fechaGestion.toISOString(),
      tipoActividad: evaluacion.gestion.tipoActividad,
      modalidad: evaluacion.gestion.modalidad,
      categoriaGestion:
        evaluacion.gestion.categoriaGestion?.nombre ?? null,
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

export const servicioDetalleBorradorSeleccionado = {
  obtenerEvidencias: async (
    empresaId: string,
    tareaId: number,
    anio: number,
    usuario: UsuarioSesionEvaluacion,
    gestionId?: string | null
  ) => {
    const { periodo, tarea } = await resolverPeriodoYTarea(
      empresaId,
      tareaId,
      anio
    );
    const gestion = await resolverBorradorSeleccionado(
      periodo.id,
      usuario,
      gestionId
    );
    const [evaluacionBorrador, ultimaFinalizada] =
      await Promise.all([
        buscarEvaluacionBorrador(
          gestion?.id ?? null,
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
                  ? { visibleCliente: true }
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
              ? { visibleCliente: true }
              : {}),
            compromiso: {
              empresaId,
              ...(tarea.aspecto.codigo
                ? {
                    OR: [
                      {
                        aspectoCodigo: tarea.aspecto.codigo,
                      },
                      {
                        aspecto: {
                          codigo: tarea.aspecto.codigo,
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
        visibleCliente: evidencia.visibleCliente,
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
          visibleCliente: evidencia.visibleCliente,
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
    usuario: UsuarioSesionEvaluacion,
    gestionId?: string | null
  ) => {
    if (usuarioEsCliente(usuario)) {
      return {
        evaluaciones: [],
      };
    }

    const { periodo, tarea } = await resolverPeriodoYTarea(
      empresaId,
      tareaId,
      anio
    );
    const gestion = await resolverBorradorSeleccionado(
      periodo.id,
      usuario,
      gestionId
    );

    const [evaluacionBorrador, historial] =
      await Promise.all([
        buscarEvaluacionBorrador(
          gestion?.id ?? null,
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
      evaluaciones: evaluaciones.map(
        serializarEvaluacionDetalle
      ),
    };
  },
};
