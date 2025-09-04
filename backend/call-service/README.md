# CallDocker WebRTC Call Service

## Overview

The CallDocker WebRTC Call Service is a high-performance, scalable service that handles real-time voice and video communications using WebRTC technology. It provides the core infrastructure for managing call lifecycles, WebRTC signaling, and intelligent call routing.

## Features

### 🎯 **Core Call Management**
- **Call Lifecycle**: Initiate, connect, hold, transfer, and end calls
- **Call Status Tracking**: Real-time status updates (ringing, connected, ended, etc.)
- **Call Metadata**: Rich call information including customer details, tags, and custom data

### 🌐 **WebRTC Integration**
- **Signaling Server**: Handle WebRTC offer/answer exchange
- **ICE Candidate Management**: Process and relay ICE candidates for NAT traversal
- **Connection State Management**: Track WebRTC peer connection states
- **STUN/TURN Support**: Configurable ICE servers for network traversal

### 🚀 **Intelligent Call Routing**
- **Priority-Based Queuing**: Smart call prioritization based on customer type and urgency
- **Skills-Based Routing**: Route calls to agents with matching skills
- **Load Balancing**: Distribute calls across available agents
- **Queue Management**: Real-time queue statistics and monitoring

### 📊 **Monitoring & Analytics**
- **Health Checks**: Service health monitoring and readiness probes
- **Metrics**: Prometheus metrics for performance monitoring
- **Call Statistics**: Detailed call analytics and reporting
- **Real-time Logging**: Comprehensive logging for debugging and monitoring

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   Call Service  │    │   Database      │
│                 │◄──►│                 │◄──►│   (PostgreSQL)  │
│  (WebRTC)      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Redis Cache   │
                       │                 │
                       │  (Sessions)     │
                       └─────────────────┘
```

## API Endpoints

### Health & Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics

### Call Management
- `POST /calls` - Create a new call
- `GET /calls/{call_id}` - Get call details
- `GET /calls` - List calls (with pagination)
- `PUT /calls/{call_id}` - Update call details
- `POST /calls/{call_id}/end` - End a call

### WebRTC Signaling
- `POST /webrtc/offer` - Handle WebRTC offer
- `POST /webrtc/answer` - Handle WebRTC answer
- `POST /webrtc/ice-candidate` - Handle ICE candidate

### WebSocket
- `GET /ws` - WebSocket connection for real-time updates

## Configuration

The service can be configured using environment variables:

```bash
# Server Configuration
CALL_SERVICE_PORT=8081
CALL_SERVICE_HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/calldocker

# Redis Configuration
REDIS_URL=redis://localhost:6379

# WebRTC Configuration
WEBRTC_MAX_CONNECTIONS=1000
WEBRTC_CONNECTION_TIMEOUT=30000
```

## WebRTC Flow

### 1. Call Initiation
```
Client → POST /calls → Call Service → Database → Queue
```

### 2. WebRTC Signaling
```
Client → POST /webrtc/offer → Call Service → WebRTC Service
Client ← ICE Servers + Connection ID ← Call Service
```

### 3. ICE Candidate Exchange
```
Client → POST /webrtc/ice-candidate → Call Service → WebRTC Service
```

### 4. Call Answer
```
Client → POST /webrtc/answer → Call Service → WebRTC Service
Call Status: Connected
```

## Call Routing Logic

### Priority Calculation
- **Base Priority**: 100
- **VIP Customers**: +50
- **Inbound Calls**: +25
- **Urgent Tags**: +75
- **High Priority Tags**: +50
- **Escalation Tags**: +100

### Skills Matching
- Extract required skills from call metadata
- Match agent skills with call requirements
- Route to best available agent

## Development

### Prerequisites
- Rust 1.70+
- PostgreSQL 13+
- Redis 6+
- Docker (optional)

### Building
```bash
cd backend/call-service
cargo build
```

### Running
```bash
# Development
cargo run

# Production
cargo build --release
./target/release/call-service
```

### Testing
```bash
# Unit tests
cargo test

# Integration tests
cargo test --test integration
```

## Docker

### Building Image
```bash
docker build -t calldocker/call-service .
```

### Running Container
```bash
docker run -p 8081:8081 \
  -e DATABASE_URL=postgresql://postgres:password@host.docker.internal:5432/calldocker \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  calldocker/call-service
```

## Monitoring

### Health Checks
- **Liveness**: `/health` - Service is running
- **Readiness**: `/health` - Service can handle requests

### Metrics
- **Call Counters**: Total calls, active calls, failed calls
- **Response Times**: API endpoint response times
- **Connection States**: WebRTC connection state distribution
- **Queue Metrics**: Queue length, wait times, routing efficiency

### Logging
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: ERROR, WARN, INFO, DEBUG, TRACE
- **Call Tracing**: End-to-end call request tracing

## Security

### Authentication
- JWT token validation for protected endpoints
- Role-based access control (RBAC)
- API key authentication for service-to-service communication

### Data Protection
- Encrypted data transmission (HTTPS/WSS)
- Secure WebRTC connections
- Audit logging for compliance

## Performance

### Scalability
- **Horizontal Scaling**: Stateless service design
- **Connection Pooling**: Database and Redis connection pooling
- **Async Processing**: Non-blocking I/O operations
- **Load Balancing**: Support for multiple service instances

### Optimization
- **Connection Reuse**: Efficient WebRTC connection management
- **Caching**: Redis-based session and metadata caching
- **Batch Operations**: Bulk database operations where possible

## Troubleshooting

### Common Issues

#### WebRTC Connection Failures
- Check ICE server configuration
- Verify network firewall settings
- Monitor STUN/TURN server availability

#### Call Routing Issues
- Verify agent availability and skills
- Check queue configuration
- Monitor routing rule definitions

#### Performance Issues
- Check database connection pool settings
- Monitor Redis memory usage
- Review service resource allocation

### Debug Mode
Enable debug logging:
```bash
export RUST_LOG=debug
cargo run
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide
