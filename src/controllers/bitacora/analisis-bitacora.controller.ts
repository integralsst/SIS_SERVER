import type { Request, Response } from "express";

import { aplicarBitacoraCompleta } from "../../services/bitacora/bitacora-aplicacion.service";
import { generarPdfHistorialBitacora } from "../../services/bitacora/bitacora-historial-pdf.service";
import { listarHistorialBitacoraUnificado } from "../../services/bitacora/bitacora-historial-unificado.service";
import { guardarYAnalizarBitacoraOperativa } from "../../services/bitacora/bitacora-operativa.service";
import { listarBitacorasEmpresa } from "../../services/bitacora/bitacora-registros.service";
import { analizarBitacoraShadow } from "../../services/bitacora/bitacora-shadow.service";
import type {
  AplicarRegistroBitacoraInput,
  CrearRegistroBitacoraInput,
} from "../../types/bitacora.types";
import {
  obtenerParametroBitacora,
  obtenerUsuarioSesionBitacora,
  responderErrorBitacora,
} from "./bitacora-controller.utils";

export const controladorAnalisisBitacora = {
  shadow: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroBitacora(req, "empresaId");

      const resultado = await analizarBitacoraShadow(
        empresaId,
        req.body as CrearRegistroBitacoraInput,
        obtenerUsuarioSesionBitacora(req)
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorBitacora(error, res);
    }
  },

  guardarAnalizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroBitacora(req, "empresaId");
      const resultado = await guardarYAnalizarBitacoraOperativa(
        empresaId,
        req.body as CrearRegistroBitacoraInput,
        obtenerUsuarioSesionBitacora(req)
      );

      res.status(201).json(resultado);
    } catch (error) {
      responderErrorBitacora(error, res);
    }
  },

  listar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroBitacora(req, "empresaId");
      const resultado = await listarBitacorasEmpresa(
        empresaId,
        obtenerUsuarioSesionBitacora(req)
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorBitacora(error, res);
    }
  },

  historial: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroBitacora(req, "empresaId");
      const resultado = await listarHistorialBitacoraUnificado(
        empresaId,
        obtenerUsuarioSesionBitacora(req)
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorBitacora(error, res);
    }
  },

  descargarPdf: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroBitacora(req, "empresaId");
      const { buffer, filename } = await generarPdfHistorialBitacora(
        empresaId,
        obtenerUsuarioSesionBitacora(req)
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
      responderErrorBitacora(error, res);
    }
  },

  aplicarTodo: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroBitacora(req, "empresaId");
      const registroId = obtenerParametroBitacora(req, "registroId");
      const resultado = await aplicarBitacoraCompleta(
        empresaId,
        registroId,
        (req.body ?? {}) as AplicarRegistroBitacoraInput,
        obtenerUsuarioSesionBitacora(req)
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorBitacora(error, res);
    }
  },
};
