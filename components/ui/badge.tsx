import { cn, bandBg } from "@/lib/utils";

type Band = "low" | "medium" | "high";

interface BadgeProps {
  band: Band;
  label?: string;
  className?: string;
}

export function BandBadge({ band, label, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border",
        bandBg(band),
        className
      )}
    >
      {label ?? band.charAt(0).toUpperCase() + band.slice(1)}
    </span>
  );
}

interface StatusBadgeProps {
  status: "open" | "closed" | "escalated";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    open: "bg-primary/10 text-primary border-primary/20",
    closed: "bg-muted text-muted-foreground border-border",
    escalated: "bg-warning/10 text-warning border-warning/20",
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border",
        styles,
        className
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
