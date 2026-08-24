import {
  EstadoCumplimientoAspecto,
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../../utils/evaluacion";
import { validarCalificacionAdministrativa } from "../../../validators/evaluacion/calificacion-administrativa.validator";
import { asegurarAccesoGestion } from "../acceso-evaluacion.service";
import { registrarControlesFinalizacion } from "../controles-finalizacion.service";

interface EvaluacionFinalizacion {
  id: string;
  usuarioRegistradorId: string;
  estadoCumplimiento: EstadoCumplimientoAspecto;
  calificacionAdministrativa: Prisma.Decimal;
  marcadaRevisionTecnica: boolean;
  motivoRevisionTecnica: string | null;
  aspecto: {
    id: number;
    nombre: string;
    configuracionRevision: {
      requiereRevisionTecnica: boolean;
      observaciones: string | null;
    } | null;
  };
}

/**
 * Finaliza una gestión SG-SST sin crear compromisos operativos.
 *
 * Regla vigente:
 * - Una calificación administrativa 0 o 3 deja el aspecto con
 *   "compromiso pendiente" calculado desde su última evaluación válida.
 * - Una calificación 5 o No aplica no deja compromiso pendiente.
 * - La finalización no solicita responsables, actividades, fechas límite,
 *   ampliaciones, cierres ni ninguna otra entidad del flujo legado.
 *
 * Las tablas históricas de compromisos se conservan intactas para consulta
 * y trazabilidad de registros creados antes de esta simplificación.
 */
export const servicioFinalizacionObligatoria = {
  finalizar: async (
    gestionId: string,
    _data: unknown,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const gestion = await asegurarAccesoGestion(
      usuario,
      gestionId,
      "ESCRITURA"
    );

    if (!gestion.valida) {
      throw new ErrorEvaluacion(
        "La gestión está invalidada y no puede finalizarse.",
        409,
        "GESTION_INVALIDADA"
      );
    }

    if (gestion.estado !== EstadoGestionSgsst.BORRADOR) {
      throw new ErrorEvaluacion(
        "Solo se puede finalizar una gestión que esté en borrador.",
        409,
        "GESTION_NO_EDITABLE"
      );
    }

    if (
      gestion.empresaPeriodo.estado !==
      EstadoPeriodoSgsst.ABIERTO
    ) {
      throw new ErrorEvaluacion(
        "No se puede finalizar una gestión de un periodo cerrado.",
        409,
        "PERIODO_CERRADO"
      );
    }

    return prisma.$transaction(
      async (tx) => {
        const evaluaciones =
          (await tx.evaluacionAspecto.findMany({
            where: {
              gestionId,
            },
            select: {
              id: true,
              usuarioRegistradorId: true,
              estadoCumplimiento: true,
              calificacionAdministrativa: true,
              marcadaRevisionTecnica: true,
              motivoRevisionTecnica: true,
              aspecto: {
                select: {
                  id: true,
                  nombre: true,
                  configuracionRevision: {
                    select: {
                      requiereRevisionTecnica: true,
                      observaciones: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              aspecto: {
                orden: "asc",
              },
            },
          })) as EvaluacionFinalizacion[];

        if (evaluaciones.length === 0) {
          throw new ErrorEvaluacion(
            "Debes guardar al menos una evaluación antes de finalizar la gestión.",
            409,
            "GESTION_SIN_EVALUACIONES"
          );
        }

        for (const evaluacion of evaluaciones) {
          validarCalificacionAdministrativa(
            evaluacion.estadoCumplimiento,
            evaluacion.calificacionAdministrativa.toNumber()
          );
        }

        const evaluacionesParaRevision =
          evaluaciones.filter(
            (evaluacion) =>
              evaluacion.marcadaRevisionTecnica ||
              Boolean(
                evaluacion.aspecto
                  .configuracionRevision
                  ?.requiereRevisionTecnica
              )
          );

        if (evaluacionesParaRevision.length > 0) {
          await tx.revisionTecnicaEvaluacion.createMany({
            data: evaluacionesParaRevision.map(
              (evaluacion) => ({
                evaluacionId: evaluacion.id,
                solicitadaPorUsuarioId:
                  evaluacion.usuarioRegistradorId,
                motivoSolicitud:
                  evaluacion.motivoRevisionTecnica?.trim() ||
                  evaluacion.aspecto
                    .configuracionRevision
                    ?.observaciones?.trim() ||
                  (evaluacion.aspecto
                    .configuracionRevision
                    ?.requiereRevisionTecnica
                    ? "Revisión técnica obligatoria configurada en la Supermatriz."
                    : "Evaluación marcada para revisión técnica antes de finalizar la gestión."),
              })
            ),
            skipDuplicates: true,
          });

          await tx.historialEvaluacion.createMany({
            data: evaluacionesParaRevision.map(
              (evaluacion) => ({
                gestionId,
                evaluacionId: evaluacion.id,
                usuarioId:
                  evaluacion.usuarioRegistradorId,
                accion:
                  "SOLICITAR_REVISION_TECNICA",
                descripcion: `Se solicitó revisión técnica para el aspecto ${evaluacion.aspecto.nombre}.`,
              })
            ),
          });
        }

        await registrarControlesFinalizacion(
          tx,
          {
            id: gestion.id,
            fechaGestion: gestion.fechaGestion,
            modalidad: gestion.modalidad,
            tipoActividad: gestion.tipoActividad,
          },
          evaluaciones.map((evaluacion) => ({
            id: evaluacion.id,
            aspectoId: evaluacion.aspecto.id,
            usuarioRegistradorId:
              evaluacion.usuarioRegistradorId,
            estadoCumplimiento:
              evaluacion.estadoCumplimiento,
            aspecto: {
              nombre: evaluacion.aspecto.nombre,
            },
          })),
          usuario
        );

        const compromisosPendientes = evaluaciones.filter(
          (evaluacion) => {
            const calificacion =
              evaluacion.calificacionAdministrativa.toNumber();

            return calificacion === 0 || calificacion === 3;
          }
        ).length;

        const actualizada =
          await tx.gestionSgsst.update({
            where: {
              id: gestionId,
            },
            data: {
              estado:
                EstadoGestionSgsst.FINALIZADA,
              finalizadaEn: new Date(),
            },
          });

        await tx.historialEvaluacion.create({
          data: {
            gestionId,
            usuarioId: usuario.usuarioId,
            accion: "FINALIZAR_GESTION",
            descripcion: `La gestión fue finalizada con ${evaluaciones.length} evaluación(es). ${compromisosPendientes} aspecto(s) quedan con compromiso pendiente calculado por calificación 0/3 y ${evaluacionesParaRevision.length} revisión(es) técnica(s) fueron generadas.`,
          },
        });

        return {
          ...actualizada,
          // Compatibilidad temporal con consumidores anteriores.
          compromisosCreados: 0,
          evaluacionesVinculadas: 0,
          compromisosPendientes,
          revisionesTecnicasCreadas:
            evaluacionesParaRevision.length,
        };
      },
      {
        maxWait: 5000,
        timeout: 30000,
      }
    );
  },
};
