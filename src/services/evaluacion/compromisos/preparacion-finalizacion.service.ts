import {
  Prisma,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import type { EvaluacionPreparacionCompromiso } from "../../../types/evaluacion/compromisos/finalizacion-gestion.types";
import type { UsuarioSesionEvaluacion as SesionEvaluacion } from "../../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../../utils/evaluacion";
import { validarCalificacionAdministrativa } from "../../../validators/evaluacion/calificacion-administrativa.validator";
import { asegurarAccesoGestion } from "../acceso-evaluacion.service";
import {
  correspondeAlMismoAspecto,
  ESTADOS_COMPROMISO_ABIERTO,
} from "./identidad-aspecto-compromiso.service";
import { listarResponsablesDisponibles } from "./responsables-disponibles.service";

type Sesion = SesionEvaluacion;

async function construirPreparacion(
  tx: Prisma.TransactionClient,
  gestionId: string,
  empresaId: string
) {
  const [evaluaciones, compromisosAbiertos, responsables] =
    await Promise.all([
      tx.evaluacionAspecto.findMany({
        where: {
          gestionId,
        },
        select: {
          id: true,
          estadoCumplimiento: true,
          calificacionAdministrativa: true,
          aspecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
        },
        orderBy: {
          aspecto: {
            orden: "asc",
          },
        },
      }),
      tx.compromiso.findMany({
        where: {
          empresaId,
          estado: {
            in: ESTADOS_COMPROMISO_ABIERTO,
          },
        },
        select: {
          id: true,
          aspectoId: true,
          aspectoCodigo: true,
          descripcion: true,
          fechaLimite: true,
          estado: true,
          aspecto: {
            select: {
              nombre: true,
            },
          },
        },
      }),
      listarResponsablesDisponibles(tx, empresaId),
    ]);

  const requierenCompromiso: EvaluacionPreparacionCompromiso[] =
    [];
  const recalificacionesCumplidas: Array<{
    evaluacionId: string;
    aspectoId: number;
    aspectoCodigo: string | null;
    aspectoNombre: string;
    compromisoId: string;
  }> = [];

  for (const evaluacion of evaluaciones) {
    const calificacion =
      evaluacion.calificacionAdministrativa.toNumber();

    validarCalificacionAdministrativa(
      evaluacion.estadoCumplimiento,
      calificacion
    );

    const compromisoAbierto =
      compromisosAbiertos.find((compromiso) =>
        correspondeAlMismoAspecto(
          compromiso,
          evaluacion.aspecto
        )
      ) ?? null;

    if (calificacion === 0 || calificacion === 3) {
      requierenCompromiso.push({
        evaluacionId: evaluacion.id,
        aspectoId: evaluacion.aspecto.id,
        aspectoCodigo:
          evaluacion.aspecto.codigo,
        aspectoNombre:
          evaluacion.aspecto.nombre,
        estadoCumplimiento:
          evaluacion.estadoCumplimiento,
        calificacionAdministrativa:
          calificacion,
        accion: compromisoAbierto
          ? "VINCULAR_EXISTENTE"
          : "CREAR",
        compromisoAbierto: compromisoAbierto
          ? {
              id: compromisoAbierto.id,
              descripcion:
                compromisoAbierto.descripcion,
              fechaLimite:
                compromisoAbierto.fechaLimite.toISOString(),
              estado: compromisoAbierto.estado,
            }
          : null,
      });
    }

    if (calificacion === 5 && compromisoAbierto) {
      recalificacionesCumplidas.push({
        evaluacionId: evaluacion.id,
        aspectoId: evaluacion.aspecto.id,
        aspectoCodigo:
          evaluacion.aspecto.codigo,
        aspectoNombre:
          evaluacion.aspecto.nombre,
        compromisoId: compromisoAbierto.id,
      });
    }
  }

  const nuevos = requierenCompromiso.filter(
    (evaluacion) => evaluacion.accion === "CREAR"
  ).length;

  return {
    gestionId,
    totalEvaluaciones: evaluaciones.length,
    requiereCompromisos:
      requierenCompromiso.length > 0,
    totalRequierenCompromiso:
      requierenCompromiso.length,
    totalNuevos: nuevos,
    totalVinculados:
      requierenCompromiso.length - nuevos,
    evaluaciones: requierenCompromiso,
    recalificacionesCumplidas,
    responsablesDisponibles: responsables,
  };
}

export const servicioPreparacionFinalizacion = {
  obtener: async (
    gestionId: string,
    usuario: Sesion
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

    return prisma.$transaction(
      (tx) =>
        construirPreparacion(
          tx,
          gestionId,
          gestion.empresaPeriodo.empresaId
        ),
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );
  },
};
