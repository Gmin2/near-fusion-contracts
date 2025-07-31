use near_sdk::{json_types::U128, borsh::{self, BorshDeserialize, BorshSerialize}, AccountId};
use serde::{Deserialize, Serialize};

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
pub struct Escrow {
    pub resolver_id: AccountId,
    pub recipient_id: AccountId,
    pub token_contract_id: AccountId,
    pub amount: U128,
    pub hashlock: [u8; 32],
    pub timelock: u64,
}

#[derive(Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct EscrowCreateMsg {
    pub order_hash: String,
    pub hashlock_hex: String,
    pub timelock: u64,
    pub recipient_id: AccountId,
}