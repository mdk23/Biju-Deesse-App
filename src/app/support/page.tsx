"use client";

import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Clock } from "lucide-react";

export default function SupportPage() {
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
        
        <div className="text-center mb-12">
          <h1 className="font-headline-lg text-headline-lg text-on-surface-variant mb-4">
            How can we help?
          </h1>
          <p className="font-body-md text-on-surface-variant/80 max-w-xl mx-auto">
            Get in touch with the Xalima support team. We're here to help you get the most out of the Digital Atelier SaaS platform.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Email Support */}
          <div className="bg-surface p-6 rounded-xl border border-outline-variant/30 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center text-primary mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-headline-md text-lg text-on-surface-variant mb-2">Email Support</h3>
            <p className="font-body-md text-sm text-on-surface-variant/70 mb-4">
              Send us an email anytime. We typically respond within 24 hours.
            </p>
            <a href="mailto:support@xalima.com" className="font-label-caps text-primary hover:underline mt-auto">
              support@xalima.com
            </a>
          </div>

          {/* Business Hours */}
          <div className="bg-surface p-6 rounded-xl border border-outline-variant/30 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-headline-md text-lg text-on-surface-variant mb-2">Business Hours</h3>
            <p className="font-body-md text-sm text-on-surface-variant/70 mb-4">
              Our support team is available during regular business hours.
            </p>
            <p className="font-label-caps text-on-surface-variant mt-auto">
              MON-FRI, 9AM-5PM (GMT)
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-surface p-8 rounded-xl border border-outline-variant/30">
          <h2 className="font-headline-md text-xl text-on-surface-variant mb-6 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-primary" />
            Send us a message
          </h2>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant mb-1" htmlFor="name">Name</label>
                <input 
                  type="text" 
                  id="name" 
                  className="w-full bg-transparent border border-outline-variant rounded-md py-2 px-3 font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant mb-1" htmlFor="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  className="w-full bg-transparent border border-outline-variant rounded-md py-2 px-3 font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block font-label-caps text-[10px] text-on-surface-variant mb-1" htmlFor="message">Message</label>
              <textarea 
                id="message" 
                rows={4}
                className="w-full bg-transparent border border-outline-variant rounded-md py-2 px-3 font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                placeholder="How can we help you?"
              ></textarea>
            </div>
            <button 
              type="button"
              className="px-6 py-2 bg-primary text-white font-label-caps rounded-md hover:bg-primary-container transition-colors"
            >
              Send Message
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
}
