import type { Request, Response } from "express";

import { aplicarBitacoraCompleta } from "../../services/bitacora/bitacora-aplicacion.service";
import {
  guardarYAnalizarBitacora,
  listarBitacorasEmpresa,
} from "../../services/bitacora/bitacora-registros.service";
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
      const resultado = await guardarYAnalizarBitacora(
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
