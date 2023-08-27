import EventEmitter from "events"
import { CurrentStates, TargetStates } from "./lib/states"

export class GarageDoorControl extends EventEmitter {
  private target: TargetStates = TargetStates.CLOSE
  private current: CurrentStates = CurrentStates.CLOSE

  private readonly changeTimeout = 20_000

  constructor(private readonly dryRun?: boolean) {
    super()
    
    if (!this.dryRun) {
      setInterval(() => {
        this.readHardwareState()
        this.emit("current", this.current)
      }, 5_000)
    }
  }

  public requestTarget(target: TargetStates) {
    if (
      this.current !== CurrentStates.CLOSE &&
      this.current !== CurrentStates.OPEN &&
      this.current !== CurrentStates.STOPPED
    ) {
      this.setCurrent(CurrentStates.STOPPED)
      return
    }

    if (this.target === target) {
      this.emit("current", this.current)
      return
    }

    this.target = target
    this.emit("target", target)

    this.setCurrent(
      {
        [TargetStates.OPEN]: CurrentStates.OPENING,
        [TargetStates.CLOSE]: CurrentStates.CLOSING,
      }[target],
    )

    this.writeSignal()

    this.waitForTarget().catch(() => {
      this.setCurrent(CurrentStates.STOPPED)
    })
  }

  private waitForTarget(): Promise<void> {
    if (this.dryRun) {
      setTimeout(() => {
        this.setCurrent(this.target)
      }, 3000 + Math.random() * 500)
    }

    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        this.readHardwareState()

        if (this.current === CurrentStates.STOPPED) {
          reject()
          return
        }

        if (this.targetResolved) {
          clearInterval(interval)
          resolve()
          return
        }
      }, 100)

      setTimeout(() => {
        reject()
      }, this.changeTimeout)
    })
  }

  private readHardwareState() {
    if (this.dryRun) return
    const { Gpio } = require("pigpio")
    const p5 = new Gpio(5, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP }) // open state
    const p6 = new Gpio(6, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP }) // close state

    const isGarageOpen = p5.digitalRead() === 1
    const isGarageClosed = p6.digitalRead() === 1

    if (isGarageOpen && isGarageClosed) {
      throw new Error("Garage door is in an invalid state")
    }

    if (isGarageOpen) {
      this.setCurrent(CurrentStates.OPEN)
    } else if (isGarageClosed) {
      this.setCurrent(CurrentStates.CLOSE)
    }
  }

  private writeSignal() {
    if (this.dryRun) return
    const { Gpio } = require("pigpio")
    const p4 = new Gpio(18, { mode: Gpio.OUTPUT })
    p4.digitalWrite(1)
    setTimeout(() => {
      p4.digitalWrite(0)
    }, 500)
  }

  private setCurrent(current: CurrentStates) {
    this.current = current
    this.emit("current", this.current)
  }

  public getState() {
    this.readHardwareState()
    return this.current
  }

  public get targetResolved(): boolean {
    return this.target === this.current
  }
}
