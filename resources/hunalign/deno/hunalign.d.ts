export type Rung = [number, number, number];
export type Ladder = Rung[];
export declare class DenoHunalign {
    #private;
    private constructor();
    run(dictionary: Uint8Array, source: Uint8Array, target: Uint8Array): Ladder;
    runWithPaths(dictPath: string, sourcePath: string, targetPath: string): Promise<Ladder>;
    static createWithWasmBinary(wasmBinary: Uint8Array): Promise<DenoHunalign>;
    static createWithWasmPath(wasmPath: string): Promise<DenoHunalign>;
}
