FROM golang:alpine

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

WORKDIR /dist
RUN cp -r /build/templates ./templates
RUN cp -r /build/res ./res

# Copy binary from build to main folder
RUN cp /build/main .

# Export necessary port
EXPOSE 3000

# Command to run when starting the container
CMD ["/dist/main"]
