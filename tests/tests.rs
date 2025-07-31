use near_workspaces::types::{NearToken, Gas};
use serde_json::json;

#[tokio::test]
async fn test_fusion_contract_basic() -> Result<(), Box<dyn std::error::Error>> {
    let worker = near_workspaces::sandbox().await?;
    let root = worker.root_account()?;

    // Create accounts with proper NearToken
    let owner = root
        .create_subaccount("owner")
        .initial_balance(NearToken::from_near(10))
        .transact()
        .await?
        .unwrap();
    
    let resolver = root
        .create_subaccount("resolver")
        .initial_balance(NearToken::from_near(10))
        .transact()
        .await?
        .unwrap();

    // Deploy fusion contract
    let fusion_contract = worker
        .dev_deploy(include_bytes!("../near/near_contracts.wasm"))
        .await?;
    
    // Initialize fusion contract
    let result = fusion_contract
        .call("new")
        .args_json(json!({"owner_id": owner.id()}))
        .transact()
        .await?;
    
    assert!(result.is_success(), "Contract initialization should succeed");

    // Add resolver
    let result = owner
        .call(fusion_contract.id(), "add_resolver")
        .args_json(json!({"resolver_id": resolver.id()}))
        .transact()
        .await?;
    
    assert!(result.is_success(), "Adding resolver should succeed");

    // Check if resolver was added
    let is_resolver: bool = fusion_contract
        .view("is_resolver")
        .args_json(json!({"resolver_id": resolver.id()}))
        .await?
        .json()?;
    
    assert!(is_resolver, "Resolver should be whitelisted");

    // Test removing resolver
    let result = owner
        .call(fusion_contract.id(), "remove_resolver")
        .args_json(json!({"resolver_id": resolver.id()}))
        .transact()
        .await?;
    
    assert!(result.is_success(), "Removing resolver should succeed");

    // Check if resolver was removed
    let is_resolver: bool = fusion_contract
        .view("is_resolver")
        .args_json(json!({"resolver_id": resolver.id()}))
        .await?
        .json()?;
    
    assert!(!is_resolver, "Resolver should be removed");

    Ok(())
}