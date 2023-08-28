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
      }, 1_000)
    }
  }

  public requestTarget(target: TargetStates) {
    this.readHardwareState()

    // if target has changed, but gate has stopped
    if (this.isStopped) {
      this.target = Number(!target) as TargetStates
      this.updateTransitionalState(this.target)
      this.writeSignal()
      return
    }

    // if target was requested while moving, set stopped state
    if (this.isMoving) {
      this.setCurrent(CurrentStates.STOPPED)
      this.writeSignal()
      return
    }

    // ignore target change because it is already set
    if (this.target === target) {
      this.emit("current", this.current)
      return
    }

    this.target = target
    this.emit("target", target)

    this.updateTransitionalState(target)
    this.writeSignal()

    // if gate hasn't reached target state in 20 seconds, set stopped state
    setTimeout(() => {
      if (this.targetResolved) return
      this.setCurrent(CurrentStates.STOPPED)
    }, this.changeTimeout)
  }

  /**
   * Reads the hardware state and sets the current state.
   * This is called every second.
   * Can be read on demand. 
   */
  private readHardwareState() {
    if (this.dryRun) return
    const { Gpio } = require("pigpio")
    const p5 = new Gpio(5, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP }) // open state
    const p6 = new Gpio(6, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP }) // close state

    const isGarageOpen: boolean = p5.digitalRead() && !p6.digitalRead()
    const isGarageClosed: boolean = p6.digitalRead() && !p5.digitalRead()

    if (isGarageOpen) {
      this.setCurrent(CurrentStates.OPEN)
    } else if (isGarageClosed) {
      this.setCurrent(CurrentStates.CLOSE)
    }
  }

  /**
   * Writes a HIGH State for 500ms to GPIO 18.
   * This starts and stops the motor.
   */
  private writeSignal() {
    if (this.dryRun) {
      setTimeout(() => {
        this.setCurrent(this.target)
      }, 5000 + Math.random() * 1000)
      return
    }

    const { Gpio } = require("pigpio")
    const p4 = new Gpio(18, { mode: Gpio.OUTPUT })
    p4.digitalWrite(1)
    setTimeout(() => {
      p4.digitalWrite(0)
    }, 500)
  }

  private setCurrent(current: CurrentStates) {
    if (this.current === current) return
    console.log(new Date(), {
      from: this.current,
      to: current,
    })
    this.current = current
    this.emit("current", this.current)
  }

  public getState() {
    this.readHardwareState()
    return this.current
  }

  private get isMoving(): boolean {
    return (
      this.current === CurrentStates.OPENING ||
      this.current === CurrentStates.CLOSING
    )
  }

  private get isStopped(): boolean {
    return this.current === CurrentStates.STOPPED
  }

  private get isSafe(): boolean {
    return (
      this.current === CurrentStates.OPEN ||
      this.current === CurrentStates.CLOSE
    )
  }

  private updateTransitionalState(target: TargetStates) {
    this.setCurrent(
      {
        [TargetStates.OPEN]: CurrentStates.OPENING,
        [TargetStates.CLOSE]: CurrentStates.CLOSING,
      }[target],
    )
  }

  public get targetResolved(): boolean {
    return this.target === this.current
  }
}
