#!/usr/bin/env node
/**
 * Hook: block the handful of shell commands an autonomous agent should never
 * run in a repo, regardless of what the prompt says. Hooks are enforced by the
 * runtime, not the model, so they hold even when the prompt is wrong.
 *
 * Input arrives on stdin as JSON ({ command, cwd, ... }); output is JSON with
 * { continue, permission: "allow" | "deny" | "ask", user_message?, agent_message? }.
 * See https://cursor.com/docs/hooks for the full schema. Cloud agents run this
 * from .cursor/hooks.json in the repo; hooks do not run during the read-only
 * exploratory turns, only once the agent has a writable environment.
 */
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const command = String(input.command ?? "");

const denied = [
  // `[^;&|\n]*` keeps each match inside one shell command, so `git push origin feat/x && gh pr create --base develop`
  // is not mistaken for a push to develop.
  { re: /\bgit\s+push\b[^;&|\n]*(?:\s--force(?:-with-lease)?\b|\s-f\b)/, why: "force-push is never allowed for agents" },
  { re: /\bgit\s+push\b[^;&|\n]*\b(main|master|develop|release)\b/, why: "agents push feature branches, never an integration branch (main/master/develop/release)" },
  { re: /\bgit\s+reset\s+--hard\b/, why: "destructive reset" },
  { re: /\brm\s+-rf\s+(\/|~|\.)\s*$/, why: "destructive delete of a root" },
  { re: /\bnpm\s+publish\b|\bpnpm\s+publish\b|\byarn\s+publish\b/, why: "publishing requires a human" },
  { re: /\b(vercel|railway|fly|kubectl|terraform|aws|gcloud)\s+(deploy|apply|up|rollout|redeploy)\b/, why: "deploys require a human" },
  // FieldView-specific: the deploy wrappers and anything that touches a live database.
  { re: /scripts\/(deploy-[\w-]+|yolo-deploy|deploy-production|apply-prod-migration|clone-prod-to-uat)\.(sh|ts)\b/, why: "deploy/prod-data scripts require a human" },
  { re: /\bprisma\s+migrate\s+(deploy|reset|resolve)\b|\bpnpm\s+db:(migrate|deploy)\b|\bdb:deploy\b/, why: "applying or resetting migrations against a real database requires a human" },
  { re: /\bprisma\s+db\s+(push|execute)\b/, why: "direct schema pushes require a human" },
  { re: /--no-verify\b/, why: "hooks must not be skipped" },
];

for (const { re, why } of denied) {
  if (re.test(command)) {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        permission: "deny",
        user_message: `Blocked by .cursor/hooks: ${why}`,
        agent_message: `That command is blocked in this repository (${why}). Choose a non-destructive alternative or report that a human must do it.`,
      }),
    );
    process.exit(0);
  }
}

process.stdout.write(JSON.stringify({ continue: true, permission: "allow" }));
