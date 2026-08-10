import { RolUsuario } from "@prisma/client";
import { Router } from "express";

import { controladorCentroAcciones } from "../controllers/alertas/centro-acciones.controller";
import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesCentroAcciones = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
];

router.use(autenticar);
router.use(autorizar(...rolesCentroAcciones));

router.get("/resumen", controladorCentroAcciones.resumen);
router.get("/empresas", controladorCentroAcciones.listarEmpresas);
router.get(
  "/empresas/:empresaId",
  controladorCentroAcciones.listarAccionesEmpresa
);

export default router;
