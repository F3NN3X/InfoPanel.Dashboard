import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, Trash2, FileArchive } from "lucide-react";
import type { AppearancePreset } from "@/lib/appearance-presets";
import { cn } from "@/lib/utils";
import { checkImport, describeIssue, filesOfInput, removePack, storePack, type ImportReport } from "@/looks/user-pack-import";
import { listUserPacks, registerUserPacks, type UserPackInfo } from "@/looks/user-packs";
import { Card, FOCUS } from "./look-card";
import { lookPreset } from "./look-gallery-model";

const HEADING = "font-ui-mono text-nano uppercase tracking-[0.08em] text-ui-hint";
const BUTTON = cn("flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ui-strong px-3 text-caption text-ui-1 hover:bg-ui-hover", FOCUS);

export interface UserPacksProps {
  /** The Look the level shows (its pack's card is ringed). */
  currentLookId: string;
  /** Apply a pack as the level's Look (the gallery's pick). */
  onPick: (preset: AppearancePreset) => void;
  /** Takes the pack off every level that wears it (Classic is drawn there) and says how many there were. */
  onRemove: (id: string) => number;
}

/**
 * Your packs: the theme packs in the app data folder, beside the built-in Looks. A pack comes in as a folder or a zip, is
 * checked by the validator (errors refuse it, warnings are shown) and is stored by the server. Sharing a pack is off.
 */
export function UserPacks({ currentLookId, onPick, onRemove }: UserPacksProps) {
  const [packs, setPacks] = useState<UserPackInfo[]>([]);
  const [report, setReport] = useState<(ImportReport & { stored?: boolean }) | undefined>();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const folder = useRef<HTMLInputElement>(null);
  const zip = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    await registerUserPacks();
    setPacks(await listUserPacks());
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const take = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    setNotice("");
    try {
      const checked = checkImport(await filesOfInput(list));
      const refused = checked.ok ? await storePack(checked) : undefined;
      setReport({ ...checked, stored: checked.ok && !refused, issues: refused ? [...checked.issues, { rule: "store", severity: "error", file: "", message: refused }] : checked.issues, ok: checked.ok && !refused });
      if (checked.ok && !refused) await refresh();
    } catch (e) {
      setReport({ ok: false, issues: [{ rule: "read", severity: "error", file: "", message: `The pack could not be read: ${(e as Error).message}` }] });
    } finally {
      setBusy(false);
      if (folder.current) folder.current.value = "";
      if (zip.current) zip.current.value = "";
    }
  };

  const remove = async (p: UserPackInfo) => {
    // the folder goes first: a places-that-wore-it edit is made only once the pack is really gone
    if (!(await removePack(p.id))) return setNotice(`Couldn't remove ${p.name}. It is still stored, and nothing that wears it was changed.`);
    const worn = onRemove(p.id);
    setNotice(worn > 0 ? `Removed ${p.name}. ${worn === 1 ? "A place that wore it now draws" : `${worn} places that wore it now draw`} Classic.` : `Removed ${p.name}.`);
    setReport(undefined);
    setPacks(await listUserPacks());
  };

  const errors = report?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings = report?.issues.filter((i) => i.severity === "warn") ?? [];
  return (
    <section aria-label="Your packs" data-user-packs className="flex flex-col gap-2.5">
      <h3 className={cn(HEADING, "pt-1")}>Your packs · {packs.length}</h3>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => folder.current?.click()} className={BUTTON}>
          <FolderOpen className="h-3.5 w-3.5" aria-hidden />
          Import a folder
        </button>
        <button type="button" disabled={busy} onClick={() => zip.current?.click()} className={BUTTON}>
          <FileArchive className="h-3.5 w-3.5" aria-hidden />
          Import a zip
        </button>
        <input ref={folder} type="file" multiple hidden data-pack-folder aria-label="Pack folder" {...{ webkitdirectory: "" }} onChange={(e) => void take(e.currentTarget.files)} />
        <input ref={zip} type="file" accept=".zip,application/zip" hidden data-pack-zip aria-label="Pack zip" onChange={(e) => void take(e.currentTarget.files)} />
      </div>
      <p className="text-micro text-ui-hint">A pack is checked before it is stored. It holds its own fonts and images and no style sheet. Sharing packs is off.</p>
      {report && (
        <div role={errors.length > 0 ? "alert" : "status"} data-pack-report className="flex flex-col gap-1 rounded-lg border border-ui-strong bg-ui-panel px-3 py-2 text-caption text-ui-1">
          <span className="font-semibold">{errors.length > 0 ? "This pack can't be imported." : report.stored ? `Imported ${report.name ?? report.id}.` : "Checked."}</span>
          {errors.map((i, k) => (
            <span key={`e${k}`} data-pack-issue="error" className="text-ui-hint">
              {describeIssue(i)}
            </span>
          ))}
          {warnings.map((i, k) => (
            <span key={`w${k}`} data-pack-issue="warn" className="text-ui-hint">
              Note: {describeIssue(i)}
            </span>
          ))}
        </div>
      )}
      {notice && (
        <p role="status" className="text-caption text-ui-1">
          {notice}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {packs.map((p) => (
          <div key={p.id} className="flex flex-col gap-1">
            <Card look={{ id: p.id, name: p.name, tags: ["your pack"], preset: lookPreset({ id: p.id, name: p.name, description: "" }) }} selected={p.id === currentLookId} onPick={() => onPick(lookPreset({ id: p.id, name: p.name, description: "" }))} />
            <button type="button" onClick={() => void remove(p)} aria-label={`Remove ${p.name}`} className={cn("flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-ui-strong text-caption text-ui-soft hover:bg-ui-hover hover:text-ui-1", FOCUS)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default UserPacks;
