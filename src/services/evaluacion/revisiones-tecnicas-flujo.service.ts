import {
  EstadoGestionSgsst,
  EstadoRevisionTecnica,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { servicioRevisionesTecnicas } from "./revisiones-tecnicas.service";
import { accionVinculoCorreccionRevision } from "./revisiones/revision-tecnica-vinculo";

export type EstadoFlujoRevisionTecnica =
  | EstadoRevisionTecnica
  | "EN_CORRECCION"
  | "SUBSANADA";

const ROLES_ADMIN_CORRECCION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

const ROLES_CORRECCION: RolUsuario[] = [
  ...ROLES_ADMIN_CORRECCION,
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
];

function serializarFecha(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export const servicioRevisionesTecnicasFlujo = {
  listarPeriodo: async (
    periodoId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const base = await servicioRevisionesTecnicas.listarPeriodo(
      periodoId,
      usuario
    );

    const revisionesConAjustes = base.revisiones.filter(
      (revision) =>
        revision.estado ===
        EstadoRevisionTecnica.REQUIERE_AJUSTES
    );

    if (revisionesConAjustes.length === 0) {
      return {
        ...base,
        resumen: {
          ...base.resumen,
          requierenAjustesActivos: 0,
          enCorreccion: 0,
          subsanadas: 0,
          accionesPendientes: base.resumen.pendientes,
        },
        revisiones: base.revisiones.map((revision) => ({
          ...revision,
          estadoFlujo: revision.estado as EstadoFlujoRevisionTecnica,
          requiereAccion:
            revision.estado === EstadoRevisionTecnica.PENDIENTE,
          puedeCorregir: false,
          gestionCorreccion: null,
          evaluacionCorrectiva: null,
        })),
      };
    }

    const aspectoIds = [
      ...new Set(
        revisionesConAjustes.map(
          (revision) => revision.evaluacion.aspecto.id
        )
      ),
    ];
    const aspectosLinaje = await prisma.aspecto.findMany({
      where: {
        id: {
          in: aspectoIds,
        },
      },
      select: {
        id: true,
        identidadHistorica: true,
      },
    });
    const identidadPorAspectoId = new Map(
      aspectosLinaje.map((aspecto) => [
        aspecto.id,
        aspecto.identidadHistorica,
      ])
    );
    const identidades = [
      ...new Set(
        aspectosLinaje.map(
          (aspecto) => aspecto.identidadHistorica
        )
      ),
    ];
    const accionesVinculo = revisionesConAjustes.map(
      (revision) =>
        accionVinculoCorreccionRevision(revision.id)
    );
    const profesionalActualId =
      usuario.profesionalId ?? "__SIN_PERFIL_PROFESIONAL__";
    const empresaId = base.periodo.empresa.id;

    const [evaluacionesPosteriores, vinculosCorreccion] =
      await Promise.all([
        prisma.evaluacionAspecto.findMany({
          where: {
            aspecto: {
              identidadHistorica: {
                in: identidades,
              },
            },
            gestion: {
              empresaPeriodo: {
                empresaId,
              },
              valida: true,
              estado: {
                in: [
                  EstadoGestionSgsst.BORRADOR,
                  EstadoGestionSgsst.FINALIZADA,
                ],
              },
            },
          },
          orderBy: [
            {
              createdAt: "desc",
            },
            {
              id: "desc",
            },
          ],
          include: {
            aspecto: {
              select: {
                identidadHistorica: true,
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
                participantes: {
                  where: {
                    profesionalId: profesionalActualId,
                    activo: true,
                  },
                  select: {
                    puedeEvaluar: true,
                  },
                },
              },
            },
          },
        }),
        prisma.historialEvaluacion.findMany({
          where: {
            accion: {
              in: accionesVinculo,
            },
            gestion: {
              empresaPeriodo: {
                empresaId,
              },
              valida: true,
              estado: {
                in: [
                  EstadoGestionSgsst.BORRADOR,
                  EstadoGestionSgsst.FINALIZADA,
                ],
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
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
                participantes: {
                  where: {
                    profesionalId: profesionalActualId,
                    activo: true,
                  },
                  select: {
                    puedeEvaluar: true,
                  },
                },
              },
            },
          },
        }),
      ]);

    const puedeCorregirRol = ROLES_CORRECCION.includes(
      usuario.rol
    );
    const esAdminCorreccion = ROLES_ADMIN_CORRECCION.includes(
      usuario.rol
    );

    const revisiones = base.revisiones.map((revision) => {
      if (
        revision.estado !==
        EstadoRevisionTecnica.REQUIERE_AJUSTES
      ) {
        return {
          ...revision,
          estadoFlujo: revision.estado as EstadoFlujoRevisionTecnica,
          requiereAccion:
            revision.estado === EstadoRevisionTecnica.PENDIENTE,
          puedeCorregir: false,
          gestionCorreccion: null,
          evaluacionCorrectiva: null,
        };
      }

      const identidadHistorica = identidadPorAspectoId.get(
        revision.evaluacion.aspecto.id
      );

      if (!identidadHistorica) {
        return {
          ...revision,
          estadoFlujo:
            EstadoRevisionTecnica.REQUIERE_AJUSTES,
          requiereAccion: true,
          puedeCorregir: puedeCorregirRol,
          gestionCorreccion: null,
          evaluacionCorrectiva: null,
        };
      }

      const accionVinculo =
        accionVinculoCorreccionRevision(revision.id);
      const vinculosRevision = vinculosCorreccion.filter(
        (vinculo) => vinculo.accion === accionVinculo
      );
      const vinculoFinalizado = vinculosRevision.find(
        (vinculo) =>
          vinculo.gestion.estado ===
          EstadoGestionSgsst.FINALIZADA
      );
      const vinculoBorrador = vinculosRevision.find(
        (vinculo) =>
          vinculo.gestion.estado ===
          EstadoGestionSgsst.BORRADOR
      );

      if (vinculoFinalizado) {
        const evaluacionCorrectiva =
          evaluacionesPosteriores.find(
            (evaluacion) =>
              evaluacion.gestionId ===
                vinculoFinalizado.gestion.id &&
              evaluacion.aspecto.identidadHistorica ===
                identidadHistorica
          ) ?? null;

        return {
          ...revision,
          estadoFlujo: "SUBSANADA" as const,
          requiereAccion: false,
          puedeCorregir: false,
          gestionCorreccion: {
            id: vinculoFinalizado.gestion.id,
            estado: vinculoFinalizado.gestion.estado,
            fechaGestion:
              vinculoFinalizado.gestion.fechaGestion.toISOString(),
            tipoActividad:
              vinculoFinalizado.gestion.tipoActividad,
            profesional: vinculoFinalizado.gestion.profesional
              ? `${vinculoFinalizado.gestion.profesional.nombres} ${vinculoFinalizado.gestion.profesional.apellidos}`.trim()
              : vinculoFinalizado.gestion.usuarioCreador.nombre,
          },
          evaluacionCorrectiva: evaluacionCorrectiva
            ? {
                id: evaluacionCorrectiva.id,
                estadoCumplimiento:
                  evaluacionCorrectiva.estadoCumplimiento,
                calificacionAdministrativa:
                  evaluacionCorrectiva.calificacionAdministrativa.toNumber(),
                observacion:
                  evaluacionCorrectiva.observacion,
                fechaDocumento: serializarFecha(
                  evaluacionCorrectiva.fechaDocumento
                ),
                creadaEn:
                  evaluacionCorrectiva.createdAt.toISOString(),
              }
            : null,
        };
      }

      if (vinculoBorrador) {
        const evaluacionCorrectiva =
          evaluacionesPosteriores.find(
            (evaluacion) =>
              evaluacion.gestionId ===
                vinculoBorrador.gestion.id &&
              evaluacion.aspecto.identidadHistorica ===
                identidadHistorica
          ) ?? null;
        const puedeOperarBorrador =
          esAdminCorreccion ||
          vinculoBorrador.gestion.participantes.some(
            (participante) => participante.puedeEvaluar
          );

        return {
          ...revision,
          estadoFlujo: "EN_CORRECCION" as const,
          requiereAccion: true,
          puedeCorregir:
            puedeCorregirRol && puedeOperarBorrador,
          gestionCorreccion: {
            id: vinculoBorrador.gestion.id,
            estado: vinculoBorrador.gestion.estado,
            fechaGestion:
              vinculoBorrador.gestion.fechaGestion.toISOString(),
            tipoActividad:
              vinculoBorrador.gestion.tipoActividad,
            profesional: vinculoBorrador.gestion.profesional
              ? `${vinculoBorrador.gestion.profesional.nombres} ${vinculoBorrador.gestion.profesional.apellidos}`.trim()
              : vinculoBorrador.gestion.usuarioCreador.nombre,
          },
          evaluacionCorrectiva: evaluacionCorrectiva
            ? {
                id: evaluacionCorrectiva.id,
                estadoCumplimiento:
                  evaluacionCorrectiva.estadoCumplimiento,
                calificacionAdministrativa:
                  evaluacionCorrectiva.calificacionAdministrativa.toNumber(),
                observacion:
                  evaluacionCorrectiva.observacion,
                fechaDocumento: serializarFecha(
                  evaluacionCorrectiva.fechaDocumento
                ),
                creadaEn:
                  evaluacionCorrectiva.createdAt.toISOString(),
              }
            : null,
        };
      }

      // Compatibilidad con correcciones históricas creadas antes de que
      // existiera el vínculo explícito revisión -> gestión correctiva.
      const fechaResolucion = revision.revisadaEn
        ? new Date(revision.revisadaEn)
        : new Date(revision.updatedAt);

      const candidatas = evaluacionesPosteriores.filter(
        (evaluacion) =>
          evaluacion.aspecto.identidadHistorica ===
            identidadHistorica &&
          evaluacion.id !== revision.evaluacion.id &&
          evaluacion.createdAt.getTime() >
            fechaResolucion.getTime()
      );

      const finalizada = candidatas.find(
        (evaluacion) =>
          evaluacion.gestion.estado ===
          EstadoGestionSgsst.FINALIZADA
      );

      const borrador = candidatas.find(
        (evaluacion) =>
          evaluacion.gestion.estado ===
          EstadoGestionSgsst.BORRADOR
      );

      if (finalizada) {
        return {
          ...revision,
          estadoFlujo: "SUBSANADA" as const,
          requiereAccion: false,
          puedeCorregir: false,
          gestionCorreccion: {
            id: finalizada.gestion.id,
            estado: finalizada.gestion.estado,
            fechaGestion:
              finalizada.gestion.fechaGestion.toISOString(),
            tipoActividad:
              finalizada.gestion.tipoActividad,
            profesional: finalizada.gestion.profesional
              ? `${finalizada.gestion.profesional.nombres} ${finalizada.gestion.profesional.apellidos}`.trim()
              : finalizada.gestion.usuarioCreador.nombre,
          },
          evaluacionCorrectiva: {
            id: finalizada.id,
            estadoCumplimiento:
              finalizada.estadoCumplimiento,
            calificacionAdministrativa:
              finalizada.calificacionAdministrativa.toNumber(),
            observacion: finalizada.observacion,
            fechaDocumento: serializarFecha(
              finalizada.fechaDocumento
            ),
            creadaEn: finalizada.createdAt.toISOString(),
          },
        };
      }

      if (borrador) {
        const puedeOperarBorrador =
          esAdminCorreccion ||
          borrador.gestion.participantes.some(
            (participante) => participante.puedeEvaluar
          );

        return {
          ...revision,
          estadoFlujo: "EN_CORRECCION" as const,
          requiereAccion: true,
          puedeCorregir:
            puedeCorregirRol && puedeOperarBorrador,
          gestionCorreccion: {
            id: borrador.gestion.id,
            estado: borrador.gestion.estado,
            fechaGestion:
              borrador.gestion.fechaGestion.toISOString(),
            tipoActividad: borrador.gestion.tipoActividad,
            profesional: borrador.gestion.profesional
              ? `${borrador.gestion.profesional.nombres} ${borrador.gestion.profesional.apellidos}`.trim()
              : borrador.gestion.usuarioCreador.nombre,
          },
          evaluacionCorrectiva: {
            id: borrador.id,
            estadoCumplimiento:
              borrador.estadoCumplimiento,
            calificacionAdministrativa:
              borrador.calificacionAdministrativa.toNumber(),
            observacion: borrador.observacion,
            fechaDocumento: serializarFecha(
              borrador.fechaDocumento
            ),
            creadaEn: borrador.createdAt.toISOString(),
          },
        };
      }

      return {
        ...revision,
        estadoFlujo:
          EstadoRevisionTecnica.REQUIERE_AJUSTES,
        requiereAccion: true,
        puedeCorregir: puedeCorregirRol,
        gestionCorreccion: null,
        evaluacionCorrectiva: null,
      };
    });

    const requierenAjustesActivos = revisiones.filter(
      (revision) =>
        revision.estadoFlujo ===
        EstadoRevisionTecnica.REQUIERE_AJUSTES
    ).length;
    const enCorreccion = revisiones.filter(
      (revision) =>
        revision.estadoFlujo === "EN_CORRECCION"
    ).length;
    const subsanadas = revisiones.filter(
      (revision) => revision.estadoFlujo === "SUBSANADA"
    ).length;

    return {
      ...base,
      resumen: {
        ...base.resumen,
        requierenAjustesActivos,
        enCorreccion,
        subsanadas,
        accionesPendientes:
          base.resumen.pendientes +
          requierenAjustesActivos +
          enCorreccion,
      },
      revisiones,
    };
  },
};
