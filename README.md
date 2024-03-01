# Bitextual: A tool for bilingual text alignment

Bitextual takes translated (preferably by humans) texts in two languages, and
outputs an easy-to-read HTML file that shows the two texts side-by-side,
aligned. This is useful for intermediate-to-advanced language learners, who want
to read literature in a foreign language, but are intimidated by the difficulty
of the text.

You can use Bitextual on the web at [bitextual.net](https://bitextual.net).

You can also use it as a command-line tool with node.js by
cloning this repo.

## Some technical notes

Alignment quality can vary significantly depending on the nature of the
translation. Broadly speaking, more liberal translations, especially those where
the translator has extensively modified sentence and paragraph breaks, will
align more poorly.

For an example of output, see the included French-English copy of
[Madame Bovary](https://htmlpreview.github.io/?https://github.com/wydengyre/bitextual/blob/main/packages/test/bovary.aligned.html).

That file is generated with the following command:

```sh
tsx packages/cli/main.ts packages/test/bovary.french.edited.txt packages/test/bovary.english.edited.txt > packages/test/bovary.aligned.html"
```

The command says "run the `main.ts` script on Bovary in French (source) and Bovary in English (target)
target file."

This project relies on a WebAssembly fork of
[hunalign](https://github.com/wydengyre/hunalign) for text alignment.

## Future direction

The [bertalign](https://github.com/wydengyre/bertalign) algorithm produces
superior alignments at the expense of requiring download of a large model file.
The project relies on a Python-based toolchain. Converting this to TypeScript
would result in significantly improved alignments, especially in the case of
liberally translated texts.
