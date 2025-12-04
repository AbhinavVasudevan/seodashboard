import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToLinkDirectory() {
  console.log('Starting Link Directory migration...\n');

  // Step 1: Get all unique root domains from Backlinks
  console.log('Step 1: Fetching backlinks...');
  const backlinks = await prisma.backlink.findMany({
    select: {
      id: true,
      rootDomain: true,
      referringPageUrl: true,
      dr: true,
      domainTraffic: true,
      linkType: true,
    },
  });
  console.log(`Found ${backlinks.length} backlinks`);

  // Step 2: Get all unique root domains from BacklinkProspects
  console.log('Step 2: Fetching prospects...');
  const prospects = await prisma.backlinkProspect.findMany({
    select: {
      id: true,
      rootDomain: true,
      referringPageUrl: true,
      domainRating: true,
      domainTraffic: true,
      nofollow: true,
      contactedOn: true,
      contactMethod: true,
      contactEmail: true,
      contactFormUrl: true,
      remarks: true,
    },
  });
  console.log(`Found ${prospects.length} prospects\n`);

  // Step 3: Build a map of unique domains with best metrics and contact info
  console.log('Step 3: Building domain map...');
  const domainMap = new Map<string, {
    rootDomain: string;
    exampleUrl: string;
    domainRating: number | null;
    domainTraffic: number | null;
    nofollow: boolean;
    contactedOn: Date | null;
    contactMethod: string | null;
    contactEmail: string | null;
    contactFormUrl: string | null;
    remarks: string | null;
    backlinkIds: string[];
    prospectIds: string[];
  }>();

  // Process backlinks first
  for (const backlink of backlinks) {
    const domain = backlink.rootDomain.toLowerCase();

    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        rootDomain: domain,
        exampleUrl: backlink.referringPageUrl,
        domainRating: backlink.dr,
        domainTraffic: backlink.domainTraffic,
        nofollow: backlink.linkType === 'nofollow',
        contactedOn: null,
        contactMethod: null,
        contactEmail: null,
        contactFormUrl: null,
        remarks: null,
        backlinkIds: [backlink.id],
        prospectIds: [],
      });
    } else {
      const existing = domainMap.get(domain)!;
      existing.backlinkIds.push(backlink.id);
      // Update metrics if this one has better values
      if (backlink.dr && (!existing.domainRating || backlink.dr > existing.domainRating)) {
        existing.domainRating = backlink.dr;
      }
      if (backlink.domainTraffic && (!existing.domainTraffic || backlink.domainTraffic > existing.domainTraffic)) {
        existing.domainTraffic = backlink.domainTraffic;
      }
    }
  }

  // Process prospects - they have contact info
  for (const prospect of prospects) {
    const domain = prospect.rootDomain.toLowerCase();

    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        rootDomain: domain,
        exampleUrl: prospect.referringPageUrl,
        domainRating: prospect.domainRating,
        domainTraffic: prospect.domainTraffic,
        nofollow: prospect.nofollow,
        contactedOn: prospect.contactedOn,
        contactMethod: prospect.contactMethod,
        contactEmail: prospect.contactEmail,
        contactFormUrl: prospect.contactFormUrl,
        remarks: prospect.remarks,
        backlinkIds: [],
        prospectIds: [prospect.id],
      });
    } else {
      const existing = domainMap.get(domain)!;
      existing.prospectIds.push(prospect.id);
      // Update metrics if this one has better values
      if (prospect.domainRating && (!existing.domainRating || prospect.domainRating > existing.domainRating)) {
        existing.domainRating = prospect.domainRating;
      }
      if (prospect.domainTraffic && (!existing.domainTraffic || prospect.domainTraffic > existing.domainTraffic)) {
        existing.domainTraffic = prospect.domainTraffic;
      }
      // Take contact info from prospect if not already set
      if (prospect.contactedOn && !existing.contactedOn) {
        existing.contactedOn = prospect.contactedOn;
      }
      if (prospect.contactMethod && !existing.contactMethod) {
        existing.contactMethod = prospect.contactMethod;
      }
      if (prospect.contactEmail && !existing.contactEmail) {
        existing.contactEmail = prospect.contactEmail;
      }
      if (prospect.contactFormUrl && !existing.contactFormUrl) {
        existing.contactFormUrl = prospect.contactFormUrl;
      }
      if (prospect.remarks && !existing.remarks) {
        existing.remarks = prospect.remarks;
      }
      if (prospect.nofollow) {
        existing.nofollow = true;
      }
    }
  }

  console.log(`Built map with ${domainMap.size} unique domains\n`);

  // Step 4: Create LinkDirectoryDomain entries and link records
  console.log('Step 4: Creating LinkDirectoryDomain entries...');
  let created = 0;
  let backlinksLinked = 0;
  let prospectsLinked = 0;

  const domainEntries = Array.from(domainMap.entries());
  for (const [domain, data] of domainEntries) {
    try {
      // Create the LinkDirectoryDomain entry
      const linkDirectoryDomain = await prisma.linkDirectoryDomain.create({
        data: {
          rootDomain: data.rootDomain,
          exampleUrl: data.exampleUrl,
          domainRating: data.domainRating,
          domainTraffic: data.domainTraffic,
          nofollow: data.nofollow,
          contactedOn: data.contactedOn,
          contactMethod: data.contactMethod as any,
          contactEmail: data.contactEmail,
          contactFormUrl: data.contactFormUrl,
          remarks: data.remarks,
        },
      });
      created++;

      // Link backlinks to this domain
      if (data.backlinkIds.length > 0) {
        await prisma.backlink.updateMany({
          where: { id: { in: data.backlinkIds } },
          data: { linkDirectoryDomainId: linkDirectoryDomain.id },
        });
        backlinksLinked += data.backlinkIds.length;
      }

      // Link prospects to this domain
      if (data.prospectIds.length > 0) {
        await prisma.backlinkProspect.updateMany({
          where: { id: { in: data.prospectIds } },
          data: { linkDirectoryDomainId: linkDirectoryDomain.id },
        });
        prospectsLinked += data.prospectIds.length;
      }

      if (created % 100 === 0) {
        console.log(`  Progress: ${created}/${domainMap.size} domains created...`);
      }
    } catch (error) {
      console.error(`Error creating domain ${domain}:`, error);
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   - Created ${created} LinkDirectoryDomain entries`);
  console.log(`   - Linked ${backlinksLinked} backlinks`);
  console.log(`   - Linked ${prospectsLinked} prospects`);
}

migrateToLinkDirectory()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
