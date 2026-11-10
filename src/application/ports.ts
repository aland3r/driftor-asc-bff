export const IPDD = Symbol('IpddClient');
export const PMINING = Symbol('PminingClient');
export const FN_ADWIN = Symbol('FnAdwinClient');
export const DOCUMENTATION = Symbol('DocumentationSource');
export const CLOCK = Symbol('Clock');

export interface IpddClient {
  getAnalysis(id: string): Promise<any | null>;
  listAnalyses(): Promise<any[]>;
}

export interface PminingClient {
  getProcess(id: string): Promise<any | null>;
  listProcesses(): Promise<any[]>;
}

export interface FnAdwinClient {
  detect(values: number[], treatment: 'raw' | 'treated', delta: number): Promise<any>;
  health(): Promise<boolean>;
}

export interface DocumentationSource {
  arc42(): Promise<string>;
}

export interface Clock {
  now(): number;
}
