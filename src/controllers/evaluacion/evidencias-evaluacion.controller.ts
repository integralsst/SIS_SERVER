import type {
  Request,
  Response,
} from "express";

import { prisma } from "../../lib/prisma";
import { asegurarCapacidadParticipanteGestion } from "../../services/evaluacion/acceso-evaluacion.service";
import { servicioEvidenciasEvaluacionDirecta } from "../../services/evaluacion/evidencias-evaluacion-directa.service";
import { servicioEvidenciasEvaluacion } from "../../services/evaluacion/evidencias-evaluacion.service";
import { asegurarEvaluacionVigenteParaEvidencia } from "../../services/evaluacion/vigencia-evidencia-evaluacion.service";
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
      const usuario = obtenerUsuarioSesion(req);

      await asegurarPermisoPorEvaluacion(
        evaluacionId,
        req
      );
      await asegurarEvaluacionVigenteParaEvidencia(
        evaluacionId
      );

      const directa =
        await servicioEvidenciasEvaluacionDirecta.esEvaluacionDirecta(
          evaluacionId
        );
      const resultado = directa
        ? await servicioEvidenciasEvaluacionDirecta.crear(
            evaluacionId,
            req.body as CrearEvidenciaEvaluacionInput,
            usuario
          )
        : await servicioEvidenciasEvaluacion.crear(
            evaluacionId,
            req.body as CrearEvidenciaEvaluacionInput,
            usuario
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
      const usuario = obtenerUsuarioSesion(req);

      await asegurarPermisoPorEvidencia(
        evidenciaId,
        req
      );

      const directa =
        await servicioEvidenciasEvaluacionDirecta.esEvidenciaDirecta(
          evidenciaId
        );
      const resultado = directa
        ? await servicioEvidenciasEvaluacionDirecta.actualizar(
            evidenciaId,
            req.body as ActualizarEvidenciaEvaluacionInput,
            usuario
          )
        : await servicioEvidenciasEvaluacion.actualizar(
            evidenciaId,
            req.body as ActualizarEvidenciaEvaluacionInput,
            usuario
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
      const usuario = obtenerUsuarioSesion(req);

      await asegurarPermisoPorEvidencia(
        evidenciaId,
        req
      );

      const directa =
        await servicioEvidenciasEvaluacionDirecta.esEvidenciaDirecta(
          evidenciaId
        );
      const resultado = directa
        ? await servicioEvidenciasEvaluacionDirecta.desactivar(
            evidenciaId,
            usuario
          )
        : await servicioEvidenciasEvaluacion.desactivar(
            evidenciaId,
            usuario
          );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
