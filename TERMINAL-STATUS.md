# Pushin full terminal

The terminal replaces the simplified pre-launch dashboard on Trade, Markets, Basis, Analytics and Portfolio. Existing landing page, documentation, protocol, tokenomics and roadmap artwork is retained. The standalone mainnet wallet remains at connect.html.

Implemented UI: three markets, candlestick and line views, six intervals, intent book and trade tape, Long/Short, market and resting limit orders, leverage, local positions, cancel/close actions, history, virtual reserves and skew, portfolio balances, market category filters, navigation and search. Market data is generated; virtual account state is localStorage only. A persistent status bar identifies the simulation.

This is not a copy of the reference backend or a live derivatives exchange. The relative-price PnL model is simplified and is not the reference funding-carry settlement formula. No deployed PUSHIN token, liquidity, deposits, withdrawal or onchain orders are provided. Wallet connection does not authorize trading transactions. Full feature parity and original server behavior are not claimed.

Validation: JS syntax, build and 15 unit tests covering wallet, earlier simulator and restored terminal primitives. Real wallet signing is not requested or tested.
