import type {
  Request,
  Response,
} from "express";

import { servicioPdfInformePeriodo } from "../../services/evaluacion/informe-periodo-pdf.service";
import {
  servicioInformesPeriodo,
  type GenerarInformePeriodoInput,
} from "../../services/evaluacion/informes-periodo.service";
import {
  construirCorteAnual,
  servicioPeriodosEvaluacion,
} from "../../services/evaluacion/periodos-evaluacion.service";
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

function esRegistro(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function usaFuenteEvaluacionesPorAspecto(snapshot: unknown): boolean {
  if (!esRegistro(snapshot) || !esRegistro(snapshot.fuente)) {
    return false;
  }

  return snapshot.fuente.modelo === "EVALUACIONES_POR_ASPECTO";
}

function adaptarFuentePdfDirecta(buffer: Buffer): Buffer {
  const original = buffer.toString("latin1");
  const adaptado = original.replace(
    /Fuente: ([0-9]+) gestiones y/g,
    "Fuente: $1 registros y"
  );

  // "gestiones" y "registros" tienen la misma longitud. Mantener el número
  // exacto de bytes conserva válidos los offsets/xref del PDF histórico.
  if (adaptado.length !== original.length) {
    throw new Error(
      "No fue posible adaptar de forma segura la presentación de la fuente del PDF."
    );
  }

  return Buffer.from(adaptado, "latin1");
}

export const controladorInformesPeriodo = {
  listar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const anio = obtenerAnio(req);
      const resultado = await servicioInformesPeriodo.listar(
        obtenerParametroRuta(req, "empresaId"),
        anio,
        obtenerUsuarioSesion(req)
      );

      if (!resultado.periodo) {
        res.status(200).json(resultado);
        return;
      }

      const fechaCorte = construirCorteAnual(anio);
      const versionAplicable =
        await servicioPeriodosEvaluacion.resolverVersionParaFecha(
          fechaCorte
        );

      res.status(200).json({
        ...resultado,
        fechaCorte: fechaCorte.toISOString(),
        periodo: {
          ...resultado.periodo,
          versionSupermatriz: {
            id: versionAplicable.id,
            nombre: versionAplicable.nombre,
          },
        },
      });
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
      const informeId = obtenerParametroRuta(req, "informeId");
      const usuario = obtenerUsuarioSesion(req);
      const [{ buffer, filename }, detalle] = await Promise.all([
        servicioPdfInformePeriodo.generar(informeId, usuario),
        servicioInformesPeriodo.obtenerDetalle(informeId, usuario),
      ]);
      const bufferPresentacion = usaFuenteEvaluacionesPorAspecto(
        detalle.snapshot
      )
        ? adaptarFuentePdfDirecta(buffer)
        : buffer;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      res.setHeader("Content-Length", String(bufferPresentacion.length));
      res.setHeader("Cache-Control", "private, no-store");
      res.status(200).send(bufferPresentacion);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};