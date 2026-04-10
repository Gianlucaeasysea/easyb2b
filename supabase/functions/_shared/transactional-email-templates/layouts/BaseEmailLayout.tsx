/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from 'npm:@react-email/components@0.0.22'

interface BaseEmailLayoutProps {
  preview: string
  children: React.ReactNode
}

const APP_URL = Deno.env.get('APP_URL') ?? 'https://b2b.easysea.org'

const styles = {
  body: {
    backgroundColor: '#f4f4f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: '0',
    padding: '0',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    maxWidth: '600px',
    borderRadius: '8px',
    overflow: 'hidden' as const,
    marginTop: '24px',
    marginBottom: '24px',
  },
  header: {
    backgroundColor: '#0f172a',
    padding: '24px 32px',
    textAlign: 'center' as const,
  },
  headerLogo: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '700' as const,
    letterSpacing: '-0.5px',
    margin: '0',
  },
  headerTagline: {
    color: '#94a3b8',
    fontSize: '12px',
    margin: '4px 0 0',
  },
  content: {
    padding: '32px',
  },
  footer: {
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    padding: '24px 32px',
    textAlign: 'center' as const,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: '12px',
    lineHeight: '1.6',
    margin: '0',
  },
  footerLink: {
    color: '#64748b',
    textDecoration: 'underline',
  },
}

export function BaseEmailLayout({ preview, children }: BaseEmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Text style={styles.headerLogo}>Easysea B2B</Text>
            <Text style={styles.headerTagline}>Dealer Portal</Text>
          </Section>

          {/* Content */}
          <Section style={styles.content}>
            {children}
          </Section>

          <Hr style={{ borderColor: '#e2e8f0', margin: '0' }} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Easysea S.r.l. · Bergamo, Italia
            </Text>
            <Text style={styles.footerText}>
              <Link href={`${APP_URL}/portal`} style={styles.footerLink}>
                Go to portal
              </Link>
              {' · '}
              <Link href={`${APP_URL}/unsubscribe`} style={styles.footerLink}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={{ ...styles.footerText, marginTop: '8px' }}>
              You received this email because you are a registered Easysea dealer.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Reusable styles for templates
export const emailStyles = {
  h1: {
    color: '#0f172a',
    fontSize: '24px',
    fontWeight: '700' as const,
    margin: '0 0 8px',
  },
  h2: {
    color: '#1e293b',
    fontSize: '18px',
    fontWeight: '600' as const,
    margin: '24px 0 8px',
  },
  paragraph: {
    color: '#475569',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0 0 16px',
  },
  button: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block' as const,
    fontSize: '14px',
    fontWeight: '600' as const,
    padding: '12px 24px',
    textDecoration: 'none',
    textAlign: 'center' as const,
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '24px',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '600' as const,
    padding: '10px 12px',
    textAlign: 'left' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  tableCell: {
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
    fontSize: '14px',
    padding: '12px',
  },
  totalRow: {
    backgroundColor: '#f8fafc',
    borderTop: '2px solid #e2e8f0',
  },
}

export { APP_URL }
