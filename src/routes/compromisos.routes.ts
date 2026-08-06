import {
  RolUsuario,
} from "@prisma/client";
import { Router } from "express";

import { controladorConsultaCompromisos } from "../controllers/compromisos/consulta-compromisos.controller";
import { controladorOperacionCompromisos } from "../controllers/compromisos/operacion-compromisos.controller";
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

router.post(
  "/:compromisoId/seguimientos",
  autorizar(...rolesBandejaInterna),
  controladorOperacionCompromisos.crearSeguimiento
);

router.patch(
  "/:compromisoId/actividades/:actividadId",
  autorizar(...rolesBandejaInterna),
  controladorOperacionCompromisos.cambiarActividad
);

router.post(
  "/:compromisoId/evidencias",
  autorizar(...rolesBandejaInterna),
  controladorOperacionCompromisos.crearEvidencia
);

router.post(
  "/:compromisoId/rechazar-asignacion",
  autorizar(...rolesBandejaInterna),
  controladorOperacionCompromisos.rechazarAsignacion
);

router.post(
  "/:compromisoId/reasignaciones",
  autorizar(...rolesBandejaInterna),
  controladorOperacionCompromisos.reasignar
);

router.post(
  "/:compromisoId/solicitudes-cierre",
  autorizar(...rolesBandejaInterna),
  controladorOperacionCompromisos.solicitarCierre
);

router.post(
  "/:compromisoId/solicitudes-cierre/:solicitudId/decision",
  autorizar(...rolesBandejaInterna),
  controladorOperacionCompromisos.decidirCierre
);

export default router;
