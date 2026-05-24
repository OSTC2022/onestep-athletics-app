"use client"

import { useState } from "react"
import { 
  Search,
  Filter,
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  Heart,
  Target,
  TrendingUp,
  User,
  X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  calculateMonthlyAttendanceRate,
  getMonthlyAttendanceSummary,
} from "@/lib/attendance"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet"

const athletes = [
  {
    id: 1,
    name: "김민준",
    position: "중거리",
    goal: "800m 1분 55초",
    weeklyDistance: 52.3,
    monthlySessions: 10,
    condition: 5,
    pain: null,
    avatar: "MJ"
  },
  {
    id: 2,
    name: "이서연",
    position: "장거리",
    goal: "5000m 16분",
    weeklyDistance: 78.5,
    monthlySessions: 5,
    condition: 4,
    pain: null,
    avatar: "SY"
  },
  {
    id: 3,
    name: "박지훈",
    position: "단거리",
    goal: "100m 11.2초",
    weeklyDistance: 28.2,
    monthlySessions: 10,
    condition: 3,
    pain: "무릎",
    avatar: "JH"
  },
  {
    id: 4,
    name: "최예진",
    position: "중거리",
    goal: "1500m 4분 30초",
    weeklyDistance: 45.8,
    monthlySessions: 5,
    condition: 2,
    pain: "허벅지",
    avatar: "YJ"
  },
  {
    id: 5,
    name: "정우성",
    position: "장거리",
    goal: "마라톤 sub 3",
    weeklyDistance: 95.2,
    monthlySessions: 10,
    condition: 4,
    pain: null,
    avatar: "WS"
  },
].map((athlete) => ({
  ...athlete,
  attendance: calculateMonthlyAttendanceRate(athlete.monthlySessions),
}))

const conditionLabels: Record<number, { label: string; color: string }> = {
  5: { label: "최상", color: "text-accent" },
  4: { label: "좋음", color: "text-accent/80" },
  3: { label: "보통", color: "text-warning" },
  2: { label: "피곤", color: "text-destructive/80" },
  1: { label: "나쁨", color: "text-destructive" },
}

export function AthletesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAthlete, setSelectedAthlete] = useState<typeof athletes[0] | null>(null)
  const monthlyAttendance = getMonthlyAttendanceSummary()

  const filteredAthletes = athletes.filter(athlete =>
    athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    athlete.position.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">선수 관리</h1>
        <Badge variant="secondary">{athletes.length}명</Badge>
      </header>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="선수 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>
        <Button variant="secondary" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Athletes List */}
      <div className="space-y-3">
        {filteredAthletes.map((athlete) => (
          <Sheet key={athlete.id}>
            <SheetTrigger asChild>
              <Card 
                className="bg-card border-border cursor-pointer hover:bg-card/80 transition-colors"
                onClick={() => setSelectedAthlete(athlete)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 bg-secondary">
                      <AvatarFallback className="text-sm font-medium">
                        {athlete.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{athlete.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {athlete.position}
                        </Badge>
                        {athlete.pain && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {athlete.pain}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {athlete.weeklyDistance}km
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {athlete.attendance}%
                        </span>
                        <span className={`flex items-center gap-1 ${conditionLabels[athlete.condition].color}`}>
                          <Heart className="h-3 w-3" />
                          {conditionLabels[athlete.condition].label}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </SheetTrigger>
            <SheetContent className="bg-card border-border w-full sm:max-w-md">
              <SheetHeader className="border-b border-border pb-4">
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 bg-secondary">
                    <AvatarFallback className="text-lg font-medium">
                      {athlete.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xl font-bold">{athlete.name}</p>
                    <Badge variant="outline">{athlete.position}</Badge>
                  </div>
                </SheetTitle>
              </SheetHeader>
              
              <div className="py-4 space-y-4">
                {/* Goal */}
                <Card className="bg-secondary border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">목표 기록</span>
                    </div>
                    <p className="text-lg font-bold">{athlete.goal}</p>
                  </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-secondary border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-accent" />
                        <span className="text-xs text-muted-foreground">주간 거리</span>
                      </div>
                      <p className="text-xl font-bold">{athlete.weeklyDistance}km</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-secondary border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                        <span className="text-xs text-muted-foreground">월간 출석률</span>
                      </div>
                      <p className="text-xl font-bold">{athlete.attendance}%</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {athlete.monthlySessions}/{monthlyAttendance.target}회
                      </p>
                      <Progress value={athlete.attendance} className="h-1 mt-2" />
                    </CardContent>
                  </Card>
                </div>

                {/* Condition */}
                <Card className="bg-secondary border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">컨디션</span>
                      </div>
                      <span className={`font-bold ${conditionLabels[athlete.condition].color}`}>
                        {conditionLabels[athlete.condition].label}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Pain Status */}
                <Card className={`border-0 ${athlete.pain ? "bg-destructive/10" : "bg-secondary"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`h-4 w-4 ${athlete.pain ? "text-destructive" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">통증 상태</span>
                      </div>
                      <span className={athlete.pain ? "text-destructive font-medium" : "text-muted-foreground"}>
                        {athlete.pain || "없음"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Performance */}
                <Card className="bg-secondary border-0">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-accent" />
                      <CardTitle className="text-sm">최근 기록</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">5월 22일</span>
                      <span>인터벌 5.2km (4:15/km)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">5월 21일</span>
                      <span>조깅 8km (5:30/km)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">5월 19일</span>
                      <span>템포런 10km (4:45/km)</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
        ))}
      </div>

      {filteredAthletes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  )
}
