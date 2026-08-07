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

const rolesSupervision = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
];

const rolesParticipacionInterna = [
  ...rolesSupervision,
  RolUsuario.PROFESIONAL,
];

const rolesParticipacion = [
  ...rolesParticipacionInterna,
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
];

router.use(autenticar);

router.get(
  "/alertas",
  autorizar(...rolesParticipacion),
  controladorConsultaCompromisos.listarAlertas
);

router.get(
  "/",
  autorizar(...rolesParticipacion),
  controladorConsultaCompromisos.listar
);

router.get(
  "/:compromisoId",
  autorizar(...rolesParticipacion),
  controladorConsultaCompromisos.obtenerDetalle
);

router.post(
  "/:compromisoId/seguimientos",
  autorizar(...rolesParticipacion),
  controladorOperacionCompromisos.crearSeguimiento
);

router.patch(
  "/:compromisoId/actividades/:actividadId",
  autorizar(...rolesParticipacion),
  controladorOperacionCompromisos.cambiarActividad
);

router.post(
  "/:compromisoId/evidencias",
  autorizar(...rolesParticipacion),
  controladorOperacionCompromisos.crearEvidencia
);

router.post(
  "/:compromisoId/rechazar-asignacion",
  autorizar(...rolesParticipacionInterna),
  controladorOperacionCompromisos.rechazarAsignacion
);

router.post(
  "/:compromisoId/reasignaciones",
  autorizar(...rolesSupervision),
  controladorOperacionCompromisos.reasignar
);

router.post(
  "/:compromisoId/solicitudes-cierre",
  autorizar(...rolesParticipacion),
  controladorOperacionCompromisos.solicitarCierre
);

router.post(
  "/:compromisoId/solicitudes-cierre/:solicitudId/decision",
  autorizar(...rolesSupervision),
  controladorOperacionCompromisos.decidirCierre
);

export default router;
