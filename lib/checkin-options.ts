export const conditionOptions = [
  { value: 5, label: "최상", color: "bg-accent" },
  { value: 4, label: "좋음", color: "bg-accent/80" },
  { value: 3, label: "보통", color: "bg-warning" },
  { value: 2, label: "피곤", color: "bg-destructive/60" },
  { value: 1, label: "나쁨", color: "bg-destructive" },
] as const

export const bodyParts = [
  "발목",
  "무릎",
  "허벅지",
  "종아리",
  "허리",
  "어깨",
  "기타",
] as const
