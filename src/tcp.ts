import { ControlPacket, SignedControlPacket } from "./lib/validator"
import { Server, Socket } from "net"
import { signPayload, checkSignature } from "./lib/signature"
import { CurrentStates } from "./lib/states"
import { GarageDoorControl } from "./door"

export type ControlOptions = {
  dryRun?: boolean
}

export class ControlTCPServer extends Server {
  private readonly gdc: GarageDoorControl

  constructor(
    private readonly secret: string,
    options?: ControlOptions
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
    const currentStateHandler = (state: CurrentStates) => {
      socket.write(state.toString())
    }

    this.gdc.on('current', currentStateHandler)

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
      this.gdc.off('current', currentStateHandler)
    })

    socket.on("error", (error) => {
      console.error(error)
    })
  }

  private control(packet: ControlPacket, socket: Socket) {
    switch (packet.action) {
      case "SYNC":
        socket.write(this.gdc.getState().toString())
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

  public sendControlPacket(packet: ControlPacket) {
    const signedPacket: SignedControlPacket = {
      payload: packet,
      signature: signPayload({
        payload: packet,
        secret: this.secret,
      }),
    }

    this.write(JSON.stringify(signedPacket))
  }
}
