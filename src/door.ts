import EventEmitter from "events"
import { CurrentStates, TargetStates } from "./lib/states"

export class GarageDoorControl extends EventEmitter {
  private target: TargetStates = TargetStates.CLOSE
  private current: CurrentStates = CurrentStates.CLOSE

  private readonly changeTimeout = 20_000

  constructor(private readonly dryRun?: boolean) {
    super()

    setInterval(() => {
      this.readHardwareState()
      this.emit("current", this.state)
    }, 1000)
  }

  public requestTarget(target: TargetStates) {
    this.readHardwareState()

    // if target has changed, but gate has stopped
    if (this.isStopped) {
      this.updateTransitionalState(Number(!this.target) as TargetStates)
      this.emit("current", this.state)
      this.writeSignal()
      return
    }

    // if target was requested while moving, set stopped state
    if (this.isMoving) {
      this.publishCurrent(CurrentStates.STOPPED)
      this.writeSignal()
      return
    }

    // ignore target change because it is already set
    if (this.target === target || this.current === target) {
      this.emit("current", this.state)
      return
    }

    this.target = target

    this.updateTransitionalState(target)
    this.emit("current", this.state)
    this.writeSignal()


    // if gate hasn't reached target state in 20 seconds, set stopped state
    const doorTimeout = setTimeout(() => {
      console.log(new Date(), "doorTimeout")
      this.publishCurrent(CurrentStates.STOPPED)
    }, this.changeTimeout)

    this.once("current", () => {
      if (!this.targetResolved) return
      console.log(new Date(), "clearTimeout stopped")
      clearTimeout(doorTimeout)
    })
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
      this.publishCurrent(CurrentStates.OPEN)
    } else if (isGarageClosed) {
      this.publishCurrent(CurrentStates.CLOSE)
    } else if (!this.isMoving && !this.isStopped) {
      // this can happen when someone manually opens or closes the gate
      const counterTarget = Number(!this.target) as TargetStates
      this.updateTransitionalState(counterTarget)
    }
  }

  /**
   * Writes a HIGH State for 500ms to GPIO 18.
   * This starts and stops the motor.
   */
  private writeSignal() {
    if (this.dryRun) {
      setTimeout(
        () => {
          this.publishCurrent(this.target)
        },
        5000 + Math.random() * 1000,
      )
      return
    }

    const { Gpio } = require("pigpio")
    const p4 = new Gpio(18, { mode: Gpio.OUTPUT })
    p4.digitalWrite(1)
    setTimeout(() => {
      p4.digitalWrite(0)
    }, 500)
  }

  private publishCurrent(current: CurrentStates) {
    if (this.current === current) return
    console.log(new Date(), "current", {
      from: this.current,
      to: current,
    })
    this.current = current
    this.emit("current", this.state)
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
    this.current = {
      [TargetStates.OPEN]: CurrentStates.OPENING,
      [TargetStates.CLOSE]: CurrentStates.CLOSING,
    }[target]
  }

  public get targetResolved(): boolean {
    return this.target === this.current
  }

  public get state() {
    this.readHardwareState()
    return {
      current: this.current,
      target: this.target,
    }
  }
}

export type GarageDoorState = GarageDoorControl["state"]
