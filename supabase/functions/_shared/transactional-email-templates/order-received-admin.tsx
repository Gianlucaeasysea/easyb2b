import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface OrderReceivedAdminProps {
  orderCode?: string
  companyName?: string
  clientName?: string
  clientEmail?: string
  itemsHtml?: string
  totalAmount?: string
  notes?: string
}

const OrderReceivedAdminEmail = ({ orderCode, companyName, clientName, clientEmail, itemsHtml, totalAmount, notes }: OrderReceivedAdminProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🔔 New Order {orderCode || ''} from {companyName || 'client'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New B2B Order Received</Heading>
        <Text style={text}><strong>Order:</strong> {orderCode || '—'}</Text>
        <Text style={text}><strong>Client:</strong> {companyName || '—'}</Text>
        <Text style={text}><strong>Contact:</strong> {clientName || '—'} ({clientEmail || 'no email'})</Text>
        {itemsHtml && (
          <div dangerouslySetInnerHTML={{ __html: itemsHtml }} />
        )}
        {totalAmount && (
          <Text style={{ ...text, fontWeight: 'bold', fontSize: '16px' }}>Total: €{totalAmount}</Text>
        )}
        {notes && (
          <Text style={text}><strong>Client notes:</strong> {notes}</Text>
        )}
        <Hr style={hr} />
        <Text style={footer}>Manage this order in the admin panel.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderReceivedAdminEmail,
  subject: (data: Record<string, any>) => `New order received — ${data.companyName || 'Dealer'}`,
  displayName: 'New order (admin notification)',
  previewData: { orderCode: 'ES-0001', companyName: 'Nautica SRL', clientName: 'Mario Rossi', clientEmail: 'mario@nautica.it', totalAmount: '250.00' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#555575', lineHeight: '1.6', margin: '0 0 10px' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
