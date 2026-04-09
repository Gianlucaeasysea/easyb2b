import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Easysea"

interface OrderStatusUpdateProps {
  clientName?: string
  orderCode?: string
  status?: string
  trackingNumber?: string
  trackingUrl?: string
}

const OrderStatusUpdateEmail = ({ clientName, orderCode, status, trackingNumber, trackingUrl }: OrderStatusUpdateProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Order {orderCode || ''} update: {status || 'updated'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Order Update</Heading>
        <Text style={text}>
          Hi {clientName || 'Customer'}, your order <strong>{orderCode || '—'}</strong> status has been updated to: <strong>{status || 'updated'}</strong>
        </Text>
        {trackingNumber && (
          <Text style={text}><strong>Tracking:</strong> {trackingNumber}</Text>
        )}
        {trackingUrl && (
          <Button href={trackingUrl} style={button}>Track your shipment →</Button>
        )}
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderStatusUpdateEmail,
  subject: (data: Record<string, any>) => `Order status update — Easysea B2B`,
  displayName: 'Order status update',
  previewData: { clientName: 'Mario Rossi', orderCode: 'ES-0001', status: 'Shipped', trackingNumber: 'TRK123456' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#555575', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#3366cc', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', display: 'inline-block', fontSize: '14px' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
