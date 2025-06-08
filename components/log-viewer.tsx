"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  CalendarIcon,
  RefreshCw,
  Settings,
  BrainCog,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { LogTable } from "@/components/log-table"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { LiveClock } from "@/components/live-clock"

// Default services
const DEFAULT_SERVICES = [
  { name: "API Server", endpoint: "https://api.example.com/logs" },
  { name: "Web Server", endpoint: "https://web.example.com/logs" },
  { name: "Database", endpoint: "https://db.example.com/logs" },
]

export default function LogViewer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Get date from URL or default to today
  const dateParam = searchParams.get("date") || "today"
  const initialDate = dateParam === "today" ? new Date() : new Date(dateParam)

  // Get service from URL or default to first service
  const serviceParam = searchParams.get("service") || "API Server"

  // State
  const [date, setDate] = useState<Date>(initialDate)
  const [selectedService, setSelectedService] = useState(serviceParam)
  const [services, setServices] = useLocalStorage("logViewerServices", DEFAULT_SERVICES)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<string>("")
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [llmExplanation, setLlmExplanation] = useState<string>("")
  const [llmLoading, setLlmLoading] = useState(false)
  const [openAIApiKey] = useLocalStorage("openAIApiKey", "")

  // Format date for display and API
  const formattedDate = format(date, "yyyy-MM-dd")

  // Update current time every second
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      )
    }

    // Update immediately
    updateTime()

    // Then update every second
    const interval = setInterval(updateTime, 1000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [])

  // Get current service endpoint
  const currentService = useMemo(() => {
    return services.find((s) => s.name === selectedService) || services[0]
  }, [selectedService, services])

  // Fetch logs
  const fetchLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      // In a real app, this would be a fetch to the actual API
      // For demo purposes, we'll generate mock logs
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const timestampDate = new Date(date)
      timestampDate.setHours(10, 30, 0, 0)

      const mockLogs = [
        {
          id: "log-1",
          timestamp: timestampDate.toISOString(),
          level: "INFO",
          message: "Example log entry - This is a demo log message",
          service: selectedService,
          user: "demo_user",
          component: "demo_component",
          action: "demo_action",
          statusCode: "200",
          requestId: "req-demo-001"
        }
      ]

      setLogs(mockLogs)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Failed to fetch logs")
      toast({
        title: "Error",
        description: "Failed to fetch logs. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update URL when date or service changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", formattedDate)
    params.set("service", selectedService)
    router.push(`?${params.toString()}`)
  }, [date, selectedService, router, searchParams, formattedDate])

  // Fetch logs when date or service changes
  useEffect(() => {
    fetchLogs()
  }, [date, selectedService])

  // Navigate to settings page
  const goToSettings = () => {
    router.push("/settings")
  }

  // Get current time in user's timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const viewWithLLM = async (entry: any) => {
    setSelectedLog(entry)

    if (!openAIApiKey) {
      toast({
        title: "Missing API Key",
        description: "Add your OpenAI API key in Settings > LLM View",
        variant: "destructive",
      })
      return
    }

    setLlmLoading(true)
    setLlmExplanation("")
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that explains log entries in human readable form.",
            },
            {
              role: "user",
              content: `Explain the following log entry in simple terms:\n\n${JSON.stringify(
                entry,
                null,
                2,
              )}`,
            },
          ],
          max_tokens: 150,
        }),
      })
      const data = await res.json()
      setLlmExplanation(
        data.choices?.[0]?.message?.content?.trim() || "No explanation",
      )
    } catch (err) {
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to fetch explanation",
        variant: "destructive",
      })
    } finally {
      setLlmLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.name} value={service.name}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[180px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formattedDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <LiveClock />
          <Button
            variant="outline"
            size="icon"
            onClick={goToSettings}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
          <h3 className="text-lg font-medium text-destructive">Failed to load logs</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={fetchLogs}
          >
            Try Again
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <LogTable logs={logs} onViewWithLLM={viewWithLLM} />
      )}

      <Dialog open={!!selectedLog} onOpenChange={(v) => !v && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCog className="h-4 w-4" /> LLM View
            </DialogTitle>
            <DialogDescription>Explanation powered by OpenAI</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="grid md:grid-cols-2 gap-4">
              <pre className="p-2 bg-muted rounded text-xs overflow-auto whitespace-pre-wrap">
{JSON.stringify(selectedLog, null, 2)}
              </pre>
              <div className="p-2 bg-muted rounded text-sm whitespace-pre-wrap">
                {llmLoading ? "Loading..." : llmExplanation}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
