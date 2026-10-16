import { z } from 'zod';
import bs58 from 'bs58';
export const uuid = z.string().uuid();
export const address = z.string().refine(s => { try { return bs58.decode(s).length === 32; } catch { return false; } }, 'invalid Solana public key');
export const signature = z.string().refine(s => { try { return bs58.decode(s).length === 64; } catch { return false; } }, 'invalid Solana signature');
export const units = z.string().regex(/^[1-9][0-9]{0,19}$/).refine(s => BigInt(s) <= 18446744073709551615n, 'exceeds u64');
export const lamports = z.string().regex(/^[1-9][0-9]{0,14}$/);
export const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const reference = z.string().max(1000).refine(s => { try { const u = new URL(s); return ['https:', 'ipfs:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } }, 'HTTPS or IPFS evidence required');
export const licenseSchema = z.object({id: uuid,licensee:z.literal('MycoDAO'),licensor:z.string().trim().min(1).max(200),rights:z.array(z.enum(['display','token_metadata','reward'])).min(1),taxonIds:z.array(uuid).max(500000).nullable(),validFrom:z.string().datetime(),validUntil:z.string().datetime(),evidenceUri:reference,status:z.enum(['active','revoked'])}).strict().refine(g=>Date.parse(g.validUntil)>Date.parse(g.validFrom),'invalid grant dates');
export const speciesSchema = z.object({taxonId:uuid,scientificName:z.string().trim().min(3).max(200),commonName:z.string().max(200).optional(),kingdom:z.literal('Fungi'),rank:z.literal('species'),sourceRevision:z.string().min(1).max(300),sourceUrl:reference,externalIds:z.record(z.string().max(500)),licenseId:uuid,image:z.object({url:reference,license:z.string().min(1).max(200),attribution:z.string().min(1).max(500)}).strict().optional(),metadataUri:reference.optional(),metadataSha256:hash.optional(),dna:z.object({accession:z.string().min(1).max(100),sha256:hash,reviewed:z.boolean()}).strict().optional()}).strict();
export const allocationSchema = z.object({id:uuid,fundingSignature:signature,budgetLamports:lamports,jobMaxLamports:lamports,route:z.enum(['spl_reward','pump_direct']).default('spl_reward'),supply:units,decimals:z.number().int().min(0).max(9).default(6),batchSize:z.number().int().min(1).max(20).default(20),maxTokens:z.number().int().min(1).max(1000000).default(20),purpose:z.enum(['creation','rewards']),symbolPrefix:z.string().regex(/^[A-Z]{1,4}$/).default('FUN'),enabled:z.boolean().default(true)}).strict();
export const policySchema=z.object({id:uuid,version:z.number().int().positive(),existingSpeciesUnits:units,rareMycoUnits:units,newMycoUnits:units,mycoMint:address,dailyUserLimit:z.number().int().min(1).max(100)}).strict();
export function requireThat(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
