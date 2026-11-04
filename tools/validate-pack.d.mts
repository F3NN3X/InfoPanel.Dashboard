/** Types for tools/validate-pack.mjs (tests/looks/validator.test.ts reads the built-in packs through it). */
import type { PackFile, PackSource } from "../src/looks/pack-validate";
export function readPackDir(dir: string, skip?: RegExp): PackSource & { files: PackFile[] };
export function loadValidator(): Promise<typeof import("../src/looks/pack-validate")>;
