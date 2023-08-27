import EventEmitter from "events"
import { CurrentStates, TargetStates } from "./lib/states"
import { Gpio } from 'pigpio'

export class GarageDoorControl extends EventEmitter {
  private target: TargetStates = TargetStates.CLOSE
  private current: CurrentStates = CurrentStates.CLOSE

  private readonly changeTimeout = 20_000

  constructor() {
    super()
    setInterval(() => {
      this.readHardwareState()
    }, 500)
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

    this.setCurrent({
      [TargetStates.OPEN]: CurrentStates.CLOSING,
      [TargetStates.CLOSE]: CurrentStates.OPENING,
    }[target])

    this.waitForTarget().catch(() => {
      this.setCurrent(CurrentStates.STOPPED)
    })
  }

  private waitForTarget(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      setTimeout(
        () => {
          if (this.current === CurrentStates.STOPPED) return

          this.current = this.target
          this.emit("current", this.current)
          resolve()
        },
        5500 + Math.random() * 900,
      )
    })
  }

  private readHardwareState() {
    const p5 = new Gpio(5, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true })
    const p6 = new Gpio(6, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true })
    // gpio 18 is to send change 

    console.log('p5', p5.digitalRead())
    console.log('p6', p6.digitalRead())
  }

  private setCurrent(current: CurrentStates) {
    this.current = current
    this.emit("current", this.current)
  }

  public getState() {
    return this.current
  }

  public get targetResolved(): boolean {
    return this.target === this.current
  }
}
