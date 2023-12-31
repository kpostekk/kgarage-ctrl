#!/usr/bin/env node
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
      y
        .option("host", {
          type: "string",
          default: "0.0.0.0",
          demandOption: false,
        })
        .option("dryRun", { type: "boolean", default: false }),
    async ({ port, host, secret, dryRun }) => {
      const server = new ControlTCPServer(secret, {
        dryRun,
      })
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
        })
        client.on("data", (data) => {
          console.log(new Date(), JSON.parse(data.toString()))
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
        })
        client.on("data", (data) => {
          const state = JSON.parse(data.toString())
          console.log(new Date(), state)
          if (state.target === target) {
            client.end()
          }
        })
      })
    },
  )
  .parse()
