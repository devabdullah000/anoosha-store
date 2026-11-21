/** SQLite CURRENT_TIMESTAMP is UTC even when no timezone suffix is present. */
export function formatOrderDate(value: string): string {
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return value;
  return (
    new Intl.DateTimeFormat("en-PK", {
      timeZone: "Asia/Karachi",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date) + " PKT"
  );
}
