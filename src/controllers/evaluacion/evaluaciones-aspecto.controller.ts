import type {
  Request,
  Response,
} from "express";

import { servicioEvaluacionesAspecto } from "../../services/evaluacion/evaluaciones-aspecto.service";
import type { GuardarEvaluacionesLoteInput } from "../../types/evaluacion.types";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./controller.utils";

export const controladorEvaluacionesAspecto = {
  guardarLote: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const gestionId = obtenerParametroRuta(
        req,
        "gestionId"
      );

      const resultado =
        await servicioEvaluacionesAspecto.guardarLote(
          gestionId,
          req.body as GuardarEvaluacionesLoteInput,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
