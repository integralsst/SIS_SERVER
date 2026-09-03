import { RolUsuario } from "@prisma/client";
import { Router } from "express";

import { controladorAnalisisBitacora } from "../controllers/bitacora/analisis-bitacora.controller";
import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesBitacoraInterna = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.PROFESIONAL,
  RolUsuario.COORDINADOR,
];

router.use(autenticar);

router.post(
  "/empresas/:empresaId/analisis-shadow",
  autorizar(...rolesBitacoraInterna),
  controladorAnalisisBitacora.shadow
);

export default router;
