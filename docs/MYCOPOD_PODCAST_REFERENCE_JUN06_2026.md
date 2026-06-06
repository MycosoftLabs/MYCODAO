# MycoPOD Podcast Reference — Jun 06, 2026

**Status:** Reference (production)  
**RSS feed:** https://media.rss.com/mycopod/feed.xml  
**BLOCKS tab:** https://blocks.mycodao.com/blocks/ → Podcasts  
**Full game plan + technical workflow:** `docs/MycoPod_Game_Plan_and_Technical_Implementation.docx`  
**GitHub (future episode pipeline):** https://github.com/MycoDAO/MycoPOD

---

## Show identity

| Field | Value |
|-------|--------|
| **Title** | MycoPOD |
| **Subtitle** | The Official Podcast of MycoDAO |
| **Tagline** | Funding Science. Growing Knowledge. Connecting Nature. |
| **Hosts** | Morgan Rockwell & Abelardo Rodriguez |
| **Website** | https://mycodao.com |
| **RSS** | https://media.rss.com/mycopod/feed.xml |
| **Cover art** | https://media.rss.com/mycopod/podcast_cover_20260606_090642_0771c9572b9b69de65c4cf4f8935d568.png |

### Short description (RSS / embeds)

MycoPOD is the official podcast of MycoDAO, hosted by Morgan Rockwell and Abelardo Rodriguez. Exploring fungi, DeSci, BioDAOs, biotechnology, AI, crypto, environmental restoration, drug discovery, decentralized governance, and the future of science.

### Long description (show page)

Exploring the future of fungi, decentralized science, biotechnology, AI, environmental restoration, and the next generation of scientific funding.

MycoPOD brings together scientists, researchers, entrepreneurs, builders, investors, DAO leaders, mycologists, and innovators working at the intersection of biology, technology, and decentralized governance.

Topics include DeSci, BioDAOs, fungal biotechnology, drug discovery, environmental remediation, biobanks, AI/bioinformatics, tokenized science, FungIP, DeFi/DePIN, biological computing, and citizen science.

**Because the future of science should be open, collaborative, and accessible to everyone.**

---

## Host bios

**Morgan Rockwell** — Founder and CEO of Mycosoft and Co-Founder of MycoDAO. Pioneer in Bitcoin, decentralized systems, biological computing, and fungal technology. Work spans fungal computer interfaces, environmental sensing, biotechnology, and decentralized governance.

**Abelardo Rodriguez** — Co-Founder and Secretary of MycoDAO. Fifteen+ years building partnerships, nonprofit support, and community initiatives. Focus: governance, outreach, and connecting researchers, institutions, and sponsors to decentralized scientific funding.

---

## RSS.com categories

- **Primary:** Science  
- **Secondary:** Technology, Business, Education  
- **Subcategories:** Life Sciences, Biotechnology, Investing, Cryptocurrency, Environmental Science  

---

## Season 1 episode guide (working titles)

| Ep | Title | Focus |
|----|--------|--------|
| 1 | Welcome to MycoPOD: Why Fungi Need a DAO | Origin story, mission |
| 2 | DAO 101 for Scientists | Proposals, voting, treasury, milestones |
| 3 | DeSci 101: Fixing the Funding Gap | DeSci + MycoDAO role |
| 4 | The BioDAO Map | HairDAO, VitaDAO, AthenaDAO, ValleyDAO, CryoDAO, guests |
| 5 | Funding the First Projects | Grants, milestones, treasury discipline |
| 6 | Project Oyster | Salt-tolerant oyster mushrooms, coastal remediation |
| 7 | From Mushroom Sample to FungIP | Biobanks, DNA, tokenized rights |
| 8 | LAB-IN-A-BOX | Mobile mycology lab model |
| 9 | Fungal Computers | FCI, Mushroom1, SporeBase, NatureOS |
| 10 | The MycoDAO Network | DeSci, DeFi, DePIN, Season 2 setup |

**Recording order:** Ep 1–3 host-only first → Ep 4 guest outreach → Ep 6 first science deep dive.

---

## Production pipeline (summary)

1. Record video master (Streamlabs/OBS).  
2. Edit once → export MP4.  
3. Extract audio (128 kbps MP3, 44.1 kHz stereo for RSS.com).  
4. Upload MP3 to RSS.com → episodes appear in feed → BLOCKS `/api/podcasts`.  
5. Upload MP4 to YouTube or video host; embed on BLOCKS when live URL is set.

Detail: see `MycoPod_Game_Plan_and_Technical_Implementation.docx`.

---

## BLOCKS integration

| Surface | Source |
|---------|--------|
| Episode list | RSS → `lib/adapters/podcasts.ts` → `GET /api/podcasts` |
| Show copy, tagline, hosts, S1 guide | `myco-pulse/src/data/mycopodShow.ts` |
| Env override | `PODCAST_RSS_URLS` (default: MycoPOD feed only) |

---

## Scripts (production reference — not shown in BLOCKS UI)

**Intro (~15s):** Welcome to MycoPOD… Morgan Rockwell / Abelardo Rodriguez… fungi, DeSci, biotechnology, AI, crypto… This is MycoPOD.

**Outro (~15s):** Thanks for listening… Follow MycoDAO… mycodao.com… keep exploring.

---

## Keywords (SEO / RSS — not duplicated in BLOCKS UI)

Mycology, Fungi, DeSci, BioDAO, Biotechnology, Environmental Restoration, FungIP, MycoDAO, Mycosoft, NatureOS, MINDEX, Project Oyster, FCI, Mycelium, Citizen Science.
