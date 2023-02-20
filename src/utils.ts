export async function spawnText(
  binPath: string | URL,
  options?: Deno.CommandOptions,
): Promise<{ out: string; err: string }> {
  const cmd = new Deno.Command(binPath, options);
  const { code, stdout, stderr } = await cmd.output();
  const td = new TextDecoder();
  const err = td.decode(stderr);
  if (code !== 0) {
    throw `${binPath} failed with code ${code}: ${err}`;
  }
  const out = td.decode(stdout);
  return { out, err };
}
