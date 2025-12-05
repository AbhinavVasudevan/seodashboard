import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PREDEFINED_TEMPLATES } from '@/lib/email-templates-data'

// POST - Seed predefined email templates
export async function POST() {
  try {
    // Check how many templates already exist
    const existingCount = await prisma.emailTemplate.count()

    let created = 0
    let skipped = 0

    for (const template of PREDEFINED_TEMPLATES) {
      // Check if template with same name exists
      const existing = await prisma.emailTemplate.findUnique({
        where: { name: template.name }
      })

      if (existing) {
        skipped++
        continue
      }

      await prisma.emailTemplate.create({
        data: {
          name: template.name,
          subject: template.subject,
          body: template.body,
          category: template.category,
          isDefault: false
        }
      })
      created++
    }

    return NextResponse.json({
      message: `Seeded ${created} templates, skipped ${skipped} existing templates`,
      created,
      skipped,
      total: existingCount + created
    })
  } catch (error) {
    console.error('Error seeding email templates:', error)
    return NextResponse.json(
      { error: 'Failed to seed templates' },
      { status: 500 }
    )
  }
}

// GET - Check seed status
export async function GET() {
  try {
    const templates = await prisma.emailTemplate.findMany({
      select: { name: true, category: true }
    })

    const predefinedNames = PREDEFINED_TEMPLATES.map(t => t.name)
    const seeded = templates.filter(t => predefinedNames.includes(t.name))
    const custom = templates.filter(t => !predefinedNames.includes(t.name))

    return NextResponse.json({
      total: templates.length,
      seeded: seeded.length,
      custom: custom.length,
      available: PREDEFINED_TEMPLATES.length,
      needsSeeding: seeded.length < PREDEFINED_TEMPLATES.length
    })
  } catch (error) {
    console.error('Error checking seed status:', error)
    return NextResponse.json(
      { error: 'Failed to check seed status' },
      { status: 500 }
    )
  }
}
