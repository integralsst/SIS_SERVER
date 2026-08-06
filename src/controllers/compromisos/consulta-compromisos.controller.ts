import type {
  Request,
  Response,
} from "express";

import { servicioConsultaCompromisos } from "../../services/compromisos/consulta-compromisos.service";
import { normalizarConsultaCompromisos } from "../../validators/compromisos/consulta-compromisos.validator";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "../evaluacion/shared/evaluacion-controller.utils";

export const controladorConsultaCompromisos = {
  listar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const consulta =
        normalizarConsultaCompromisos(
          req.query as Record<string, unknown>
        );

      const resultado =
        await servicioConsultaCompromisos.listar(
          consulta,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  obtenerDetalle: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await servicioConsultaCompromisos.obtenerDetalle(
          obtenerParametroRuta(
            req,
            "compromisoId"
          ),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
