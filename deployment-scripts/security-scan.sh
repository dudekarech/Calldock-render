#!/bin/bash

# CallDocker Security Scan Script
# This script performs security checks on the CallDocker application

set -e

echo "🔒 Starting CallDocker Security Scan..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for security vulnerabilities in dependencies
check_dependencies() {
    print_status "Checking for security vulnerabilities in dependencies..."
    
    if command -v npm &> /dev/null; then
        if npm audit --audit-level=moderate; then
            print_success "No high or moderate vulnerabilities found in dependencies."
        else
            print_warning "Security vulnerabilities found in dependencies. Run 'npm audit fix' to fix them."
        fi
    else
        print_error "npm not found. Cannot check dependencies."
    fi
}

# Check for hardcoded secrets
check_secrets() {
    print_status "Checking for hardcoded secrets..."
    
    # Common secret patterns
    SECRET_PATTERNS=(
        "password.*=.*['\"][^'\"]{8,}['\"]"
        "secret.*=.*['\"][^'\"]{8,}['\"]"
        "key.*=.*['\"][^'\"]{8,}['\"]"
        "token.*=.*['\"][^'\"]{8,}['\"]"
        "api_key.*=.*['\"][^'\"]{8,}['\"]"
        "private_key.*=.*['\"][^'\"]{8,}['\"]"
    )
    
    SECRETS_FOUND=false
    
    for pattern in "${SECRET_PATTERNS[@]}"; do
        if grep -r -i -E "$pattern" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" .; then
            SECRETS_FOUND=true
        fi
    done
    
    if [ "$SECRETS_FOUND" = true ]; then
        print_warning "Potential hardcoded secrets found. Please review and move to environment variables."
    else
        print_success "No hardcoded secrets found."
    fi
}

# Check for SQL injection vulnerabilities
check_sql_injection() {
    print_status "Checking for potential SQL injection vulnerabilities..."
    
    # Look for direct string concatenation in SQL queries
    if grep -r -i "SELECT.*\+" --include="*.js" --exclude-dir=node_modules .; then
        print_warning "Potential SQL injection vulnerability found. Use parameterized queries."
    else
        print_success "No obvious SQL injection vulnerabilities found."
    fi
    
    # Check for proper use of parameterized queries
    if grep -r -i "pool\.query.*\$" --include="*.js" --exclude-dir=node_modules .; then
        print_success "Parameterized queries are being used."
    else
        print_warning "Consider using parameterized queries for database operations."
    fi
}

# Check for XSS vulnerabilities
check_xss() {
    print_status "Checking for potential XSS vulnerabilities..."
    
    # Look for unescaped user input in HTML
    if grep -r -i "innerHTML.*req\." --include="*.js" --exclude-dir=node_modules .; then
        print_warning "Potential XSS vulnerability found. Sanitize user input before displaying."
    else
        print_success "No obvious XSS vulnerabilities found."
    fi
    
    # Check for proper input validation
    if grep -r -i "express-validator\|joi\|yup" --include="*.js" --exclude-dir=node_modules .; then
        print_success "Input validation library found."
    else
        print_warning "Consider adding input validation middleware."
    fi
}

# Check for CSRF protection
check_csrf() {
    print_status "Checking for CSRF protection..."
    
    if grep -r -i "csurf\|csrf" --include="*.js" --exclude-dir=node_modules .; then
        print_success "CSRF protection found."
    else
        print_warning "Consider adding CSRF protection for state-changing operations."
    fi
}

# Check for rate limiting
check_rate_limiting() {
    print_status "Checking for rate limiting..."
    
    if grep -r -i "rate-limit\|express-rate-limit" --include="*.js" --exclude-dir=node_modules .; then
        print_success "Rate limiting found."
    else
        print_warning "Consider adding rate limiting to prevent abuse."
    fi
}

# Check for HTTPS enforcement
check_https() {
    print_status "Checking for HTTPS enforcement..."
    
    if grep -r -i "helmet\|hsts" --include="*.js" --exclude-dir=node_modules .; then
        print_success "Security headers middleware found."
    else
        print_warning "Consider adding helmet.js for security headers."
    fi
}

# Check for file upload security
check_file_upload() {
    print_status "Checking for file upload security..."
    
    if grep -r -i "multer" --include="*.js" --exclude-dir=node_modules .; then
        print_success "File upload middleware found."
        
        # Check for file type validation
        if grep -r -i "fileFilter\|mimetype" --include="*.js" --exclude-dir=node_modules .; then
            print_success "File type validation found."
        else
            print_warning "Consider adding file type validation for uploads."
        fi
        
        # Check for file size limits
        if grep -r -i "limits.*fileSize" --include="*.js" --exclude-dir=node_modules .; then
            print_success "File size limits found."
        else
            print_warning "Consider adding file size limits for uploads."
        fi
    else
        print_warning "No file upload middleware found. If you handle file uploads, consider adding security measures."
    fi
}

# Check for authentication security
check_auth() {
    print_status "Checking for authentication security..."
    
    # Check for JWT implementation
    if grep -r -i "jsonwebtoken\|jwt" --include="*.js" --exclude-dir=node_modules .; then
        print_success "JWT authentication found."
        
        # Check for proper JWT secret handling
        if grep -r -i "JWT_SECRET" --include="*.js" --exclude-dir=node_modules .; then
            print_success "JWT secret is using environment variables."
        else
            print_warning "Consider using environment variables for JWT secrets."
        fi
    else
        print_warning "No JWT authentication found. Consider implementing secure authentication."
    fi
    
    # Check for password hashing
    if grep -r -i "bcrypt\|argon2\|scrypt" --include="*.js" --exclude-dir=node_modules .; then
        print_success "Password hashing found."
    else
        print_warning "Consider adding password hashing for user authentication."
    fi
}

# Check for logging security
check_logging() {
    print_status "Checking for secure logging practices..."
    
    # Check for sensitive data in logs
    if grep -r -i "console\.log.*password\|console\.log.*secret\|console\.log.*token" --include="*.js" --exclude-dir=node_modules .; then
        print_warning "Potential sensitive data logging found. Avoid logging passwords, secrets, or tokens."
    else
        print_success "No obvious sensitive data logging found."
    fi
    
    # Check for proper error handling
    if grep -r -i "try.*catch\|error.*handling" --include="*.js" --exclude-dir=node_modules .; then
        print_success "Error handling found."
    else
        print_warning "Consider adding proper error handling to avoid information disclosure."
    fi
}

# Check for environment variable security
check_env_security() {
    print_status "Checking for environment variable security..."
    
    # Check if .env files are in .gitignore
    if [ -f .gitignore ] && grep -q "\.env" .gitignore; then
        print_success ".env files are in .gitignore."
    else
        print_warning "Consider adding .env files to .gitignore to prevent secret exposure."
    fi
    
    # Check for .env.example file
    if [ -f .env.example ]; then
        print_success ".env.example file found for documentation."
    else
        print_warning "Consider creating .env.example file to document required environment variables."
    fi
}

# Generate security report
generate_report() {
    print_status "Generating security report..."
    
    REPORT_FILE="security-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "CallDocker Security Scan Report"
        echo "Generated: $(date)"
        echo "=================================="
        echo ""
        
        echo "Dependencies:"
        if command -v npm &> /dev/null; then
            npm audit --audit-level=moderate 2>&1 || echo "Vulnerabilities found - see above"
        else
            echo "npm not available"
        fi
        echo ""
        
        echo "Secret Patterns Found:"
        grep -r -i -E "(password|secret|key|token|api_key|private_key).*=.*['\"][^'\"]{8,}['\"]" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" . || echo "None found"
        echo ""
        
        echo "SQL Injection Check:"
        grep -r -i "SELECT.*\+" --include="*.js" --exclude-dir=node_modules . || echo "No obvious vulnerabilities found"
        echo ""
        
        echo "XSS Check:"
        grep -r -i "innerHTML.*req\." --include="*.js" --exclude-dir=node_modules . || echo "No obvious vulnerabilities found"
        echo ""
        
        echo "Security Middleware:"
        grep -r -i "helmet\|csurf\|rate-limit" --include="*.js" --exclude-dir=node_modules . || echo "No security middleware found"
        echo ""
        
        echo "Authentication:"
        grep -r -i "jsonwebtoken\|bcrypt" --include="*.js" --exclude-dir=node_modules . || echo "No authentication found"
        echo ""
        
    } > "$REPORT_FILE"
    
    print_success "Security report generated: $REPORT_FILE"
}

# Main security scan function
main() {
    echo "🔒 CallDocker Security Scan"
    echo "=========================="
    
    check_dependencies
    check_secrets
    check_sql_injection
    check_xss
    check_csrf
    check_rate_limiting
    check_https
    check_file_upload
    check_auth
    check_logging
    check_env_security
    generate_report
    
    echo ""
    echo "🎉 Security scan completed!"
    echo ""
    echo "📋 Recommendations:"
    echo "1. Fix any high-severity vulnerabilities found"
    echo "2. Implement missing security middleware"
    echo "3. Review and sanitize all user inputs"
    echo "4. Ensure all secrets are in environment variables"
    echo "5. Add comprehensive input validation"
    echo "6. Implement proper error handling"
    echo ""
    echo "📚 For detailed security guidelines, see DEPLOYMENT-STRATEGY.md"
}

# Run main function
main "$@"
