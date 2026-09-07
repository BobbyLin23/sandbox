const BILLION = 1_000_000_000

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function formatCredits(amount: number) {
  return formatter.format(amount / BILLION)
}
