#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::webrtc_service::WebRTCService;
    use shared::types::{WebRTCSignal, SignalType};
    use uuid::Uuid;
    use chrono::Utc;
    use serde_json::json;

    #[tokio::test]
    async fn test_webrtc_service_creation() {
        let service = WebRTCService::new();
        assert!(service.get_active_connections().await.is_empty());
    }

    #[tokio::test]
    async fn test_handle_offer() {
        let service = WebRTCService::new();
        let call_id = Uuid::new_v4();
        
        let signal = WebRTCSignal {
            call_id,
            signal_type: SignalType::Offer,
            data: json!({
                "sdp": "test-sdp-offer"
            }),
            timestamp: Utc::now(),
        };

        let result = service.handle_offer(&signal).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response["status"], "offer_received");
        assert_eq!(response["call_id"], call_id);
    }

    #[tokio::test]
    async fn test_handle_answer() {
        let service = WebRTCService::new();
        let call_id = Uuid::new_v4();
        
        // First create an offer
        let offer_signal = WebRTCSignal {
            call_id,
            signal_type: SignalType::Offer,
            data: json!({
                "sdp": "test-sdp-offer"
            }),
            timestamp: Utc::now(),
        };
        service.handle_offer(&offer_signal).await.unwrap();

        // Then handle answer
        let answer_signal = WebRTCSignal {
            call_id,
            signal_type: SignalType::Answer,
            data: json!({
                "sdp": "test-sdp-answer"
            }),
            timestamp: Utc::now(),
        };

        let result = service.handle_answer(&answer_signal).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response["status"], "answer_received");
        assert_eq!(response["connection_state"], "connected");
    }

    #[tokio::test]
    async fn test_handle_ice_candidate() {
        let service = WebRTCService::new();
        let call_id = Uuid::new_v4();
        
        // First create an offer
        let offer_signal = WebRTCSignal {
            call_id,
            signal_type: SignalType::Offer,
            data: json!({
                "sdp": "test-sdp-offer"
            }),
            timestamp: Utc::now(),
        };
        service.handle_offer(&offer_signal).await.unwrap();

        // Then handle ICE candidate
        let ice_signal = WebRTCSignal {
            call_id,
            signal_type: SignalType::IceCandidate,
            data: json!({
                "candidate": "test-ice-candidate"
            }),
            timestamp: Utc::now(),
        };

        let result = service.handle_ice_candidate(&ice_signal).await;
        assert!(result.is_ok());
    }
}
