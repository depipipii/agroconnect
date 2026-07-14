
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Droplets,
  Activity,
  Wifi,
  Database,
  Server,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Zap,
  Smartphone,
  RefreshCw,
  Terminal,
  Bell,
  Sprout,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Reading {
  id: number;
  moisture: number;
  created_at: string;
}

interface SensorData {
  moisture: number;
  totalReadings: number;
  createdAt: string;
}

export default function Dashboard() {
  const [data, setData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [activities, setActivities] = useState<
    { id: number; message: string; time: string; type: "info" | "success" | "warning" | "error" }[]
  >([]);
  const [prevReadingId, setPrevReadingId] = useState<number | null>(null);

  const addActivity = useCallback((message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    const newActivity = {
      id: Date.now(),
      message,
      time: new Date().toLocaleTimeString("id-ID"),
      type,
    };
    setActivities((prev) => [newActivity, ...prev].slice(0, 10));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [latestRes, historyRes] = await Promise.all([
        fetch("/api/sensor/latest"),
        fetch("/api/sensor/history"),
      ]);

      if (!latestRes.ok || !historyRes.ok) {
        throw new Error("Failed to fetch data from API");
      }

      const latestData = await latestRes.json();
      const historyData = await historyRes.json();

      // Process history: take last 20 (which is first 20 from API since API returns DESC by id), then reverse to make chronological (oldest first)
      const processedHistory = Array.isArray(historyData) 
        ? historyData.slice(0, 20).reverse() 
        : [];
      
      setData(latestData);
      setHistory(processedHistory);
      setLastSync(new Date());
      setLoading(false);

      // Calculate current condition
      const getConditionLabel = (moisture: number) => {
        if (moisture < 30) return "Kering";
        if (moisture < 70) return "Normal";
        return "Basah";
      };
      const currentCondition = getConditionLabel(latestData.moisture);
      const moisture = latestData.moisture;
      const currentId = historyData[0]?.id || 0;

      // Add activity only if reading id is new (meaning new data from sensor)
      if (prevReadingId === null) {
        // First load: add initial activity
        setPrevReadingId(currentId);
        addActivity(`Data sensor pertama diterima: ${moisture}% (${currentCondition})`, "success");
      } else if (currentId !== prevReadingId) {
        // New data from sensor received!
        setPrevReadingId(currentId);
        
        // Get previous data to check change
        const previousMoisture = historyData[1]?.moisture || moisture;
        const previousCondition = getConditionLabel(previousMoisture);
        
        const moistureChange = Math.abs(moisture - previousMoisture);
        
        if (moisture > 0 && (moistureChange >= 5 || previousCondition !== currentCondition)) {
          // Significant change: add activity
          addActivity(`Kelembapan berubah: ${previousCondition} → ${currentCondition} (${moisture}%)`, "success");
        } else {
          // Just new data but no significant change
          addActivity(`Data sensor baru diterima: ${moisture}% (${currentCondition})`, "info");
        }
      }
    } catch (err) {
      console.error("[FETCH] Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      addActivity("Gagal mengambil data", "error");
    }
  }, [addActivity, prevReadingId]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (history.length === 0) {
      return { avg: 0, min: 0, max: 0 };
    }
    const moistures = history.map(h => h.moisture);
    const avg = Math.round(moistures.reduce((a, b) => a + b, 0) / moistures.length);
    const min = Math.min(...moistures);
    const max = Math.max(...moistures);
    return { avg, min, max };
  }, [history]);

  // Get recommendation based on condition
  const getRecommendation = (moisture: number) => {
    if (moisture < 30) {
      return {
        text: "Tanaman perlu disiram",
        color: "text-red-500",
        bg: "bg-red-500/10",
        icon: Droplets,
      };
    }
    if (moisture < 70) {
      return {
        text: "Kondisi tanah baik",
        color: "text-green-500",
        bg: "bg-green-500/10",
        icon: Sprout,
      };
    }
    return {
      text: "Kurangi penyiraman",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      icon: Droplets,
    };
  };

  // Helper to parse date from SQLite or Supabase ISO string
  const parseSQLiteDate = (dateStr: string | undefined | null): Date => {
    if (!dateStr) {
      return new Date();
    }
    if (dateStr.includes('T')) {
      // Supabase ISO string format (e.g., "2026-07-07T12:00:00.000Z")
      return new Date(dateStr);
    } else {
      // SQLite format (e.g., "2026-06-24 17:00:13")
      const [datePart, timePart] = dateStr.split(' ');
      if (!datePart || !timePart) {
        return new Date();
      }
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hour, minute, second);
    }
  };

  // Check device status
  const isDeviceOnline = useMemo(() => {
    if (!data) return false;
    try {
      const lastDataDate = parseSQLiteDate(data.createdAt);
      const now = new Date();
      const diffSeconds = (now.getTime() - lastDataDate.getTime()) / 1000;
      console.log("[STATUS] Device status check:", { 
        createdAt: data.createdAt, 
        parsedDate: lastDataDate.toISOString(), 
        now: now.toISOString(), 
        diffSeconds 
      });
      return diffSeconds < 30;
    } catch (e) {
      console.error("[STATUS] Error parsing date:", e);
      return false;
    }
  }, [data]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getSoilCondition = (moisture: number) => {
    if (moisture < 30) return { label: "Kering", color: "text-red-500", bg: "bg-red-500/10" };
    if (moisture < 70) return { label: "Normal", color: "text-green-500", bg: "bg-green-500/10" };
    return { label: "Basah", color: "text-blue-500", bg: "bg-blue-500/10" };
  };

  const Skeleton = () => (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-24 bg-muted rounded-xl" />
      ))}
      <div className="h-80 bg-muted rounded-xl" />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] p-4 md:p-8 flex items-center justify-center">
        <div className="p-6 max-w-7xl mx-auto w-full">
          <Skeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090B] p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-xl text-white">Terjadi Kesalahan</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button 
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const condition = data ? getSoilCondition(data.moisture) : null;
  const recommendation = data ? getRecommendation(data.moisture) : null;

  return (
    <div className="min-h-screen bg-[#09090B] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white">AgroConnect</h1>
            <p className="text-muted-foreground mt-1">Dashboard Monitoring Kelembapan Tanah - ESP32 IoT</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
              isDeviceOnline 
                ? "bg-green-500/10 border-green-500/20" 
                : "bg-red-500/10 border-red-500/20"
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                isDeviceOnline ? "bg-green-500" : "bg-red-500"
              }`} />
              <span className={`font-medium text-sm ${
                isDeviceOnline ? "text-green-500" : "text-red-500"
              }`}>
                {isDeviceOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card border rounded-full text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {lastSync ? lastSync.toLocaleTimeString("id-ID") : "-"}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchData}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Bell className="w-4 h-4" />
            </Button>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>AC</AvatarFallback>
            </Avatar>
          </div>
        </motion.div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: "Kelembapan Tanah",
              value: `${data?.moisture ?? 0}%`,
              icon: Droplets,
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Status Sensor",
              value: condition?.label ?? "Tidak Diketahui",
              icon: Activity,
              color: condition?.color ?? "text-muted-foreground",
              bg: condition?.bg ?? "bg-muted",
            },
            {
              label: "Rata-rata",
              value: `${stats.avg}%`,
              icon: Activity,
              color: "text-green-500",
              bg: "bg-green-500/10",
            },
            {
              label: "Tertinggi",
              value: `${stats.max}%`,
              icon: TrendingUp,
              color: "text-yellow-500",
              bg: "bg-yellow-500/10",
            },
            {
              label: "Terendah",
              value: `${stats.min}%`,
              icon: TrendingDown,
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recommendation */}
        {recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-emerald-500" />
                  Rekomendasi Otomatis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${recommendation.bg}`}>
                    <recommendation.icon className={`w-8 h-8 ${recommendation.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">{recommendation.text}</p>
                    <p className="text-sm text-muted-foreground">Berdasarkan kelembapan tanah saat ini</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  Riwayat Kelembapan (20 Data Terakhir)
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Data diurutkan secara kronologis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity="0.3" />
                            <stop offset="95%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                          dataKey="created_at"
                          tick={{ fill: "#9ca3af", fontSize: 12 }}
                          tickFormatter={(time) => {
                            try {
                              return parseSQLiteDate(time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                            } catch {
                              return time;
                            }
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: "#9ca3af", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#111827", border: "1px solid #27272a", borderRadius: "8px" }}
                          itemStyle={{ color: "#10b981" }}
                          labelFormatter={(time) => {
                            try {
                              return parseSQLiteDate(time).toLocaleString("id-ID");
                            } catch {
                              return time;
                            }
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="moisture"
                          stroke="#10b981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorMoisture)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Database className="w-12 h-12 mb-2 opacity-50" />
                      <p>Belum ada data riwayat</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Soil Condition */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-emerald-500" />
                    Kondisi Tanah
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data ? (
                    <>
                      <Progress value={data.moisture} className="h-3" />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "Kering", value: "< 30%", color: data.moisture < 30 ? "bg-red-500 text-white" : "bg-muted text-muted-foreground" },
                          { label: "Normal", value: "30-70%", color: data.moisture >= 30 && data.moisture < 70 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground" },
                          { label: "Basah", value: "> 70%", color: data.moisture >= 70 ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground" },
                        ].map((c) => (
                          <div key={c.label} className={`p-2 rounded-lg text-xs ${c.color}`}>
                            <div className="font-semibold">{c.label}</div>
                            <div className="opacity-70">{c.value}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
                      <p>Data tidak tersedia</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Device Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-500" />
                    Informasi Perangkat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Nama Perangkat</span>
                    <span className="font-medium">AgroConnect Sensor Node</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Total Pembacaan</span>
                    <span className="font-medium">{data?.totalReadings ?? 0}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Versi Firmware</span>
                    <span className="font-medium">v1.0.0</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Status WiFi</span>
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-green-500">Terhubung</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-500" />
                  Aktivitas Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div
                          className={`mt-1 p-1 rounded-full ${
                            activity.type === "success"
                              ? "bg-green-500/10 text-green-500"
                              : activity.type === "warning"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : activity.type === "error"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          {activity.type === "success" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : activity.type === "warning" ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : activity.type === "error" ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <Activity className="w-3 h-3" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Belum ada aktivitas</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* System Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-emerald-500" />
                  Kesehatan Sistem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Perangkat Online", status: isDeviceOnline, icon: Zap },
                    { label: "Database Terhubung", status: true, icon: Database },
                    { label: "API Berjalan", status: true, icon: Server },
                  ].map((system, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <system.icon className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm">{system.label}</span>
                      </div>
                      {system.status ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

