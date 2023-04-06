import { fromFileUrl } from "std/path/mod.ts";
import { go } from "./main.ts";

Deno.test("run main", async () => {
  const sourceLang = "fr";
  const bovaryFrench = fromFileUrl(
    import.meta.resolve("../test/bovary.french.edited.txt"),
  );
  const targetLang = "en";
  const bovaryEnglish = fromFileUrl(
    import.meta.resolve("../test/bovary.english.edited.txt"),
  );
  const _result = await go([
    sourceLang,
    targetLang,
    bovaryFrench,
    bovaryEnglish,
  ]);
  // TODO: assert result
});
