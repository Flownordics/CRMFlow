import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { useActivities } from "@/services/activity";
import { format } from "date-fns";

export function DealActivityList({ dealId }: { dealId: string }) {
  const { data, isLoading, error } = useActivities(dealId);

  if (isLoading) return <div>Loading…</div>;
  if (error) return <div role="alert" className="text-destructive">Failed to load activity</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground">No activity yet</div>;

  return (
    <ul className="space-y-2">
      {data.map((ev) => (
        <li key={ev.id} className="rounded-xl border p-2">
          <div className="text-xs text-muted-foreground">{format(new Date(ev.createdAt), "PPpp")}</div>
          <div className="text-sm">
            {ev.type === "stage_moved" && <>Stage changed to <b>{ev.meta?.to}</b></>}
            {ev.type === "doc_created" && <>Created <b>{ev.meta?.docType}</b> ({ev.meta?.id})</>}
            {ev.type !== "stage_moved" && ev.type !== "doc_created" && <>{ev.type}</>}
          </div>
        </li>
      ))}
    </ul>
  );
}
