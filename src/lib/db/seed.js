/**
 * Seed initial demo data on first load (local mode only).
 * Gives the dashboard real content to show immediately.
 */

import db from './store.js'

const SEED_FLAG = 'contentos_seeded'

export async function seedIfEmpty() {
  // Only seed once, and only in local mode
  if (db.mode !== 'local') return
  if (localStorage.getItem(SEED_FLAG)) return

  try {
    // Create a default workspace
    const workspace = await db.workspaces.create({
      name: 'Solo Setup Guide',
      niche: 'Freelance Business',
      audience: 'New freelancers',
      brand_color: '#06b6d4',
      font_family: 'Inter'
    })

    const wsId = workspace.id

    // Seed channels
    await db.channels.create({
      workspace_id: wsId, platform: 'youtube', handle: '@FinanceTips',
      display_name: 'Finance Tips', followers: 12500, status: 'active', auto_post: false
    })
    await db.channels.create({
      workspace_id: wsId, platform: 'tiktok', handle: '@QuickFacts',
      display_name: 'Quick Facts', followers: 45200, status: 'active', auto_post: true
    })
    await db.channels.create({
      workspace_id: wsId, platform: 'instagram', handle: '@DailyHacks',
      display_name: 'Daily Hacks', followers: 8900, status: 'growing', auto_post: false
    })

    // Seed videos
    await db.videos.create({
      workspace_id: wsId, title: '5 Tax Mistakes Freelancers Make',
      topic: 'freelancer tax mistakes', format: 'vertical', content_style: 'faceless',
      status: 'published', published_at: new Date().toISOString(),
      target_platforms: ['tiktok']
    })
    await db.videos.create({
      workspace_id: wsId, title: 'How to Register Your Business',
      topic: 'business registration', format: 'landscape', content_style: 'faceless',
      status: 'published', published_at: new Date(Date.now() - 86400000).toISOString(),
      target_platforms: ['youtube']
    })
    await db.videos.create({
      workspace_id: wsId, title: 'Contract Template Walkthrough',
      topic: 'contract templates', format: 'vertical', content_style: 'faceless',
      status: 'scheduled', scheduled_time: new Date(Date.now() + 86400000).toISOString(),
      target_platforms: ['instagram']
    })
    await db.videos.create({
      workspace_id: wsId, title: 'Q1 Tax Deadlines Explained',
      topic: 'tax deadlines', format: 'vertical', content_style: 'faceless',
      status: 'draft', target_platforms: ['tiktok', 'instagram', 'youtube']
    })

    // Seed products
    await db.products.create({
      workspace_id: wsId, name: 'Freelancer Tax Checklist', price: 27,
      product_type: 'guide', platform: 'gumroad', total_sales: 145,
      total_revenue: 3915, conversion_rate: 3.2
    })
    await db.products.create({
      workspace_id: wsId, name: 'Contract Templates Pack', price: 47,
      product_type: 'template', platform: 'beacons', total_sales: 89,
      total_revenue: 4183, conversion_rate: 2.8
    })
    await db.products.create({
      workspace_id: wsId, name: 'Complete Business Setup Guide', price: 97,
      product_type: 'course', platform: 'stripe', total_sales: 34,
      total_revenue: 3298, conversion_rate: 4.1
    })

    localStorage.setItem(SEED_FLAG, 'true')
    console.log('✓ Seeded initial demo data')
  } catch (err) {
    console.error('Seed error:', err)
  }
}

export function resetData() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('contentos_'))
    .forEach(k => localStorage.removeItem(k))
  console.log('✓ Reset all ContentOS data')
}