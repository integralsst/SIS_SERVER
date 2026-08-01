import type {
  Request,
  Response,
} from "express";

import { servicioMatrizEvaluacion } from "../../services/evaluacion/matriz-evaluacion.service";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./controller.utils";

export const controladorContextoEvaluacion = {
  obtener: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroRuta(
        req,
        "empresaId"
      );

      const anioSolicitado = Array.isArray(req.query.anio)
        ? req.query.anio[0]
        : req.query.anio;

      const anio =
        anioSolicitado != null &&
        typeof anioSolicitado === "string"
          ? Number(anioSolicitado)
          : new Date().getFullYear();

      const resultado =
        await servicioMatrizEvaluacion.obtenerContexto(
          empresaId,
          anio,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
