import type { Request, Response } from "express";

import {
  servicioEvaluacionDirecta,
  type GuardarEvaluacionesDirectasInput,
} from "../../services/evaluacion/evaluacion-directa.service";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

export const controladorEvaluacionDirecta = {
  guardarLote: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroRuta(
        req,
        "empresaId"
      );

      const resultado =
        await servicioEvaluacionDirecta.guardarLote(
          empresaId,
          req.body as GuardarEvaluacionesDirectasInput,
          obtenerUsuarioSesion(req)
        );

      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
