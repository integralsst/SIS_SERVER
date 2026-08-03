import {
  EstadoGestionSgsst,
  EstadoRevisionTecnica,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { servicioRevisionesTecnicas } from "./revisiones-tecnicas.service";

export type EstadoFlujoRevisionTecnica =
  | EstadoRevisionTecnica
  | "EN_CORRECCION"
  | "SUBSANADA";

const ROLES_CORRECCION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
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

    const evaluacionesPosteriores =
      await prisma.evaluacionAspecto.findMany({
        where: {
          aspectoId: {
            in: aspectoIds,
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
      });

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

      const fechaResolucion = revision.revisadaEn
        ? new Date(revision.revisadaEn)
        : new Date(revision.updatedAt);

      const candidatas = evaluacionesPosteriores.filter(
        (evaluacion) =>
          evaluacion.aspectoId ===
            revision.evaluacion.aspecto.id &&
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
            EstadoGestionSgsst.BORRADOR &&
          (usuario.rol !== RolUsuario.PROFESIONAL ||
            evaluacion.gestion.usuarioCreadorId ===
              usuario.usuarioId)
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
        return {
          ...revision,
          estadoFlujo: "EN_CORRECCION" as const,
          requiereAccion: true,
          puedeCorregir: puedeCorregirRol,
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
