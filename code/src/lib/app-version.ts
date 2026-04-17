import packageJson from "../../package.json";

function getShortCommitSha(): string | null {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  if (!sha) return null;
  return sha.slice(0, 7);
}

export function getAppVersion(): string {
  return packageJson.version ?? "0.0.0";
}

export function getAppVersionLabel(): string {
  const version = getAppVersion();
  const shortSha = getShortCommitSha();
  return shortSha ? `v${version} · ${shortSha}` : `v${version}`;
}
