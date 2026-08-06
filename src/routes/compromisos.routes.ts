import {
  RolUsuario,
} from "@prisma/client";
import { Router } from "express";

import { controladorConsultaCompromisos } from "../controllers/compromisos/consulta-compromisos.controller";
import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesBandejaInterna = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
];

router.use(autenticar);

router.get(
  "/",
  autorizar(...rolesBandejaInterna),
  controladorConsultaCompromisos.listar
);

router.get(
  "/:compromisoId",
  autorizar(...rolesBandejaInterna),
  controladorConsultaCompromisos.obtenerDetalle
);

export default router;
