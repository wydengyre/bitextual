# Bitextual: A tool for bilingual text alignment

Bitextual is a cross-platform tool for alignment of text in two languages.

It is written in TypeScript and supports [Deno](https://deno.land) as its runtime.

To run, see `deno/main.ts`.

It relies on WebAssembly forks of [rust-punkt](https://github.com/wydengyre/rust-punkt)
for tokenization and [hunalign](https://github.com/wydengyre/hunalign) for text alignment.
