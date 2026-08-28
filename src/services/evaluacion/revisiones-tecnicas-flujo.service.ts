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

const ROLES_CORRECCION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
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

    const [evaluacionesRelacionadas, vinculosHistoricos] =
      await Promise.all([
        prisma.evaluacionAspecto.findMany({
          where: {
            aspecto: {
              identidadHistorica: {
                in: identidades,
              },
            },
            gestion: {
              empresaPeriodoId: periodoId,
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
              empresaPeriodoId: periodoId,
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
              },
            },
          },
        }),
      ]);

    const puedeCorregirRol = ROLES_CORRECCION.includes(
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

      const fechaResolucion = revision.revisadaEn
        ? new Date(revision.revisadaEn)
        : new Date(revision.updatedAt);

      // Flujo vigente: una nueva evaluación directa oficial y posterior al
      // concepto técnico subsana la revisión. No se requiere BORRADOR,
      // equipo ni GestionParticipante para registrar la corrección.
      const evaluacionDirectaPosterior =
        evaluacionesRelacionadas.find(
          (evaluacion) =>
            evaluacion.gestion.estado ===
              EstadoGestionSgsst.FINALIZADA &&
            evaluacion.aspecto.identidadHistorica ===
              identidadHistorica &&
            evaluacion.id !== revision.evaluacion.id &&
            evaluacion.createdAt.getTime() >
              fechaResolucion.getTime()
        ) ?? null;

      if (evaluacionDirectaPosterior) {
        return {
          ...revision,
          estadoFlujo: "SUBSANADA" as const,
          requiereAccion: false,
          puedeCorregir: false,
          gestionCorreccion: {
            id: evaluacionDirectaPosterior.gestion.id,
            estado: evaluacionDirectaPosterior.gestion.estado,
            fechaGestion:
              evaluacionDirectaPosterior.gestion.fechaGestion.toISOString(),
            tipoActividad:
              evaluacionDirectaPosterior.gestion.tipoActividad,
            profesional: evaluacionDirectaPosterior.gestion.profesional
              ? `${evaluacionDirectaPosterior.gestion.profesional.nombres} ${evaluacionDirectaPosterior.gestion.profesional.apellidos}`.trim()
              : evaluacionDirectaPosterior.gestion.usuarioCreador.nombre,
          },
          evaluacionCorrectiva: {
            id: evaluacionDirectaPosterior.id,
            estadoCumplimiento:
              evaluacionDirectaPosterior.estadoCumplimiento,
            calificacionAdministrativa:
              evaluacionDirectaPosterior.calificacionAdministrativa.toNumber(),
            observacion:
              evaluacionDirectaPosterior.observacion,
            fechaDocumento: serializarFecha(
              evaluacionDirectaPosterior.fechaDocumento
            ),
            creadaEn:
              evaluacionDirectaPosterior.createdAt.toISOString(),
          },
        };
      }

      // Compatibilidad histórica: solo un vínculo explícito creado por el
      // flujo anterior puede mantener una corrección en BORRADOR. Los
      // borradores no relacionados ya no afectan el estado de la revisión.
      const accionVinculo =
        accionVinculoCorreccionRevision(revision.id);
      const vinculosRevision = vinculosHistoricos.filter(
        (vinculo) => vinculo.accion === accionVinculo
      );
      const vinculoFinalizado = vinculosRevision.find(
        (vinculo) =>
          vinculo.gestion.estado ===
          EstadoGestionSgsst.FINALIZADA
      );

      if (vinculoFinalizado) {
        const evaluacionCorrectiva =
          evaluacionesRelacionadas.find(
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

      const vinculoBorrador = vinculosRevision.find(
        (vinculo) =>
          vinculo.gestion.estado ===
          EstadoGestionSgsst.BORRADOR
      );

      if (vinculoBorrador) {
        const evaluacionCorrectiva =
          evaluacionesRelacionadas.find(
            (evaluacion) =>
              evaluacion.gestionId ===
                vinculoBorrador.gestion.id &&
              evaluacion.aspecto.identidadHistorica ===
                identidadHistorica
          ) ?? null;

        return {
          ...revision,
          estadoFlujo: "EN_CORRECCION" as const,
          requiereAccion: true,
          puedeCorregir: puedeCorregirRol,
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