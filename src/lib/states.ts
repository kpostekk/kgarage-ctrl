export const TargetStates = {
  OPEN: 0,
  CLOSE: 1,
} as const

export type TargetStates = typeof TargetStates[keyof typeof TargetStates]

export const CurrentStates = {
  OPEN: 0,
  CLOSE: 1,
  OPENING: 2,
  CLOSING: 3,
  STOPPED: 4,
} as const

export type CurrentStates = typeof CurrentStates[keyof typeof CurrentStates]
