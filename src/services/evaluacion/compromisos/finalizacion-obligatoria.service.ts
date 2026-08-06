import {
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import type {
  CompromisoFinalizacionInput,
} from "../../../types/evaluacion/compromisos/finalizacion-gestion.types";
import type { UsuarioSesionEvaluacion } from "../../../types/evaluacion.types";
import {
  convertirFecha,
  ErrorEvaluacion,
} from "../../../utils/evaluacion";
import { validarCalificacionAdministrativa } from "../../../validators/evaluacion/calificacion-administrativa.validator";
import { normalizarFinalizacionGestion } from "../../../validators/evaluacion/compromisos/finalizacion-gestion.validator";
import { asegurarAccesoGestion } from "../acceso-evaluacion.service";
import {
  correspondeAlMismoAspecto,
  ESTADOS_COMPROMISO_ABIERTO,
} from "./identidad-aspecto-compromiso.service";
import {
  asegurarResponsablesDisponibles,
  listarResponsablesDisponibles,
} from "./responsables-disponibles.service";

interface EvaluacionFinalizacion {
  id: string;
  usuarioRegistradorId: string;
  estadoCumplimiento:
    | "CUMPLIDO"
    | "PARCIAL"
    | "NO_CUMPLIDO"
    | "NO_APLICA";
  calificacionAdministrativa: Prisma.Decimal;
  marcadaRevisionTecnica: boolean;
  motivoRevisionTecnica: string | null;
  aspecto: {
    id: number;
    codigo: string | null;
    nombre: string;
    configuracionRevision: {
      requiereRevisionTecnica: boolean;
      observaciones: string | null;
    } | null;
  };
}

function validarCompromisosEnviados(
  evaluacionesNuevas: EvaluacionFinalizacion[],
  compromisos: CompromisoFinalizacionInput[]
): Map<string, CompromisoFinalizacionInput> {
  const esperadas = new Set(
    evaluacionesNuevas.map(
      (evaluacion) => evaluacion.id
    )
  );
  const recibidas = new Map(
    compromisos.map((compromiso) => [
      compromiso.evaluacionId,
      compromiso,
    ])
  );

  const faltantes = [...esperadas].filter(
    (evaluacionId) => !recibidas.has(evaluacionId)
  );

  if (faltantes.length > 0) {
    throw new ErrorEvaluacion(
      `Debes registrar ${faltantes.length} compromiso(s) obligatorio(s) antes de finalizar la gestión.`,
      409,
      "COMPROMISOS_OBLIGATORIOS_PENDIENTES"
    );
  }

  const adicionales = [...recibidas.keys()].filter(
    (evaluacionId) => !esperadas.has(evaluacionId)
  );

  if (adicionales.length > 0) {
    throw new ErrorEvaluacion(
      "Se enviaron compromisos para evaluaciones que no requieren uno nuevo.",
      400,
      "COMPROMISOS_NO_REQUERIDOS"
    );
  }

  return recibidas;
}

export const servicioFinalizacionObligatoria = {
  finalizar: async (
    gestionId: string,
    data: unknown,
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

    const entrada =
      normalizarFinalizacionGestion(data);

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
                  codigo: true,
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

        const compromisosAbiertos =
          await tx.compromiso.findMany({
            where: {
              empresaId:
                gestion.empresaPeriodo.empresaId,
              estado: {
                in: ESTADOS_COMPROMISO_ABIERTO,
              },
            },
            select: {
              id: true,
              aspectoId: true,
              aspectoCodigo: true,
              aspecto: {
                select: {
                  nombre: true,
                },
              },
            },
          });

        const compromisoPorEvaluacion = new Map<
          string,
          (typeof compromisosAbiertos)[number]
        >();

        for (const evaluacion of evaluaciones) {
          const existente =
            compromisosAbiertos.find((compromiso) =>
              correspondeAlMismoAspecto(
                compromiso,
                evaluacion.aspecto
              )
            );

          if (existente) {
            compromisoPorEvaluacion.set(
              evaluacion.id,
              existente
            );
          }
        }

        const evaluacionesNuevas =
          evaluaciones.filter((evaluacion) => {
            const calificacion =
              evaluacion.calificacionAdministrativa.toNumber();

            return (
              (calificacion === 0 ||
                calificacion === 3) &&
              !compromisoPorEvaluacion.has(
                evaluacion.id
              )
            );
          });

        const compromisosPorEvaluacion =
          validarCompromisosEnviados(
            evaluacionesNuevas,
            entrada.compromisos ?? []
          );

        const responsablesDisponibles =
          evaluacionesNuevas.length > 0
            ? await listarResponsablesDisponibles(
                tx,
                gestion.empresaPeriodo.empresaId
              )
            : [];

        const compromisosCreados: string[] = [];

        for (const evaluacion of evaluacionesNuevas) {
          const compromisoInput =
            compromisosPorEvaluacion.get(
              evaluacion.id
            );

          if (!compromisoInput) {
            throw new ErrorEvaluacion(
              "No fue posible asociar uno de los compromisos obligatorios.",
              409,
              "COMPROMISO_SIN_EVALUACION"
            );
          }

          asegurarResponsablesDisponibles(
            responsablesDisponibles,
            compromisoInput.responsables.map(
              (responsable) =>
                responsable.usuarioResponsableId
            )
          );

          const fechaLimite = convertirFecha(
            compromisoInput.fechaLimite,
            "fechaLimite",
            true
          ) as Date;

          if (fechaLimite < gestion.fechaGestion) {
            throw new ErrorEvaluacion(
              `La fecha límite del aspecto "${evaluacion.aspecto.nombre}" no puede ser anterior a la fecha de la gestión.`,
              400,
              "FECHA_LIMITE_INVALIDA"
            );
          }

          const compromiso =
            await tx.compromiso.create({
              data: {
                empresaId:
                  gestion.empresaPeriodo.empresaId,
                gestionOrigenId: gestionId,
                evaluacionOrigenId:
                  evaluacion.id,
                aspectoId:
                  evaluacion.aspecto.id,
                aspectoCodigo:
                  evaluacion.aspecto.codigo,
                creadoPorUsuarioId:
                  usuario.usuarioId,
                descripcion:
                  compromisoInput.descripcion,
                recursos:
                  compromisoInput.recursos ?? null,
                fechaLimite,
                responsables: {
                  create:
                    compromisoInput.responsables.map(
                      (responsable) => ({
                        usuarioResponsableId:
                          responsable.usuarioResponsableId,
                        asignadoPorUsuarioId:
                          usuario.usuarioId,
                        tipo: responsable.tipo,
                        actividad: {
                          create: {
                            descripcion:
                              responsable.actividad,
                          },
                        },
                      })
                    ),
                },
              },
              select: {
                id: true,
              },
            });

          compromisosCreados.push(
            compromiso.id
          );

          await tx.historialCompromiso.create({
            data: {
              compromisoId: compromiso.id,
              entidadTipo: "COMPROMISO",
              entidadId: compromiso.id,
              accion: "CREAR_COMPROMISO",
              descripcion: `Se creó el compromiso obligatorio para el aspecto ${evaluacion.aspecto.nombre} al finalizar la gestión.`,
              usuarioId: usuario.usuarioId,
            },
          });
        }

        const evaluacionesVinculadas =
          evaluaciones
            .map((evaluacion) => ({
              evaluacionId: evaluacion.id,
              compromiso:
                compromisoPorEvaluacion.get(
                  evaluacion.id
                ),
            }))
            .filter(
              (
                vinculacion
              ): vinculacion is {
                evaluacionId: string;
                compromiso: (typeof compromisosAbiertos)[number];
              } =>
                Boolean(vinculacion.compromiso)
            );

        if (evaluacionesVinculadas.length > 0) {
          await tx.compromisoEvaluacionSeguimiento.createMany(
            {
              data: evaluacionesVinculadas.map(
                (vinculacion) => ({
                  compromisoId:
                    vinculacion.compromiso.id,
                  evaluacionId:
                    vinculacion.evaluacionId,
                })
              ),
              skipDuplicates: true,
            }
          );

          await tx.historialCompromiso.createMany({
            data: evaluacionesVinculadas.map(
              (vinculacion) => ({
                compromisoId:
                  vinculacion.compromiso.id,
                entidadTipo:
                  "EVALUACION_ASPECTO",
                entidadId:
                  vinculacion.evaluacionId,
                accion:
                  "VINCULAR_REEVALUACION",
                descripcion:
                  "Se vinculó una nueva evaluación del aspecto a la trazabilidad del compromiso abierto.",
                usuarioId: usuario.usuarioId,
              })
            ),
          });
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
            descripcion: `La gestión fue finalizada con ${compromisosCreados.length} compromiso(s) nuevo(s), ${evaluacionesVinculadas.length} evaluación(es) vinculada(s) a compromisos abiertos y ${evaluacionesParaRevision.length} revisión(es) técnica(s).`,
          },
        });

        return {
          ...actualizada,
          compromisosCreados:
            compromisosCreados.length,
          evaluacionesVinculadas:
            evaluacionesVinculadas.length,
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
