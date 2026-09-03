import type { Request, Response } from "express";

import { analizarBitacoraShadow } from "../../services/bitacora/bitacora-shadow.service";
import type { CrearRegistroBitacoraInput } from "../../types/bitacora.types";
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
};
