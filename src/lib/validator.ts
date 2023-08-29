import { z } from "zod"

export const ControlRequest = z.union([
  z.object({
    action: z.literal("SYNC"),
  }),
  z.object({
    action: z.literal("SET"),
    target: z.union([z.literal(0), z.literal(1)]),
  }),
])

export type ControlRequest = z.infer<typeof ControlRequest>

export const ControlPacket = z.union([
  z.object({
    action: z.literal("SYNC"),
    timestamp: z.number().positive().int(),
  }),
  z.object({
    action: z.literal("SET"),
    target: z.union([z.literal(0), z.literal(1)]),
    timestamp: z.number().positive().int(),
  }),
])

export type ControlPacket = z.infer<typeof ControlPacket>

export const SignedControlPacket = z.object({
  signature: z.string(),
  payload: ControlPacket,
})

export type SignedControlPacket = z.infer<typeof SignedControlPacket>
