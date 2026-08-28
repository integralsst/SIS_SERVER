import type {
  Request,
  Response,
} from "express";

import { enriquecerContextoConEstadoEvidencia } from "../../services/evaluacion/estado-evidencia-aspecto.service";
import { servicioMatrizEvaluacionDirecta } from "../../services/evaluacion/matriz-evaluacion-directa.service";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

export const controladorContextoEvaluacionDirecta = {
  obtener: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroRuta(req, "empresaId");
      const anioSolicitado = Array.isArray(req.query.anio)
        ? req.query.anio[0]
        : req.query.anio;
      const anio =
        typeof anioSolicitado === "string"
          ? Number(anioSolicitado)
          : new Date().getFullYear();

      const contexto =
        await servicioMatrizEvaluacionDirecta.obtenerContexto(
          empresaId,
          anio,
          obtenerUsuarioSesion(req)
        );
      const resultado =
        await enriquecerContextoConEstadoEvidencia(contexto);

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};