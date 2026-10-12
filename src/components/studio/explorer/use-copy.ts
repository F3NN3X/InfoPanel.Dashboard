import { useToast } from "@/components/ui/toast";

/** Copy text to the clipboard and toast "Copied to clipboard". */
export function useCopy(): (text: string) => void {
  const toast = useToast();
  return (text) => {
    void navigator.clipboard?.writeText(text).then(
      () => toast("Copied to clipboard"),
      () => {}
    );
  };
}
