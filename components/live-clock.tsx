"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"
import { useLocalStorage } from "@/hooks/use-local-storage"

export function LiveClock() {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState(new Date())
  const [timezone] = useLocalStorage("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [timeFormat] = useLocalStorage("timeFormat", "HH:mm:ss")
  const [dateFormat] = useLocalStorage("dateFormat", "yyyy-MM-dd")

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  function getFormattedTime(date: Date, format: string) {
    if (format === "HH:mm:ss") return date.toLocaleTimeString(undefined, { timeZone: timezone, hour12: false })
    if (format === "HH:mm") return date.toLocaleTimeString(undefined, { timeZone: timezone, hour12: false, second: undefined })
    if (format === "hh:mm:ss a") return date.toLocaleTimeString(undefined, { timeZone: timezone, hour12: true })
    if (format === "hh:mm a") return date.toLocaleTimeString(undefined, { timeZone: timezone, hour12: true, second: undefined })
    return date.toLocaleTimeString(undefined, { timeZone: timezone })
  }

  function getFormattedDate(date: Date, format: string) {
    if (format === "yyyy-MM-dd") return date.toLocaleDateString("en-CA", { timeZone: timezone })
    if (format === "MM/dd/yyyy") return date.toLocaleDateString("en-US", { timeZone: timezone })
    if (format === "dd/MM/yyyy") return date.toLocaleDateString("en-GB", { timeZone: timezone })
    if (format === "MMM dd, yyyy") return date.toLocaleDateString(undefined, { timeZone: timezone, year: "numeric", month: "short", day: "2-digit" })
    if (format === "full") return date.toLocaleDateString(undefined, { timeZone: timezone, weekday: "long", year: "numeric", month: "long", day: "numeric" })
    return date.toLocaleDateString(undefined, { timeZone: timezone })
  }

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 text-sm bg-background px-3 py-1 rounded-md border">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono">--:--:--</span>
        <span className="text-xs text-muted-foreground ml-2">----</span>
        <span className="text-xs text-muted-foreground ml-2">(---)</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm bg-background px-3 py-1 rounded-md border">
      <Clock className="h-3.5 w-3.5 text-primary" />
      <span className="font-mono">
        {getFormattedTime(time, timeFormat)}
      </span>
      <span className="text-xs text-muted-foreground ml-2">
        {getFormattedDate(time, dateFormat)}
      </span>
      <span className="text-xs text-muted-foreground ml-2">
        ({timezone})
      </span>
    </div>
  )
}
