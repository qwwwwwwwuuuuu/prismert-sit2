# PUSHIN mainnet integration — not a trading launch

Implemented: EIP-6963 wallet discovery, EIP-1193 account connection, Robinhood Chain mainnet (4663 / 0x1237) switch/add, real ETH balance reads, account/network event handling, local disconnect, explorer link. No private keys, approvals, signatures, or transactions are requested.

Removed script references to the synthetic paper feed and paper trading app from HTML. Old simulated assets remain unused for rollback. Existing demo account storage is ignored, not converted to real funds.

Trade, markets, analytics, basis, portfolio and connect currently show the mainnet pre-launch dashboard. PUSHIN price/chart, swap, derivatives and liquidity are unavailable, not implemented trading features. Original landing/documentation pages retain their design and have a warning that inherited derivative claims and addresses are not deployed PUSHIN products; those pages still require editorial migration before launch.

Missing for actual token trading: deployed verified PUSHIN token address, tokenomics, funded liquidity pool, selected supported DEX/router, quote and transaction integrations with slippage/deadline protection, independent security review and end-to-end wallet verification. Do not enable trading solely by changing chain ID or labels.

The C-VIX 30D, FR-BASIS BTC and FR-BASIS ETH panels now have an explicitly labelled educational simulator: synthetic prices, a virtual 10,000-credit account, Long/Short positions and capped simplified scores. It runs without wallet access and resets on page reload. This is not the reference protocol's pricing or settlement engine.

Validation: node --test test-mainnet.cjs test-simulator.cjs (11 tests); node --check for JS modules; npm run build. Real-wallet verification has not been performed. Deployment status is tracked by the GitHub commit checks.

Build updates are stored in site-overrides and applied over the artwork archive by build.mjs. Edit these source files for subsequent updates.

Official network source: https://docs.robinhood.com/chain/connecting/
Wallet discovery specification: https://eips.ethereum.org/EIPS/eip-6963
