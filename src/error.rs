
pub const E001_OWNER_ONLY: &str = "E001: Method can only be called by the contract owner";
pub const E002_RESOLVER_ONLY: &str = "E002: Method can only be called by a whitelisted resolver";
pub const E003_ALREADY_INITIALIZED: &str = "E003: Contract is already initialized";
pub const E004_ESCROW_NOT_FOUND: &str = "E004: Escrow for the given order hash not found";
pub const E005_ESCROW_EXISTS: &str = "E005: Escrow for the given order hash already exists";
pub const E006_INVALID_SECRET: &str = "E006: Invalid secret provided for hashlock";
pub const E007_TIMELOCK_NOT_EXPIRED: &str = "E007: Timelock has not expired";
pub const E008_WRONG_DEPOSIT: &str = "E008: Requires exactly 1 yoctoNEAR attached deposit";
pub const E009_INVALID_MSG_FORMAT: &str = "E009: Invalid JSON format for msg parameter";
pub const E010_INVALID_HEX_FORMAT: &str = "E010: Invalid hex string format provided";