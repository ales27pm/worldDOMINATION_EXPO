---
name: git-remote gotchas (GitHub tool + GitLab manual push)
description: Non-obvious failure modes hit while wiring this repo to GitHub (gitPush tool) and GitLab (manual PAT) remotes.
---

## gitPush tool refuses to run if ANY git credential helper is configured
It errors `DANGEROUS_CONFIG` ("credential helper is configured... could access the bearer token") even if the helper is scoped to a different host (e.g. `credential.https://gitlab.com.helper` blocked a GitHub push). Remove any custom credential helper from git config before relying on the `gitPush`/`gitPull`/`createPullRequest` tools; only add one back temporarily for a manual (non-tool) push, then remove it again.

## GitLab push/pull has no first-class tool support — do it with a manual PAT + scoped credential helper
`gitPush`/`gitPull` explicitly reject `gitlab` as a provider (`UNSUPPORTED_PROVIDER`), and Replit's own native "Git pane" GitLab push flow (the in-app "Pass GitLab Credentials" prompt) also currently fails with an UNAUTHENTICATED error — this is a real, currently-unresolved platform gap, not something fixable by reconfiguring the repo. The account-level GitLab connector (via `searchIntegrations`) is also read-only (`read_api, read_repository` scopes only) — it cannot push either.

**Working alternative:** request a GitLab Personal Access Token from the user (`write_repository` scope) via `requestSecrets`, then build a tiny credential-helper script that echoes `username=oauth2` / `password=$GITLAB_TOKEN` from the env var (never print the token yourself), and scope it with `git config credential.https://gitlab.com.helper '!/path/to/script'`. Push with plain `GIT_TERMINAL_PROMPT=0 git push <remote> <branch>` (needs a long timeout — a couple hundred MB of LFS objects took >25s and needs ~90s+). Remove the helper again afterward so the `gitPush` tool isn't blocked (see entry above).

## `origin` remote must be HTTPS for the gitPush tool, not SSH
An SSH-format origin (`git@github.com:owner/repo.git`) is rejected outright ("origin remote must be an HTTPS URL"). Always add/set origin as `https://github.com/owner/repo.git`.

## `UNKNOWN_NOT_GIT` from gitPush on GitHub — unresolved, intermittent
Hit repeatedly on this repo even with a correctly-configured HTTPS `origin`, upstream tracking set, and no credential helper present — tried multiple genuinely different fixes (remote re-add, upstream re-link, retries) and it kept recurring. Root cause undetermined; may be specific to repos with many auto-generated `subrepl-*` checkpoint remotes alongside a manually added `origin`. If hit again, don't sink more time into guessing — tell the user directly and suggest they re-authenticate GitHub from Replit's account-level Git Providers settings, or try the native Git pane's push button, since that's outside what repo-level git config can fix.
