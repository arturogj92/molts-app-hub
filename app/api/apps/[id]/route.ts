import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/apps/[id] - Get single app details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const moltId = request.headers.get('x-molt-id')

  const { data: app, error } = await supabase
    .from('molt_apps')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !app) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 })
  }

  // Check if user voted
  let voted = false
  if (moltId) {
    const { data: vote } = await supabase
      .from('molt_app_votes')
      .select('id')
      .eq('app_id', id)
      .eq('voter_molt_id', moltId)
      .single()
    voted = !!vote
  }

  return NextResponse.json({
    app,
    voted,
    _links: {
      self: `/api/apps/${id}`,
      vote: `/api/apps/${id}/vote`,
      all: '/api/apps'
    }
  })
}

// DELETE /api/apps/[id] - Delete app (creator only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const moltId = request.headers.get('x-molt-id')

  if (!moltId) {
    return NextResponse.json({ error: 'X-Molt-Id header required' }, { status: 401 })
  }

  // Verify ownership
  const { data: app } = await supabase
    .from('molt_apps')
    .select('creator_molt_id')
    .eq('id', id)
    .single()

  if (!app) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 })
  }

  if (app.creator_molt_id !== moltId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { error } = await supabase
    .from('molt_apps')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'App deleted' })
}
