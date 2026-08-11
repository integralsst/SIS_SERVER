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

router.use(autenticar);
router.use(autorizar(...rolesLectura));

router.get("/", controladorAuditorias.listar);
router.get(
  "/empresas/:empresaId/contexto",
  controladorAuditorias.contextoEmpresa
);
router.post("/", controladorAuditorias.crear);
router.get("/:auditoriaId", controladorAuditorias.obtenerDetalle);
router.patch("/:auditoriaId", controladorAuditorias.actualizar);
router.patch(
  "/:auditoriaId/estado",
  controladorAuditorias.cambiarEstado
);
router.post(
  "/:auditoriaId/hallazgos",
  controladorAuditorias.crearHallazgo
);
router.patch(
  "/hallazgos/:hallazgoId",
  controladorAuditorias.actualizarHallazgo
);
router.post(
  "/hallazgos/:hallazgoId/recomendaciones",
  controladorAuditorias.crearRecomendacion
);
router.patch(
  "/recomendaciones/:recomendacionId",
  controladorAuditorias.actualizarRecomendacion
);
router.post(
  "/hallazgos/:hallazgoId/seguimientos",
  controladorAuditorias.registrarSeguimiento
);

export default router;
