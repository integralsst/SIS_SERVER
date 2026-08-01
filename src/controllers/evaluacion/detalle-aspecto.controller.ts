import type {
  Request,
  Response,
} from "express";

import { servicioDetalleAspecto } from "../../services/evaluacion/detalle-aspecto.service";
import { validarAnio } from "../../utils/evaluacion";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./controller.utils";

export const controladorDetalleAspecto = {
  obtener: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroRuta(
        req,
        "empresaId"
      );
      const tareaId = Number(
        obtenerParametroRuta(req, "tareaId")
      );
      const anioQuery = Array.isArray(req.query.anio)
        ? req.query.anio[0]
        : req.query.anio;
      const anio = Number(
        typeof anioQuery === "string"
          ? anioQuery
          : new Date().getFullYear()
      );

      if (!Number.isInteger(tareaId) || tareaId <= 0) {
        throw new Error(
          "El identificador de la fila no es válido."
        );
      }

      validarAnio(anio);

      const resultado =
        await servicioDetalleAspecto.obtener(
          empresaId,
          tareaId,
          anio,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
