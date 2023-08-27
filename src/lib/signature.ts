import { ControlPacket } from "./validator"
import { createHmac } from "crypto"

export function checkSignature(options: {
  payload: ControlPacket
  signature: string
  secret: string
}) {
  return signPayload(options) === options.signature
}

export function signPayload(options: {
  payload: ControlPacket
  secret: string
}) {
  const data = JSON.stringify(options.payload)
  const hmac = createHmac("sha256", options.secret)
  hmac.update(data)
  const digest = hmac.digest("hex")
  return digest
}
