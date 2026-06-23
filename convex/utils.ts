export function normalizePaymentMethod(method: string): string {
  if (method === "M-Pesa") return "M-Pesa";
  if (method === "e-Mola") return "e-Mola";
  if (method === "BCI") return "BCI";
  if (method === "BIM Cash" || method === "BIM") return "BIM Cash";
  if (method === "Card") return "Card";
  return "Cash";
}
