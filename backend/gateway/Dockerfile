# Multi-stage build for Go Gateway (Format Kilat)
FROM --platform=$BUILDPLATFORM golang:1.23-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
ARG TARGETOS=linux
ARG TARGETARCH=amd64
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags="-w -s" -o gateway ./cmd/api

FROM alpine:3.20

WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata python3 py3-pip py3-pillow
RUN mkdir -p /app/storage/box /app/scripts

COPY --from=builder /app/gateway .
COPY --from=builder /app/config ./config

EXPOSE 8080

CMD ["./gateway"]
