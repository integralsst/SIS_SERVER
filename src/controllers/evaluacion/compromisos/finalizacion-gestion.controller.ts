import type {
  Request,
  Response,
} from "express";

import { servicioFinalizacionObligatoria } from "../../../services/evaluacion/compromisos/finalizacion-obligatoria.service";
import { servicioPreparacionFinalizacion } from "../../../services/evaluacion/compromisos/preparacion-finalizacion.service";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "../shared/evaluacion-controller.utils";

export const controladorFinalizacionGestion = {
  preparar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await servicioPreparacionFinalizacion.obtener(
          obtenerParametroRuta(req, "gestionId"),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  finalizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await servicioFinalizacionObligatoria.finalizar(
          obtenerParametroRuta(req, "gestionId"),
          req.body,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
