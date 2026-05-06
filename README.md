# Portfolium

Determine what you should work on, how to prioritize it
and how to plan it.

## Development

### Run UI Only (no back-end)

You can run the UI without any back-end provinding data.
Test/dummy data, pre-injected into the UI is used.

Run with

```bash
    make uidev
```

or automatically run on file update with

```bash
    ls ui/comps/*.* ui/layout.* | entr make uidev
```

use a hot-reload web server like Live Server in VSCode
to serve `/ui/dist/index.html`.

### Run with Back-End

When running it with the back-end, start the DB with

```bash
    docker compose up -d
```

build the full-stack webapp and run the server:

```bash
    make fsdev
    go run main.go
```

go to `localhost:8080`.

## Build for Production

Build the app with compression and build the server binary:

```bash
    make build
    go build -o product_server main.go
```
