import {
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  EstadoRevisionTecnica,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  InvalidarGestionSgsstInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import {
  comoJsonPrismaEvaluacion,
  ErrorEvaluacion,
} from "../../utils/evaluacion";
import { asegurarAccesoGestion } from "./acceso-evaluacion.service";

const ROLES_INVALIDACION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

function validarMotivo(data: InvalidarGestionSgsstInput): string {
  const motivo = data.motivo?.trim();

  if (!motivo) {
    throw new ErrorEvaluacion(
      "Debes explicar por qué esta gestión debe invalidarse.",
      400,
      "MOTIVO_INVALIDACION_OBLIGATORIO"
    );
  }

  if (motivo.length < 10) {
    throw new ErrorEvaluacion(
      "El motivo de invalidación debe tener al menos 10 caracteres.",
      400,
      "MOTIVO_INVALIDACION_CORTO"
    );
  }

  if (motivo.length > 2000) {
    throw new ErrorEvaluacion(
      "El motivo de invalidación no puede superar los 2000 caracteres.",
      400,
      "MOTIVO_INVALIDACION_LARGO"
    );
  }

  return motivo;
}

export const servicioInvalidacionesGestion = {
  invalidar: async (
    gestionId: string,
    data: InvalidarGestionSgsstInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    if (!ROLES_INVALIDACION.includes(usuario.rol)) {
      throw new ErrorEvaluacion(
        "Tu rol no puede invalidar gestiones finalizadas.",
        403,
        "ROL_SIN_PERMISO_INVALIDACION"
      );
    }

    const motivo = validarMotivo(data);
    const gestion = await asegurarAccesoGestion(
      usuario,
      gestionId,
      "ESCRITURA"
    );

    if (
      gestion.empresaPeriodo.estado !==
      EstadoPeriodoSgsst.ABIERTO
    ) {
      throw new ErrorEvaluacion(
        "No se puede invalidar una gestión de un periodo cerrado.",
        409,
        "PERIODO_CERRADO"
      );
    }

    if (
      gestion.estado !== EstadoGestionSgsst.FINALIZADA ||
      !gestion.valida
    ) {
      throw new ErrorEvaluacion(
        "Solo se puede invalidar una gestión finalizada y válida.",
        409,
        "GESTION_NO_INVALIDABLE"
      );
    }

    const invalidadaEn = new Date();

    return prisma.$transaction(async (tx) => {
      const resultado = await tx.gestionSgsst.updateMany({
        where: {
          id: gestionId,
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
        },
        data: {
          estado: EstadoGestionSgsst.INVALIDADA,
          valida: false,
          invalidadaEn,
          motivoInvalidacion: motivo,
        },
      });

      if (resultado.count !== 1) {
        throw new ErrorEvaluacion(
          "La gestión cambió de estado antes de completar la invalidación. Recarga la página e inténtalo nuevamente.",
          409,
          "GESTION_MODIFICADA_CONCURRENTEMENTE"
        );
      }

      const revisionesAfectadas =
        await tx.revisionTecnicaEvaluacion.findMany({
          where: {
            evaluacion: {
              gestionId,
            },
            estado: {
              not: EstadoRevisionTecnica.ANULADA,
            },
          },
          select: {
            id: true,
            evaluacionId: true,
            estado: true,
          },
        });

      if (revisionesAfectadas.length > 0) {
        await tx.revisionTecnicaEvaluacion.updateMany({
          where: {
            id: {
              in: revisionesAfectadas.map(
                (revision) => revision.id
              ),
            },
          },
          data: {
            estado: EstadoRevisionTecnica.ANULADA,
            anuladaEn: invalidadaEn,
            motivoAnulacion:
              "La revisión fue anulada porque la gestión asociada fue invalidada.",
          },
        });

        await tx.historialEvaluacion.createMany({
          data: revisionesAfectadas.map(
            (revision) => ({
              gestionId,
              evaluacionId: revision.evaluacionId,
              usuarioId: usuario.usuarioId,
              accion: "ANULAR_REVISION_TECNICA",
              descripcion:
                "La revisión técnica fue anulada automáticamente por la invalidación de la gestión.",
            })
          ),
        });
      }

      await tx.historialEvaluacion.create({
        data: {
          gestionId,
          usuarioId: usuario.usuarioId,
          accion: "INVALIDAR_GESTION",
          descripcion: `La gestión fue invalidada. Motivo: ${motivo}`,
          datosAntes: comoJsonPrismaEvaluacion({
            estado: gestion.estado,
            valida: gestion.valida,
            invalidadaEn: gestion.invalidadaEn,
            motivoInvalidacion: gestion.motivoInvalidacion,
          }),
          datosDespues: comoJsonPrismaEvaluacion({
            estado: EstadoGestionSgsst.INVALIDADA,
            valida: false,
            invalidadaEn,
            motivoInvalidacion: motivo,
          }),
        },
      });

      return {
        id: gestionId,
        estado: EstadoGestionSgsst.INVALIDADA,
        valida: false,
        invalidadaEn: invalidadaEn.toISOString(),
        motivoInvalidacion: motivo,
        mensaje:
          "La gestión fue invalidada. Sus evaluaciones permanecen en el historial, pero ya no participan en el estado vigente ni en los cálculos.",
      };
    });
  },
};
