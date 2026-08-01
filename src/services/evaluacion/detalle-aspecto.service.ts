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

export const servicioDetalleAspecto = {
  obtener: async (
    empresaId: string,
    tareaId: number,
    anio: number,
    usuario: UsuarioSesionEvaluacion
  ) => {
    validarAnio(anio);

    const empresa = await asegurarAccesoEmpresa(
      usuario,
      empresaId,
      "LECTURA"
    );

    const periodo =
      await prisma.empresaPeriodo.findUnique({
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
      });

    if (!periodo) {
      throw new ErrorEvaluacion(
        "El periodo seleccionado todavía no está abierto.",
        404,
        "PERIODO_NO_ENCONTRADO"
      );
    }

    const tarea =
      await prisma.supermatrizTarea.findFirst({
        where: {
          id: tareaId,
          versionSupermatrizId:
            periodo.versionSupermatrizId,
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

    const gestionActiva =
      await prisma.gestionSgsst.findFirst({
        where: {
          empresaPeriodoId: periodo.id,
          usuarioCreadorId: usuario.usuarioId,
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

    const evaluacionBorrador = gestionActiva
      ? await prisma.evaluacionAspecto.findUnique({
          where: {
            gestionId_aspectoId: {
              gestionId: gestionActiva.id,
              aspectoId: tarea.aspectoId,
            },
          },
          include: {
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
              },
            },
            usuarioRegistrador: {
              select: {
                nombre: true,
              },
            },
            evidencias: {
              where: {
                activo: true,
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
            },
          },
        })
      : null;

    const filtroAspectoHistorico: Prisma.EvaluacionAspectoWhereInput = tarea.aspecto.codigo
      ? {
          aspecto: {
            codigo: tarea.aspecto.codigo,
          },
        }
      : {
          aspectoId: tarea.aspectoId,
        };

    const historial =
      await prisma.evaluacionAspecto.findMany({
        where: {
          ...filtroAspectoHistorico,
          gestion: {
            valida: true,
            estado: EstadoGestionSgsst.FINALIZADA,
            empresaPeriodo: {
              empresaId,
            },
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
        include: {
          aspecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
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
            },
          },
          usuarioRegistrador: {
            select: {
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
        },
      });

    const ultimaFinalizada = historial[0] ?? null;
    const evaluacionObjetivo =
      evaluacionBorrador ?? ultimaFinalizada;

    const esCliente =
      usuario.rol === RolUsuario.ADMIN_CLIENTE ||
      usuario.rol === RolUsuario.USUARIO_CLIENTE;

    const evidencias = evaluacionObjetivo
      ? await prisma.evidenciaEvaluacion.findMany({
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
      : [];

    const detalleVigenciaActual =
      resolverVigenciaEvaluacion({
        evaluacion: evaluacionObjetivo,
        configuracion:
          tarea.aspecto.configuracionVigencia,
        esEvergreen:
          tarea.aspecto.configuracion
            ?.esEvergreen ?? false,
        provisional: Boolean(evaluacionBorrador),
      });

    type EvaluacionDetalleInput =
      | NonNullable<typeof evaluacionBorrador>
      | NonNullable<typeof ultimaFinalizada>;

    const serializarEvaluacionDetalle = (
      evaluacion: EvaluacionDetalleInput
    ) => {
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
          evaluacion.marcadaRevisionTecnica,
        creadaEn: evaluacion.createdAt.toISOString(),
        actualizadaEn:
          evaluacion.updatedAt.toISOString(),
        anio:
          evaluacion.gestion.empresaPeriodo.anio,
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
        },
        usuarioRegistrador:
          evaluacion.usuarioRegistrador.nombre,
      };
    };

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
            tarea.aspecto
              .configuracionTareaCotidiana,
          configuracionEvidencia:
            tarea.aspecto
              .configuracionEvidencia,
          configuracionRevision:
            tarea.aspecto
              .configuracionRevision,
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
                    .categoriaEstandar.cicloPhva
                    .codigo,
                nombre:
                  tarea.aspecto.estandar
                    .categoriaEstandar.cicloPhva
                    .nombre,
              },
            },
          },
        },
      },
      evaluacionBorrador: evaluacionBorrador
        ? serializarEvaluacionDetalle(evaluacionBorrador)
        : null,
      ultimaEvaluacion: ultimaFinalizada
        ? serializarEvaluacionDetalle(ultimaFinalizada)
        : null,
      detalleVigencia:
        serializarDetalleVigencia(
          detalleVigenciaActual
        ),
      historial: historial.map((evaluacion) => ({
        ...serializarEvaluacionDetalle(
          evaluacion
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
      evidenciaObjetivo: evaluacionObjetivo
        ? {
            evaluacionId: evaluacionObjetivo.id,
            esBorrador: Boolean(
              evaluacionBorrador
            ),
          }
        : null,
      permisos: {
        puedeGestionarEvidencias: Boolean(
          evaluacionBorrador
        ),
        motivoEvidencias: evaluacionBorrador
          ? null
          : ultimaFinalizada
            ? "Las evidencias de una gestión finalizada son de solo lectura. Crea una nueva gestión y guarda una evaluación para agregar soportes nuevos."
            : "Primero guarda la evaluación del aspecto dentro de la gestión actual para poder agregar evidencias.",
      },
    };
  },
};
