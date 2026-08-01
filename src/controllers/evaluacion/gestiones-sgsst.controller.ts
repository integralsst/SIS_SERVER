import type {
  Request,
  Response,
} from "express";

import { servicioGestionesSgsst } from "../../services/evaluacion/gestiones-sgsst.service";
import type { CrearGestionSgsstInput } from "../../types/evaluacion.types";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./controller.utils";

export const controladorGestionesSgsst = {
  crear: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const periodoId = obtenerParametroRuta(
        req,
        "periodoId"
      );

      const gestion = await servicioGestionesSgsst.crear(
        periodoId,
        req.body as CrearGestionSgsstInput,
        obtenerUsuarioSesion(req)
      );

      res.status(201).json(gestion);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  finalizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const gestionId = obtenerParametroRuta(
        req,
        "gestionId"
      );

      const gestion =
        await servicioGestionesSgsst.finalizar(
          gestionId,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(gestion);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
