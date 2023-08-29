import { ControlPacket, ControlRequest, SignedControlPacket } from "./lib/validator"
import { Server, Socket } from "net"
import { signPayload, checkSignature } from "./lib/signature"
import { CurrentStates } from "./lib/states"
import { GarageDoorControl, GarageDoorState } from "./door"

export type ControlOptions = {
  dryRun?: boolean
}

export class ControlTCPServer extends Server {
  private readonly gdc: GarageDoorControl

  constructor(
    private readonly secret: string,
    options?: ControlOptions,
  ) {
    super()
    this.gdc = new GarageDoorControl(options?.dryRun)
    this.on("connection", this.handleConnection)
  }

  private validateBuffer(buffer: Buffer) {
    try {
      const data = JSON.parse(buffer.toString())
      const { payload, signature } = SignedControlPacket.parse(data)

      const valid = checkSignature({
        payload,
        signature,
        secret: this.secret,
      })

      if (!valid) {
        throw new Error("Invalid signature")
      }

      return payload
    } catch (error) {
      throw new Error("Invalid packet", {
        cause: error,
      })
    }
  }

  private handleConnection(socket: Socket) {
    console.log(new Date(), socket.remoteAddress, "connected")

    const currentStateHandler = (state: GarageDoorState) => {
      socket.write(JSON.stringify(state))
    }

    this.gdc
      .on("current", currentStateHandler)
      .on("target", currentStateHandler)

    socket.on("data", (buffer: Buffer) => {
      try {
        const packet = this.validateBuffer(buffer)
        this.control(packet, socket)
      } catch (error) {
        socket.end()
        console.error(error)
      }
    })

    socket.on("close", () => {
      this.gdc
        .off("current", currentStateHandler)
        .off("target", currentStateHandler)
      console.log(new Date(), socket.remoteAddress, "disconnected")
    })

    socket.on("error", (error) => {
      console.error(error)
      console.log(new Date(), socket.remoteAddress, "disconnected (err)")
    })
  }

  private control(packet: ControlPacket, socket: Socket) {
    switch (packet.action) {
      case "SYNC":
        socket.write(JSON.stringify(this.gdc.state))
        break
      case "SET":
        console.debug(new Date(), socket.remoteAddress, packet)
        this.gdc.requestTarget(packet.target)
        break
    }
  }
}

export class ControlTCPClient extends Socket {
  constructor(private readonly secret: string) {
    super()
  }

  public sendControlPacket(packet: ControlRequest) {
    const payload = ControlPacket.parse({
      ...packet,
      timestamp: Date.now(),
    })

    const signedPacket: SignedControlPacket = {
      payload,
      signature: signPayload({
        payload,
        secret: this.secret,
      }),
    }

    this.write(JSON.stringify(signedPacket))
  }

  public async waitForSync() {
    this.sendControlPacket({
      action: 'SYNC',
    })

    await new Promise((resolve) => {
      this.once('data', resolve)
    })
  }
}
