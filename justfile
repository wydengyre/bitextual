#!/usr/bin/env just --justfile

# might come in handy
# RELEASE_NAME := `git rev-parse --abbrev-ref HEAD` + "-" + `git rev-parse --short HEAD`

default:
	just --list --justfile {{justfile()}}

clean:
	npm run clean --workspaces --if-present

ci: ci-lint typecheck build test

ci-lint:
	npm run ci-lint

lint:
	npm run lint

typecheck:
	npm run typecheck --workspaces --if-present

build:
	npm run build --workspace '@bitextual/web'
	npm run build --workspace '@bitextual/cf'

test: build
	npm run test --workspaces --if-present

serve: build
	npm run serve --workspace '@bitextual/cf'

deploy: build
	npm run deploy --workspace '@bitextual/cf'
