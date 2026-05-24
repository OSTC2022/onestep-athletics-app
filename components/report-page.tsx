"use client"

import { useState } from "react"
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  CheckCircle2,
  Heart,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import {
  calculateMonthlyAttendanceRate,
  getMonthlyAttendanceSummary,
  ATTENDANCE_DAY_LABELS,
} from "@/lib/attendance"

const teamMonthlySessions = [10, 5, 10, 5, 10]

const weeklyStats = {
  totalDistance: 342.8,
  avgDistance: 68.6,
  totalSessions: 28,
  avgAttendance: Math.round(
    teamMonthlySessions.reduce(
      (sum, count) => sum + calculateMonthlyAttendanceRate(count),
      0
    ) / teamMonthlySessions.length
  ),
  avgCondition: 3.8,
  painReports: 2,
}

const distanceByDay = [
  { day: "월", value: 52 },
  { day: "화", value: 68 },
  { day: "수", value: 0 },
  { day: "목", value: 75 },
  { day: "금", value: 45 },
  { day: "토", value: 82 },
  { day: "일", value: 20 },
]

const topPerformers = [
  { name: "정우성", distance: 95.2, change: 12 },
  { name: "이서연", distance: 78.5, change: 8 },
  { name: "김민준", distance: 52.3, change: -3 },
]

const conditionSummary = [
  { label: "최상", count: 1, percent: 20 },
  { label: "좋음", count: 2, percent: 40 },
  { label: "보통", count: 1, percent: 20 },
  { label: "피곤", count: 1, percent: 20 },
  { label: "나쁨", count: 0, percent: 0 },
]

const painSummary = [
  { area: "무릎", count: 1 },
  { area: "허벅지", count: 1 },
]

export function ReportPage() {
  const monthlyAttendance = getMonthlyAttendanceSummary()
  const maxDistance = Math.max(...distanceByDay.map(d => d.value))

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">주간 리포트</h1>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          내보내기
        </Button>
      </header>

      {/* Week Selector */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          <span className="font-medium">2026년 5월 4주차</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">총 거리</span>
            </div>
            <p className="text-2xl font-bold">{weeklyStats.totalDistance}km</p>
            <p className="text-xs text-muted-foreground mt-1">
              평균 {weeklyStats.avgDistance}km/선수
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">월간 출석률</span>
            </div>
            <p className="text-2xl font-bold">{weeklyStats.avgAttendance}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {ATTENDANCE_DAY_LABELS} 중 주 2회 · {monthlyAttendance.weeksInMonth}주 ·
              목표 {monthlyAttendance.target}회
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">평균 컨디션</span>
            </div>
            <p className="text-2xl font-bold">{weeklyStats.avgCondition}</p>
            <Progress value={(weeklyStats.avgCondition / 5) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">통증 보고</span>
            </div>
            <p className="text-2xl font-bold">{weeklyStats.painReports}건</p>
            <p className="text-xs text-muted-foreground mt-1">
              5명 중 {weeklyStats.painReports}명
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distance Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">일별 훈련 거리</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-32">
            {distanceByDay.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-accent/80 rounded-t transition-all"
                  style={{ 
                    height: day.value > 0 ? `${(day.value / maxDistance) * 100}%` : "4px",
                    minHeight: "4px"
                  }}
                />
                <span className="text-xs text-muted-foreground">{day.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">주간 거리 TOP 3</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {topPerformers.map((athlete, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? "bg-accent text-accent-foreground" : "bg-secondary"
                }`}>
                  {i + 1}
                </div>
                <span className="font-medium">{athlete.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono">{athlete.distance}km</span>
                <Badge variant={athlete.change >= 0 ? "default" : "destructive"} className="text-xs">
                  {athlete.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(athlete.change)}%
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Condition Summary */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">컨디션 분포</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {conditionSummary.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm w-10">{item.label}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {item.count}명
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pain Summary */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">통증 현황</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {painSummary.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {painSummary.map((item, i) => (
                <Badge key={i} variant="destructive" className="text-sm">
                  {item.area} ({item.count}명)
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">통증 보고 없음</p>
          )}
          <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">권장사항:</strong> 무릎, 허벅지 통증 선수들의 훈련 강도 조절 필요. 
              다음 주 초반에 개별 상담 권장.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
