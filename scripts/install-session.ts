import fs from "node:fs";
import path from "node:path";

type SessionLevel = "info" | "error";

function releaseDir(root = process.cwd()): string {
  return path.join(root, "release");
}

export function getInstallSessionLogPath(root = process.cwd()): string {
  return path.join(releaseDir(root), "install-session.log");
}

export function appendInstallSessionLog(input: {
  step: string;
  event: string;
  level?: SessionLevel;
  payload?: unknown;
  root?: string;
}): void {
  const root = input.root ?? process.cwd();
  const target = getInstallSessionLogPath(root);
  fs.mkdirSync(path.dirname(target), { recursive: true });

  const entry = {
    timestamp: new Date().toISOString(),
    step: input.step,
    event: input.event,
    level: input.level ?? "info",
    payload: input.payload ?? null
  };

  fs.appendFileSync(target, `${JSON.stringify(entry)}\n`, "utf8");
}
