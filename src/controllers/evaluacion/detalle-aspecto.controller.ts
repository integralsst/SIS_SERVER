import type {
  Request,
  Response,
} from "express";

import { servicioDetalleAspecto } from "../../services/evaluacion/detalle-aspecto.service";
import { validarAnio } from "../../utils/evaluacion";
import { finalizarMedicionHttp } from "../../utils/rendimiento";
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
    const inicio = process.hrtime.bigint();
    let empresaId = "desconocida";
    let tareaId = 0;
    let anio = new Date().getFullYear();

    try {
      empresaId = obtenerParametroRuta(
        req,
        "empresaId"
      );
      tareaId = Number(
        obtenerParametroRuta(req, "tareaId")
      );
      const anioQuery = Array.isArray(req.query.anio)
        ? req.query.anio[0]
        : req.query.anio;
      anio = Number(
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

      finalizarMedicionHttp(res, {
        nombre: "detalle-aspecto",
        inicio,
        resultado: "OK",
        contexto: {
          empresaId,
          tareaId,
          anio,
        },
      });

      res.status(200).json(resultado);
    } catch (error) {
      finalizarMedicionHttp(res, {
        nombre: "detalle-aspecto",
        inicio,
        resultado: "ERROR",
        contexto: {
          empresaId,
          tareaId,
          anio,
        },
      });

      responderErrorEvaluacion(error, res);
    }
  },
};
