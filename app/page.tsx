import { Suspense } from "react"
import LogViewer from "@/components/log-viewer"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Log Viewer</h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      <p className="text-muted-foreground">
        A powerful tool for viewing, filtering, and analyzing application logs across multiple services.
      </p>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <LogViewer />
      </Suspense>
    </div>
  )
}
