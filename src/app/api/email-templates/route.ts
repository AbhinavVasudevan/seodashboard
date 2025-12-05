import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all email templates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const templates = await prisma.emailTemplate.findMany({
      where: category ? { category } : undefined,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching email templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST - Create new email template
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, subject, body: templateBody, category, isDefault } = body

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { error: 'Name, subject, and body are required' },
        { status: 400 }
      )
    }

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await prisma.emailTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        body: templateBody,
        category: category || null,
        isDefault: isDefault || false
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating email template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

// PUT - Update email template
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, subject, body: templateBody, category, isDefault } = body

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await prisma.emailTemplate.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false }
      })
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(templateBody && { body: templateBody }),
        ...(category !== undefined && { category }),
        ...(isDefault !== undefined && { isDefault })
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error updating email template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE - Delete email template
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    await prisma.emailTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Template deleted' })
  } catch (error) {
    console.error('Error deleting email template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
