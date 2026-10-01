#!/usr/bin/env node
/**
 * Vercel "Ignored Build Step" (vercel.json `ignoreCommand`): exit 0 skips the
 * build, exit 1 builds. Skips a push whose changes can't affect the deployed
 * app — tests, stories, docs, agent notes, CI and the check scripts — so the
 * plan's 100 deployments a day go to real changes (product, 2026-10-01).
 * When unsure (no previous deploy, a shallow clone), it builds.
 */
import { execSync } from 'node:child_process';

const prev = process.env.VERCEL_GIT_PREVIOUS_SHA;
if (!prev) process.exit(1);

let files;
try {
  // --no-renames: a rename lists both paths, so code renamed into a test name
  // still counts as a deployed change.
  files = execSync(`git diff --name-only --no-renames ${prev} HEAD`, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch {
  process.exit(1);
}

const NOT_DEPLOYED = [
  /^\.claude\//,
  /^\.github\//,
  /^\.storybook\//,
  /^docs\//,
  // Markdown at the root only: public/ serves its files.
  /^[^/]+\.md$/,
  /\.(test|stories)\.[cm]?[jt]sx?$/,
  /\.(testkit|harness)\.[jt]sx?$/,
  /^vitest\.(config|setup)\.ts$/,
  /^scripts\/(check-[\w-]+|review-page)\.mjs$/,
];
const skip = files.length > 0 && files.every((f) => NOT_DEPLOYED.some((re) => re.test(f)));
console.log(skip ? 'Skipped: nothing deployed changed.' : 'Building.');
process.exit(skip ? 0 : 1);
