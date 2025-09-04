use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    error::ErrorUnauthorized,
    http::header::{self, HeaderValue},
    Error, HttpMessage, HttpRequest,
};
use futures_util::future::{ready, LocalBoxFuture, Ready};
use jsonwebtoken::{decode, DecodingKey, Validation};
use shared::{Claims, CallDockerError};
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;
use std::task::{Context, Poll};

pub struct AuthMiddleware {
    jwt_secret: String,
}

impl AuthMiddleware {
    pub fn new(jwt_secret: String) -> Self {
        Self { jwt_secret }
    }
}

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareService {
            service: Rc::new(service),
            jwt_secret: self.jwt_secret.clone(),
        }))
    }
}

pub struct AuthMiddlewareService<S> {
    service: Rc<S>,
    jwt_secret: String,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();
        let jwt_secret = self.jwt_secret.clone();

        Box::pin(async move {
            // Extract token from Authorization header
            let auth_header = req.headers().get(header::AUTHORIZATION);
            let token = match auth_header {
                Some(header) => {
                    let header_str = header.to_str().unwrap_or("");
                    if header_str.starts_with("Bearer ") {
                        header_str[7..].to_string()
                    } else {
                        return Err(ErrorUnauthorized("Invalid authorization header"));
                    }
                }
                None => return Err(ErrorUnauthorized("Missing authorization header")),
            };

            // Decode and validate token
            let claims = decode::<Claims>(
                &token,
                &DecodingKey::from_secret(jwt_secret.as_ref()),
                &Validation::default(),
            )
            .map_err(|_| ErrorUnauthorized("Invalid token"))?;

            // Add claims to request extensions
            req.extensions_mut().insert(claims.claims);

            // Continue with the request
            let res = svc.call(req).await?;
            Ok(res)
        })
    }
}

// Helper function to extract claims from request
pub fn get_claims(req: &HttpRequest) -> Result<Claims, CallDockerError> {
    req.extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| CallDockerError::Authentication("Claims not found in request".to_string()))
}

// Helper function to check if user has required role
pub fn has_role(claims: &Claims, required_role: &str) -> bool {
    match required_role {
        "super_admin" => matches!(claims.role, shared::UserRole::SuperAdmin),
        "company_admin" => matches!(claims.role, shared::UserRole::SuperAdmin | shared::UserRole::CompanyAdmin),
        "agent" => true, // All roles can access agent-level endpoints
        _ => false,
    }
}
