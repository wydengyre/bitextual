export type Rung = [number, number, number];
export type Ladder = Rung[];
export declare class Hunalign {
	private constructor();
	run(dictionary: Uint8Array, source: Uint8Array, target: Uint8Array): Ladder;
	static create(wasmBinary?: Uint8Array): Promise<Hunalign>;
}
