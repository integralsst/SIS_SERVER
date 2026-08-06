import type {
  Request,
  Response,
} from "express";

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
