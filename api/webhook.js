import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawBody = await getRawBody(req)
  const sig     = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  if (event.type === 'checkout.session.completed' ||
      event.type === 'customer.subscription.created' ||
      event.type === 'invoice.payment_succeeded') {

    const session      = event.data.object
    const customerEmail = session.customer_email ||
                          session.customer_details?.email

    if (customerEmail) {
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users?.users?.find(u => u.email === customerEmail)

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: user.id, is_premium: true })

        if (error) {
          console.error('Supabase update error:', error)
          return res.status(500).json({ error: 'Database update failed' })
        }
        console.log(`Premium activated for: ${customerEmail}`)
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription  = event.data.object
    const customerId    = subscription.customer
    const customer      = await stripe.customers.retrieve(customerId)
    const customerEmail = customer.email

    if (customerEmail) {
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users?.users?.find(u => u.email === customerEmail)

      if (user) {
        await supabase
          .from('profiles')
          .upsert({ id: user.id, is_premium: false })
        console.log(`Premium cancelled for: ${customerEmail}`)
      }
    }
  }

  res.status(200).json({ received: true })
}