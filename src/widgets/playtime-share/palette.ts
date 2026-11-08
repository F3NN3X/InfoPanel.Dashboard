// Playtime Share's slice colours, apart from its catalog entry: `hue` lives in a module with value imports, which a meta.ts may not read.
import { hue } from "../core/tokens";

export const PALETTE = [hue(0), hue(70), hue(140), hue(210), hue(280), "rgba(255,255,255,0.35)"];
