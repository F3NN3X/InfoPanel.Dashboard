/** Types for tools/widgets/generate.mjs (its tests compare the generated files with the tree and check each widget folder). */
export declare function generate(): Promise<Map<string, string>>;
export declare function widgetFolders(): string[];
export declare function readmeSections(text: string): Record<string, string>;
export declare function kebab(id: string): string;
export declare const README_SECTIONS: readonly string[];
