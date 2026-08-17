import type {
  Request,
  Response,
} from "express";

import { asegurarCapacidadParticipanteGestion } from "../../../services/evaluacion/acceso-evaluacion.service";
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
      const gestionId = obtenerParametroRuta(req, "gestionId");
      const usuario = obtenerUsuarioSesion(req);

      await asegurarCapacidadParticipanteGestion(
        usuario,
        gestionId,
        "LIDER"
      );

      const resultado =
        await servicioPreparacionFinalizacion.obtener(
          gestionId,
          usuario
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
      const gestionId = obtenerParametroRuta(req, "gestionId");
      const usuario = obtenerUsuarioSesion(req);

      await asegurarCapacidadParticipanteGestion(
        usuario,
        gestionId,
        "LIDER"
      );

      const resultado =
        await servicioFinalizacionObligatoria.finalizar(
          gestionId,
          req.body,
          usuario
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
