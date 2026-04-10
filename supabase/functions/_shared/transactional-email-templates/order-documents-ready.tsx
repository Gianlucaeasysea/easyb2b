/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Button, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BaseEmailLayout, emailStyles, APP_URL } from './layouts/BaseEmailLayout.tsx'

interface OrderDocumentsReadyProps {
  clientName?: string
  orderCode?: string
  portalUrl?: string
}

const OrderDocumentsReadyEmail = ({ clientName, orderCode, portalUrl }: OrderDocumentsReadyProps) => {
  const viewUrl = portalUrl || `${APP_URL}/portal/orders?highlight=${orderCode || ''}`

  return (
    <BaseEmailLayout preview={`New documents available for order ${orderCode || ''}`}>
      <Text style={emailStyles.h1}>New Documents Available 📄</Text>
      <Text style={emailStyles.paragraph}>
        Hi <strong>{clientName || 'Customer'}</strong>, new documents have been uploaded for your order <strong>{orderCode || '—'}</strong>.
      </Text>
      <Text style={emailStyles.paragraph}>
        You can download them from your dealer portal.
      </Text>

      <Section style={{ textAlign: 'center' as const, marginTop: '32px' }}>
        <Button href={viewUrl} style={emailStyles.button}>
          View documents in the portal
        </Button>
      </Section>

      <Text style={{ ...emailStyles.paragraph, fontSize: '13px', color: '#94a3b8', marginTop: '24px' }}>
        For assistance, reply to this email or contact your sales representative.
      </Text>
    </BaseEmailLayout>
  )
}

export const template = {
  component: OrderDocumentsReadyEmail,
  subject: (data: Record<string, unknown>) => `Documents available for your order — Easysea B2B`,
  displayName: 'Order documents ready',
  previewData: { clientName: 'Mario Rossi', orderCode: 'ES-0001' },
} satisfies TemplateEntry
