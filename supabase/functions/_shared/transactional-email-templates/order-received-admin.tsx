/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Button, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BaseEmailLayout, emailStyles, APP_URL } from './layouts/BaseEmailLayout.tsx'

interface OrderReceivedAdminProps {
  orderCode?: string
  companyName?: string
  clientName?: string
  clientEmail?: string
  itemsHtml?: string
  totalAmount?: string
  notes?: string
}

const OrderReceivedAdminEmail = ({
  orderCode, companyName, clientName, clientEmail, itemsHtml, totalAmount, notes,
}: OrderReceivedAdminProps) => {
  const adminUrl = `${APP_URL}/admin/orders`

  return (
    <BaseEmailLayout preview={`🔔 New Order ${orderCode || ''} from ${companyName || 'client'}`}>
      <Text style={emailStyles.h1}>New B2B Order Received</Text>

      <Section style={emailStyles.infoBox}>
        <Text style={{ margin: '0 0 4px', color: '#334155', fontSize: '14px' }}>
          <strong>Order:</strong> {orderCode || '—'}
        </Text>
        <Text style={{ margin: '0 0 4px', color: '#334155', fontSize: '14px' }}>
          <strong>Client:</strong> {companyName || '—'}
        </Text>
        <Text style={{ margin: '0', color: '#334155', fontSize: '14px' }}>
          <strong>Contact:</strong> {clientName || '—'} ({clientEmail || 'no email'})
        </Text>
      </Section>

      {itemsHtml && (
        <div dangerouslySetInnerHTML={{ __html: itemsHtml }} />
      )}

      {totalAmount && (
        <Text style={{ ...emailStyles.paragraph, fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>
          Total: €{totalAmount}
        </Text>
      )}

      {notes && (
        <>
          <Text style={emailStyles.h2}>Client Notes</Text>
          <Text style={emailStyles.paragraph}>{notes}</Text>
        </>
      )}

      <Section style={{ textAlign: 'center' as const, marginTop: '32px' }}>
        <Button href={adminUrl} style={emailStyles.button}>
          Manage in admin panel
        </Button>
      </Section>
    </BaseEmailLayout>
  )
}

export const template = {
  component: OrderReceivedAdminEmail,
  subject: (data: Record<string, unknown>) => `New order received — ${(data as Record<string, string>).companyName || 'Dealer'}`,
  displayName: 'New order (admin notification)',
  previewData: { orderCode: 'ES-0001', companyName: 'Nautica SRL', clientName: 'Mario Rossi', clientEmail: 'mario@nautica.it', totalAmount: '250.00' },
} satisfies TemplateEntry
