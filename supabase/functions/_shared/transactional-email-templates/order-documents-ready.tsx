import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Easysea"

interface OrderDocumentsReadyProps {
  clientName?: string
  orderCode?: string
}

const OrderDocumentsReadyEmail = ({ clientName, orderCode }: OrderDocumentsReadyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New documents available for order {orderCode || ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Documents Available 📄</Heading>
        <Text style={text}>
          Hi {clientName || 'Customer'}, new documents have been uploaded for your order <strong>{orderCode || '—'}</strong>.
        </Text>
        <Text style={text}>
          You can download them from your dealer portal under <strong>My Orders → {orderCode || '—'} → Documents</strong>.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderDocumentsReadyEmail,
  subject: (data: Record<string, any>) => `Documents available for your order — Easysea B2B`,
  displayName: 'Order documents ready',
  previewData: { clientName: 'Mario Rossi', orderCode: 'ES-0001' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#555575', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
