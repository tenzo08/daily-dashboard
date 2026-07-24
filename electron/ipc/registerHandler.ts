import { ipcMain } from 'electron'

/** Thin, consistent wrapper every electron/ipc/*.ts file uses to register
 *  a handler — keeps the (_event, ...args) => ... boilerplate in one place. */
export function registerHandler<Args extends unknown[], Result>(
  channel: string,
  handler: (...args: Args) => Result | Promise<Result>
): void {
  ipcMain.handle(channel, (_event, ...args: Args) => handler(...args))
}
