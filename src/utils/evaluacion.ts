import { Prisma } from "@prisma/client";

export class ErrorEvaluacion extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = "ERROR_EVALUACION"
  ) {
    super(message);
    this.name = "ErrorEvaluacion";
  }
}

export function convertirFecha(
  value: string | null | undefined,
  fieldName: string,
  required = false
): Date | null {
  if (!value) {
    if (required) {
      throw new ErrorEvaluacion(
        `El campo ${fieldName} es obligatorio.`
      );
    }

    return null;
  }

  const date = new Date(`${value.slice(0, 10)}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new ErrorEvaluacion(
      `El campo ${fieldName} no contiene una fecha válida.`
    );
  }

  return date;
}

export function comoJsonPrismaEvaluacion(
  value: unknown
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) => {
      if (currentValue instanceof Date) {
        return currentValue.toISOString();
      }

      if (
        currentValue &&
        typeof currentValue === "object" &&
        "toNumber" in currentValue &&
        typeof currentValue.toNumber === "function"
      ) {
        return currentValue.toNumber();
      }

      return currentValue;
    })
  ) as Prisma.InputJsonValue;
}

export function validarAnio(anio: number): void {
  if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) {
    throw new ErrorEvaluacion(
      "El año del periodo debe estar entre 2020 y 2100."
    );
  }
}
