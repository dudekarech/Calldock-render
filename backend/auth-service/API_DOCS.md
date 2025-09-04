# Auth Service API Documentation

## Base URL
`http://localhost:8081`

## Authentication Endpoints

### 1. User Registration
**POST** `/auth/register`

Register a new user and company.

**Request Body:**
```json
{
  "email": "admin@company.com",
  "password": "securepassword123",
  "company_name": "My Company",
  "company_uuid": "my-company"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@company.com",
    "role": "company_admin",
    "company_id": "uuid",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 2. User Login
**POST** `/auth/login`

Authenticate user and receive access tokens.

**Request Body:**
```json
{
  "email": "admin@company.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here",
    "expires_in": 3600,
    "token_type": "Bearer"
  }
}
```

### 3. Refresh Token
**POST** `/auth/refresh`

Get a new access token using refresh token.

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "new_jwt_token_here",
    "refresh_token": "new_refresh_token_here",
    "expires_in": 3600,
    "token_type": "Bearer"
  }
}
```

### 4. Logout
**POST** `/auth/logout`

Invalidate refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### 5. Forgot Password
**POST** `/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "admin@company.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### 6. Reset Password
**POST** `/auth/reset-password`

Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "new_password": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password successfully reset"
}
```

## User Management Endpoints

### 7. Get User Profile
**GET** `/users/profile`

Get current user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@company.com",
    "role": "company_admin",
    "company_id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "avatar_url": "https://example.com/avatar.jpg",
    "is_active": true,
    "last_login": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 8. Update User Profile
**PUT** `/users/profile`

Update current user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

## Company Management Endpoints

### 9. Create Company
**POST** `/companies`

Create a new company (SuperAdmin only).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "New Company",
  "uuid": "new-company",
  "settings": {}
}
```

### 10. Get Company
**GET** `/companies/{company_id}`

Get company details.

**Headers:**
```
Authorization: Bearer <access_token>
```

## Agent Management Endpoints

### 11. Create Agent
**POST** `/agents`

Create a new agent for the company.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "email": "agent@company.com",
  "password": "agentpassword123",
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "+1234567890"
}
```

### 12. List Agents
**GET** `/agents`

List all agents for the company.

**Headers:**
```
Authorization: Bearer <access_token>
```

## Health Check

### 13. Health Check
**GET** `/health`

Check service health.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Role-Based Access

- **SuperAdmin**: Access to all endpoints
- **CompanyAdmin**: Access to company and agent management
- **Agent**: Limited access to own profile and calls
