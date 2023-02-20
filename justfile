#!/usr/bin/env just --justfile

default:
    just --list --justfile {{justfile()}}

ci: ci-fmt lint test

update-deps:
    deno run -A https://deno.land/x/udd/main.ts import_map.json

ci-fmt:
    deno fmt --check deno tools test

fmt:
    deno fmt deno tools test

lint:
    deno lint deno tools test

test:
    deno test --allow-read=./ --allow-run=./resources/punkt deno
