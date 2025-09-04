#[cfg(test)]
mod tests {
    use super::*;
    use shared::{LoginRequest, RegisterRequest, UserRole};

    #[test]
    fn test_register_request_validation() {
        let valid_request = RegisterRequest {
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            company_name: "Test Company".to_string(),
            company_uuid: "test-company".to_string(),
        };
        
        assert!(valid_request.validate().is_ok());
    }

    #[test]
    fn test_login_request_validation() {
        let valid_request = LoginRequest {
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
        };
        
        assert!(valid_request.validate().is_ok());
    }

    #[test]
    fn test_user_role_display() {
        assert_eq!(UserRole::SuperAdmin.to_string(), "super_admin");
        assert_eq!(UserRole::CompanyAdmin.to_string(), "company_admin");
        assert_eq!(UserRole::Agent.to_string(), "agent");
    }
}
