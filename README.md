# CallDocker Backend API

A comprehensive backend API for the CallDocker SaaS platform, providing real-time communication, IVR management, call analytics, and multi-tenant architecture.

## 🚀 Features

### Core Functionality
- **Real-time Communication**: WebRTC-based voice/video calls and screen sharing
- **IVR Management**: Interactive Voice Response system with customizable flows
- **Call Management**: Complete call lifecycle from initiation to completion
- **Multi-tenant Architecture**: Company-based isolation and management
- **Agent Management**: Agent availability, skills, and performance tracking
- **Analytics & Reporting**: Comprehensive call analytics and insights

### Security & Authentication
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin, Manager, and Agent roles
- **Company Isolation**: Multi-tenant security with company boundaries
- **Rate Limiting**: API rate limiting and abuse prevention
- **Input Validation**: Comprehensive request validation and sanitization

### Integrations
- **Webhook Support**: External service integrations
- **Twilio Integration**: Phone system integration
- **Slack/Teams**: Notification integrations
- **File Storage**: Local and S3 storage options

## 🏗️ Architecture

```
CallDocker Backend/
├── server.js                 # Main Express server
├── database/                 # Database layer
│   ├── config.js            # Database connection & utilities
│   ├── schema.sql           # PostgreSQL schema
│   └── models/              # Database models
│       ├── User.js          # User management
│       ├── Company.js       # Company management
│       ├── Call.js          # Call management
│       └── IvrFlow.js       # IVR flow management
├── middleware/               # Express middleware
│   ├── auth.js              # Authentication & authorization
│   └── validation.js        # Request validation
├── routes/                   # API endpoints
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management
│   ├── companies.js         # Company management
│   ├── calls.js             # Call management
│   ├── ivr.js               # IVR management
│   ├── agents.js            # Agent management
│   ├── analytics.js         # Analytics & reporting
│   ├── webhooks.js          # Webhook handling
│   └── settings.js          # System & user settings
└── package.json             # Dependencies & scripts
```

## 🛠️ Installation

### Prerequisites
- Node.js 16+ 
- PostgreSQL 12+
- Redis (optional, for caching)

### Setup

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd CallDocker
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Create database
createdb calldocker

# Run schema
psql -d calldocker -f database/schema.sql

# Or use npm scripts
npm run db:create
npm run db:migrate
npm run db:seed
```

4. **Start the Server**
```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Configuration

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=calldocker
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Security
SESSION_SECRET=your_session_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# WebRTC
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=your_turn_server
TURN_USERNAME=your_turn_username
TURN_CREDENTIAL=your_turn_credential

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
SMTP_FROM=noreply@calldocker.com

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=your_bucket
AWS_REGION=us-east-1

# Third-party
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - List all users (admin)
- `GET /api/users/company/:companyId` - Company users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Companies
- `GET /api/companies` - List companies (admin)
- `GET /api/companies/:id` - Get company details
- `POST /api/companies` - Create company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### Calls
- `GET /api/calls` - List calls
- `GET /api/calls/:id` - Get call details
- `POST /api/calls` - Create call
- `PUT /api/calls/:id` - Update call
- `GET /api/calls/queue/next` - Get next call from queue
- `POST /api/calls/:id/assign` - Assign call to agent

### IVR
- `GET /api/ivr` - List IVR flows
- `GET /api/ivr/:id` - Get IVR flow details
- `POST /api/ivr` - Create IVR flow
- `PUT /api/ivr/:id` - Update IVR flow
- `DELETE /api/ivr/:id` - Delete IVR flow
- `POST /api/ivr/:id/activate` - Activate IVR flow

### Agents
- `GET /api/agents` - List agents
- `GET /api/agents/company/:companyId` - Company agents
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id` - Update agent
- `PUT /api/agents/:id/availability` - Update availability

### Analytics
- `GET /api/analytics/company/:companyId/overview` - Company analytics
- `GET /api/analytics/company/:companyId/calls` - Call analytics
- `GET /api/analytics/company/:companyId/agents/performance` - Agent performance
- `GET /api/analytics/company/:companyId/insights` - Analytics insights
- `GET /api/analytics/company/:companyId/export` - Export data

### Webhooks
- `POST /api/webhooks/incoming/:companyId` - Incoming webhooks
- `POST /api/webhooks/twilio/:companyId` - Twilio webhooks
- `GET /api/webhooks/company/:companyId` - Company webhooks
- `POST /api/webhooks/company/:companyId` - Create webhook

### Settings
- `GET /api/settings/system` - System settings (admin)
- `GET /api/settings/company/:companyId` - Company settings
- `GET /api/settings/user/preferences` - User preferences
- `PUT /api/settings/user/preferences` - Update preferences
- `GET /api/settings/themes` - Available themes
- `GET /api/settings/languages` - Available languages

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts and authentication
- **companies**: Multi-tenant company information
- **calls**: Call records and metadata
- **ivr_flows**: IVR configuration and flows
- **agents**: Agent information and availability
- **call_events**: Detailed call event tracking
- **call_queue**: Call queue management

### Key Features
- UUID primary keys for security
- JSONB fields for flexible data storage
- Automatic timestamp management
- Comprehensive indexing for performance
- Foreign key constraints for data integrity

## 🔐 Security

### Authentication Flow
1. User provides credentials
2. Server validates and creates JWT token
3. Token includes user ID, role, and company
4. Subsequent requests include token in Authorization header
5. Middleware validates token and sets req.user

### Authorization
- **Admin**: Full system access
- **Manager**: Company-level access
- **Agent**: Limited to assigned calls and personal data

### Data Isolation
- Company-based data segregation
- User access limited to their company
- Cross-company data access prevented

## 🧪 Testing

### Run Tests
```bash
# Install test dependencies
npm install --save-dev

# Run tests
npm test

# Test specific file
npm test -- --grep "auth"

# Coverage report
npm run test:coverage
```

### Test Backend
```bash
# Test API endpoints
node test-backend.js
```

## 📊 Monitoring

### Health Checks
- `GET /health` - Basic health status
- `GET /api/settings/system/status` - Detailed system status

### Logging
- Request logging with Morgan
- Error logging with Winston
- Structured logging for production

### Metrics
- Call volume and duration
- Agent performance metrics
- System resource usage
- API response times

## 🚀 Deployment

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Configure secure JWT secrets
- [ ] Set up HTTPS/SSL
- [ ] Configure database connection pooling
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Set up CI/CD pipeline

### Docker (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔄 Development

### Scripts
```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database
```

### Code Style
- ESLint configuration
- Prettier formatting
- Consistent error handling
- Comprehensive JSDoc comments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Core API structure
- ✅ Authentication system
- ✅ Database models
- ✅ Basic CRUD operations

### Phase 2 (Next)
- 🔄 Real-time WebSocket signaling
- 🔄 WebRTC implementation
- 🔄 Call recording
- 🔄 Advanced IVR features

### Phase 3 (Future)
- 📋 Mobile app APIs
- 📋 Advanced analytics
- 📋 AI-powered insights
- 📋 Multi-language support
