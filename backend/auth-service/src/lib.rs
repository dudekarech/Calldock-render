pub mod config;
pub mod handlers;
pub mod middleware;
pub mod models;
pub mod services;
pub mod utils;

#[cfg(test)]
mod test_structure;

// Re-export main types for easier access
pub use config::Config;
