import type {
  Request,
  Response,
} from "express";

import { servicioLogicaEvaluacionAspecto } from "../../services/supermatriz/logica-evaluacion-aspecto.service";
import {
  enteroRequerido,
  responderErrorSupermatriz,
  textoOpcional,
} from "../../utils/supermatriz";

export const controladorLogicaEvaluacionAspecto = {
  actualizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
        });
        return;
      }

      const resultado =
        await servicioLogicaEvaluacionAspecto.actualizar(
          Number(req.params.id),
          {
            versionSupermatrizId:
              enteroRequerido(
                req.body.versionSupermatrizId,
                "La versión"
              ),
            logicaEvaluacion:
              textoOpcional(
                req.body.logicaEvaluacion
              ),
          },
          req.user.usuarioId
        );

      res.json(resultado);
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "ASPECTO-LOGICA-EVALUACION"
      );
    }
  },
};
