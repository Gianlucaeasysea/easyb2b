import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Easysea"

interface OrderConfirmedProps {
  clientName?: string
  orderCode?: string
  totalAmount?: string
}

const OrderConfirmedEmail = ({ clientName, orderCode, totalAmount }: OrderConfirmedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your order {orderCode || ''} has been confirmed! — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Order Confirmed! ✅</Heading>
        <Text style={text}>
          Hi {clientName || 'Customer'}, your order <strong>{orderCode || '—'}</strong> has been confirmed and is being prepared.
        </Text>
        {totalAmount && (
          <Text style={{ ...text, fontWeight: 'bold' }}>Total: €{totalAmount}</Text>
        )}
        <Hr style={hr} />
        <Text style={text}>We'll keep you updated on the progress.</Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmedEmail,
  subject: (data: Record<string, any>) => `Easysea — Order ${data.orderCode || ''} confirmed!`,
  displayName: 'Order confirmed',
  previewData: { clientName: 'Mario Rossi', orderCode: 'ES-0001', totalAmount: '250.00' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#555575', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
