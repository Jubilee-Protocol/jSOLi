//! LST protocol helper functions
//!
//! Utilities for interacting with various LST protocols.

use anchor_lang::prelude::*;
use crate::state::LstProtocol;

/// Get the token mint address for a protocol
pub fn get_protocol_mint(protocol: LstProtocol) -> Option<&'static str> {
    match protocol {
        LstProtocol::Jito => Some("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"),
        LstProtocol::Marinade => Some("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"),
        LstProtocol::BlazeStake => Some("bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1"),
        LstProtocol::Jupiter => Some("jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v"),
    }
}

/// Get the program ID for a protocol
pub fn get_protocol_program_id(protocol: LstProtocol) -> Option<&'static str> {
    match protocol {
        LstProtocol::Marinade => Some("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD"),
        LstProtocol::Jito => Some("Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb"),
        LstProtocol::BlazeStake => Some("stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi"),
        LstProtocol::Jupiter => Some("jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v"),
    }
}

/// Get the protocol name as a string
pub fn get_protocol_name(protocol: LstProtocol) -> &'static str {
    match protocol {
        LstProtocol::Jito => "Jito",
        LstProtocol::Marinade => "Marinade",
        LstProtocol::BlazeStake => "BlazeStake",
        LstProtocol::Jupiter => "Jupiter",
    }
}

/// Get the LST token symbol
pub fn get_protocol_symbol(protocol: LstProtocol) -> &'static str {
    match protocol {
        LstProtocol::Jito => "jitoSOL",
        LstProtocol::Marinade => "mSOL",
        LstProtocol::BlazeStake => "bSOL",
        LstProtocol::Jupiter => "JupSOL",
    }
}

/// Get unstaking delay in seconds for a protocol
pub fn get_unstaking_delay(protocol: LstProtocol) -> i64 {
    match protocol {
        LstProtocol::Jito => 0,           // Instant unstaking available
        LstProtocol::Marinade => 0,       // mSOL has instant redemption (with fee) or delayed
        LstProtocol::BlazeStake => 172800,// ~2 days
        LstProtocol::Jupiter => 86400,    // ~1 day
    }
}

/// Check if protocol supports instant unstaking
pub fn supports_instant_unstake(protocol: LstProtocol) -> bool {
    matches!(protocol, LstProtocol::Jito | LstProtocol::Marinade)
}

/// Get instant unstake fee in basis points (if applicable)
pub fn get_instant_unstake_fee(protocol: LstProtocol) -> Option<u16> {
    match protocol {
        LstProtocol::Jito => Some(10),      // 0.1% fee
        LstProtocol::Marinade => Some(30),  // 0.3% fee
        _ => None,
    }
}

/// Convert protocol enum to u8 index
pub fn protocol_to_index(protocol: LstProtocol) -> u8 {
    match protocol {
        LstProtocol::Jito => 0,
        LstProtocol::Marinade => 1,
        LstProtocol::BlazeStake => 2,
        LstProtocol::Jupiter => 3,
    }
}

/// Convert u8 index to protocol enum
pub fn index_to_protocol(index: u8) -> Option<LstProtocol> {
    match index {
        0 => Some(LstProtocol::Jito),
        1 => Some(LstProtocol::Marinade),
        2 => Some(LstProtocol::BlazeStake),
        3 => Some(LstProtocol::Jupiter),
        _ => None,
    }
}

/// Protocol configuration for display/analytics
#[derive(Debug, Clone)]
pub struct ProtocolInfo {
    pub name: &'static str,
    pub symbol: &'static str,
    pub mint: Option<&'static str>,
    pub program_id: Option<&'static str>,
    pub unstaking_delay: i64,
    pub supports_instant: bool,
}

/// Get full protocol info
pub fn get_protocol_info(protocol: LstProtocol) -> ProtocolInfo {
    ProtocolInfo {
        name: get_protocol_name(protocol),
        symbol: get_protocol_symbol(protocol),
        mint: get_protocol_mint(protocol),
        program_id: get_protocol_program_id(protocol),
        unstaking_delay: get_unstaking_delay(protocol),
        supports_instant: supports_instant_unstake(protocol),
    }
}
