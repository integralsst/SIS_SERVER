import { RolUsuario } from "@prisma/client";
import { Router } from "express";

import { controladorContextoEvaluacion } from "../controllers/evaluacion/contexto-evaluacion.controller";
import { controladorEvaluacionesAspecto } from "../controllers/evaluacion/evaluaciones-aspecto.controller";
import { controladorGestionesSgsst } from "../controllers/evaluacion/gestiones-sgsst.controller";
import { controladorPeriodosEvaluacion } from "../controllers/evaluacion/periodos-evaluacion.controller";
import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesLectura = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.PROFESIONAL,
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
];

const rolesEvaluacion = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.PROFESIONAL,
];

router.use(autenticar);

router.get(
  "/empresas/:empresaId/contexto",
  autorizar(...rolesLectura),
  controladorContextoEvaluacion.obtener
);

router.post(
  "/empresas/:empresaId/periodos",
  autorizar(...rolesEvaluacion),
  controladorPeriodosEvaluacion.abrir
);

router.post(
  "/periodos/:periodoId/gestiones",
  autorizar(...rolesEvaluacion),
  controladorGestionesSgsst.crear
);

router.put(
  "/gestiones/:gestionId/evaluaciones",
  autorizar(...rolesEvaluacion),
  controladorEvaluacionesAspecto.guardarLote
);

router.post(
  "/gestiones/:gestionId/finalizar",
  autorizar(...rolesEvaluacion),
  controladorGestionesSgsst.finalizar
);

export default router;
