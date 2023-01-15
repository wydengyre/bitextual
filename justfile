#!/usr/bin/env just --justfile

default:
    just --list --justfile {{justfile()}}

fmt:
    deno fmt src tools test

lint:
    deno lint src test

test:
    deno test --allow-read=./ --allow-run=./resources/punkt src
