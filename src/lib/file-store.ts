import path from "path";

/**
 * Local: `data/<name>` under the project.
 * Vercel/serverless: `/tmp/cornerman/<name>` (only writable path).
 * Data in /tmp is ephemeral per instance - fine for demo; use Supabase later.
 */
export function dataStorePath(filename: string): string {
  const base =
    process.env.VERCEL || process.env.CORNERMAN_USE_TMP_STORE === "1"
      ? path.join("/tmp", "cornerman")
      : path.join(process.cwd(), "data");
  return path.join(base, filename);
}
