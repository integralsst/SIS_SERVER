import {
  EstadoCompromiso,
  type Compromiso,
} from "@prisma/client";

export const ESTADOS_COMPROMISO_ABIERTO: EstadoCompromiso[] = [
  EstadoCompromiso.EN_EJECUCION,
  EstadoCompromiso.PENDIENTE_DE_REASIGNACION,
  EstadoCompromiso.SOLICITUD_DE_CIERRE,
];

interface AspectoIdentificable {
  id: number;
  codigo: string | null;
  nombre: string;
}

type CompromisoIdentificable = Pick<
  Compromiso,
  "aspectoId" | "aspectoCodigo"
> & {
  aspecto: {
    nombre: string;
  };
};

function normalizarTextoIdentidad(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
}

export function correspondeAlMismoAspecto(
  compromiso: CompromisoIdentificable,
  aspecto: AspectoIdentificable
): boolean {
  const codigoCompromiso =
    compromiso.aspectoCodigo?.trim();
  const codigoAspecto = aspecto.codigo?.trim();

  if (codigoCompromiso && codigoAspecto) {
    return (
      normalizarTextoIdentidad(codigoCompromiso) ===
      normalizarTextoIdentidad(codigoAspecto)
    );
  }

  if (compromiso.aspectoId === aspecto.id) {
    return true;
  }

  return (
    normalizarTextoIdentidad(
      compromiso.aspecto.nombre
    ) === normalizarTextoIdentidad(aspecto.nombre)
  );
}
