# Backlink Directory System - Implementation Plan

## Overview

Building a comprehensive backlink management system with:
1. Contacted URLs tracking (outreach management)
2. Ahrefs competitor backlink import & prospect discovery
3. Cross-brand comparison for locked deals
4. Brand-specific approved links management

---

## Database Schema Changes

### 1. New Model: `BacklinkProspect` (Contacted URLs)

Tracks all URLs we've contacted for potential backlinks.

```prisma
model BacklinkProspect {
  id                String              @id @default(cuid())
  referringPageUrl  String              @unique
  rootDomain        String
  domainRating      Int?
  domainTraffic     Int?
  nofollow          Boolean             @default(false)
  contactedOn       DateTime?
  contactMethod     ContactMethod?
  contactEmail      String?
  contactFormUrl    String?
  remarks           String?
  content           String?             // Notes about the content/page
  status            ProspectStatus      @default(NOT_CONTACTED)
  source            String?             // Where we found this (manual, ahrefs import, etc.)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  // Track which brands have used this prospect
  brandDeals        BrandBacklinkDeal[]

  @@map("backlink_prospects")
}

enum ContactMethod {
  EMAIL
  CONTACT_FORM
  SOCIAL_MEDIA
  OTHER
}

enum ProspectStatus {
  NOT_CONTACTED
  CONTACTED
  RESPONDED
  NEGOTIATING
  DEAL_LOCKED
  REJECTED
  NO_RESPONSE
}
```

### 2. New Model: `AhrefsImport` (Competitor Backlink Imports)

Stores raw Ahrefs export data for analysis.

```prisma
model AhrefsImport {
  id                    String    @id @default(cuid())
  referringPageTitle    String?
  referringPageUrl      String
  language              String?
  platform              String?
  httpCode              Int?
  domainRating          Int?
  urlRating             Int?
  domainTraffic         Int?
  referringDomains      Int?
  linkedDomains         Int?
  externalLinks         Int?
  pageTraffic           Int?
  keywords              Int?
  targetUrl             String?   // Competitor's URL being linked
  leftContext           String?
  anchor                String?
  rightContext          String?
  linkType              String?   // text, image, etc.
  contentType           String?
  nofollow              Boolean   @default(false)
  ugc                   Boolean   @default(false)
  sponsored             Boolean   @default(false)
  firstSeen             DateTime?
  lastSeen              DateTime?
  importedAt            DateTime  @default(now())
  importBatchId         String    // Group imports by batch
  competitorDomain      String    // Which competitor this came from
  isProcessed           Boolean   @default(false)
  isProspect            Boolean   @default(false) // Marked as potential prospect

  @@map("ahrefs_imports")
}
```

### 3. New Model: `BrandBacklinkDeal` (Brand-Specific Approved Links)

Links prospects to specific brands with deal details.

```prisma
model BrandBacklinkDeal {
  id                String           @id @default(cuid())
  brandId           String
  brand             Brand            @relation(fields: [brandId], references: [id], onDelete: Cascade)
  prospectId        String?
  prospect          BacklinkProspect? @relation(fields: [prospectId], references: [id])
  referringPageUrl  String           // Can be standalone if no prospect
  linkUrl           String           // URL where link points (our page)
  linkAnchor        String?
  domainRating      Int?
  linkType          String?          // Guest post, niche edit, homepage, etc.
  price             Float?
  status            DealStatus       @default(PENDING)
  remarks           String?
  publishedOn       DateTime?
  expiresOn         DateTime?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  @@unique([brandId, referringPageUrl]) // One deal per brand per URL
  @@map("brand_backlink_deals")
}

enum DealStatus {
  PENDING
  APPROVED
  LIVE
  EXPIRED
  CANCELLED
}
```

### 4. Update Brand Model

Add relation to BrandBacklinkDeal:

```prisma
model Brand {
  // ... existing fields
  backlinkDeals     BrandBacklinkDeal[]
}
```

---

## Feature Implementation Plan

### Phase 1: Schema & API Foundation

#### 1.1 Database Schema Update
- [ ] Add new models to `prisma/schema.prisma`
- [ ] Run `prisma db push` to update database
- [ ] Generate Prisma client

#### 1.2 API Routes
- [ ] `/api/backlink-prospects` - CRUD for contacted URLs
- [ ] `/api/ahrefs-import` - Upload and process Ahrefs exports
- [ ] `/api/brand-deals` - CRUD for brand-specific deals
- [ ] `/api/backlink-directory/compare` - Cross-brand comparison

---

### Phase 2: Contacted URLs (Prospects) Management

#### 2.1 Prospects Page (`/backlink-directory/prospects`)
- Table view with all contacted URLs
- Columns: Referring URL, Domain, DR, Traffic, Status, Contacted On, Method, Remarks
- Filters: Status, Contact Method, Date Range
- Search by URL/domain
- Add/Edit modal with all fields
- Quick status update buttons

#### 2.2 Features
- Track contact history
- Set follow-up reminders
- Mark as "Deal Locked" when successful
- Link to brand deals when locked

---

### Phase 3: Ahrefs Import & Prospect Discovery

#### 3.1 Import Page (`/backlink-directory/import`)
- File upload (CSV/TSV) for Ahrefs exports
- Competitor domain input field
- Preview imported data before saving
- Show count of new/duplicate URLs

#### 3.2 Processing Logic
- Parse Ahrefs CSV format (all 30+ columns)
- Identify URLs not in our prospects list
- Calculate overlap with existing prospects
- Mark high-value prospects (DR > 30, traffic > 500)

#### 3.3 Discovery View (`/backlink-directory/discover`)
- Show imported URLs not yet contacted
- Filter by DR, traffic, link type
- Bulk add to prospects list
- Compare with what we already have

---

### Phase 4: Brand-Specific Deals

#### 4.1 Brand Deals Page (`/backlink-directory/deals`)
- View all deals across brands
- Filter by brand, status, DR range
- Columns: Brand, Referring URL, Link URL, Anchor, Type, Price, Status

#### 4.2 Brand Integration
- Add "Backlink Deals" section to brand detail page
- Show locked deals for each brand
- Quick link to add new deal for brand

---

### Phase 5: Cross-Brand Comparison

#### 5.1 Comparison Dashboard (`/backlink-directory/compare`)
- Select multiple brands to compare
- Show locked deals not used by other brands
- Matrix view: Domains vs Brands (checkmark if deal exists)
- Identify opportunities: "Brand A has deal with example.com, Brand B doesn't"

#### 5.2 Stats Cards
- Total unique domains with deals
- Deals per brand
- Unused opportunities
- Average DR/price metrics

---

## UI/UX Design

### Navigation Structure

```
Backlinks (existing) → Rename to "Active Links"

Backlink Directory (new section)
├── Prospects        → Contacted URLs management
├── Import           → Ahrefs import tool
├── Discover         → Find new prospects from imports
├── Deals            → Brand-specific approved links
└── Compare          → Cross-brand comparison
```

### Page Layouts

#### Prospects Page
```
┌─────────────────────────────────────────────────────────┐
│ Backlink Prospects                    [+ Add Prospect]  │
├─────────────────────────────────────────────────────────┤
│ [Search...] [Status ▼] [Method ▼] [Date Range]          │
├─────────────────────────────────────────────────────────┤
│ Stats: Total: 245 | Contacted: 180 | Locked: 45 | ...   │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ URL        │ DR │Traffic│Status  │Contacted│Actions│ │
│ │ example... │ 45 │ 5.2K  │Locked  │Dec 1    │ ✎ 🗑  │ │
│ │ site.com   │ 32 │ 1.1K  │Respond │Nov 28   │ ✎ 🗑  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Import Page
```
┌─────────────────────────────────────────────────────────┐
│ Import Ahrefs Backlinks                                 │
├─────────────────────────────────────────────────────────┤
│ Competitor Domain: [competitor.com    ]                 │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │  📁 Drop Ahrefs CSV/TSV file here                   │ │
│ │     or click to browse                              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Preview]  Import Batch: 2024-12-03-001                │
├─────────────────────────────────────────────────────────┤
│ Preview: 523 rows | 412 new | 111 duplicates           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ URL        │ DR │Traffic│ New? │ Select             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                   [Import Selected]     │
└─────────────────────────────────────────────────────────┘
```

#### Compare Page
```
┌─────────────────────────────────────────────────────────┐
│ Cross-Brand Comparison                                  │
├─────────────────────────────────────────────────────────┤
│ Select Brands: [✓ Brand A] [✓ Brand B] [✓ Brand C]     │
├─────────────────────────────────────────────────────────┤
│ ┌───────────────┬─────────┬─────────┬─────────┐        │
│ │ Domain        │ Brand A │ Brand B │ Brand C │        │
│ ├───────────────┼─────────┼─────────┼─────────┤        │
│ │ example.com   │   ✓     │    -    │   ✓     │        │
│ │ site.org      │   ✓     │   ✓     │    -    │        │
│ │ blog.net      │    -    │   ✓     │   ✓     │        │
│ └───────────────┴─────────┴─────────┴─────────┘        │
│                                                         │
│ Opportunities: 12 unused deals available                │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Order

### Week 1: Foundation
1. Schema updates (all new models)
2. API routes for Prospects CRUD
3. Prospects page with full CRUD

### Week 2: Import System
4. Ahrefs import API with CSV parsing
5. Import page UI
6. Discover page (filtered imports)

### Week 3: Brand Deals
7. Brand Deals API
8. Deals page UI
9. Integration with brand detail page

### Week 4: Comparison & Polish
10. Comparison API
11. Compare page UI
12. Navigation updates
13. Testing & refinement

---

## Data Migration Notes

- Existing `Backlink` model can remain for active/published links
- May want to migrate some data to new `BrandBacklinkDeal` model
- Keep both systems initially, merge later if needed

---

## Questions to Clarify

1. Should the existing Backlinks page remain separate or merge into this system?
2. Do we need multi-user tracking (who contacted, who locked deal)?
3. Should Ahrefs imports be auto-processed or manual review?
4. Any specific DR/traffic thresholds for highlighting prospects?
5. Do we need email integration for outreach tracking?
