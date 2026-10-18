# Species tokens — MINDEX library and DAO styling

**Date:** October 16, 2026  
**Status:** Local verified on port 3020. Live ECS image not yet this build.

The `/species-tokens` page uses the Blocks palette: black ground, `#00ff88` labels, `#ff6321` actions. The catalog reads live fungal taxa from `https://mycosoft.com/api/mindex/taxa` (the same MINDEX records Ancestry uses) when `SPECIES_TOKEN_SERVICE_URL` is unset. Cards show kingdom, phylum, class, order, family, genus, rank, and the Ancestry path when that is all the record carries. A mint is rendered only when the taxon metadata already has one. Observation payouts stay unavailable until the species-token service is configured.
