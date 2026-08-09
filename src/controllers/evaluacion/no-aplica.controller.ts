import type {
  Request,
  Response,
} from "express";

import { servicioNoAplica } from "../../services/evaluacion/no-aplica/no-aplica.service";
import { normalizarDecisionNoAplica } from "../../validators/evaluacion/no-aplica.validator";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

export const controladorNoAplica = {
  listarPeriodo: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado = await servicioNoAplica.listarPeriodo(
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
      const resultado = await servicioNoAplica.decidir(
        obtenerParametroRuta(req, "decisionId"),
        normalizarDecisionNoAplica(req.body),
        obtenerUsuarioSesion(req)
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
