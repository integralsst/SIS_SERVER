import type {
  Request,
  Response,
} from "express";

import { servicioAprobacionGestion } from "../../services/evaluacion/aprobaciones/aprobacion-gestion.service";
import { normalizarDecisionAprobacionGestion } from "../../validators/evaluacion/aprobacion-gestion.validator";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

export const controladorAprobacionesGestion = {
  listarPeriodo: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await servicioAprobacionGestion.listarPeriodo(
          obtenerParametroRuta(req, "periodoId"),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  decidir: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await servicioAprobacionGestion.decidir(
          obtenerParametroRuta(req, "aprobacionId"),
          normalizarDecisionAprobacionGestion(req.body),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
