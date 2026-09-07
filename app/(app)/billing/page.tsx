import { PricingTable } from "@clerk/nextjs"

export default function BillingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-4 py-2.5">
        <h1 className="text-sm font-semibold">Billing</h1>
      </header>
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <section>
          <p className="text-sm text-muted-foreground">Available credits</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
            $8.80
          </p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Credits cover the models that build and revise your games. A scene
            already in progress can finish below zero; the next build waits for
            more credits.
          </p>
        </section>
        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">
            Keep the studio running
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Builder adds $10.00 every month, and unused credits roll over.
          </p>
          <div className="mt-4">
            <PricingTable for="organization" />
          </div>
        </section>
      </div>
    </div>
  )
}
