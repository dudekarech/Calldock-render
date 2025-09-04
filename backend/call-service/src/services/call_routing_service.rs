use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use shared::call::{Call, CallQueue, CallRouting, RoutingType};

#[derive(Clone)]
pub struct CallRoutingService {
    queues: Arc<RwLock<HashMap<Uuid, Vec<CallQueue>>>>, // company_id -> queues
    routing_rules: Arc<RwLock<HashMap<Uuid, Vec<CallRouting>>>>, // company_id -> rules
}

impl CallRoutingService {
    pub fn new() -> Self {
        Self {
            queues: Arc::new(RwLock::new(HashMap::new())),
            routing_rules: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Add call to routing queue
    pub async fn add_to_queue(&self, call: &Call) -> Result<(), Box<dyn std::error::Error>> {
        let mut queues = self.queues.write().await;
        
        let company_queues = queues.entry(call.company_id).or_insert_with(Vec::new);
        
        let queue_entry = CallQueue {
            id: Uuid::new_v4(),
            company_id: call.company_id,
            call_id: call.id,
            priority: self.calculate_priority(call),
            skills_required: self.extract_required_skills(call),
            created_at: chrono::Utc::now(),
        };

        company_queues.push(queue_entry);
        
        // Sort by priority (highest first)
        company_queues.sort_by(|a, b| b.priority.cmp(&a.priority));

        tracing::info!("Added call {} to routing queue for company {}", call.id, call.company_id);
        Ok(())
    }

    /// Route call to best available agent
    pub async fn route_call(&self, call_id: Uuid, company_id: Uuid) -> Result<Option<Uuid>, Box<dyn std::error::Error>> {
        // This would typically:
        // 1. Check agent availability
        // 2. Match skills requirements
        // 3. Apply routing rules (round-robin, skills-based, etc.)
        // 4. Return best agent ID or None if no agents available
        
        // For now, return None to indicate no routing decision made
        tracing::info!("Routing call {} for company {}", call_id, company_id);
        Ok(None)
    }

    /// Get next call from queue for agent
    pub async fn get_next_call(&self, agent_id: Uuid, company_id: Uuid) -> Result<Option<Uuid>, Box<dyn std::error::Error>> {
        let mut queues = self.queues.write().await;
        
        if let Some(company_queues) = queues.get_mut(&company_id) {
            // Find highest priority call that matches agent skills
            if let Some(index) = company_queues.iter().position(|queue| {
                // This would check if agent has required skills
                // For now, just return the first available call
                true
            }) {
                let call_id = company_queues[index].call_id;
                company_queues.remove(index);
                return Ok(Some(call_id));
            }
        }

        Ok(None)
    }

    /// Calculate call priority based on various factors
    fn calculate_priority(&self, call: &Call) -> u32 {
        let mut priority = 100; // Base priority

        // VIP customers get higher priority
        if let Some(email) = &call.customer_email {
            if email.contains("vip") || email.contains("premium") {
                priority += 50;
            }
        }

        // Inbound calls typically get higher priority than outbound
        match call.direction {
            shared::call::CallDirection::Inbound => priority += 25,
            shared::call::CallDirection::Outbound => priority += 0,
        }

        // Calls with specific tags get priority
        for tag in &call.tags {
            match tag.as_str() {
                "urgent" => priority += 75,
                "high_priority" => priority += 50,
                "escalation" => priority += 100,
                _ => {}
            }
        }

        priority
    }

    /// Extract required skills from call metadata
    fn extract_required_skills(&self, call: &Call) -> Vec<String> {
        let mut skills = Vec::new();

        // Extract skills from metadata
        if let Some(metadata) = call.metadata.as_object() {
            if let Some(skills) = metadata.get("required_skills") {
                if let Some(skills_array) = skills.as_array() {
                    for skill in skills_array {
                        if let Some(skill_str) = skill.as_str() {
                            skills.push(skill_str.to_string());
                        }
                    }
                }
            }
        }

        // Add skills based on customer info
        if let Some(email) = &call.customer_email {
            if email.contains("technical") {
                skills.push("technical_support".to_string());
            }
            if email.contains("billing") {
                skills.push("billing_support".to_string());
            }
        }

        skills
    }

    /// Get queue statistics for company
    pub async fn get_queue_stats(&self, company_id: Uuid) -> Result<QueueStats, Box<dyn std::error::Error>> {
        let queues = self.queues.read().await;
        
        if let Some(company_queues) = queues.get(&company_id) {
            let total_calls = company_queues.len() as u64;
            let high_priority_calls = company_queues.iter()
                .filter(|q| q.priority >= 150)
                .count() as u64;
            let average_wait_time = company_queues.iter()
                .map(|q| chrono::Utc::now().signed_duration_since(q.created_at).num_seconds() as u64)
                .sum::<u64>() / total_calls.max(1);

            Ok(QueueStats {
                company_id,
                total_calls,
                high_priority_calls,
                average_wait_time,
                timestamp: chrono::Utc::now(),
            })
        } else {
            Ok(QueueStats {
                company_id,
                total_calls: 0,
                high_priority_calls: 0,
                average_wait_time: 0,
                timestamp: chrono::Utc::now(),
            })
        }
    }
}

#[derive(Debug, Clone)]
pub struct QueueStats {
    pub company_id: Uuid,
    pub total_calls: u64,
    pub high_priority_calls: u64,
    pub average_wait_time: u64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}
