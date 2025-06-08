import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

export const metadata = {
  title: "Log Viewer",
  description: "A modern log viewer web application",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <div className="flex-1 flex flex-col">
            {children}
            <Toaster />
          </div>
          <footer className="w-full py-3 bg-background text-center text-sm text-muted-foreground">
            Created with <span className="mx-1">❤️</span> by Mubashir Ahmed Siddiqui and Umar Anzar
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
