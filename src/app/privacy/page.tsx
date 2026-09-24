import type { Metadata } from "next";
import LegalPage from "@/components/site/LegalPage";
import { legal, site } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy policy" };

// TEMPLATE: a starting point, not legal advice. Written with India's Digital Personal Data Protection Act, 2023 in mind.
// Have a lawyer review and adapt it (especially the list of processors) before going live.
export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <p>{legal.companyName} ("we") respects your privacy. This policy explains what personal data we collect when you use {site.name}, why, who we share it with, and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email, mobile number and a hashed password.</li>
        <li>Booking details: stay, dates, number of guests, amounts paid, and notes you give us.</li>
        <li>Messages you send through enquiry forms or WhatsApp.</li>
        <li>Basic technical data such as a session cookie that keeps you logged in.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To create your account, take payment, confirm and manage your booking, and contact you about it.</li>
        <li>To reply to your enquiries and provide support.</li>
        <li>To meet legal, tax and accounting obligations, and prevent fraud.</li>
        <li>To show honest reviews after your stay, if you choose to leave one.</li>
      </ul>
      <p>We use your data only for these purposes, and only where you have agreed or where the law allows.</p>

      <h2>Who we share it with</h2>
      <p>We share only what's needed with service providers that help us run the service:</p>
      <ul>
        <li>Razorpay, to process payments and refunds.</li>
        <li>Meta (WhatsApp Business), to send booking messages to your mobile number.</li>
        <li>An email delivery provider, to send confirmations and password links.</li>
        <li>Our hosting and database providers.</li>
        <li>The property host or caretaker, who receives your name, guest count and contact number so they can host you.</li>
      </ul>
      <p>We don't sell your personal data.</p>

      <h2>How long we keep it</h2>
      <p>We keep booking and payment records for as long as the law requires for tax and accounting. Account data is kept while your account is active. You can ask us to delete your account, and we will unless we must keep something by law.</p>

      <h2>Your rights</h2>
      <p>You can ask to see the personal data we hold about you, correct it, delete it, or withdraw your consent. Write to the address below and we'll respond within a reasonable time.</p>

      <h2>Cookies</h2>
      <p>We use one essential cookie to keep you logged in. We don't use advertising cookies.</p>

      <h2>Security</h2>
      <p>Passwords are stored hashed, payments run through a certified gateway, and access to admin tools is restricted. No system is perfectly secure, but we take reasonable steps to protect your data.</p>

      <h2>Children</h2>
      <p>Bookings must be made by adults aged 18 or over.</p>

      <h2>Grievance officer</h2>
      <p>{legal.grievanceOfficer}, {legal.companyName}, {legal.address}. Email: <a href={`mailto:${legal.grievanceEmail}`}>{legal.grievanceEmail}</a>.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a meaningful way we'll update the date above and, where appropriate, tell you.</p>
    </LegalPage>
  );
}
