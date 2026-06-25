"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        
        <div className="space-y-6 font-body-md text-on-surface-variant/80">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-3">1. Agreement to Terms</h2>
            <p>
              These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and <strong>Xalima</strong> ("we," "us," or "our"), concerning your access to and use of the Digital Atelier SaaS application.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-3">2. Intellectual Property Rights</h2>
            <p>
              Unless otherwise indicated, the SaaS application is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein are owned or controlled by us, namely Xalima.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-3">3. User Representations</h2>
            <p>
              By using the SaaS, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-3">4. Limitation of Liability</h2>
            <p>
              In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the SaaS.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
