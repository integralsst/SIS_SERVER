import type {
  Request,
  Response,
} from "express";

import {
  servicioInformesGlobales,
  type CategoriaInformeGlobal,
  type FiltrosInformesGlobales,
  type GrupoInformeGlobal,
} from "../../services/evaluacion/informes-globales.service";
import {
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./controller.utils";

function valorQuery(
  req: Request,
  nombre: string
): string | null {
  const value = req.query[nombre];
  const normalized = Array.isArray(value) ? value[0] : value;

  return typeof normalized === "string" && normalized.trim()
    ? normalized.trim()
    : null;
}

function numeroQuery(
  req: Request,
  nombre: string
): number | null {
  const value = valorQuery(req, nombre);

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function obtenerFiltros(req: Request): FiltrosInformesGlobales {
  return {
    buscar: valorQuery(req, "buscar"),
    empresaId: valorQuery(req, "empresaId"),
    anio: numeroQuery(req, "anio"),
    fechaDesde: valorQuery(req, "fechaDesde"),
    fechaHasta: valorQuery(req, "fechaHasta"),
    grupo: valorQuery(req, "grupo") as GrupoInformeGlobal | null,
    categoria: valorQuery(
      req,
      "categoria"
    ) as CategoriaInformeGlobal | null,
    pagina: numeroQuery(req, "pagina"),
    limite: numeroQuery(req, "limite"),
  };
}

export const controladorInformesGlobales = {
  listar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado = await servicioInformesGlobales.listar(
        obtenerFiltros(req),
        obtenerUsuarioSesion(req)
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};