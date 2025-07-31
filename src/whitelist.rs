use crate::error::E001_OWNER_ONLY;
use near_sdk::{env, require, AccountId};

pub fn require_owner(owner_id: &AccountId) {
    require!(env::predecessor_account_id() == *owner_id, E001_OWNER_ONLY);
}

pub fn require_resolver(resolvers: &near_sdk::collections::LookupSet<AccountId>, sender_id: &AccountId) {
    require!(resolvers.contains(sender_id), crate::error::E002_RESOLVER_ONLY);
}