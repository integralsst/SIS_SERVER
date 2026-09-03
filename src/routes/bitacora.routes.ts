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

router.get(
  "/empresas/:empresaId/registros",
  autorizar(...rolesBitacoraInterna),
  controladorAnalisisBitacora.listar
);

router.post(
  "/empresas/:empresaId/registros",
  autorizar(...rolesBitacoraInterna),
  controladorAnalisisBitacora.guardarAnalizar
);

router.post(
  "/empresas/:empresaId/registros/:registroId/aplicar",
  autorizar(...rolesBitacoraInterna),
  controladorAnalisisBitacora.aplicarTodo
);

export default router;
