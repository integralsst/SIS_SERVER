import {
  EstadoAprobacionGestion,
  EstadoGestionSgsst,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import type { DecidirAprobacionGestionInput } from "../../../types/evaluacion/aprobacion-gestion.types";
import type { UsuarioSesionEvaluacion } from "../../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../../utils/evaluacion";
import {
  asegurarAccesoEmpresa,
  asegurarAccesoPeriodo,
} from "../acceso-evaluacion.service";

const ROLES_ADMINISTRADOR: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

async function obtenerAprobacionCompleta(id: string) {
  return prisma.aprobacionGestion.findUnique({
    where: {
      id,
    },
    include: {
      decididaPor: {
        select: {
          id: true,
          nombre: true,
          correo: true,
        },
      },
      gestion: {
        include: {
          usuarioCreador: {
            select: {
              id: true,
              nombre: true,
              correo: true,
            },
          },
          profesional: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
            },
          },
          categoriaGestion: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
          empresaPeriodo: {
            include: {
              empresa: {
                select: {
                  id: true,
                  nit: true,
                  nombre: true,
                  activo: true,
                },
              },
            },
          },
        },
      },
      evaluaciones: {
        include: {
          evaluacion: {
            include: {
              aspecto: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  estandar: {
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
    },
  });
}

function serializarAprobacion(
  aprobacion: NonNullable<
    Awaited<ReturnType<typeof obtenerAprobacionCompleta>>
  >,
  usuario: UsuarioSesionEvaluacion
) {
  return {
    id: aprobacion.id,
    estado: aprobacion.estado,
    reglasAplicadas: aprobacion.reglasAplicadas,
    observacionDecision: aprobacion.observacionDecision,
    generadaEn: aprobacion.generadaEn.toISOString(),
    decididaEn:
      aprobacion.decididaEn?.toISOString() ?? null,
    decididaPor: aprobacion.decididaPor,
    puedeDecidir:
      ROLES_ADMINISTRADOR.includes(usuario.rol) &&
      aprobacion.estado ===
        EstadoAprobacionGestion.PENDIENTE &&
      aprobacion.gestion.usuarioCreadorId !==
        usuario.usuarioId,
    gestion: {
      id: aprobacion.gestion.id,
      fechaGestion:
        aprobacion.gestion.fechaGestion.toISOString(),
      modalidad: aprobacion.gestion.modalidad,
      tipoActividad: aprobacion.gestion.tipoActividad,
      observacionGeneral:
        aprobacion.gestion.observacionGeneral,
      usuarioCreador: aprobacion.gestion.usuarioCreador,
      profesional: aprobacion.gestion.profesional
        ? {
            id: aprobacion.gestion.profesional.id,
            nombre:
              `${aprobacion.gestion.profesional.nombres} ${aprobacion.gestion.profesional.apellidos}`.trim(),
          }
        : null,
      categoriaGestion:
        aprobacion.gestion.categoriaGestion,
      empresa:
        aprobacion.gestion.empresaPeriodo.empresa,
      anio: aprobacion.gestion.empresaPeriodo.anio,
    },
    evaluaciones: aprobacion.evaluaciones.map(
      ({ evaluacion }) => ({
        id: evaluacion.id,
        estadoCumplimiento:
          evaluacion.estadoCumplimiento,
        calificacionRegistrada:
          evaluacion.calificacionAdministrativa.toNumber(),
        observacion: evaluacion.observacion,
        aspecto: evaluacion.aspecto,
      })
    ),
  };
}

export const servicioAprobacionGestion = {
  listarPeriodo: async (
    periodoId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const periodo = await asegurarAccesoPeriodo(
      usuario,
      periodoId,
      "LECTURA"
    );

    const aprobaciones = await prisma.aprobacionGestion.findMany({
      where: {
        gestion: {
          empresaPeriodoId: periodoId,
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
        },
      },
      orderBy: {
        generadaEn: "desc",
      },
      include: {
        decididaPor: {
          select: {
            id: true,
            nombre: true,
            correo: true,
          },
        },
        gestion: {
          include: {
            usuarioCreador: {
              select: {
                id: true,
                nombre: true,
                correo: true,
              },
            },
            profesional: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
              },
            },
            categoriaGestion: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
              },
            },
            empresaPeriodo: {
              include: {
                empresa: {
                  select: {
                    id: true,
                    nit: true,
                    nombre: true,
                    activo: true,
                  },
                },
              },
            },
          },
        },
        evaluaciones: {
          include: {
            evaluacion: {
              include: {
                aspecto: {
                  select: {
                    id: true,
                    codigo: true,
                    nombre: true,
                    estandar: {
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
      },
    });

    const items = aprobaciones.map((aprobacion) =>
      serializarAprobacion(aprobacion, usuario)
    );

    return {
      periodo: {
        id: periodo.id,
        anio: periodo.anio,
        empresa: periodo.empresa,
      },
      resumen: {
        total: items.length,
        pendientes: items.filter(
          (item) =>
            item.estado === EstadoAprobacionGestion.PENDIENTE
        ).length,
        aprobadas: items.filter(
          (item) =>
            item.estado === EstadoAprobacionGestion.APROBADA
        ).length,
        rechazadas: items.filter(
          (item) =>
            item.estado === EstadoAprobacionGestion.RECHAZADA
        ).length,
      },
      items,
    };
  },

  decidir: async (
    aprobacionId: string,
    input: DecidirAprobacionGestionInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    if (!ROLES_ADMINISTRADOR.includes(usuario.rol)) {
      throw new ErrorEvaluacion(
        "Solo un administrador puede decidir gestiones sujetas a aprobación.",
        403,
        "APROBACION_GESTION_REQUIERE_ADMINISTRADOR"
      );
    }

    const actual = await obtenerAprobacionCompleta(aprobacionId);

    if (!actual) {
      throw new ErrorEvaluacion(
        "La aprobación de gestión no existe.",
        404,
        "APROBACION_GESTION_NO_ENCONTRADA"
      );
    }

    await asegurarAccesoEmpresa(
      usuario,
      actual.gestion.empresaPeriodo.empresaId,
      "ESCRITURA"
    );

    if (
      actual.gestion.estado !== EstadoGestionSgsst.FINALIZADA ||
      !actual.gestion.valida
    ) {
      throw new ErrorEvaluacion(
        "La gestión ya no está finalizada y válida.",
        409,
        "APROBACION_GESTION_NO_VALIDA"
      );
    }

    if (
      actual.estado !== EstadoAprobacionGestion.PENDIENTE
    ) {
      throw new ErrorEvaluacion(
        "La gestión ya tiene una decisión de aprobación.",
        409,
        "APROBACION_GESTION_YA_DECIDIDA"
      );
    }

    if (
      actual.gestion.usuarioCreadorId === usuario.usuarioId
    ) {
      throw new ErrorEvaluacion(
        "No puedes aprobar o rechazar una gestión que tú mismo creaste.",
        403,
        "APROBACION_GESTION_SIN_SEPARACION_FUNCIONES"
      );
    }

    const aprobada = input.decision === "APROBAR";
    const ahora = new Date();

    await prisma.$transaction(async (tx) => {
      const reclamada = await tx.aprobacionGestion.updateMany({
        where: {
          id: aprobacionId,
          estado: EstadoAprobacionGestion.PENDIENTE,
        },
        data: {
          estado: aprobada
            ? EstadoAprobacionGestion.APROBADA
            : EstadoAprobacionGestion.RECHAZADA,
          observacionDecision:
            input.observacion?.trim() || null,
          decididaPorUsuarioId: usuario.usuarioId,
          decididaEn: ahora,
        },
      });

      if (reclamada.count !== 1) {
        throw new ErrorEvaluacion(
          "La aprobación de gestión fue decidida por otro usuario.",
          409,
          "APROBACION_GESTION_DECISION_CONCURRENTE"
        );
      }

      await tx.historialEvaluacion.create({
        data: {
          gestionId: actual.gestion.id,
          usuarioId: usuario.usuarioId,
          accion: aprobada
            ? "APROBAR_GESTION"
            : "RECHAZAR_GESTION",
          descripcion: aprobada
            ? "La gestión configurada quedó aprobada y sus resultados sujetos a aprobación quedan firmes."
            : `La gestión fue rechazada. ${actual.evaluaciones.length} evaluación(es) afectada(s) toman resultado efectivo 3 sin sobrescribir su calificación registrada.`,
          datosAntes: {
            estado: actual.estado,
          },
          datosDespues: {
            estado: aprobada ? "APROBADA" : "RECHAZADA",
            evaluacionIds: actual.evaluaciones.map(
              (item) => item.evaluacionId
            ),
            observacion: input.observacion?.trim() || null,
          },
        },
      });
    });

    const actualizada =
      await obtenerAprobacionCompleta(aprobacionId);

    if (!actualizada) {
      throw new ErrorEvaluacion(
        "No fue posible recuperar la aprobación actualizada.",
        500,
        "APROBACION_GESTION_NO_RECUPERADA"
      );
    }

    return serializarAprobacion(actualizada, usuario);
  },
};
