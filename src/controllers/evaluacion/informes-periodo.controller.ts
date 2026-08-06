import type {
  Request,
  Response,
} from "express";

import { servicioPdfInformePeriodo } from "../../services/evaluacion/informe-periodo-pdf.service";
import {
  servicioInformesPeriodo,
  type GenerarInformePeriodoInput,
} from "../../services/evaluacion/informes-periodo.service";
import { validarAnio } from "../../utils/evaluacion";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

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

  descargarPdf: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { buffer, filename } =
        await servicioPdfInformePeriodo.generar(
          obtenerParametroRuta(req, "informeId"),
          obtenerUsuarioSesion(req)
        );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      res.setHeader("Content-Length", String(buffer.length));
      res.setHeader("Cache-Control", "private, no-store");
      res.status(200).send(buffer);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
