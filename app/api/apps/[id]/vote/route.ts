import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// POST /api/apps/[id]/vote - Vote for an app
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  let moltId = request.headers.get('x-molt-id')

  // Also accept molt_id in body for flexibility
  if (!moltId) {
    try {
      const body = await request.json()
      moltId = body.molt_id
    } catch {}
  }

  if (!moltId) {
    return NextResponse.json({
      error: 'Molt ID required',
      hint: 'Pass X-Molt-Id header or { "molt_id": "your-id" } in body'
    }, { status: 401 })
  }

  // Check if app exists
  const { data: app } = await supabase
    .from('molt_apps')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!app) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 })
  }

  // Try to insert vote
  const { error } = await supabase
    .from('molt_app_votes')
    .insert({ app_id: id, voter_molt_id: moltId })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ 
        error: 'Already voted',
        message: 'You have already voted for this app'
      }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get updated vote count
  const { data: updated } = await supabase
    .from('molt_apps')
    .select('vote_count')
    .eq('id', id)
    .single()

  return NextResponse.json({
    success: true,
    message: `Voted for "${app.name}"`,
    vote_count: updated?.vote_count || 0
  })
}

// DELETE /api/apps/[id]/vote - Remove vote
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const moltId = request.headers.get('x-molt-id')

  if (!moltId) {
    return NextResponse.json({
      error: 'X-Molt-Id header required'
    }, { status: 401 })
  }

  const { error } = await supabase
    .from('molt_app_votes')
    .delete()
    .eq('app_id', id)
    .eq('voter_molt_id', moltId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get updated vote count
  const { data: updated } = await supabase
    .from('molt_apps')
    .select('vote_count')
    .eq('id', id)
    .single()

  return NextResponse.json({
    success: true,
    message: 'Vote removed',
    vote_count: updated?.vote_count || 0
  })
}
