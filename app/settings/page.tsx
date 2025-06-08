"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FixedSizeList as List } from "react-window";

/* ───────────────────── third-party timezone helpers ──────────────────────── */
import { rawTimeZones } from "@vvo/tzdb";
import { format as formatTz } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme-toggle";
import AutoSizer from "react-virtualized-auto-sizer";                    // ⚠ tweak if your paths differ

import {
  Trash,
  Plus,
  ArrowLeft,
  Clock,
  Table,
  Server,
  Globe,
  Palette,
  RotateCcw,
  Save,
  MapPin,
  X,
  BrainCog,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";

/* ───────────────────── constants kept from your original code ────────────── */
const EMPTY_TZ_LIST: string[] = [];
const DEFAULT_SERVICES = [
  { name: "API Server", endpoint: "https://api.example.com/logs" },
  { name: "Web Server", endpoint: "https://web.example.com/logs" },
  { name: "Database", endpoint: "https://db.example.com/logs" },
];
const DEFAULT_PAGE_SIZE = 10;

/* ───────────────────── timezone utilities built from tzdb ────────────────── */
// 1. fast lookup map
const TZ_RECORD = new Map(rawTimeZones.map((z) => [z.name, z]));

// 2. friendly label
const getTimezoneLabel = (tz: string) =>
  TZ_RECORD.get(tz)?.alternativeName ?? tz.replace(/_/g, " ");

// 3. current time string (24-h)
const getTimeInTimezone = (tz: string) =>
  formatTz(new Date(), "HH:mm", { timeZone: tz });

// 4. offset like "UTC+05:00"
const getTimezoneOffset = (tz: string) =>
  "UTC" + formatTz(new Date(), " XXX", { timeZone: tz });

// 5. group by region for the pop-over list
const TIMEZONE_DATA = Object.entries(
  rawTimeZones.reduce<Record<string, string[]>>((acc, { name }) => {
    const region = name.split("/")[0] || "Other";
    (acc[region] ??= []).push(name);
    return acc;
  }, {})
).map(([region, timezones]) => ({ region, timezones }));

/* ───────────────────── component ─────────────────────────────────────────── */
export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  /* ───── local-storage backed settings (unchanged) ───── */
  const [services, setServices] = useLocalStorage("logViewerServices", DEFAULT_SERVICES);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceEndpoint, setNewServiceEndpoint] = useState("");

  const [primaryTimezone, setPrimaryTimezone] = useLocalStorage(
    "timezone",
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  const [pageSize, setPageSize] = useLocalStorage("logViewerPageSize", DEFAULT_PAGE_SIZE);
  const [showLineNumbers, setShowLineNumbers] = useLocalStorage("showLineNumbers", true);
  const [dateFormat, setDateFormat] = useLocalStorage("dateFormat", "yyyy-MM-dd");
  const [timeFormat, setTimeFormat] = useLocalStorage("timeFormat", "HH:mm:ss");
  const [openAIApiKey, setOpenAIApiKey] = useLocalStorage("openAIApiKey", "");

  /* ───── misc helpers (identical logic, fewer crashes) ───── */
  const detectTimezone = () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setPrimaryTimezone(detected);
    toast({ title: "Timezone Updated", description: `Primary set to ${detected}` });
  };

  // Add a new service
  const addService = () => {
    if (!newServiceName || !newServiceEndpoint) {
      toast({
        title: "Error",
        description: "Please provide both a name and endpoint for the new service.",
        variant: "destructive",
      })
      return
    }

    if (services.some((s) => s.name === newServiceName)) {
      toast({
        title: "Error",
        description: "A service with this name already exists.",
        variant: "destructive",
      })
      return
    }

    setServices([...services, { name: newServiceName, endpoint: newServiceEndpoint }])
    setNewServiceName("")
    setNewServiceEndpoint("")

    toast({
      title: "Success",
      description: "Service added successfully.",
    })
  }

  // Remove a service
  const removeService = (name: string) => {
    setServices(services.filter((s) => s.name !== name))

    toast({
      title: "Success",
      description: "Service removed successfully.",
    })
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setServices(DEFAULT_SERVICES)
    setPrimaryTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    setPageSize(DEFAULT_PAGE_SIZE)
    setShowLineNumbers(true)
    setDateFormat("yyyy-MM-dd")
    setTimeFormat("HH:mm:ss")

    toast({
      title: "Success",
      description: "Settings reset to defaults.",
    })
  }

  const filteredZones = useMemo(() => {
    const q = timezoneSearch.trim().toLowerCase();

    return TIMEZONE_DATA
      .map(({ region, timezones }) => ({
        region,
        timezones: q
          ? timezones.filter((tz) => {
            const lbl = getTimezoneLabel(tz).toLowerCase();
            const off = getTimezoneOffset(tz).toLowerCase();
            return tz.toLowerCase().includes(q) ||
              lbl.includes(q) ||
              off.includes(q);
          })
          : timezones,
      }))
      .filter((g) => g.timezones.length);     // drop empty groups
  }, [timezoneSearch]);

  const handleSelectTz = useCallback(
    (tz: string) => {
      setPrimaryTimezone(tz);
      setTimezoneOpen(false);
      setTimezoneSearch("");
    },
    [setPrimaryTimezone]
  );

  // Return to home page
  const goToHome = () => {
    router.push("/")
  }

  // Save settings
  const saveSettings = () => {
    toast({
      title: "Success",
      description: "Settings saved successfully.",
    })

    setTimeout(() => {
      router.push("/")
    }, 2000)
  }

  // Add state for live clock, time format, and date format
  const [clock, setClock] = useState(new Date());
  const [clockTimeFormat, setClockTimeFormat] = useState("HH:mm:ss");
  const [clockDateFormat, setClockDateFormat] = useState("yyyy-MM-dd");

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to get formatted time string
  function getFormattedTime(date: Date, format: string) {
    if (format === "HH:mm:ss") return date.toLocaleTimeString(undefined, { hour12: false });
    if (format === "HH:mm") return date.toLocaleTimeString(undefined, { hour12: false, second: undefined });
    if (format === "hh:mm:ss a") return date.toLocaleTimeString(undefined, { hour12: true });
    if (format === "hh:mm a") return date.toLocaleTimeString(undefined, { hour12: true, second: undefined });
    return date.toLocaleTimeString();
  }

  // Helper to get formatted date string
  function getFormattedDate(date: Date, format: string) {
    if (format === "yyyy-MM-dd") return date.toLocaleDateString("en-CA");
    if (format === "MM/dd/yyyy") return date.toLocaleDateString("en-US");
    if (format === "dd/MM/yyyy") return date.toLocaleDateString("en-GB");
    if (format === "MMM dd, yyyy") return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    if (format === "full") return date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    return date.toLocaleDateString();
  }

  console.log("SettingsPage rendered with services:", services);
  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToHome} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Settings
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span>Services</span>
          </TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>Display</span>
          </TabsTrigger>
          <TabsTrigger value="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Time</span>
          </TabsTrigger>
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <BrainCog className="h-4 w-4" />
            <span>LLM View</span>
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500" />
                Services Configuration
              </CardTitle>
              <CardDescription>
                Configure the services whose logs you want to view. Add, edit, or remove log sources.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {services.map((service, index) => (
                  <div key={service.name} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {index + 1}
                    </div>
                    <div className="grid flex-1 gap-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`service-${service.name}`} className="font-medium">
                          {service.name}
                        </Label>
                        <Badge variant="outline" className="font-mono text-xs">
                          ID: {service.name.toLowerCase().replace(/\s+/g, "-")}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id={`service-${service.name}`}
                          value={service.endpoint}
                          onChange={(e) => {
                            const updatedServices = services.map((s) =>
                              s.name === service.name ? { ...s, endpoint: e.target.value } : s,
                            )
                            setServices(updatedServices)
                          }}
                          className="flex-1"
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => removeService(service.name)}
                                disabled={services.length <= 1}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remove service</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Add New Service</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-service-name">Service Name</Label>
                    <Input
                      id="new-service-name"
                      placeholder="e.g., Authentication Service"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-service-endpoint">API Endpoint</Label>
                    <Input
                      id="new-service-endpoint"
                      placeholder="e.g., https://api.example.com/logs/auth"
                      value={newServiceEndpoint}
                      onChange={(e) => setNewServiceEndpoint(e.target.value)}
                    />
                  </div>
                  <Button onClick={addService} className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white border-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500" />
                Display Settings
              </CardTitle>
              <CardDescription>
                Configure how logs are displayed in the viewer. Customize the appearance and behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-line-numbers">Show Line Numbers</Label>
                    <p className="text-sm text-muted-foreground">Display line numbers in the log viewer</p>
                  </div>
                  <Switch id="show-line-numbers" checked={showLineNumbers} onCheckedChange={setShowLineNumbers} />
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Label htmlFor="pageSize">Logs Per Page</Label>
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4 text-muted-foreground" />
                    <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                      <SelectTrigger id="pageSize" className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 30, 50, 100].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} rows
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Number of log entries to display per page</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Tab */}
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500" />
                Time Settings
              </CardTitle>
              <CardDescription>
                Configure timezone and time display preferences. Customize how dates and times are displayed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="primary-timezone">Primary Timezone</Label>
                    <Button variant="outline" onClick={detectTimezone} size="sm" className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Detect My Timezone
                    </Button>
                  </div>
                  {/* Live Clock and Format Selectors */}
                  <div className="flex flex-col gap-2 mt-4 p-3 rounded-md bg-muted">
                    <div className="flex flex-wrap items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Current time</span>
                      <Select value={clockTimeFormat} onValueChange={setClockTimeFormat}>
                        <SelectTrigger className="w-[180px] ml-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HH:mm:ss">24-hour (13:45:30)</SelectItem>
                      <SelectItem value="hh:mm:ss a">12-hour (01:45:30 PM)</SelectItem>
                      <SelectItem value="HH:mm">24-hour, no seconds (13:45)</SelectItem>
                      <SelectItem value="hh:mm a">12-hour, no seconds (01:45 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                      <span className="text-sm font-medium ml-4">Date format</span>
                      <Select value={clockDateFormat} onValueChange={setClockDateFormat}>
                        <SelectTrigger className="w-[160px] ml-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yyyy-MM-dd">2023-12-31</SelectItem>
                          <SelectItem value="MM/dd/yyyy">12/31/2023</SelectItem>
                          <SelectItem value="dd/MM/yyyy">31/12/2023</SelectItem>
                          <SelectItem value="MMM dd, yyyy">Dec 31, 2023</SelectItem>
                          <SelectItem value="full">Monday, December 31, 2023</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                    <div className="text-xl font-mono font-bold">
                      {getFormattedTime(clock, clockTimeFormat)}
                  </div>
                    <div className="text-xs text-muted-foreground">
                      {getFormattedDate(clock, clockDateFormat)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LLM View Tab */}
        <TabsContent value="llm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCog className="h-5 w-5 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500" />
                LLM View
              </CardTitle>
              <CardDescription>
                Paste your OpenAI API key to enable AI powered log explanations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  value={openAIApiKey}
                  onChange={(e) => setOpenAIApiKey(e.target.value)}
                  placeholder="sk-..."
                />
                <p className="text-xs text-muted-foreground">
                  The key is stored locally in your browser.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={goToHome}>
          Cancel
        </Button>
        <Button onClick={saveSettings} className="gap-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white border-0">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
