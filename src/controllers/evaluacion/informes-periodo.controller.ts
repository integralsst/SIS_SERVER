import type {
  Request,
  Response,
} from "express";

import {
  servicioInformesPeriodo,
  type GenerarInformePeriodoInput,
} from "../../services/evaluacion/informes-periodo.service";
import { validarAnio } from "../../utils/evaluacion";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./controller.utils";

function obtenerAnio(req: Request): number {
  const value = Array.isArray(req.query.anio)
    ? req.query.anio[0]
    : req.query.anio;
  const anio =
    typeof value === "string"
      ? Number(value)
      : new Date().getFullYear();

  validarAnio(anio);
  return anio;
}

export const controladorInformesPeriodo = {
  listar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado = await servicioInformesPeriodo.listar(
        obtenerParametroRuta(req, "empresaId"),
        obtenerAnio(req),
        obtenerUsuarioSesion(req)
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  generar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado = await servicioInformesPeriodo.generar(
        obtenerParametroRuta(req, "empresaId"),
        obtenerAnio(req),
        req.body as GenerarInformePeriodoInput,
        obtenerUsuarioSesion(req)
      );

      res.status(201).json(resultado);
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
        await servicioInformesPeriodo.obtenerDetalle(
          obtenerParametroRuta(req, "informeId"),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};