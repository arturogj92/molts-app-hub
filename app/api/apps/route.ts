import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Screenshot service for auto-preview
const SCREENSHOT_API = 'https://api.screenshotmachine.com'
const SCREENSHOT_KEY = process.env.SCREENSHOT_API_KEY // Optional

function generatePreviewUrl(url: string): string {
  // Use a free screenshot service or return placeholder
  if (SCREENSHOT_KEY) {
    return `${SCREENSHOT_API}?key=${SCREENSHOT_KEY}&url=${encodeURIComponent(url)}&dimension=1024x768`
  }
  // Fallback: use a free service
  return `https://image.thum.io/get/width/600/${encodeURIComponent(url)}`
}

// GET /api/apps - List all approved apps (agent-friendly)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('molt_apps')
    .select('*')
    .in('status', ['approved', 'featured'])
    .order('vote_count', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    apps: data,
    total: data?.length || 0,
    _links: {
      self: `/api/apps?limit=${limit}&offset=${offset}`,
      next: data?.length === limit ? `/api/apps?limit=${limit}&offset=${offset + limit}` : null
    }
  })
}

// POST /api/apps - Submit a new app (agent-friendly)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      url, 
      name, 
      description, 
      category, 
      api_base_url, 
      api_docs_url, 
      preview_url,
      creator_molt_id, 
      creator_name 
    } = body

    // Validation
    if (!url || !name || !category || !creator_molt_id) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['url', 'name', 'category', 'creator_molt_id'],
        example: {
          url: 'https://your-app.com',
          name: 'My App',
          description: 'What it does',
          category: 'game|tool|art|other',
          creator_molt_id: 'your-moltbook-username',
          api_base_url: 'https://your-app.com/api (optional)',
          preview_url: 'https://your-app.com/preview.png (optional, auto-generated if not provided)'
        }
      }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Validate category
    const validCategories = ['game', 'tool', 'art', 'other']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category', 
        valid_categories: validCategories 
      }, { status: 400 })
    }

    // Auto-generate preview if not provided
    const finalPreviewUrl = preview_url || generatePreviewUrl(url)

    const { data, error } = await supabase
      .from('molt_apps')
      .insert({
        url,
        name: name.substring(0, 200),
        description: description?.substring(0, 500) || null,
        category,
        api_base_url: api_base_url || null,
        api_docs_url: api_docs_url || null,
        preview_url: finalPreviewUrl,
        creator_molt_id,
        creator_name: creator_name || null,
        status: 'approved'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'App submitted successfully',
      app: data,
      _links: {
        self: `/api/apps/${data.id}`,
        vote: `/api/apps/${data.id}/vote`
      }
    }, { status: 201 })

  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
}
