/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Button, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BaseEmailLayout, emailStyles, APP_URL } from './layouts/BaseEmailLayout.tsx'

interface OrderConfirmedProps {
  clientName?: string
  orderCode?: string
  totalAmount?: string
  portalUrl?: string
}

const OrderConfirmedEmail = ({ clientName, orderCode, totalAmount, portalUrl }: OrderConfirmedProps) => {
  const viewUrl = portalUrl || `${APP_URL}/portal/orders?highlight=${orderCode || ''}`

  return (
    <BaseEmailLayout preview={`Your order ${orderCode || ''} has been confirmed! — Easysea B2B`}>
      <Text style={emailStyles.h1}>Order Confirmed! ✅</Text>
      <Text style={emailStyles.paragraph}>
        Hi <strong>{clientName || 'Customer'}</strong>, your order <strong>{orderCode || '—'}</strong> has been confirmed and is being prepared.
      </Text>

      {totalAmount && (
        <Section style={emailStyles.infoBox}>
          <Text style={{ margin: '0', color: '#0369a1', fontSize: '12px', fontWeight: '600' }}>
            ORDER TOTAL
          </Text>
          <Text style={{ margin: '2px 0 0', color: '#0f172a', fontSize: '20px', fontWeight: '700' }}>
            €{totalAmount}
          </Text>
        </Section>
      )}

      <Text style={emailStyles.paragraph}>
        We'll keep you updated on the progress of your order.
      </Text>

      <Section style={{ textAlign: 'center' as const, marginTop: '32px' }}>
        <Button href={viewUrl} style={emailStyles.button}>
          View your order in the portal
        </Button>
      </Section>

      <Text style={{ ...emailStyles.paragraph, fontSize: '13px', color: '#94a3b8', marginTop: '24px' }}>
        For assistance, reply to this email or contact your sales representative.
      </Text>
    </BaseEmailLayout>
  )
}

export const template = {
  component: OrderConfirmedEmail,
  subject: (data: Record<string, unknown>) => `Your order has been confirmed — Easysea B2B`,
  displayName: 'Order confirmed',
  previewData: { clientName: 'Mario Rossi', orderCode: 'ES-0001', totalAmount: '250.00' },
} satisfies TemplateEntry
