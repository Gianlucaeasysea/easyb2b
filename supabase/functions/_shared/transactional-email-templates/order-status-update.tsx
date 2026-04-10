/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Button, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BaseEmailLayout, emailStyles, APP_URL } from './layouts/BaseEmailLayout.tsx'

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#10b981',
  processing: '#f59e0b',
  ready_to_ship: '#f97316',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
}

interface OrderStatusUpdateProps {
  clientName?: string
  orderCode?: string
  status?: string
  trackingNumber?: string
  trackingUrl?: string
  portalUrl?: string
}

const OrderStatusUpdateEmail = ({
  clientName, orderCode, status, trackingNumber, trackingUrl, portalUrl,
}: OrderStatusUpdateProps) => {
  const viewUrl = portalUrl || `${APP_URL}/portal/orders?highlight=${orderCode || ''}`
  const badgeColor = STATUS_COLORS[status || ''] || '#64748b'

  return (
    <BaseEmailLayout preview={`Order ${orderCode || ''} update: ${status || 'updated'}`}>
      <Text style={emailStyles.h1}>Order Update</Text>
      <Text style={emailStyles.paragraph}>
        Hi <strong>{clientName || 'Customer'}</strong>, your order <strong>{orderCode || '—'}</strong> status has been updated:
      </Text>

      <Section style={{ ...emailStyles.infoBox, borderColor: badgeColor }}>
        <Text style={{ margin: '0', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
          NEW STATUS
        </Text>
        <Text style={{ margin: '4px 0 0', color: badgeColor, fontSize: '18px', fontWeight: '700', textTransform: 'capitalize' as const }}>
          {(status || 'Updated').replace(/_/g, ' ')}
        </Text>
      </Section>

      {trackingNumber && (
        <Text style={emailStyles.paragraph}>
          <strong>Tracking Number:</strong> {trackingNumber}
        </Text>
      )}

      <Section style={{ textAlign: 'center' as const, marginTop: '24px' }}>
        {trackingUrl ? (
          <Button href={trackingUrl} style={{ ...emailStyles.button, marginRight: '8px' }}>
            Track your shipment →
          </Button>
        ) : null}
        <Button href={viewUrl} style={{ ...emailStyles.button, backgroundColor: trackingUrl ? '#475569' : '#0f172a' }}>
          View order in portal
        </Button>
      </Section>

      <Text style={{ ...emailStyles.paragraph, fontSize: '13px', color: '#94a3b8', marginTop: '24px' }}>
        For assistance, reply to this email or contact your sales representative.
      </Text>
    </BaseEmailLayout>
  )
}

export const template = {
  component: OrderStatusUpdateEmail,
  subject: (data: Record<string, unknown>) => `Order status update — Easysea B2B`,
  displayName: 'Order status update',
  previewData: { clientName: 'Mario Rossi', orderCode: 'ES-0001', status: 'shipped', trackingNumber: 'TRK123456' },
} satisfies TemplateEntry
