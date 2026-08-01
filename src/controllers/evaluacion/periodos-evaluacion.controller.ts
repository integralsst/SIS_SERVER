import type {
  Request,
  Response,
} from "express";

import { servicioPeriodosEvaluacion } from "../../services/evaluacion/periodos-evaluacion.service";
import type { AbrirPeriodoEvaluacionInput } from "../../types/evaluacion.types";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./controller.utils";

export const controladorPeriodosEvaluacion = {
  abrir: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroRuta(
        req,
        "empresaId"
      );
      const data = req.body as AbrirPeriodoEvaluacionInput;

      const periodo =
        await servicioPeriodosEvaluacion.abrir(
          empresaId,
          {
            anio: Number(data.anio),
            versionSupermatrizId:
              data.versionSupermatrizId != null
                ? Number(data.versionSupermatrizId)
                : undefined,
          },
          obtenerUsuarioSesion(req)
        );

      res.status(201).json(periodo);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
