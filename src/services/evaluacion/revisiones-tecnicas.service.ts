import {
  EstadoGestionSgsst,
  EstadoRevisionTecnica,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  ResolverRevisionTecnicaInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import {
  comoJsonPrismaEvaluacion,
  ErrorEvaluacion,
} from "../../utils/evaluacion";
import {
  asegurarAccesoGestion,
  asegurarAccesoPeriodo,
} from "./acceso-evaluacion.service";

const ROLES_RESOLUCION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
];

const ORDEN_ESTADO: Record<EstadoRevisionTecnica, number> = {
  [EstadoRevisionTecnica.PENDIENTE]: 0,
  [EstadoRevisionTecnica.REQUIERE_AJUSTES]: 1,
  [EstadoRevisionTecnica.APROBADA]: 2,
  [EstadoRevisionTecnica.ANULADA]: 3,
};

function serializarFecha(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function nombreProfesional(
  profesional: {
    nombres: string;
    apellidos: string;
  } | null,
  fallback: string
): string {
  if (!profesional) {
    return fallback;
  }

  return `${profesional.nombres} ${profesional.apellidos}`.trim();
}

function validarResolucion(
  data: ResolverRevisionTecnicaInput
): {
  estado: ResolverRevisionTecnicaInput["estado"];
  conceptoTecnico: string;
} {
  if (
    data.estado !== EstadoRevisionTecnica.APROBADA &&
    data.estado !== EstadoRevisionTecnica.REQUIERE_AJUSTES
  ) {
    throw new ErrorEvaluacion(
      "El resultado de la revisión debe ser Aprobada o Requiere ajustes.",
      400,
      "ESTADO_REVISION_INVALIDO"
    );
  }

  const conceptoTecnico = data.conceptoTecnico?.trim();

  if (!conceptoTecnico) {
    throw new ErrorEvaluacion(
      "Debes registrar el concepto técnico de la revisión.",
      400,
      "CONCEPTO_TECNICO_OBLIGATORIO"
    );
  }

  if (conceptoTecnico.length < 10) {
    throw new ErrorEvaluacion(
      "El concepto técnico debe tener al menos 10 caracteres.",
      400,
      "CONCEPTO_TECNICO_CORTO"
    );
  }

  if (conceptoTecnico.length > 5000) {
    throw new ErrorEvaluacion(
      "El concepto técnico no puede superar los 5000 caracteres.",
      400,
      "CONCEPTO_TECNICO_LARGO"
    );
  }

  return {
    estado: data.estado,
    conceptoTecnico,
  };
}

export const servicioRevisionesTecnicas = {
  listarPeriodo: async (
    periodoId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const periodo = await asegurarAccesoPeriodo(
      usuario,
      periodoId,
      "LECTURA"
    );

    if (
      usuario.rol === RolUsuario.ADMIN_CLIENTE ||
      usuario.rol === RolUsuario.USUARIO_CLIENTE
    ) {
      throw new ErrorEvaluacion(
        "Las revisiones técnicas son un flujo interno de trabajo.",
        403,
        "REVISION_TECNICA_SOLO_INTERNA"
      );
    }

    const revisiones =
      await prisma.revisionTecnicaEvaluacion.findMany({
        where: {
          evaluacion: {
            gestion: {
              empresaPeriodoId: periodoId,
            },
          },
        },
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
          evaluacion: {
            include: {
              aspecto: {
                include: {
                  estandar: {
                    select: {
                      id: true,
                      codigo: true,
                      nombre: true,
                    },
                  },
                },
              },
              gestion: {
                include: {
                  profesional: {
                    select: {
                      id: true,
                      nombres: true,
                      apellidos: true,
                    },
                  },
                  usuarioCreador: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                  categoriaGestion: {
                    select: {
                      id: true,
                      codigo: true,
                      nombre: true,
                    },
                  },
                },
              },
              evidencias: {
                where: {
                  activo: true,
                },
                orderBy: {
                  createdAt: "desc",
                },
                select: {
                  id: true,
                  nombre: true,
                  url: true,
                  descripcion: true,
                  fechaDocumento: true,
                  visibleCliente: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

    const puedeResolverRol = ROLES_RESOLUCION.includes(
      usuario.rol
    );

    const items = revisiones
      .map((revision) => ({
        id: revision.id,
        estado: revision.estado,
        motivoSolicitud: revision.motivoSolicitud,
        conceptoTecnico: revision.conceptoTecnico,
        motivoAnulacion: revision.motivoAnulacion,
        solicitadaEn: revision.solicitadaEn.toISOString(),
        revisadaEn: serializarFecha(revision.revisadaEn),
        anuladaEn: serializarFecha(revision.anuladaEn),
        createdAt: revision.createdAt.toISOString(),
        updatedAt: revision.updatedAt.toISOString(),
        solicitadaPor: revision.solicitadaPor,
        revisadaPor: revision.revisadaPor,
        puedeResolver:
          puedeResolverRol &&
          revision.solicitadaPorUsuarioId !== usuario.usuarioId &&
          revision.evaluacion.usuarioRegistradorId !==
            usuario.usuarioId &&
          revision.estado === EstadoRevisionTecnica.PENDIENTE &&
          revision.evaluacion.gestion.estado ===
            EstadoGestionSgsst.FINALIZADA &&
          revision.evaluacion.gestion.valida,
        evaluacion: {
          id: revision.evaluacion.id,
          estadoCumplimiento:
            revision.evaluacion.estadoCumplimiento,
          calificacionAdministrativa:
            revision.evaluacion.calificacionAdministrativa.toNumber(),
          observacion: revision.evaluacion.observacion,
          fechaDocumento: serializarFecha(
            revision.evaluacion.fechaDocumento
          ),
          fechaVencimientoCalculada: serializarFecha(
            revision.evaluacion.fechaVencimientoCalculada
          ),
          aspecto: {
            id: revision.evaluacion.aspecto.id,
            codigo: revision.evaluacion.aspecto.codigo,
            nombre: revision.evaluacion.aspecto.nombre,
            estandar: revision.evaluacion.aspecto.estandar,
          },
          gestion: {
            id: revision.evaluacion.gestion.id,
            fechaGestion:
              revision.evaluacion.gestion.fechaGestion.toISOString(),
            modalidad: revision.evaluacion.gestion.modalidad,
            tipoActividad:
              revision.evaluacion.gestion.tipoActividad,
            estado: revision.evaluacion.gestion.estado,
            valida: revision.evaluacion.gestion.valida,
            categoriaGestion:
              revision.evaluacion.gestion.categoriaGestion,
            profesional: nombreProfesional(
              revision.evaluacion.gestion.profesional,
              revision.evaluacion.gestion.usuarioCreador.nombre
            ),
          },
          evidencias: revision.evaluacion.evidencias.map(
            (evidencia) => ({
              id: evidencia.id,
              nombre: evidencia.nombre,
              url: evidencia.url,
              descripcion: evidencia.descripcion,
              fechaDocumento: serializarFecha(
                evidencia.fechaDocumento
              ),
              visibleCliente: evidencia.visibleCliente,
              createdAt: evidencia.createdAt.toISOString(),
            })
          ),
        },
      }))
      .sort((a, b) => {
        const diferenciaEstado =
          ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado];

        if (diferenciaEstado !== 0) {
          return diferenciaEstado;
        }

        return (
          new Date(b.solicitadaEn).getTime() -
          new Date(a.solicitadaEn).getTime()
        );
      });

    const resumen = {
      total: items.length,
      pendientes: items.filter(
        (item) =>
          item.estado === EstadoRevisionTecnica.PENDIENTE
      ).length,
      aprobadas: items.filter(
        (item) => item.estado === EstadoRevisionTecnica.APROBADA
      ).length,
      requierenAjustes: items.filter(
        (item) =>
          item.estado ===
          EstadoRevisionTecnica.REQUIERE_AJUSTES
      ).length,
      anuladas: items.filter(
        (item) => item.estado === EstadoRevisionTecnica.ANULADA
      ).length,
    };

    return {
      periodo: {
        id: periodo.id,
        anio: periodo.anio,
        estado: periodo.estado,
        empresa: periodo.empresa,
      },
      resumen,
      revisiones: items,
    };
  },

  resolver: async (
    revisionId: string,
    data: ResolverRevisionTecnicaInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    if (!ROLES_RESOLUCION.includes(usuario.rol)) {
      throw new ErrorEvaluacion(
        "Tu rol no puede resolver revisiones técnicas.",
        403,
        "ROL_SIN_PERMISO_REVISION"
      );
    }

    const resolucion = validarResolucion(data);

    const revision =
      await prisma.revisionTecnicaEvaluacion.findUnique({
        where: {
          id: revisionId,
        },
        include: {
          evaluacion: {
            include: {
              gestion: true,
              aspecto: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
      });

    if (!revision) {
      throw new ErrorEvaluacion(
        "La revisión técnica seleccionada no existe.",
        404,
        "REVISION_TECNICA_NO_ENCONTRADA"
      );
    }

    await asegurarAccesoGestion(
      usuario,
      revision.evaluacion.gestionId,
      "ESCRITURA"
    );

    if (
      revision.solicitadaPorUsuarioId === usuario.usuarioId ||
      revision.evaluacion.usuarioRegistradorId === usuario.usuarioId
    ) {
      throw new ErrorEvaluacion(
        "No puedes emitir el concepto técnico de una evaluación que registraste o cuya revisión solicitaste.",
        403,
        "REVISION_TECNICA_SIN_SEPARACION_FUNCIONES"
      );
    }

    if (
      revision.estado !== EstadoRevisionTecnica.PENDIENTE
    ) {
      throw new ErrorEvaluacion(
        "La revisión técnica ya fue resuelta o anulada.",
        409,
        "REVISION_TECNICA_NO_PENDIENTE"
      );
    }

    if (
      revision.evaluacion.gestion.estado !==
        EstadoGestionSgsst.FINALIZADA ||
      !revision.evaluacion.gestion.valida
    ) {
      throw new ErrorEvaluacion(
        "Solo se pueden resolver revisiones de gestiones finalizadas y válidas.",
        409,
        "GESTION_REVISION_NO_VALIDA"
      );
    }

    const revisadaEn = new Date();

    return prisma.$transaction(async (tx) => {
      const actualizadas =
        await tx.revisionTecnicaEvaluacion.updateMany({
          where: {
            id: revisionId,
            estado: EstadoRevisionTecnica.PENDIENTE,
          },
          data: {
            estado: resolucion.estado,
            conceptoTecnico: resolucion.conceptoTecnico,
            revisadaPorUsuarioId: usuario.usuarioId,
            revisadaEn,
          },
        });

      if (actualizadas.count !== 1) {
        throw new ErrorEvaluacion(
          "La revisión cambió antes de completar la operación. Recarga la página.",
          409,
          "REVISION_MODIFICADA_CONCURRENTEMENTE"
        );
      }

      await tx.historialEvaluacion.create({
        data: {
          gestionId: revision.evaluacion.gestionId,
          evaluacionId: revision.evaluacionId,
          usuarioId: usuario.usuarioId,
          accion: "RESOLVER_REVISION_TECNICA",
          descripcion:
            resolucion.estado === EstadoRevisionTecnica.APROBADA
              ? `Se aprobó la revisión técnica del aspecto ${revision.evaluacion.aspecto.nombre}.`
              : `La revisión técnica del aspecto ${revision.evaluacion.aspecto.nombre} requiere ajustes.`,
          datosAntes: comoJsonPrismaEvaluacion({
            estado: revision.estado,
            conceptoTecnico: revision.conceptoTecnico,
            revisadaPorUsuarioId:
              revision.revisadaPorUsuarioId,
            revisadaEn: revision.revisadaEn,
          }),
          datosDespues: comoJsonPrismaEvaluacion({
            estado: resolucion.estado,
            conceptoTecnico: resolucion.conceptoTecnico,
            revisadaPorUsuarioId: usuario.usuarioId,
            revisadaEn,
          }),
        },
      });

      return {
        id: revisionId,
        estado: resolucion.estado,
        conceptoTecnico: resolucion.conceptoTecnico,
        revisadaEn: revisadaEn.toISOString(),
        mensaje:
          resolucion.estado === EstadoRevisionTecnica.APROBADA
            ? "La revisión técnica fue aprobada."
            : "La revisión técnica quedó con ajustes requeridos. La evaluación finalizada no fue modificada; la corrección debe registrarse en una nueva gestión.",
      };
    });
  },
};
