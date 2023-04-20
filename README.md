# Bitextual: A tool for bilingual text alignment

Bitextual takes translated (preferably by humans) texts in two languages,
and outputs an easy-to-read HTML file that shows the two texts side-by-side,
aligned. This is useful for intermediate-to-advanced language learners, who
want to read literature in a foreign language, but are intimidated by the
difficulty of the text.

## Some technical notes

The tool is written in TypeScript and currently supports [Deno](https://deno.land) as its runtime.
The only dependency is Deno.

Alignment quality can vary significantly depending on the nature of the translation. Broadly speaking,
more liberal translations, especially those where the translator has extensively modified sentence
and paragraph breaks, will align more poorly.

For an example of output, see the included French-English copy of [Madame Bovary](https://htmlpreview.github.io/?https://github.com/wydengyre/bitextual/blob/main/test/bovary.aligned.html).

That file is generated with the following command:

```sh
deno run --allow-read deno/main.ts fr en test/bovary.french.edited.txt test/bovary.english.edited.txt > test/bovary.aligned.html 
```

The command says
"run the `main.ts` script on a French source file and an English target file, which have the following paths."

An example of a somewhat more liberal translation leading to poor alignment quality is available
in the [Marianela](https://htmlpreview.github.io/?https://github.com/wydengyre/bitextual/blob/main/test/marianela.aligned.html)
translation.

This project relies on WebAssembly forks of [rust-punkt](https://github.com/wydengyre/rust-punkt)
for tokenization and [hunalign](https://github.com/wydengyre/hunalign) for text alignment.

## Future direction

The [bertalign](https://github.com/wydengyre/bertalign) algorithm produces superior alignments
at the expense of requiring download of a large model file. The project relies on a Python-based
toolchain. Converting this to TypeScript would result in significantly improved alignments,
especially in the case of liberally translated texts.
