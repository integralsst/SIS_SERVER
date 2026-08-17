import type {
  Request,
  Response,
} from "express";

import { prisma } from "../../lib/prisma";
import { asegurarCapacidadParticipanteGestion } from "../../services/evaluacion/acceso-evaluacion.service";
import { servicioEvidenciasEvaluacion } from "../../services/evaluacion/evidencias-evaluacion.service";
import type {
  ActualizarEvidenciaEvaluacionInput,
  CrearEvidenciaEvaluacionInput,
} from "../../types/evaluacion.types";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

async function asegurarPermisoPorEvaluacion(
  evaluacionId: string,
  req: Request
): Promise<void> {
  const evaluacion = await prisma.evaluacionAspecto.findUnique({
    where: {
      id: evaluacionId,
    },
    select: {
      gestionId: true,
    },
  });

  if (evaluacion) {
    await asegurarCapacidadParticipanteGestion(
      obtenerUsuarioSesion(req),
      evaluacion.gestionId,
      "EVIDENCIAS"
    );
  }
}

async function asegurarPermisoPorEvidencia(
  evidenciaId: string,
  req: Request
): Promise<void> {
  const evidencia = await prisma.evidenciaEvaluacion.findUnique({
    where: {
      id: evidenciaId,
    },
    select: {
      evaluacion: {
        select: {
          gestionId: true,
        },
      },
    },
  });

  if (evidencia) {
    await asegurarCapacidadParticipanteGestion(
      obtenerUsuarioSesion(req),
      evidencia.evaluacion.gestionId,
      "EVIDENCIAS"
    );
  }
}

export const controladorEvidenciasEvaluacion = {
  crear: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const evaluacionId = obtenerParametroRuta(
        req,
        "evaluacionId"
      );

      await asegurarPermisoPorEvaluacion(
        evaluacionId,
        req
      );

      const resultado =
        await servicioEvidenciasEvaluacion.crear(
          evaluacionId,
          req.body as CrearEvidenciaEvaluacionInput,
          obtenerUsuarioSesion(req)
        );

      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  actualizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const evidenciaId = obtenerParametroRuta(
        req,
        "evidenciaId"
      );

      await asegurarPermisoPorEvidencia(
        evidenciaId,
        req
      );

      const resultado =
        await servicioEvidenciasEvaluacion.actualizar(
          evidenciaId,
          req.body as ActualizarEvidenciaEvaluacionInput,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  desactivar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const evidenciaId = obtenerParametroRuta(
        req,
        "evidenciaId"
      );

      await asegurarPermisoPorEvidencia(
        evidenciaId,
        req
      );

      const resultado =
        await servicioEvidenciasEvaluacion.desactivar(
          evidenciaId,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
