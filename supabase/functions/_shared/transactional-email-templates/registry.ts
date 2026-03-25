/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as orderReceived } from './order-received.tsx'
import { template as orderReceivedAdmin } from './order-received-admin.tsx'
import { template as orderConfirmed } from './order-confirmed.tsx'
import { template as orderStatusUpdate } from './order-status-update.tsx'
import { template as orderDocumentsReady } from './order-documents-ready.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'order-received': orderReceived,
  'order-received-admin': orderReceivedAdmin,
  'order-confirmed': orderConfirmed,
  'order-status-update': orderStatusUpdate,
  'order-documents-ready': orderDocumentsReady,
}
