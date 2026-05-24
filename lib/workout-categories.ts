export type WorkoutCategoryId =
  | "easy"
  | "interval"
  | "tempo"
  | "long"
  | "fartlek"
  | "hill"
  | "cross"

export type WorkoutRecordType = "running" | "cross"

export type SessionFieldType =
  | "text"
  | "select"
  | "selectOrCustom"
  | "textarea"
  | "segmentPace"
  | "duration"

export interface SessionFieldDef {
  id: string
  label: string
  placeholder?: string
  unit?: string
  type?: SessionFieldType
  options?: { value: string; label: string }[]
  hint?: string
  /** selectOrCustom: 직접 입력 placeholder */
  customPlaceholder?: string
  /** selectOrCustom: 직접 입력 기본 단위 */
  customUnit?: "m" | "km"
  colSpan?: 1 | 2
  /** segmentPace / duration: 환산 기준 거리 필드 id */
  linkedDistanceField?: string
}

export interface SessionFieldGroup {
  title: string
  fieldIds: string[]
}

export interface WorkoutCategoryConfig {
  id: WorkoutCategoryId
  label: string
  tag: string
  description: string
  /** running: 거리·페이스 / cross: 웨이트·보강 등 */
  recordType?: WorkoutRecordType
  sessionFields: SessionFieldDef[]
  /** 카테고리별 입력 그룹 (인터벌 등) */
  sessionGroups?: SessionFieldGroup[]
}

export const workoutCategories: WorkoutCategoryConfig[] = [
  {
    id: "easy",
    label: "조깅",
    tag: "EASY",
    description: "회복·기초 유산소. 심박 존과 RPE로 강도를 관리합니다.",
    sessionFields: [
      {
        id: "targetZone",
        label: "목표 심박 존",
        type: "select",
        options: [
          { value: "z1", label: "Zone 1 (회복)" },
          { value: "z2", label: "Zone 2 (유산소)" },
        ],
      },
      {
        id: "rpe",
        label: "RPE (체감 강도)",
        placeholder: "3-4",
        hint: "1(매우 쉬움) ~ 10(최대)",
      },
      {
        id: "warmupKm",
        label: "워밍업",
        placeholder: "1",
        unit: "km",
      },
      {
        id: "mainKm",
        label: "메인 조깅",
        placeholder: "8",
        unit: "km",
      },
      {
        id: "cooldownKm",
        label: "쿨다운",
        placeholder: "1",
        unit: "km",
      },
    ],
  },
  {
    id: "interval",
    label: "인터벌",
    tag: "INTERVAL",
    description: "인터벌·회복·반복을 묶어 간단히 기록합니다.",
    sessionGroups: [
      { title: "인터벌", fieldIds: ["repDistance", "intervalPace"] },
      {
        title: "회복",
        fieldIds: ["recoveryDistance", "recoveryTime"],
      },
      { title: "반복 · 세트", fieldIds: ["reps", "sets", "setRestTime"] },
      { title: "준비 · 정리", fieldIds: ["warmupKm", "cooldownKm"] },
    ],
    sessionFields: [
      {
        id: "repDistance",
        label: "거리",
        type: "selectOrCustom",
        customPlaceholder: "350",
        customUnit: "m",
        options: [
          { value: "200", label: "200m" },
          { value: "300", label: "300m" },
          { value: "400", label: "400m" },
          { value: "600", label: "600m" },
          { value: "800", label: "800m" },
          { value: "1000", label: "1km" },
          { value: "1200", label: "1.2km" },
          { value: "1600", label: "1.6km" },
        ],
      },
      {
        id: "intervalPace",
        label: "페이스",
        type: "segmentPace",
        linkedDistanceField: "repDistance",
        placeholder: "1:15",
        hint: "mm:ss",
      },
      {
        id: "recoveryDistance",
        label: "거리",
        type: "selectOrCustom",
        customPlaceholder: "200",
        customUnit: "m",
        options: [
          { value: "0", label: "스탠딩/정지" },
          { value: "100", label: "100m" },
          { value: "200", label: "200m" },
          { value: "300", label: "300m" },
          { value: "400", label: "400m" },
          { value: "800", label: "800m" },
        ],
      },
      {
        id: "recoveryTime",
        label: "회복 시간",
        type: "duration",
        linkedDistanceField: "recoveryDistance",
        placeholder: "1:30",
        hint: "mm:ss · 조깅 시 km 페이스 자동 표시",
      },
      {
        id: "reps",
        label: "횟수",
        placeholder: "8",
        unit: "회",
        hint: "1세트당 인터벌 횟수",
      },
      {
        id: "sets",
        label: "세트",
        placeholder: "1",
        unit: "set",
        hint: "전체 세트 수",
      },
      {
        id: "setRestTime",
        label: "세트 간 휴식",
        type: "duration",
        placeholder: "3:00",
        hint: "mm:ss",
        colSpan: 2,
      },
      {
        id: "warmupKm",
        label: "워밍업",
        placeholder: "2",
        unit: "km",
      },
      {
        id: "cooldownKm",
        label: "쿨다운",
        placeholder: "1.5",
        unit: "km",
      },
    ],
  },
  {
    id: "tempo",
    label: "템포런",
    tag: "TEMPO",
    description: "젖산 역치 구간 훈련. 템포 구간 거리와 목표 페이스를 기록합니다.",
    sessionFields: [
      {
        id: "tempoKm",
        label: "템포 구간",
        placeholder: "6",
        unit: "km",
      },
      {
        id: "targetTempoPace",
        label: "목표 템포 페이스",
        placeholder: "4:30",
        unit: "/km",
      },
      {
        id: "warmupKm",
        label: "워밍업",
        placeholder: "2",
        unit: "km",
      },
      {
        id: "cooldownKm",
        label: "쿨다운",
        placeholder: "2",
        unit: "km",
      },
      {
        id: "hrZone",
        label: "목표 심박 존",
        type: "select",
        options: [
          { value: "z3", label: "Zone 3" },
          { value: "z4", label: "Zone 4 (역치)" },
        ],
      },
    ],
  },
  {
    id: "long",
    label: "장거리",
    tag: "LONG",
    description: "장거리 내구 훈련. 메인 거리와 이지 페이스 목표를 기록합니다.",
    sessionFields: [
      {
        id: "mainKm",
        label: "메인 거리",
        placeholder: "15",
        unit: "km",
      },
      {
        id: "targetPace",
        label: "목표 페이스",
        placeholder: "5:30",
        unit: "/km",
        hint: "이지~마라톤 페이스",
      },
      {
        id: "warmupKm",
        label: "워밍업",
        placeholder: "2",
        unit: "km",
      },
      {
        id: "fueling",
        label: "보급 계획",
        placeholder: "10km 이후 겔 1개",
        hint: "선택 입력",
      },
    ],
  },
  {
    id: "fartlek",
    label: "파틀크",
    tag: "FARTLEK",
    description: "가속·감속 반복. 작업/회복 시간과 반복 횟수를 기록합니다.",
    sessionFields: [
      {
        id: "workDuration",
        label: "가속 시간",
        placeholder: "3",
        unit: "분",
      },
      {
        id: "restDuration",
        label: "회복 시간",
        placeholder: "2",
        unit: "분",
      },
      {
        id: "repetitions",
        label: "반복 횟수",
        placeholder: "6",
        unit: "회",
      },
      {
        id: "workIntensity",
        label: "가속 강도",
        type: "select",
        options: [
          { value: "5k", label: "5K 페이스" },
          { value: "10k", label: "10K 페이스" },
          { value: "hard", label: "강한 노력 (RPE 8)" },
        ],
      },
      {
        id: "warmupKm",
        label: "워밍업",
        placeholder: "2",
        unit: "km",
      },
      {
        id: "cooldownKm",
        label: "쿨다운",
        placeholder: "2",
        unit: "km",
      },
    ],
  },
  {
    id: "hill",
    label: "힐",
    tag: "HILL",
    description: "언덕 반복·회복·세트를 인터벌과 같은 형식으로 기록합니다.",
    sessionGroups: [
      {
        title: "힐 반복",
        fieldIds: ["hillLength", "hillTime", "gradient", "effort"],
      },
      {
        title: "회복",
        fieldIds: ["recoveryDistance", "recoveryTime"],
      },
      { title: "반복 · 세트", fieldIds: ["reps", "sets", "setRestTime"] },
      { title: "준비 · 정리", fieldIds: ["warmupKm", "cooldownKm"] },
    ],
    sessionFields: [
      {
        id: "hillLength",
        label: "언덕 길이",
        type: "selectOrCustom",
        customPlaceholder: "200",
        customUnit: "m",
        options: [
          { value: "100", label: "100m" },
          { value: "150", label: "150m" },
          { value: "200", label: "200m" },
          { value: "300", label: "300m" },
          { value: "400", label: "400m" },
          { value: "600", label: "600m" },
          { value: "800", label: "800m" },
        ],
      },
      {
        id: "hillTime",
        label: "상승 시간",
        type: "duration",
        linkedDistanceField: "hillLength",
        placeholder: "1:00",
        hint: "mm:ss · km 페이스 자동 표시",
      },
      {
        id: "gradient",
        label: "경사도",
        placeholder: "5",
        unit: "%",
        hint: "선택 입력",
      },
      {
        id: "effort",
        label: "상승 강도",
        type: "select",
        options: [
          { value: "easy", label: "저강도 (RPE 5)" },
          { value: "moderate", label: "중강도 (RPE 7)" },
          { value: "hard", label: "고강도 (RPE 9)" },
        ],
      },
      {
        id: "recoveryDistance",
        label: "거리",
        type: "selectOrCustom",
        customPlaceholder: "200",
        customUnit: "m",
        options: [
          { value: "0", label: "스탠딩/정지" },
          { value: "100", label: "100m" },
          { value: "200", label: "200m" },
          { value: "300", label: "300m" },
          { value: "400", label: "400m" },
        ],
      },
      {
        id: "recoveryTime",
        label: "회복 시간",
        type: "duration",
        linkedDistanceField: "recoveryDistance",
        placeholder: "1:00",
        hint: "mm:ss · 하강 조깅 시 km 페이스 자동 표시",
      },
      {
        id: "reps",
        label: "횟수",
        placeholder: "10",
        unit: "회",
        hint: "1세트당 힐 반복 횟수",
      },
      {
        id: "sets",
        label: "세트",
        placeholder: "1",
        unit: "set",
        hint: "전체 세트 수",
      },
      {
        id: "setRestTime",
        label: "세트 간 휴식",
        type: "duration",
        placeholder: "3:00",
        hint: "mm:ss",
        colSpan: 2,
      },
      {
        id: "warmupKm",
        label: "워밍업",
        placeholder: "2",
        unit: "km",
      },
      {
        id: "cooldownKm",
        label: "쿨다운",
        placeholder: "1.5",
        unit: "km",
      },
    ],
  },
  {
    id: "cross",
    label: "기타·보강",
    tag: "CROSS",
    recordType: "cross",
    description:
      "웨이트·보강 등 종목별로 추가해 세션을 구성합니다.",
    sessionFields: [],
  },
]

export function getWorkoutCategory(id: WorkoutCategoryId): WorkoutCategoryConfig {
  return (
    workoutCategories.find((c) => c.id === id) ?? workoutCategories[0]
  )
}
