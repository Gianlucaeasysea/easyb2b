/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Button, Section, Text, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BaseEmailLayout, emailStyles, APP_URL } from './layouts/BaseEmailLayout.tsx'

interface OrderReceivedProps {
  clientName?: string
  orderCode?: string
  orderDate?: string
  itemsHtml?: string
  totalAmount?: string
  notes?: string
  portalUrl?: string
}

const OrderReceivedEmail = ({
  clientName, orderCode, orderDate, itemsHtml, totalAmount, notes, portalUrl,
}: OrderReceivedProps) => {
  const viewUrl = portalUrl || `${APP_URL}/portal/orders?highlight=${orderCode || ''}`

  return (
    <BaseEmailLayout preview={`Order ${orderCode || ''} received — Easysea B2B`}>
      <Text style={emailStyles.h1}>Order Received</Text>
      <Text style={emailStyles.paragraph}>
        Hi <strong>{clientName || 'Customer'}</strong>, we have received your order.
        We are processing it and will contact you for confirmation.
      </Text>

      {/* Order Info Box */}
      <Section style={emailStyles.infoBox}>
        <Row>
          <Column>
            <Text style={{ margin: '0', color: '#0369a1', fontSize: '12px', fontWeight: '600' }}>
              ORDER NUMBER
            </Text>
            <Text style={{ margin: '2px 0 0', color: '#0f172a', fontSize: '20px', fontWeight: '700' }}>
              {orderCode || '—'}
            </Text>
          </Column>
          {orderDate && (
            <Column style={{ textAlign: 'right' as const }}>
              <Text style={{ margin: '0', color: '#0369a1', fontSize: '12px', fontWeight: '600' }}>
                DATE
              </Text>
              <Text style={{ margin: '2px 0 0', color: '#0f172a', fontSize: '14px' }}>
                {orderDate}
              </Text>
            </Column>
          )}
        </Row>
      </Section>

      {/* Items HTML */}
      {itemsHtml && (
        <div dangerouslySetInnerHTML={{ __html: itemsHtml }} />
      )}

      {totalAmount && (
        <Text style={{ ...emailStyles.paragraph, fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>
          Order Total: €{totalAmount}
        </Text>
      )}

      {notes && (
        <Section style={{ marginTop: '16px' }}>
          <Text style={emailStyles.h2}>Notes</Text>
          <Text style={emailStyles.paragraph}>{notes}</Text>
        </Section>
      )}

      {/* CTA */}
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
  component: OrderReceivedEmail,
  subject: (data: Record<string, unknown>) => `Order Received — Easysea B2B`,
  displayName: 'Order received (client)',
  previewData: { clientName: 'Mario Rossi', orderCode: 'ES-0001', totalAmount: '250.00', orderDate: '10/04/2026' },
} satisfies TemplateEntry
