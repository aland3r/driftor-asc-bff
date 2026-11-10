/** Regras da composição: cada fonte responde ou vira null, e o motivo fica registrado. */

export type SourceName = 'ipdd' | 'pmining' | 'fnAdwin';

export interface SourceStatus {
  source: SourceName;
  ok: boolean;
  ms: number;
  error?: string;
}

export interface SourceResult<T> {
  value: T | null;
  status: SourceStatus;
}

export class NotFoundError extends Error {}
export class InvalidInputError extends Error {}

export function partial<T>(source: SourceName, started: number, now: number, value: T | null, error?: unknown): SourceResult<T> {
  return {
    value,
    status: {
      source,
      ok: error === undefined,
      ms: Math.round(now - started),
      ...(error === undefined ? {} : { error: error instanceof Error ? error.message : String(error) }),
    },
  };
}

/** Série que a Function devolve tratada, alinhada aos pontos da análise. */
export interface TreatedSeries {
  treatment: 'treated';
  smoothingWindow: number;
  processedValues: number[];
  outlierIndices: number[];
}
