FROM rust:1.75-slim as builder

WORKDIR /app

# Copy workspace files
COPY Cargo.toml Cargo.lock ./
COPY shared ./shared
COPY backend/call-service ./backend/call-service

# Build the call service
RUN cargo build --release --bin call-service

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/call-service /app/call-service

# Copy configuration
COPY .env ./

EXPOSE 8080

CMD ["./call-service"]
