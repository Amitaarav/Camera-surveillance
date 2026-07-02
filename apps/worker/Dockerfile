FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git if needed by go mod tidy
RUN apk add --no-cache git

# Copy the source code
COPY . .

# Download dependencies and build
RUN go mod tidy
RUN go build -o worker main.go


FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/worker .

CMD ["./worker"]
