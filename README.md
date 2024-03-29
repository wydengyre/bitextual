# Bitextual: A tool for bilingual text alignment

Bitextual takes translated (preferably by humans) epubs in two languages, and
outputs a parallel, bilingual book that shows the two texts side-by-side,
aligned. This is useful for lovers of translated literature and
intermediate-to-advanced level language learners.

You can use Bitextual on the web at [bitextual.net](https://bitextual.net).

You can also use it as a command-line tool with node.js by
cloning this repo.

## Some technical notes

For an example of output, see the included French-English copy of
[Madame Bovary](https://bitextual.net/bovary.aligned/).
That file is generated with the following command:

```sh
tsx packages/cli/main.ts --html packages/test/bovary.french.epub packages/test/bovary.english.epub > packages/web/dist/bovary.aligned/index.html
```

The command says "run the `main.ts` script with html output on Bovary in French (source) and Bovary in English (target)."

There is also an [epub version](https://bitextual.net/bovary.aligned/bovary.epub), produced with the following command:

```sh
tsx packages/cli/main.ts --epub packages/test/bovary.french.epub packages/test/bovary.english.epub > packages/web/dist/bovary.aligned/bovary.epub
```

This project relies on a WebAssembly fork of
[hunalign](https://github.com/wydengyre/hunalign) for text alignment.
