mod error;
mod escrow;
mod whitelist;

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::borsh::{self, BorshSerialize};
use near_sdk::collections::{LookupSet, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::{
    env, log, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise,
    PromiseOrValue,
};
use near_sdk::serde_json;

use crate::error::*;
use crate::escrow::{Escrow, EscrowCreateMsg};

const GAS_FOR_FT_TRANSFER: Gas = Gas::from_tgas(20);
const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);

#[derive(BorshStorageKey, BorshSerialize)]
enum StorageKey {
    Escrows,
    Resolvers,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub owner_id: AccountId,
    pub resolvers: LookupSet<AccountId>,
    pub escrows: UnorderedMap<String, Escrow>,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        require!(!env::state_exists(), E003_ALREADY_INITIALIZED);
        Self {
            owner_id,
            resolvers: LookupSet::new(StorageKey::Resolvers),
            escrows: UnorderedMap::new(StorageKey::Escrows),
        }
    }

    pub fn add_resolver(&mut self, resolver_id: AccountId) {
        whitelist::require_owner(&self.owner_id);
        self.resolvers.insert(&resolver_id);
    }

    pub fn remove_resolver(&mut self, resolver_id: AccountId) {
        whitelist::require_owner(&self.owner_id);
        self.resolvers.remove(&resolver_id);
    }

    pub fn is_resolver(&self, resolver_id: AccountId) -> bool {
        self.resolvers.contains(&resolver_id)
    }

    #[payable]
    pub fn claim(&mut self, order_hash: String, secret_hex: String) -> Promise {
        require!(env::attached_deposit() == ONE_YOCTO, E008_WRONG_DEPOSIT);

        let escrow = self.escrows.remove(&order_hash).expect(E004_ESCROW_NOT_FOUND);

        let secret_bytes = hex::decode(secret_hex).expect(E010_INVALID_HEX_FORMAT);
        let hash = env::keccak256_array(&secret_bytes);

        require!(hash == escrow.hashlock, E006_INVALID_SECRET);

        log!("Claim successful for order {}. Transferring funds.", order_hash);

        Promise::new(escrow.token_contract_id).function_call(
            "ft_transfer".into(),
            serde_json::to_vec(&serde_json::json!({
                "receiver_id": escrow.recipient_id,
                "amount": escrow.amount,
            })).unwrap(),
            ONE_YOCTO,
            GAS_FOR_FT_TRANSFER,
        )
    }

    #[payable]
    pub fn reclaim(&mut self, order_hash: String) -> Promise {
        require!(env::attached_deposit() == ONE_YOCTO, E008_WRONG_DEPOSIT);

        let escrow = self.escrows.get(&order_hash).expect(E004_ESCROW_NOT_FOUND);

        require!(env::block_timestamp() > escrow.timelock, E007_TIMELOCK_NOT_EXPIRED);
        require!(env::predecessor_account_id() == escrow.resolver_id, E002_RESOLVER_ONLY);

        let escrow_to_reclaim = self.escrows.remove(&order_hash).unwrap();

        log!("Reclaiming for order {}. Timelock expired.", order_hash);

        Promise::new(escrow_to_reclaim.token_contract_id).function_call(
            "ft_transfer".into(),
            serde_json::to_vec(&serde_json::json!({
                "receiver_id": escrow_to_reclaim.resolver_id,
                "amount": escrow_to_reclaim.amount,
            })).unwrap(),
            ONE_YOCTO,
            GAS_FOR_FT_TRANSFER,
        )
    }
}

#[near]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        whitelist::require_resolver(&self.resolvers, &sender_id);

        let msg_params: EscrowCreateMsg =
            serde_json::from_str(&msg).expect(E009_INVALID_MSG_FORMAT);

        require!(self.escrows.get(&msg_params.order_hash).is_none(), E005_ESCROW_EXISTS);

        let hashlock_bytes: [u8; 32] = hex::decode(msg_params.hashlock_hex)
            .expect(E010_INVALID_HEX_FORMAT)
            .try_into()
            .unwrap();
        
        let new_escrow = Escrow {
            resolver_id: sender_id.clone(),
            recipient_id: msg_params.recipient_id,
            token_contract_id: env::predecessor_account_id(),
            amount,
            hashlock: hashlock_bytes,
            timelock: msg_params.timelock,
        };

        self.escrows.insert(&msg_params.order_hash, &new_escrow);

        log!("Escrow created for order {}. Locked {} tokens from {}.", 
             msg_params.order_hash, amount.0, sender_id);

        PromiseOrValue::Value(U128(0))
    }
}