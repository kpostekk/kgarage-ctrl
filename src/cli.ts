import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { ControlTCPServer, ControlTCPClient } from "./tcp"

yargs(hideBin(process.argv))
  .option("secret", { type: "string", demandOption: true })
  .option("port", { type: "number", default: 11001 })
  .option("host", { type: "string", demandOption: true })
  .command(
    "tcp",
    "Start TCP server",
    (y) =>
      y.option("host", {
        type: "string",
        default: "0.0.0.0",
        demandOption: false,
      }),
    async ({ port, host, secret }) => {
      const server = new ControlTCPServer(secret)
      server.listen(port, host)
    },
  )
  .command(
    "sync",
    "Sync data",
    (y) => y,
    async ({ host, port, secret }) => {
      const client = new ControlTCPClient(secret)
      client.connect(port, host)
      client.once("connect", () => {
        client.sendControlPacket({
          action: "SYNC",
          timestamp: Date.now(),
        })
        client.on("data", (data) => {
          console.log(data.toString())
        })
      })
    },
  )
  .command(
    "set",
    "Request target",
    (y) =>
      y.option("target", {
        choices: [0, 1] as const,
        demandOption: true,
        type: "number",
      }),
    async ({ host, port, secret, target }) => {
      const client = new ControlTCPClient(secret)
      client.connect(port, host)
      client.once("connect", () => {
        client.sendControlPacket({
          action: "SET",
          target,
          timestamp: Date.now(),
        })
        client.on("data", (data) => {
          const state = Number(data.toString())
          console.log({ state })
          if (state === target) {
            console.log("OK")
            client.end()
          }
        })
      })
    },
  )
  .parse()
