import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, Mail, Users, RefreshCw, Send, 
  ShoppingBag, Target, LayoutDashboard, Activity, ArrowRight
} from "lucide-react";

const CRMHelp = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-3">
          <HelpCircle size={24} className="text-primary" /> CRM — How To Guide
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you need to know to use the Sales CRM effectively.
        </p>
      </div>

      <div className="space-y-6">
        {/* Getting Started */}
        <section className="glass-card-solid p-6">
          <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <LayoutDashboard size={18} className="text-primary" /> Getting Started
          </h2>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="overview">
              <AccordionTrigger className="text-sm font-medium">What is the CRM for?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>The CRM is your central hub for managing client relationships. From here you can:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Track leads through the sales pipeline</li>
                  <li>Manage company contacts and communication history</li>
                  <li>Send and receive emails directly from client profiles</li>
                  <li>Monitor orders and revenue per client</li>
                  <li>Log activities and notes for follow-ups</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="navigation">
              <AccordionTrigger className="text-sm font-medium">How do I navigate the CRM?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Use the sidebar on the left to access:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Dashboard</strong> — Overview of orders collected, paid, and delivered with date filters</li>
                  <li><strong>Leads</strong> — New potential clients not yet converted</li>
                  <li><strong>Pipeline</strong> — Visual Kanban board of lead stages</li>
                  <li><strong>Activities</strong> — Tasks, calls, and follow-ups to track</li>
                  <li><strong>Contacts</strong> — Full company directory with all client details</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Email & Communications */}
        <section className="glass-card-solid p-6">
          <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <Mail size={18} className="text-primary" /> Email & Communications
          </h2>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="gmail-connect">
              <AccordionTrigger className="text-sm font-medium">How do I connect Gmail?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Go to any client profile <ArrowRight size={12} className="inline" /> <strong>Communications</strong> tab</li>
                  <li>Click <Badge variant="outline" className="text-xs">Connect Gmail</Badge> button</li>
                  <li>A Google OAuth popup will appear — sign in with the business@easysea.org account</li>
                  <li>Grant the requested permissions</li>
                  <li>Once connected, a green <Badge className="text-xs bg-primary/20 text-primary border-0">Gmail Connected</Badge> badge will appear</li>
                </ol>
                <p className="text-xs italic">Note: You only need to connect once. The connection persists across all client profiles.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="sync-emails">
              <AccordionTrigger className="text-sm font-medium">How do I sync emails?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Open a client profile and go to the <strong>Communications</strong> tab</li>
                  <li>Click <Badge variant="outline" className="text-xs gap-1"><RefreshCw size={10} /> Sync</Badge></li>
                  <li>The system searches Gmail for all emails matching the client's email addresses (including contacts)</li>
                  <li>Imported emails appear organized by conversation thread</li>
                </ol>
                <p className="text-xs italic">The sync imports emails for ALL clients at once. It checks both the primary company email and all contact emails.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="send-email">
              <AccordionTrigger className="text-sm font-medium">How do I send an email?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Click <Badge className="text-xs gap-1"><Send size={10} /> New Email</Badge> from the Communications tab</li>
                  <li><strong>Choose recipient:</strong> If the company has multiple contacts, select from the dropdown</li>
                  <li><strong>Add CC:</strong> Check any company contacts to add in CC, or type custom email addresses</li>
                  <li><strong>Use templates:</strong> Select a pre-built template (Order Update, Payment Reminder) or write a custom message</li>
                  <li><strong>AI Draft:</strong> Click "Generate AI Draft" for an AI-written starting point that you can edit</li>
                  <li>Click <strong>Send</strong></li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="reply-email">
              <AccordionTrigger className="text-sm font-medium">How do I reply to an email?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Open an email by clicking on it in the conversation list</li>
                  <li>Read the full message with From/To/CC details</li>
                  <li>Click <Badge variant="outline" className="text-xs gap-1">Reply</Badge> at the bottom</li>
                  <li>The compose dialog opens with the recipient and subject pre-filled</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="email-from-order">
              <AccordionTrigger className="text-sm font-medium">How do I email a client about a specific order?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>There are two ways:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>From client profile:</strong> In the Orders tab, click the <Send size={10} className="inline" /> icon on any order row. The email will reference that order code.</li>
                  <li><strong>From Admin order detail:</strong> Go to Admin → Orders → click an order → scroll to the Communications section at the bottom.</li>
                </ul>
                <p>All emails sent from an order context are logged both in the order history and the client's Communications tab.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Contacts & Companies */}
        <section className="glass-card-solid p-6">
          <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <Users size={18} className="text-primary" /> Contacts & Companies
          </h2>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="add-contact">
              <AccordionTrigger className="text-sm font-medium">How do I add contacts to a company?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Open the client profile from <strong>Contacts</strong></li>
                  <li>In the left sidebar, find the <strong>Contacts</strong> section</li>
                  <li>Click <Badge variant="outline" className="text-xs">+ Add Contact</Badge></li>
                  <li>Fill in Name, Role, Email, Phone, and Notes</li>
                  <li>Click <strong>Save</strong></li>
                </ol>
                <p className="text-xs italic">Each contact's email is used for email filtering and Gmail sync. Adding a contact email means their conversations will be imported too.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="notes">
              <AccordionTrigger className="text-sm font-medium">How do I add notes?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>You can add notes at two levels:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Company notes:</strong> In the client profile left sidebar → "Notes" section → Click "Edit" or "Add" → Write your note → Click "Save"</li>
                  <li><strong>Contact notes:</strong> When adding or editing a contact, use the Notes field to store contact-specific information</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="filter-comms">
              <AccordionTrigger className="text-sm font-medium">How do I filter communications by contact?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>In the Communications tab, use the email filter dropdown at the top. You can:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>View <strong>All contacts</strong> — see every email for the company</li>
                  <li>Select a specific email address — see only conversations with that person</li>
                </ul>
                <p className="text-xs italic">The filter shows the count of messages per email address.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Pipeline & Leads */}
        <section className="glass-card-solid p-6">
          <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <Target size={18} className="text-primary" /> Pipeline & Leads
          </h2>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="lead-stages">
              <AccordionTrigger className="text-sm font-medium">What are the lead stages?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>New</strong> — Fresh lead, not yet contacted</li>
                  <li><strong>Contacted</strong> — Initial outreach made</li>
                  <li><strong>Qualified</strong> — Confirmed interest and fit</li>
                  <li><strong>Onboarding</strong> — Setting up as a client</li>
                  <li><strong>Won</strong> — Deal closed, converted to client</li>
                  <li><strong>Lost</strong> — Did not convert</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pipeline-view">
              <AccordionTrigger className="text-sm font-medium">How does the Pipeline view work?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>The Pipeline is a Kanban-style board where you can drag leads between stages. Click on a lead card to see full details and update information.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Dashboard */}
        <section className="glass-card-solid p-6">
          <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" /> Dashboard & Orders
          </h2>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="dashboard-metrics">
              <AccordionTrigger className="text-sm font-medium">What do the dashboard metrics mean?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Total Orders Collected:</strong> Sum of all order totals within the selected date range, filtered by order creation date</li>
                  <li><strong>Total Orders Paid:</strong> Sum of order totals where payment has been received, filtered by payment date</li>
                  <li><strong>Total Orders Delivered:</strong> Sum of order totals that have been delivered, filtered by delivery date</li>
                </ul>
                <p>Use the date range picker to filter metrics by any time period.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="new-orders">
              <AccordionTrigger className="text-sm font-medium">How do I handle new orders?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>New orders appear in both the CRM Dashboard and the Admin panel's "New Orders" section. When an order comes in:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Review the order details and items</li>
                  <li>Update the order status as it progresses</li>
                  <li>Send the client an email update if needed</li>
                  <li>Status changes are shared between CRM and Admin panels</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Tips */}
        <section className="glass-card-solid p-6">
          <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <Activity size={18} className="text-primary" /> Tips & Best Practices
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span><strong>Sync regularly</strong> — Run email sync at least daily to keep conversations up to date.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span><strong>Add all contacts</strong> — Make sure every person you communicate with at a company is added as a contact. This ensures their emails are captured during sync.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span><strong>Use templates</strong> — Pre-built email templates save time and ensure consistent messaging.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              <span><strong>Log activities</strong> — Record calls, meetings, and follow-ups in the Activities section to maintain a complete history.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">5.</span>
              <span><strong>Use notes</strong> — Add notes to both companies and individual contacts for quick reference during calls.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default CRMHelp;
