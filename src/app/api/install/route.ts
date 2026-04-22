import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

const INSTALL_STEP_MAP = {
  setup: "scripts/setup-install.ts",
  bootstrap: "scripts/bootstrap-install.ts",
  doctor: "scripts/install-doctor.ts",
  postcheck: "scripts/postinstall-check.ts"
} as const;

type InstallStep = keyof typeof INSTALL_STEP_MAP;

const installStatePath = path.join(
  process.cwd(),
  "release",
  "install-state.json"
);

function readInstallState() {
  if (!fs.existsSync(installStatePath)) {
    return {
      setupComplete: false,
      bootstrapComplete: false,
      doctorComplete: false,
      postcheckComplete: false
    };
  }

  try {
    return JSON.parse(fs.readFileSync(installStatePath, "utf8")) as {
      setupComplete?: boolean;
      bootstrapComplete?: boolean;
      doctorComplete?: boolean;
      postcheckComplete?: boolean;
    };
  } catch {
    return {
      setupComplete: false,
      bootstrapComplete: false,
      doctorComplete: false,
      postcheckComplete: false
    };
  }
}

function isStepAllowed(step: InstallStep) {
  const state = readInstallState();

  if (step === "setup") {
    return true;
  }

  if (step === "bootstrap") {
    return state.setupComplete === true;
  }

  if (step === "doctor") {
    return state.setupComplete === true && state.bootstrapComplete === true;
  }

  if (step === "postcheck") {
    return (
      state.setupComplete === true &&
      state.bootstrapComplete === true &&
      state.doctorComplete === true
    );
  }

  return false;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { step?: InstallStep };
  const step = body.step;

  if (!step || !(step in INSTALL_STEP_MAP)) {
    return NextResponse.json(
      { error: "Gecersiz kurulum adimi." },
      { status: 400 }
    );
  }

  if (!isStepAllowed(step)) {
    return NextResponse.json(
      {
        step,
        ok: false,
        error: "Kurulum adimlari sirayla calistirilmalidir."
      },
      { status: 409 }
    );
  }

  const scriptPath = path.join(process.cwd(), INSTALL_STEP_MAP[step]);

  try {
    const { stdout } = await execFileAsync(process.execPath, [
      "--import",
      "tsx",
      scriptPath
    ]);

    const payload = JSON.parse(stdout) as Record<string, unknown>;

    return NextResponse.json({
      step,
      ok: true,
      payload
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kurulum adimi calistirilamadi.";

    return NextResponse.json(
      {
        step,
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}
