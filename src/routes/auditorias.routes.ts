import { RolUsuario } from "@prisma/client";
import { Router } from "express";

import { controladorAuditorias } from "../controllers/auditorias/auditorias.controller";
import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesLectura = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
];

const rolesGobierno = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
];

const rolesSeguimiento = [...rolesGobierno, RolUsuario.PROFESIONAL];

router.use(autenticar);
router.use(autorizar(...rolesLectura));

router.get("/", controladorAuditorias.listar);
router.get(
  "/empresas/:empresaId/contexto",
  controladorAuditorias.contextoEmpresa
);
router.post(
  "/",
  autorizar(...rolesGobierno),
  controladorAuditorias.crear
);
router.get("/:auditoriaId", controladorAuditorias.obtenerDetalle);
router.patch(
  "/:auditoriaId",
  autorizar(...rolesGobierno),
  controladorAuditorias.actualizar
);
router.patch(
  "/:auditoriaId/estado",
  autorizar(...rolesGobierno),
  controladorAuditorias.cambiarEstado
);
router.post(
  "/:auditoriaId/hallazgos",
  autorizar(...rolesGobierno),
  controladorAuditorias.crearHallazgo
);
router.patch(
  "/hallazgos/:hallazgoId",
  autorizar(...rolesGobierno),
  controladorAuditorias.actualizarHallazgo
);
router.post(
  "/hallazgos/:hallazgoId/recomendaciones",
  autorizar(...rolesGobierno),
  controladorAuditorias.crearRecomendacion
);
router.patch(
  "/recomendaciones/:recomendacionId",
  autorizar(...rolesGobierno),
  controladorAuditorias.actualizarRecomendacion
);
router.post(
  "/hallazgos/:hallazgoId/seguimientos",
  autorizar(...rolesSeguimiento),
  controladorAuditorias.registrarSeguimiento
);

export default router;
