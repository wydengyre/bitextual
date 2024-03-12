# Bitextual: A tool for bilingual text alignment

Bitextual takes translated (preferably by humans) texts in two languages, and
outputs an easy-to-read HTML file that shows the two texts side-by-side,
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
tsx packages/cli/main.ts packages/test/bovary.french.edited.txt packages/test/bovary.english.edited.txt > packages/web/dist/bovary.aligned.html"
```

The command says "run the `main.ts` script on Bovary in French (source) and Bovary in English (target)."

This project relies on a WebAssembly fork of
[hunalign](https://github.com/wydengyre/hunalign) for text alignment.
