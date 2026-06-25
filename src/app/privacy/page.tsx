"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-4xl mx-auto glass-panel p-8 md:p-12 rounded-2xl shadow-sm">
        <Link 
          href="/login" 
          className="inline-flex items-center text-primary hover:text-primary-container transition-colors font-label-caps text-label-caps mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
        
        <h1 className="font-headline-lg text-headline-lg text-on-surface-variant mb-6">
          Privacy Policy
        </h1>
        
        <div className="space-y-6 font-body-md text-on-surface-variant/80">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-3">1. Introduction</h2>
            <p>
              Welcome to the Digital Atelier. This SaaS application is owned and operated by <strong>Xalima</strong>. 
              We are committed to protecting your personal information and your right to privacy.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-3">2. Data Architecture and Access</h2>
            <p>
              Unlike traditional multi-tenant applications, we provision a dedicated, isolated database for each individual store using our platform. This ensures your data is strictly separated from other users. However, please note that Xalima retains administrative access to your dedicated database for the purposes of system maintenance, troubleshooting, and providing direct technical support to your store.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-3">3. How We Use Your Information</h2>
            <p>
              We process your personal information for a variety of reasons, depending on how you interact with our Services, including:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>To facilitate account creation and authentication and otherwise manage user accounts.</li>
              <li>To deliver and facilitate delivery of services to the user.</li>
              <li>To send administrative information to you.</li>
              <li>To request feedback and to contact you about your use of our SaaS.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-3">4. Contact Us</h2>
            <p>
              If you have questions or comments about this notice, you may email us at privacy@xalima.com or contact us via the Support page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
