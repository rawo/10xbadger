import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Props {
  templateId?: string;
}

export function PromotionCreateView({ templateId }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) return;

    const createPromotion = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template_id: templateId }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ message: "Failed to create promotion" }));
          throw new Error(err.message || "Failed to create promotion");
        }

        const promotion = await response.json();
        // Navigate to promotion builder/detail page
        window.location.href = `/promotions/${promotion.id}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create promotion";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    };

    createPromotion();
  }, [templateId]);

  if (!templateId) {
    return (
      <div className="container mx-auto px-4 py-8">No template selected. Please go back and choose a template.</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Creating promotion from template…</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Please wait — creating draft promotion.</p>}
        {error && <p className="text-sm text-destructive">Error: {error}</p>}
      </div>
    </div>
  );
}
