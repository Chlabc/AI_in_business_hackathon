/** Commission display; existing helper names retained for caller compatibility. */
export function seatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${Number(n.toFixed(3))}%`;
}

/** Long form, for the first mention on a page. */
export function seatPriceFull(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${seatPrice(n)} commission`;
}
