# syntax=docker/dockerfile:1.7
# Upstream stopped distributing its public images. Build the official source
# and its locked mc dependency instead of introducing a different storage engine.
FROM golang:1.26-bookworm@sha256:632dff7351799a5a9954a48dc06670ade72ee44e8c351cdc0e5a57af2fea21af AS builder
WORKDIR /src
ARG GOPROXY=https://proxy.golang.org,direct
ENV CGO_ENABLED=0 GOMAXPROCS=2
RUN git init . \
    && git remote add origin https://github.com/minio/minio.git \
    && git fetch --depth=1 origin 9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a \
    && git checkout --detach FETCH_HEAD
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -mod=readonly -p 2 -trimpath \
      -ldflags='-s -w -X github.com/minio/minio/cmd.Version=2025-10-15T17:29:55Z -X github.com/minio/minio/cmd.ReleaseTag=RELEASE.2025-10-15T17-29-55Z -X github.com/minio/minio/cmd.CommitID=9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a' \
      -o /out/minio . \
    && go build -mod=readonly -p 2 -trimpath -ldflags='-s -w' -o /out/mc github.com/minio/mc

FROM debian:bookworm-slim@sha256:7ff6ba31527b9e336162fa061746c366c4b2032f4d2cff2078bea43f78efe3f8
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /out/minio /out/mc /usr/local/bin/
COPY --from=builder /src/dockerscripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --from=builder /src/LICENSE /usr/share/doc/minio/LICENSE
LABEL org.opencontainers.image.source="https://github.com/minio/minio" \
      org.opencontainers.image.revision="9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
EXPOSE 9000 9001
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["minio"]
