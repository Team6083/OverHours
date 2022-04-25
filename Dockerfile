FROM golang:1.16 as builder

# Set necessary environmet variables needed for our image
ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \ 
    PORT=3000

# Move to working directory /build
WORKDIR /build

# Copy and download dependency using go mod
COPY go.mod .
COPY go.sum .
RUN go mod download

# Copy the code into the container
COPY . .

# Build the application
RUN go build -o main .

FROM alpine:latest

WORKDIR /dist
COPY --from=builder /build/templates ./templates
COPY --from=builder /build/res ./res

# Copy binary from build to main folder
COPY --from=builder /build/main .

# Timezone file
COPY --from=builder /usr/local/go/lib/time/zoneinfo.zip /opt/zoneinfo.zip

# Export necessary port
EXPOSE 3000

# Command to run when starting the container
CMD ["/dist/main"]
