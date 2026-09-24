import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/site/LegalPage";
import { legal, site } from "@/lib/config";

export const metadata: Metadata = { title: "Terms and conditions" };

// TEMPLATE: a starting point, not legal advice. Have a lawyer review and adapt it before going live.
export default function Terms() {
  return (
    <LegalPage title="Terms and conditions">
      <p>These terms apply when you use {site.url.replace(/^https?:\/\//, "")} and book a stay through {site.name}, operated by {legal.companyName} ("we", "us"). By creating an account or making a booking you agree to them.</p>

      <h2>Bookings and payment</h2>
      <p>A booking is confirmed only when payment is received and you see a confirmation on screen and by email. Payments are processed securely by Razorpay. We never see or store your card or UPI details.</p>
      <p>Dates are held for a few minutes while you pay. If payment isn't completed in that time, the hold is released.</p>

      <h2>Prices and taxes</h2>
      <p>Prices are in Indian rupees per night. GST is added at the rate applicable to the tariff and shown before you pay. The total you see at checkout is the total you pay.</p>

      <h2>Guests and house rules</h2>
      <ul>
        <li>The number of guests must not exceed the maximum shown for the stay. Extra guests may be charged or refused entry.</li>
        <li>A valid government photo ID is required for every adult guest at check-in.</li>
        <li>Follow the house rules on the stay page, including quiet hours and smoking rules.</li>
        <li>Events, parties or commercial shoots need our written approval before booking.</li>
      </ul>

      <h2>Damage and liability</h2>
      <p>You are responsible for damage to the property or its contents caused by you or your guests beyond normal wear. We may charge the reasonable cost of repair. We are not liable for loss of personal belongings, or for events outside our control such as weather, power or water outages, or government restrictions, though we will work to help you.</p>

      <h2>Cancellations and refunds</h2>
      <p>Cancellations and refunds follow our <Link href="/cancellation-policy">cancellation policy</Link>. If we have to cancel your booking, you receive a full refund.</p>

      <h2>Bookings made through other platforms</h2>
      <p>Some stays are also listed on other travel platforms. If you book through one of them, that platform's terms and cancellation rules apply to your booking.</p>

      <h2>Your account</h2>
      <p>Keep your password private. You are responsible for activity on your account. We may suspend accounts that misuse the service.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India. Courts at [your city] have jurisdiction, subject to any consumer rights you have by law.</p>

      <h2>Contact</h2>
      <p>{legal.companyName}, {legal.address}. Email <a href={`mailto:${site.email}`}>{site.email}</a> or call {site.phoneDisplay}. Grievances: see our <Link href="/privacy">privacy policy</Link>.</p>
    </LegalPage>
  );
}
